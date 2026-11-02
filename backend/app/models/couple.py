from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import String, Integer, Float, DateTime, Boolean, ForeignKey, Text, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class Couple(Base, TimestampMixin):
    """Represents a paired couple space."""
    __tablename__ = "couples"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    pairing_code: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    
    # Milestone & Streak
    streak_days: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    last_interaction_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    last_heartbeat_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    last_heartbeat_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Next Reunion Goals
    reunion_title: Mapped[str] = mapped_column(String(200), default="Countdown until we hug in person", nullable=False)
    reunion_city: Mapped[str] = mapped_column(String(100), default="Paris, France", nullable=False)
    reunion_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    reunion_progress: Mapped[int] = mapped_column(Integer, default=80, nullable=False)

    # Relationships
    partners: Mapped[List["Partner"]] = relationship("Partner", back_populates="couple", cascade="all, delete-orphan")
    daily_prompts: Mapped[List["DailyPrompt"]] = relationship("DailyPrompt", back_populates="couple", cascade="all, delete-orphan")
    chat_messages: Mapped[List["ChatMessage"]] = relationship("ChatMessage", back_populates="couple", cascade="all, delete-orphan", order_by="ChatMessage.id")


class Partner(Base, TimestampMixin):
    """Represents an individual partner in a couple."""
    __tablename__ = "partners"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    couple_id: Mapped[int] = mapped_column(ForeignKey("couples.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Profile Info
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    gender: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    age: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    dob: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    timezone: Mapped[str] = mapped_column(String(100), default="UTC", nullable=False)
    latitude: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    
    # Real-Time Status & Mood
    status_message: Mapped[str] = mapped_column(String(255), default="Online", nullable=False)
    status_emoji: Mapped[str] = mapped_column(String(16), default="✨", nullable=False)
    avatar_url: Mapped[str] = mapped_column(Text, nullable=False)
    is_online: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    couple: Mapped["Couple"] = relationship("Couple", back_populates="partners")


class DailyPrompt(Base, TimestampMixin):
    """Daily question and locked/revealed answers for a couple."""
    __tablename__ = "daily_prompts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    couple_id: Mapped[int] = mapped_column(ForeignKey("couples.id", ondelete="CASCADE"), nullable=False, index=True)
    
    question: Mapped[str] = mapped_column(String(500), nullable=False)
    user1_answer: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    user2_answer: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    user1_answered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    user2_answered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_revealed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    couple: Mapped["Couple"] = relationship("Couple", back_populates="daily_prompts")
 
 
class ChatMessage(Base, TimestampMixin):
    """Private message, photo, or call log between couple partners."""
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    couple_id: Mapped[int] = mapped_column(ForeignKey("couples.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_index: Mapped[int] = mapped_column(Integer, nullable=False)  # 0 for Aishu, 1 for Prago
    sender_name: Mapped[str] = mapped_column(String(100), nullable=False)
    message_type: Mapped[str] = mapped_column(String(20), default="text", nullable=False)  # "text", "image", "call_log"
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Reply & Quote support
    reply_to_id: Mapped[Optional[int]] = mapped_column(ForeignKey("chat_messages.id", ondelete="SET NULL"), nullable=True)
    reply_to_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reply_to_sender: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Emoji reactions mapping: e.g. {"0": "❤️", "1": "🔥"}
    reactions: Mapped[Optional[dict]] = mapped_column(JSON, default=dict, nullable=True)

    # Soft Delete & Unsend
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    couple: Mapped["Couple"] = relationship("Couple", back_populates="chat_messages")
