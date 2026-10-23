from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import String, Integer, Float, DateTime, Boolean, ForeignKey, Text, func
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


class Partner(Base, TimestampMixin):
    """Represents an individual partner in a couple."""
    __tablename__ = "partners"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    couple_id: Mapped[int] = mapped_column(ForeignKey("couples.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Profile Info
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
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
