from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class PartnerBase(BaseModel):
    name: str
    city: str
    gender: Optional[str] = None
    age: Optional[int] = None
    dob: Optional[str] = None
    timezone: str
    status_message: str
    status_emoji: str
    avatar_url: str
    is_online: bool = True


class PartnerUpdate(BaseModel):
    partner_index: int = Field(0, description="0 for user 1, 1 for user 2")
    name: Optional[str] = None
    city: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    dob: Optional[str] = None
    timezone: Optional[str] = None
    status_message: Optional[str] = None
    status_emoji: Optional[str] = None
    avatar_url: Optional[str] = None


class CoupleOnboardingRequest(BaseModel):
    name: str
    gender: Optional[str] = None
    age: Optional[int] = None
    dob: Optional[str] = None
    city: str
    avatar_url: Optional[str] = None
    pairing_code: Optional[str] = Field(None, description="Invite code to connect to existing partner space")
    partner_index: Optional[int] = Field(None, description="0 for user 1, 1 for user 2")


class AvatarUploadRequest(BaseModel):
    partner_index: int = Field(0, description="0 for user 1, 1 for user 2")
    image_data: str = Field(..., description="Base64 encoded image or image Data URI")


class PartnerResponse(PartnerBase):
    id: int
    couple_id: int
    latitude: float
    longitude: float

    class Config:
        from_attributes = True


class ReunionUpdate(BaseModel):
    reunion_title: Optional[str] = None
    reunion_city: Optional[str] = None
    reunion_date: Optional[datetime] = None
    reunion_progress: Optional[int] = Field(None, ge=0, le=100)


class HeartbeatRequest(BaseModel):
    sender_name: str = "You"


class DailyAnswerRequest(BaseModel):
    partner_index: int = Field(0, description="0 for user 1, 1 for user 2")
    answer: str


class DailyPromptResponse(BaseModel):
    id: int
    question: str
    user1_answered: bool
    user2_answered: bool
    user1_answer: Optional[str] = None
    user2_answer: Optional[str] = None
    is_revealed: bool


class CoupleResponse(BaseModel):
    id: int
    pairing_code: str
    streak_days: int
    distance_km: int
    timezone_diff_text: str
    last_heartbeat_at: Optional[datetime] = None
    last_heartbeat_by: Optional[str] = None
    reunion_title: str
    reunion_city: str
    reunion_date: datetime
    reunion_progress: int
    partners: List[PartnerResponse]
    daily_prompt: Optional[DailyPromptResponse] = None
