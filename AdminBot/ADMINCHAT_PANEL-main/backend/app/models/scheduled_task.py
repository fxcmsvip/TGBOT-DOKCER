"""Scheduled task model for automated agent actions."""
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class ScheduledTask(Base, TimestampMixin):
    """
    Scheduled task model for automated agent actions.
    
    Supports cron-based scheduling for:
    - Sending scheduled messages
    - Running periodic reports
    - Data cleanup tasks
    - Custom agent actions
    """
    __tablename__ = "scheduled_tasks"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="Task name")
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="Task description")
    
    # Agent binding
    agent_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("agents.id"), nullable=True,
        comment="Agent to execute this task (null for system tasks)"
    )
    
    # Bot binding (which bot to send messages through)
    bot_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("bots.id"), nullable=True,
        comment="Bot to use for message sending"
    )
    
    # Schedule configuration
    schedule_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default="cron",
        comment="cron, interval, or once"
    )
    cron_expression: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True,
        comment="Cron expression (e.g., '0 9 * * 1-5' for weekdays at 9am)"
    )
    interval_seconds: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True,
        comment="Interval in seconds for interval-based tasks"
    )
    run_at: Mapped[Optional[datetime]] = mapped_column(
        nullable=True,
        comment="Specific time for one-time tasks"
    )
    timezone: Mapped[str] = mapped_column(
        String(50), nullable=False, default="UTC",
        comment="Timezone for schedule evaluation"
    )
    
    # Task configuration
    task_type: Mapped[str] = mapped_column(
        String(50), nullable=False,
        comment="send_message, run_report, cleanup, custom_action"
    )
    task_config: Mapped[dict] = mapped_column(
        JSONB, nullable=False, server_default="{}",
        comment="""Task-specific configuration:
        For send_message:
        {
            "target_chats": [123456, 789012],
            "target_groups": ["group_id_1"],
            "message_template": "Daily report: {report_data}",
            "parse_mode": "HTML"
        }
        
        For run_report:
        {
            "report_type": "daily_stats",
            "recipients": ["admin_id"],
            "format": "markdown"
        }
        
        For custom_action:
        {
            "handler": "module.function",
            "args": {},
            "kwargs": {}
        }"""
    )
    
    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true", comment="Whether task is active")
    last_run_at: Mapped[Optional[datetime]] = mapped_column(nullable=True, comment="Last execution time")
    last_run_status: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True,
        comment="success, failed, skipped"
    )
    last_run_result: Mapped[Optional[dict]] = mapped_column(
        JSONB, nullable=True,
        comment="Result data from last execution"
    )
    next_run_at: Mapped[Optional[datetime]] = mapped_column(nullable=True, comment="Next scheduled run time")
    
    # Error tracking
    error_count: Mapped[int] = mapped_column(Integer, server_default="0", comment="Consecutive error count")
    last_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="Last error message")
    
    # Relationships
    agent = relationship("Agent", foreign_keys=[agent_id])
    bot = relationship("Bot", foreign_keys=[bot_id])


class TaskExecutionLog(Base):
    """Log of task executions for auditing."""
    __tablename__ = "task_execution_logs"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    task_id: Mapped[int] = mapped_column(Integer, ForeignKey("scheduled_tasks.id"), nullable=False)
    
    # Execution details
    status: Mapped[str] = mapped_column(String(20), nullable=False, comment="success, failed, skipped")
    started_at: Mapped[datetime] = mapped_column(server_default="now()")
    completed_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    duration_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    # Result
    result: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Relationships
    task = relationship("ScheduledTask")
