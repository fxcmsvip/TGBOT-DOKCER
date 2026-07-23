"""Agent model for AI-powered customer service."""
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Agent(Base, TimestampMixin):
    """
    AI Agent model - represents an intelligent assistant with specific role and capabilities.
    
    Agents can be bound to specific bots or shared across multiple bots.
    Each agent has its own system prompt, permissions, and tool access.
    """
    __tablename__ = "agents"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="Agent display name")
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="Agent description")
    
    # Core AI configuration
    ai_config_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("ai_configs.id"), nullable=True,
        comment="AI provider configuration to use"
    )
    system_prompt: Mapped[str] = mapped_column(
        Text, nullable=False, default="",
        comment="System prompt defining agent's personality and behavior"
    )
    
    # Bot binding (nullable for shared/global agents)
    bot_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("bots.id"), nullable=True,
        comment="Bot this agent is bound to (null = shared agent)"
    )
    
    # Permissions and capabilities
    permissions: Mapped[dict] = mapped_column(
        JSONB, nullable=False, server_default="{}",
        comment="""Permission settings:
        {
            "can_access_faq": true,
            "can_access_rag": true,
            "can_create_tickets": false,
            "can_transfer_to_human": true,
            "allowed_groups": ["group_id_1", "group_id_2"],
            "restricted_commands": ["admin_only_cmd"]
        }"""
    )
    
    # Tools available to this agent
    tools: Mapped[dict] = mapped_column(
        JSONB, nullable=False, server_default="{}",
        comment="""Tool configuration:
        {
            "enabled_tools": ["faq_search", "rag_query", "web_search"],
            "tool_configs": {
                "web_search": {"max_results": 5},
                "rag_query": {"top_k": 3}
            }
        }"""
    )
    
    # Response settings
    response_settings: Mapped[dict] = mapped_column(
        JSONB, nullable=False, server_default="{}",
        comment="""Response behavior settings:
        {
            "temperature": 0.7,
            "max_tokens": 2000,
            "response_language": "auto",
            "personality_traits": ["friendly", "professional"],
            "greeting_message": "Hello! How can I help you today?",
            "fallback_message": "I'm sorry, I don't understand. Could you rephrase?"
        }"""
    )
    
    # Knowledge base bindings
    knowledge_base: Mapped[dict] = mapped_column(
        JSONB, nullable=False, server_default="{}",
        comment="""Knowledge base configuration:
        {
            "faq_categories": [1, 2, 3],
            "rag_collections": ["product_docs", "faq_docs"],
            "external_sources": []
        }"""
    )
    
    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true", comment="Whether agent is active")
    is_default: Mapped[bool] = mapped_column(
        Boolean, server_default="false",
        comment="Whether this is the default agent for unmatched queries"
    )
    
    # Metadata for extensibility
    metadata_: Mapped[dict] = mapped_column(
        "metadata", JSONB, nullable=False, server_default="{}",
        comment="Additional metadata for future extensions"
    )
    
    # Relationships
    ai_config = relationship("AiConfig", foreign_keys=[ai_config_id])
    bot = relationship("Bot", foreign_keys=[bot_id])
    
    # Scheduling
    schedule: Mapped[dict] = mapped_column(
        JSONB, nullable=False, server_default="{}",
        comment="""Schedule configuration:
        {
            "enabled": false,
            "cron_expression": "0 9 * * 1-5",
            "timezone": "UTC",
            "active_hours": {"start": "09:00", "end": "18:00"},
            "active_days": [1, 2, 3, 4, 5]
        }"""
    )


class AgentConversation(Base):
    """Track agent conversations for analytics and context."""
    __tablename__ = "agent_conversations"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    agent_id: Mapped[int] = mapped_column(Integer, ForeignKey("agents.id"), nullable=False)
    tg_user_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    chat_id: Mapped[int] = mapped_column(Integer, nullable=False)
    
    # Conversation context
    context: Mapped[dict] = mapped_column(
        JSONB, nullable=False, server_default="{}",
        comment="Conversation context and history summary"
    )
    
    # Status
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="active",
        comment="active, closed, transferred"
    )
    
    # Timestamps
    started_at: Mapped[datetime] = mapped_column(server_default="now()")
    last_activity_at: Mapped[datetime] = mapped_column(server_default="now()")
    closed_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    
    # Relationships
    agent = relationship("Agent")


class AgentMessage(Base):
    """Store agent messages for context and analytics."""
    __tablename__ = "agent_messages"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    conversation_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("agent_conversations.id"), nullable=False
    )
    
    # Message content
    role: Mapped[str] = mapped_column(String(20), nullable=False, comment="user, assistant, system, tool")
    content: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Tool usage
    tool_calls: Mapped[Optional[dict]] = mapped_column(
        JSONB, nullable=True,
        comment="Tool calls made by the agent"
    )
    tool_results: Mapped[Optional[dict]] = mapped_column(
        JSONB, nullable=True,
        comment="Results from tool calls"
    )
    
    # Token usage
    tokens_used: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    # Timestamp
    created_at: Mapped[datetime] = mapped_column(server_default="now()")
    
    # Relationships
    conversation = relationship("AgentConversation")
