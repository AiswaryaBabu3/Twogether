import base64
import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select

from app.core.database import get_db
from app.models.couple import Couple, Partner, DailyPrompt
from app.schemas.couple import (
    CoupleResponse,
    PartnerUpdate,
    AvatarUploadRequest,
    ReunionUpdate,
    HeartbeatRequest,
    DailyAnswerRequest,
)
from app.services.couple_service import (
    get_or_create_default_couple,
    build_couple_response,
    lookup_city_info,
)

logger = logging.getLogger("twogether.couple_api")
router = APIRouter(prefix="/api/couple", tags=["Couple Realtime API"])


class ConnectionManager:
    """Manages active WebSockets for realtime couple synchronization."""
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Total clients: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]):
        for connection in list(self.active_connections):
            try:
                await connection.send_text(json.dumps(message, default=str))
            except Exception as e:
                logger.warning(f"Error broadcasting to client: {e}")
                self.disconnect(connection)


manager = ConnectionManager()


@router.get("", response_model=CoupleResponse, summary="Get active couple space")
async def get_couple(db: AsyncSession = Depends(get_db)):
    """Fetches the couple space, partners, live distance, and daily questions."""
    couple = await get_or_create_default_couple(db)
    return build_couple_response(couple)


def _process_avatar_data(partner_id: int, image_data: str) -> str:
    """If image_data is a data URI, decodes and saves it to static/avatars/."""
    image_str = image_data.strip()
    if image_str.startswith("data:image"):
        try:
            header, encoded = image_str.split(",", 1)
            ext = "jpg"
            if "png" in header:
                ext = "png"
            elif "webp" in header:
                ext = "webp"
            elif "gif" in header:
                ext = "gif"

            static_dir = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "avatars"
            )
            os.makedirs(static_dir, exist_ok=True)
            filename = f"avatar_p{partner_id}_{uuid.uuid4().hex[:8]}.{ext}"
            file_path = os.path.join(static_dir, filename)

            image_bytes = base64.b64decode(encoded)
            with open(file_path, "wb") as f:
                f.write(image_bytes)

            return f"/static/avatars/{filename}"
        except Exception as exc:
            logger.warning(f"Failed to save avatar to disk, using data URI directly: {exc}")
            return image_str
    return image_str


@router.put("/profile", response_model=CoupleResponse, summary="Update partner profile")
async def update_partner_profile(payload: PartnerUpdate, db: AsyncSession = Depends(get_db)):
    """Updates name, city, timezone, status, or avatar for either partner."""
    couple = await get_or_create_default_couple(db)
    partners = sorted(couple.partners, key=lambda p: p.id)

    if payload.partner_index >= len(partners):
        raise HTTPException(status_code=400, detail="Invalid partner index")

    partner = partners[payload.partner_index]

    if payload.name is not None:
        partner.name = payload.name.strip()
    if payload.city is not None:
        partner.city = payload.city.strip()
        lat, lon, tz = lookup_city_info(partner.city)
        if lat != 0.0 or lon != 0.0:
            partner.latitude = lat
            partner.longitude = lon
            if payload.timezone is None:
                partner.timezone = tz
    if payload.timezone is not None:
        partner.timezone = payload.timezone.strip()
    if payload.status_message is not None:
        partner.status_message = payload.status_message.strip()
    if payload.status_emoji is not None:
        partner.status_emoji = payload.status_emoji.strip()
    if payload.avatar_url is not None:
        partner.avatar_url = _process_avatar_data(partner.id, payload.avatar_url)

    couple.last_interaction_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(partner)

    # Reload couple with relationships
    stmt = (
        select(Couple)
        .options(selectinload(Couple.partners), selectinload(Couple.daily_prompts))
        .where(Couple.id == couple.id)
    )
    res = await db.execute(stmt)
    updated_couple = res.scalars().first()
    response_data = build_couple_response(updated_couple)

    # Broadcast update to all connected screens in real-time
    await manager.broadcast({
        "type": "COUPLE_UPDATED",
        "data": response_data.model_dump(mode="json")
    })

    return response_data


@router.post("/avatar", response_model=CoupleResponse, summary="Upload partner avatar image")
async def upload_partner_avatar(payload: AvatarUploadRequest, db: AsyncSession = Depends(get_db)):
    """Uploads avatar image (base64 or data URI) for either partner."""
    couple = await get_or_create_default_couple(db)
    partners = sorted(couple.partners, key=lambda p: p.id)

    if payload.partner_index >= len(partners):
        raise HTTPException(status_code=400, detail="Invalid partner index")

    partner = partners[payload.partner_index]
    partner.avatar_url = _process_avatar_data(partner.id, payload.image_data)

    couple.last_interaction_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(partner)

    stmt = (
        select(Couple)
        .options(selectinload(Couple.partners), selectinload(Couple.daily_prompts))
        .where(Couple.id == couple.id)
    )
    res = await db.execute(stmt)
    updated_couple = res.scalars().first()
    response_data = build_couple_response(updated_couple)

    await manager.broadcast({
        "type": "COUPLE_UPDATED",
        "data": response_data.model_dump(mode="json")
    })

    return response_data


@router.put("/reunion", response_model=CoupleResponse, summary="Update reunion goals")
async def update_reunion(payload: ReunionUpdate, db: AsyncSession = Depends(get_db)):
    """Updates the upcoming reunion destination, target date, and progress."""
    couple = await get_or_create_default_couple(db)

    if payload.reunion_title is not None:
        couple.reunion_title = payload.reunion_title.strip()
    if payload.reunion_city is not None:
        couple.reunion_city = payload.reunion_city.strip()
    if payload.reunion_date is not None:
        couple.reunion_date = payload.reunion_date
    if payload.reunion_progress is not None:
        couple.reunion_progress = payload.reunion_progress

    couple.last_interaction_at = datetime.now(timezone.utc)
    await db.commit()

    stmt = (
        select(Couple)
        .options(selectinload(Couple.partners), selectinload(Couple.daily_prompts))
        .where(Couple.id == couple.id)
    )
    res = await db.execute(stmt)
    updated_couple = res.scalars().first()
    response_data = build_couple_response(updated_couple)

    await manager.broadcast({
        "type": "REUNION_UPDATED",
        "data": response_data.model_dump(mode="json")
    })

    return response_data


@router.post("/heartbeat", summary="Send real-time love pulse")
async def send_heartbeat(payload: HeartbeatRequest, db: AsyncSession = Depends(get_db)):
    """Sends a real-time haptic love heartbeat pulse."""
    couple = await get_or_create_default_couple(db)
    now = datetime.now(timezone.utc)
    couple.last_heartbeat_at = now
    couple.last_heartbeat_by = payload.sender_name
    couple.last_interaction_at = now
    await db.commit()

    # Real-time WebSocket broadcast
    await manager.broadcast({
        "type": "HEARTBEAT",
        "sender": payload.sender_name,
        "timestamp": now.isoformat()
    })

    return {
        "status": "delivered",
        "sender": payload.sender_name,
        "timestamp": now.isoformat()
    }


@router.post("/daily-question/answer", summary="Submit answer to daily question")
async def submit_daily_answer(payload: DailyAnswerRequest, db: AsyncSession = Depends(get_db)):
    """Submit an answer for today's question. If both answered, unlocks partner answer."""
    couple = await get_or_create_default_couple(db)
    now = datetime.now(timezone.utc)

    if not couple.daily_prompts:
        raise HTTPException(status_code=404, detail="No active daily prompt found.")

    prompt = sorted(couple.daily_prompts, key=lambda p: p.id, reverse=True)[0]

    if payload.partner_index == 0:
        prompt.user1_answer = payload.answer.strip()
        prompt.user1_answered_at = now
    else:
        prompt.user2_answer = payload.answer.strip()
        prompt.user2_answered_at = now

    if prompt.user1_answer and prompt.user2_answer:
        prompt.is_revealed = True

    await db.commit()

    stmt = (
        select(Couple)
        .options(selectinload(Couple.partners), selectinload(Couple.daily_prompts))
        .where(Couple.id == couple.id)
    )
    res = await db.execute(stmt)
    updated_couple = res.scalars().first()
    response_data = build_couple_response(updated_couple)

    await manager.broadcast({
        "type": "DAILY_QUESTION_ANSWERED",
        "data": response_data.model_dump(mode="json")
    })

    return response_data


@router.websocket("/ws")
async def couple_websocket(websocket: WebSocket):
    """Realtime WebSocket endpoint for instant bidirectional couple updates."""
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive & handle incoming pings
            data = await websocket.receive_text()
            try:
                parsed = json.loads(data)
                if parsed.get("type") == "PING":
                    await websocket.send_text(json.dumps({"type": "PONG"}))
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as exc:
        logger.warning(f"WebSocket connection closed with error: {exc}")
        manager.disconnect(websocket)
