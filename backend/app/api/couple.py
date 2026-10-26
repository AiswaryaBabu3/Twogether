import base64
import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Set, Optional
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select, func

from app.core.database import get_db
from app.models.couple import Couple, Partner, DailyPrompt
from app.schemas.couple import (
    CoupleResponse,
    PartnerUpdate,
    CoupleOnboardingRequest,
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
    """Manages active WebSockets and live partner presence."""
    def __init__(self):
        self.active_connections: Dict[WebSocket, int] = {}
        self.online_partner_indices: Set[int] = set()

    async def connect(self, websocket: WebSocket, partner_index: int = 0):
        await websocket.accept()
        p_idx = partner_index if partner_index in (0, 1) else 0
        self.active_connections[websocket] = p_idx
        self.online_partner_indices.add(p_idx)
        logger.info(f"WebSocket client connected as partner {p_idx}. Online partners: {self.online_partner_indices}")
        await self.broadcast_presence()

    async def update_partner(self, websocket: WebSocket, partner_index: int):
        if websocket in self.active_connections:
            self.active_connections[websocket] = partner_index
            self._recalculate_online()
            await self.broadcast_presence()

    async def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            del self.active_connections[websocket]
            self._recalculate_online()
            logger.info(f"WebSocket client disconnected. Online partners: {self.online_partner_indices}")
            await self.broadcast_presence()

    def _recalculate_online(self):
        self.online_partner_indices = set(self.active_connections.values())

    async def broadcast_presence(self):
        await self.broadcast({
            "type": "PRESENCE_UPDATED",
            "online_partners": list(self.online_partner_indices)
        })

    async def broadcast(self, message: Dict[str, Any]):
        for connection in list(self.active_connections.keys()):
            try:
                await connection.send_text(json.dumps(message, default=str))
            except Exception as e:
                logger.warning(f"Error broadcasting to client: {e}")
                if connection in self.active_connections:
                    del self.active_connections[connection]
                    self._recalculate_online()


manager = ConnectionManager()


@router.get("", response_model=CoupleResponse, summary="Get active couple space")
async def get_couple(db: AsyncSession = Depends(get_db)):
    """Fetches the couple space, partners, live distance, and daily questions."""
    couple = await get_or_create_default_couple(db)
    return build_couple_response(couple, manager.online_partner_indices)


@router.put("/profile", response_model=CoupleResponse, summary="Update partner profile")
async def update_partner_profile(payload: PartnerUpdate, db: AsyncSession = Depends(get_db)):
    """Updates name, city, timezone, status, or avatar (base64/URL) for either partner."""
    couple = await get_or_create_default_couple(db)
    partners = sorted(couple.partners, key=lambda p: p.id)

    if payload.partner_index >= len(partners):
        if payload.partner_index == 1 and len(partners) < 2:
            lat, lon, tz = lookup_city_info(payload.city or "Bengaluru, India")
            partner = Partner(
                couple_id=couple.id,
                name=payload.name.strip() if payload.name else "Prago",
                city=payload.city.strip() if payload.city else "Bengaluru, India",
                gender=payload.gender.strip() if payload.gender else "Male",
                age=payload.age or 26,
                dob=payload.dob.strip() if payload.dob else "2000-01-04",
                timezone=payload.timezone or tz,
                latitude=lat,
                longitude=lon,
                status_message=payload.status_message.strip() if payload.status_message else "Listening to our playlist",
                status_emoji=payload.status_emoji.strip() if payload.status_emoji else "🎧",
                avatar_url=payload.avatar_url.strip() if payload.avatar_url else "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
                is_online=True
            )
            db.add(partner)
            await db.commit()
            await db.refresh(partner)
        else:
            raise HTTPException(status_code=400, detail="Invalid partner index")
    else:
        partner = partners[payload.partner_index]

    if payload.name is not None:
        partner.name = payload.name.strip()
    if payload.gender is not None:
        partner.gender = payload.gender.strip()
    if payload.age is not None:
        partner.age = payload.age
    if payload.dob is not None:
        partner.dob = payload.dob.strip()
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
        partner.avatar_url = payload.avatar_url.strip()

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
    response_data = build_couple_response(updated_couple, manager.online_partner_indices)

    # Broadcast update to all connected screens in real-time
    await manager.broadcast({
        "type": "COUPLE_UPDATED",
        "data": response_data.model_dump(mode="json")
    })

    return response_data


@router.post("/onboarding", response_model=Dict[str, Any], summary="Register partner profile & pair space")
async def onboard_partner(payload: CoupleOnboardingRequest, db: AsyncSession = Depends(get_db)):
    """
    Onboards a user with Name, Gender, Age, DOB, City, Avatar.
    - If pairing_code is provided, joins the existing couple space as Partner 2.
    - If pairing_code is NOT provided, sets up Partner 1 and provides pairing code to share.
    """
    lat, lon, tz = lookup_city_info(payload.city)
    avatar = payload.avatar_url.strip() if payload.avatar_url else "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"

    if payload.pairing_code and payload.pairing_code.strip():
        code = payload.pairing_code.strip()
        stmt = (
            select(Couple)
            .options(selectinload(Couple.partners), selectinload(Couple.daily_prompts))
            .where(func.lower(Couple.pairing_code) == code.lower())
        )
        res = await db.execute(stmt)
        couple = res.scalars().first()
        if not couple:
            raise HTTPException(status_code=404, detail=f"No couple space found with code '{code}'. Please check with your partner!")

        partners = sorted(couple.partners, key=lambda p: p.id)
        if len(partners) < 2:
            p2 = Partner(
                couple_id=couple.id,
                name=payload.name.strip(),
                city=payload.city.strip(),
                gender=payload.gender.strip() if payload.gender else None,
                age=payload.age,
                dob=payload.dob.strip() if payload.dob else None,
                timezone=tz,
                latitude=lat,
                longitude=lon,
                status_message="Connected with partner ❤️",
                status_emoji="✨",
                avatar_url=avatar,
                is_online=True
            )
            db.add(p2)
            partner_index = 1
        else:
            p2 = partners[1]
            p2.name = payload.name.strip()
            p2.city = payload.city.strip()
            if payload.gender: p2.gender = payload.gender.strip()
            if payload.age: p2.age = payload.age
            if payload.dob: p2.dob = payload.dob.strip()
            p2.latitude = lat
            p2.longitude = lon
            p2.timezone = tz
            if payload.avatar_url: p2.avatar_url = avatar
            partner_index = 1

        couple.last_interaction_at = datetime.now(timezone.utc)
        await db.commit()
    else:
        couple = await get_or_create_default_couple(db)
        partners = sorted(couple.partners, key=lambda p: p.id)
        
        target_idx = payload.partner_index if (payload.partner_index is not None and payload.partner_index < len(partners)) else 0
        if target_idx < len(partners):
            p = partners[target_idx]
            p.name = payload.name.strip()
            p.city = payload.city.strip()
            if payload.gender: p.gender = payload.gender.strip()
            if payload.age: p.age = payload.age
            if payload.dob: p.dob = payload.dob.strip()
            p.latitude = lat
            p.longitude = lon
            p.timezone = tz
            if payload.avatar_url: p.avatar_url = avatar
            partner_index = target_idx
        else:
            # Add as partner 2 if index 1 requested
            p2 = Partner(
                couple_id=couple.id,
                name=payload.name.strip(),
                city=payload.city.strip(),
                gender=payload.gender.strip() if payload.gender else None,
                age=payload.age,
                dob=payload.dob.strip() if payload.dob else None,
                timezone=tz,
                latitude=lat,
                longitude=lon,
                status_message="Connected with partner ❤️",
                status_emoji="✨",
                avatar_url=avatar,
                is_online=True
            )
            db.add(p2)
            partner_index = len(partners)

        couple.last_interaction_at = datetime.now(timezone.utc)
        await db.commit()

    # Reload couple with relationships
    stmt = (
        select(Couple)
        .options(selectinload(Couple.partners), selectinload(Couple.daily_prompts))
        .where(Couple.id == couple.id)
    )
    res = await db.execute(stmt)
    updated_couple = res.scalars().first()
    response_data = build_couple_response(updated_couple, manager.online_partner_indices)

    # Real-time WebSocket broadcast so the other partner sees the update instantly
    await manager.broadcast({
        "type": "COUPLE_UPDATED",
        "data": response_data.model_dump(mode="json")
    })

    return {
        "couple": response_data.model_dump(mode="json"),
        "partner_index": partner_index,
        "pairing_code": couple.pairing_code,
        "partner_name": payload.name.strip()
    }


@router.post("/avatar", response_model=CoupleResponse, summary="Upload partner avatar image")
async def upload_partner_avatar(payload: AvatarUploadRequest, db: AsyncSession = Depends(get_db)):
    """Uploads avatar image (base64 data URI) directly into database."""
    couple = await get_or_create_default_couple(db)
    partners = sorted(couple.partners, key=lambda p: p.id)

    if payload.partner_index >= len(partners):
        if payload.partner_index == 1 and len(partners) < 2:
            lat, lon, tz = lookup_city_info("Bengaluru, India")
            partner = Partner(
                couple_id=couple.id,
                name="Prago",
                city="Bengaluru, India",
                gender="Male",
                age=26,
                dob="2000-01-04",
                timezone=tz,
                latitude=lat,
                longitude=lon,
                status_message="Listening to our playlist",
                status_emoji="🎧",
                avatar_url=payload.image_data.strip(),
                is_online=True
            )
            db.add(partner)
            await db.commit()
            await db.refresh(partner)
        else:
            raise HTTPException(status_code=400, detail="Invalid partner index")
    else:
        partner = partners[payload.partner_index]
        partner.avatar_url = payload.image_data.strip()
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
    response_data = build_couple_response(updated_couple, manager.online_partner_indices)

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
    response_data = build_couple_response(updated_couple, manager.online_partner_indices)

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
    response_data = build_couple_response(updated_couple, manager.online_partner_indices)

    await manager.broadcast({
        "type": "DAILY_QUESTION_ANSWERED",
        "data": response_data.model_dump(mode="json")
    })

    return response_data


@router.websocket("/ws")
async def couple_websocket(websocket: WebSocket, partner_index: int = 0):
    """Realtime WebSocket endpoint for instant bidirectional couple updates."""
    await manager.connect(websocket, partner_index)
    try:
        while True:
            # Keep connection alive & handle incoming pings or identity switches
            data = await websocket.receive_text()
            try:
                parsed = json.loads(data)
                if parsed.get("type") == "PING":
                    await websocket.send_text(json.dumps({"type": "PONG"}))
                elif parsed.get("type") == "REGISTER_PARTNER":
                    p_idx = parsed.get("partner_index", partner_index)
                    await manager.update_partner(websocket, p_idx)
            except Exception:
                pass
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception as exc:
        logger.warning(f"WebSocket connection closed with error: {exc}")
        await manager.disconnect(websocket)
