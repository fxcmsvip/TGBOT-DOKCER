"""Bot source code model for storing generated Python code."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.models.base import Base


class BotSourceCode(Base):
    """Stores generated Python source code for a bot."""

    __tablename__ = "bot_source_codes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    bot_id = Column(Integer, ForeignKey("bots.id", ondelete="CASCADE"), unique=True, nullable=False)
    source_code = Column(Text, nullable=False, default="")
    generated_at = Column(DateTime, default=datetime.utcnow)
    is_custom = Column(Boolean, default=False, comment="True if user has edited the source")
    last_modified = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    bot = relationship("Bot", backref="source_code")

    def __repr__(self):
        return f"<BotSourceCode bot_id={self.bot_id} is_custom={self.is_custom}>"
