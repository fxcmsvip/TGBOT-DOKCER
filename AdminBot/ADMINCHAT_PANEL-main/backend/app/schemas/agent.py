"""Pydantic schemas for Agent API."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class AgentPermissions(BaseModel):
    """Agent permission settings."""
    can_access_faq: bool = True
    can_access_rag: bool = True
    can_create_tickets: bool = False
    can_transfer_to_human: bool = True
    allowed_groups: list[str] = Field(default_factory=list)
    restricted_commands: list[str] = Field(default_factory=list)


class AgentTools(BaseModel):
    """Agent tool configuration."""
    enabled_tools: list[str] = Field(default_factory=list)
    tool_configs: dict = Field(default_factory=dict)


class AgentResponseSettings(BaseModel):
    """Agent response behavior settings."""
    temperature: float = 0.7
    max_tokens: int = 2000
    response_language: str = "auto"
    personality_traits: list[str] = Field(default_factory=list)
    greeting_message: str = ""
    fallback_message: str = "I'm sorry, I don't understand. Could you rephrase?"


class AgentKnowledgeBase(BaseModel):
    """Agent knowledge base configuration."""
    faq_categories: list[int] = Field(default_factory=list)
    rag_collections: list[str] = Field(default_factory=list)
    external_sources: list[str] = Field(default_factory=list)


class AgentSchedule(BaseModel):
    """Agent schedule configuration."""
    enabled: bool = False
    cron_expression: Optional[str] = None
    timezone: str = "UTC"
    active_hours: Optional[dict] = None
    active_days: list[int] = Field(default_factory=list)


class AgentBase(BaseModel):
    """Base agent schema."""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    ai_config_id: Optional[int] = None
    system_prompt: str = ""
    bot_id: Optional[int] = None
    permissions: AgentPermissions = Field(default_factory=AgentPermissions)
    tools: AgentTools = Field(default_factory=AgentTools)
    response_settings: AgentResponseSettings = Field(default_factory=AgentResponseSettings)
    knowledge_base: AgentKnowledgeBase = Field(default_factory=AgentKnowledgeBase)
    is_active: bool = True
    is_default: bool = False
    schedule: AgentSchedule = Field(default_factory=AgentSchedule)


class AgentCreate(AgentBase):
    """Schema for creating an agent."""
    pass


class AgentUpdate(BaseModel):
    """Schema for updating an agent."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    ai_config_id: Optional[int] = None
    system_prompt: Optional[str] = None
    bot_id: Optional[int] = None
    permissions: Optional[AgentPermissions] = None
    tools: Optional[AgentTools] = None
    response_settings: Optional[AgentResponseSettings] = None
    knowledge_base: Optional[AgentKnowledgeBase] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None
    schedule: Optional[AgentSchedule] = None


class AgentResponse(BaseModel):
    """Schema for agent response."""
    id: int
    name: str
    description: Optional[str]
    ai_config_id: Optional[int]
    ai_config_name: Optional[str] = None
    system_prompt: str
    bot_id: Optional[int]
    bot_name: Optional[str] = None
    permissions: dict
    tools: dict
    response_settings: dict
    knowledge_base: dict
    is_active: bool
    is_default: bool
    schedule: dict
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AgentListResponse(BaseModel):
    """Schema for agent list response."""
    agents: list[AgentResponse]
    total: int


class AgentTestRequest(BaseModel):
    """Schema for testing an agent."""
    message: str
    conversation_id: Optional[int] = None


class AgentTestResponse(BaseModel):
    """Schema for agent test response."""
    response: str
    tokens_used: Optional[int] = None
    tool_calls: Optional[list] = None
    latency_ms: int


# Scheduled Task schemas

class ScheduledTaskBase(BaseModel):
    """Base scheduled task schema."""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    agent_id: Optional[int] = None
    bot_id: Optional[int] = None
    schedule_type: str = "cron"
    cron_expression: Optional[str] = None
    interval_seconds: Optional[int] = None
    run_at: Optional[datetime] = None
    timezone: str = "UTC"
    task_type: str
    task_config: dict = Field(default_factory=dict)
    is_active: bool = True


class ScheduledTaskCreate(ScheduledTaskBase):
    """Schema for creating a scheduled task."""
    pass


class ScheduledTaskUpdate(BaseModel):
    """Schema for updating a scheduled task."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    agent_id: Optional[int] = None
    bot_id: Optional[int] = None
    schedule_type: Optional[str] = None
    cron_expression: Optional[str] = None
    interval_seconds: Optional[int] = None
    run_at: Optional[datetime] = None
    timezone: Optional[str] = None
    task_type: Optional[str] = None
    task_config: Optional[dict] = None
    is_active: Optional[bool] = None


class ScheduledTaskResponse(BaseModel):
    """Schema for scheduled task response."""
    id: int
    name: str
    description: Optional[str]
    agent_id: Optional[int]
    agent_name: Optional[str] = None
    bot_id: Optional[int]
    bot_name: Optional[str] = None
    schedule_type: str
    cron_expression: Optional[str]
    interval_seconds: Optional[int]
    run_at: Optional[datetime]
    timezone: str
    task_type: str
    task_config: dict
    is_active: bool
    last_run_at: Optional[datetime]
    last_run_status: Optional[str]
    next_run_at: Optional[datetime]
    error_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ScheduledTaskListResponse(BaseModel):
    """Schema for scheduled task list response."""
    tasks: list[ScheduledTaskResponse]
    total: int
