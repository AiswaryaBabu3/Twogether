import math
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple, Set
from zoneinfo import ZoneInfo
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.couple import Couple, Partner, DailyPrompt
from app.schemas.couple import (
    CoupleResponse,
    PartnerResponse,
    DailyPromptResponse,
    PartnerUpdate,
    ReunionUpdate
)

# Reference coordinates for cities
CITY_COORDINATES = {
    "new york, usa": (40.7128, -74.0060, "America/New_York"),
    "london, uk": (51.5074, -0.1278, "Europe/London"),
    "paris, france": (48.8566, 2.3522, "Europe/Paris"),
    "tokyo, japan": (35.6762, 139.6503, "Asia/Tokyo"),
    "mumbai, india": (19.0760, 72.8777, "Asia/Kolkata"),
    "bengaluru, india": (12.9716, 77.5946, "Asia/Kolkata"),
    "coimbatore, india": (11.0168, 76.9558, "Asia/Kolkata"),
    "coimbatore": (11.0168, 76.9558, "Asia/Kolkata"),
    "chennai, india": (13.0827, 80.2707, "Asia/Kolkata"),
    "hyderabad, india": (17.3850, 78.4867, "Asia/Kolkata"),
    "delhi, india": (28.6139, 77.2090, "Asia/Kolkata"),
    "san francisco, usa": (37.7749, -122.4194, "America/Los_Angeles"),
    "los angeles, usa": (34.0522, -118.2437, "America/Los_Angeles"),
    "sydney, australia": (-33.8688, 151.2093, "Australia/Sydney"),
    "singapore": (1.3521, 103.8198, "Asia/Singapore"),
    "toronto, canada": (43.6532, -79.3832, "America/Toronto"),
    "berlin, germany": (52.5200, 13.4050, "Europe/Berlin"),
    "dubai, uae": (25.2048, 55.2708, "Asia/Dubai"),
}


def lookup_city_info(city_str: str) -> Tuple[float, float, str]:
    """Returns (lat, lon, timezone) for city, with sensible fallbacks."""
    normalized = city_str.strip().lower()
    for key, (lat, lon, tz) in CITY_COORDINATES.items():
        if key in normalized or normalized in key:
            return lat, lon, tz
    # Fallback to (0,0) and UTC if unknown
    return 0.0, 0.0, "UTC"


def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> int:
    """Calculates geodesic distance in kilometers between two lat/lon coordinates."""
    if (lat1 == 0.0 and lon1 == 0.0) or (lat2 == 0.0 and lon2 == 0.0):
        return 5567  # Default if unset

    R = 6371.0  # Earth's radius in km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return int(round(R * c))


def calculate_timezone_diff(tz1_name: str, tz2_name: str, name1: str, name2: str) -> str:
    """Computes readable time difference string between two timezones."""
    try:
        now = datetime.now(timezone.utc)
        offset1 = ZoneInfo(tz1_name).utcoffset(now)
        offset2 = ZoneInfo(tz2_name).utcoffset(now)
        if offset1 is not None and offset2 is not None:
            diff_hours = (offset2 - offset1).total_seconds() / 3600.0
            if diff_hours == 0:
                return "Same time zone"
            elif diff_hours > 0:
                return f"{name2} is {int(diff_hours) if diff_hours.is_integer() else diff_hours:g} hrs ahead"
            else:
                abs_diff = abs(diff_hours)
                return f"{name2} is {int(abs_diff) if abs_diff.is_integer() else abs_diff:g} hrs behind"
    except Exception:
        pass
    return f"{name2} is in a different time zone"


async def get_or_create_default_couple(db: AsyncSession) -> Couple:
    """Retrieves existing couple or seeds initial default couple."""
    stmt = (
        select(Couple)
        .options(selectinload(Couple.partners), selectinload(Couple.daily_prompts))
        .order_by(Couple.id)
    )
    result = await db.execute(stmt)
    couple = result.scalars().first()

    if couple is None:
        # Seed default couple (Alex & Maya)
        reunion_target = datetime.now(timezone.utc) + timedelta(days=14, hours=6)
        couple = Couple(
            pairing_code="TWO-7749",
            streak_days=48,
            reunion_title="Countdown until we hug in person",
            reunion_city="Paris, France",
            reunion_date=reunion_target,
            reunion_progress=82,
            last_heartbeat_at=datetime.now(timezone.utc),
            last_heartbeat_by="Maya"
        )
        db.add(couple)
        await db.flush()

        # Only seed Partner 1 if couple table is empty
        alex_lat, alex_lon, alex_tz = lookup_city_info("Coimbatore, India")
        p1 = Partner(
            couple_id=couple.id,
            name="Aishu",
            city="Coimbatore, India",
            gender="Female",
            age=23,
            dob="2002-12-02",
            timezone=alex_tz,
            latitude=alex_lat,
            longitude=alex_lon,
            status_message="Coding Twogether App",
            status_emoji="💻",
            avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
            is_online=True
        )
        db.add(p1)

        # Default Daily Prompt
        prompt = DailyPrompt(
            couple_id=couple.id,
            question="If we could magically teleport together to any spot in the world for just 3 hours tonight, where would we go and what would we eat?",
            user1_answer=None,
            user2_answer=None,
            is_revealed=False
        )
        db.add(prompt)
        await db.commit()

        # Reload with relationships
        result = await db.execute(stmt)
        couple = result.scalars().first()

    # Ensure couple space always has Partner 2 seeded if missing
    if couple is not None and len(couple.partners) < 2:
        p2_lat, p2_lon, p2_tz = lookup_city_info("Bengaluru, India")
        p2 = Partner(
            couple_id=couple.id,
            name="Prago",
            city="Bengaluru, India",
            gender="Male",
            age=26,
            dob="2000-01-04",
            timezone=p2_tz,
            latitude=p2_lat,
            longitude=p2_lon,
            status_message="Listening to our playlist",
            status_emoji="🎧",
            avatar_url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
            is_online=False
        )
        db.add(p2)
        await db.commit()
        result = await db.execute(stmt)
        couple = result.scalars().first()

    return couple


def build_couple_response(couple: Couple, online_partners: Optional[Set[int]] = None) -> CoupleResponse:
    """Maps Couple entity to clean API response model with live presence."""
    partners = sorted(couple.partners, key=lambda p: p.id)
    p1 = partners[0] if len(partners) > 0 else None
    p2 = partners[1] if len(partners) > 1 else None

    # Calculate distance
    if p1 and p2:
        dist = calculate_haversine_distance(p1.latitude, p1.longitude, p2.latitude, p2.longitude)
        tz_diff = calculate_timezone_diff(p1.timezone, p2.timezone, p1.name, p2.name)
    else:
        dist = 0
        tz_diff = "Waiting for partner to connect"

    # Daily Prompt mapping
    latest_prompt = None
    if couple.daily_prompts:
        p = sorted(couple.daily_prompts, key=lambda x: x.id, reverse=True)[0]
        latest_prompt = DailyPromptResponse(
            id=p.id,
            question=p.question,
            user1_answered=bool(p.user1_answer),
            user2_answered=bool(p.user2_answer),
            user1_answer=p.user1_answer,
            user2_answer=p.user2_answer,
            is_revealed=p.is_revealed
        )

    partner_responses = []
    for idx, p in enumerate(partners):
        resp = PartnerResponse.model_validate(p)
        if online_partners is not None:
            resp.is_online = (idx in online_partners)
        else:
            resp.is_online = (idx == 0)
        partner_responses.append(resp)

    return CoupleResponse(
        id=couple.id,
        pairing_code=couple.pairing_code,
        streak_days=couple.streak_days,
        distance_km=dist,
        timezone_diff_text=tz_diff,
        last_heartbeat_at=couple.last_heartbeat_at,
        last_heartbeat_by=couple.last_heartbeat_by,
        reunion_title=couple.reunion_title,
        reunion_city=couple.reunion_city,
        reunion_date=couple.reunion_date,
        reunion_progress=couple.reunion_progress,
        partners=partner_responses,
        daily_prompt=latest_prompt
    )
