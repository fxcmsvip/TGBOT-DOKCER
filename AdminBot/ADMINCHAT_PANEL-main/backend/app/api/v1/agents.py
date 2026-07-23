"""
Agent API endpoints.

GET    /agents           - list all agents
POST   /agents           - create agent
GET    /agents/:id       - get agent details
PATCH  /agents/:id       - update agent
DELETE /agents/:id       - delete agent
POST   /agents/:id/test  - test agent with a message
GET    /agents/:id/conversations - get agent conversations
POST   /agents/:id/chat  - chat with agent (for web widget)
"""
from __future__ import annotations

import logging
import time
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_admin
from app.faq.ai_handler import ai_handler
from app.models.admin import Admin
from app.models.agent import Agent, AgentConversation, AgentMessage
from app.models.ai_config import AiConfig
from app.models.bot import Bot
from app.schemas.agent import (
    AgentCreate,
    AgentListResponse,
    AgentResponse,
    AgentTestRequest,
    AgentTestResponse,
    AgentUpdate,
)
from app.schemas.common import APIResponse

logger = logging.getLogger(__name__)

router = APIRouter()


def _agent_to_response(agent: Agent, ai_config: AiConfig = None, bot: Bot = None) -> AgentResponse:
    """Convert Agent model to response schema."""
    return AgentResponse(
        id=agent.id,
        name=agent.name,
        description=agent.description,
        ai_config_id=agent.ai_config_id,
        ai_config_name=ai_config.name if ai_config else None,
        system_prompt=agent.system_prompt,
        bot_id=agent.bot_id,
        bot_name=bot.bot_username if bot else None,
        permissions=agent.permissions or {},
        tools=agent.tools or {},
        response_settings=agent.response_settings or {},
        knowledge_base=agent.knowledge_base or {},
        is_active=agent.is_active,
        is_default=agent.is_default,
        schedule=agent.schedule or {},
        created_at=agent.created_at,
        updated_at=agent.updated_at,
    )


@router.get("", response_model=APIResponse)
async def list_agents(
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_user: Annotated[Admin, Depends(require_admin)],
    bot_id: int = None,
) -> APIResponse:
    """List all agents, optionally filtered by bot_id."""
    query = select(Agent).order_by(Agent.created_at.desc())
    if bot_id:
        query = query.where(Agent.bot_id == bot_id)
    
    result = await db.execute(query)
    agents = result.scalars().all()
    
    # Get related AI configs and bots
    ai_config_ids = [a.ai_config_id for a in agents if a.ai_config_id]
    bot_ids = [a.bot_id for a in agents if a.bot_id]
    
    ai_configs = {}
    if ai_config_ids:
        ai_result = await db.execute(select(AiConfig).where(AiConfig.id.in_(ai_config_ids)))
        ai_configs = {c.id: c for c in ai_result.scalars().all()}
    
    bots = {}
    if bot_ids:
        bot_result = await db.execute(select(Bot).where(Bot.id.in_(bot_ids)))
        bots = {b.id: b for b in bot_result.scalars().all()}
    
    agent_responses = [
        _agent_to_response(a, ai_configs.get(a.ai_config_id), bots.get(a.bot_id))
        for a in agents
    ]
    
    return APIResponse(
        data=AgentListResponse(agents=agent_responses, total=len(agent_responses))
    )


@router.post("", response_model=APIResponse, status_code=status.HTTP_201_CREATED)
async def create_agent(
    agent_data: AgentCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_user: Annotated[Admin, Depends(require_admin)],
) -> APIResponse:
    """Create a new agent."""
    # Validate AI config if provided
    if agent_data.ai_config_id:
        ai_result = await db.execute(
            select(AiConfig).where(AiConfig.id == agent_data.ai_config_id)
        )
        if not ai_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"AI config with id {agent_data.ai_config_id} not found"
            )
    
    # Validate bot if provided
    if agent_data.bot_id:
        bot_result = await db.execute(select(Bot).where(Bot.id == agent_data.bot_id))
        if not bot_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Bot with id {agent_data.bot_id} not found"
            )
    
    # If setting as default, unset other defaults
    if agent_data.is_default:
        await db.execute(
            update(Agent).where(Agent.is_default == True).values(is_default=False)
        )
    
    agent = Agent(
        name=agent_data.name,
        description=agent_data.description,
        ai_config_id=agent_data.ai_config_id,
        system_prompt=agent_data.system_prompt,
        bot_id=agent_data.bot_id,
        permissions=agent_data.permissions.model_dump() if agent_data.permissions else {},
        tools=agent_data.tools.model_dump() if agent_data.tools else {},
        response_settings=agent_data.response_settings.model_dump() if agent_data.response_settings else {},
        knowledge_base=agent_data.knowledge_base.model_dump() if agent_data.knowledge_base else {},
        is_active=agent_data.is_active,
        is_default=agent_data.is_default,
        schedule=agent_data.schedule.model_dump() if agent_data.schedule else {},
    )
    
    db.add(agent)
    await db.commit()
    await db.refresh(agent)
    
    # Get related objects for response
    ai_config = None
    bot = None
    if agent.ai_config_id:
        ai_result = await db.execute(select(AiConfig).where(AiConfig.id == agent.ai_config_id))
        ai_config = ai_result.scalar_one_or_none()
    if agent.bot_id:
        bot_result = await db.execute(select(Bot).where(Bot.id == agent.bot_id))
        bot = bot_result.scalar_one_or_none()
    
    return APIResponse(
        data=_agent_to_response(agent, ai_config, bot),
        message="Agent created successfully"
    )


@router.get("/{agent_id}", response_model=APIResponse)
async def get_agent(
    agent_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_user: Annotated[Admin, Depends(require_admin)],
) -> APIResponse:
    """Get agent details."""
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    ai_config = None
    bot = None
    if agent.ai_config_id:
        ai_result = await db.execute(select(AiConfig).where(AiConfig.id == agent.ai_config_id))
        ai_config = ai_result.scalar_one_or_none()
    if agent.bot_id:
        bot_result = await db.execute(select(Bot).where(Bot.id == agent.bot_id))
        bot = bot_result.scalar_one_or_none()
    
    return APIResponse(data=_agent_to_response(agent, ai_config, bot))


@router.patch("/{agent_id}", response_model=APIResponse)
async def update_agent(
    agent_id: int,
    agent_data: AgentUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_user: Annotated[Admin, Depends(require_admin)],
) -> APIResponse:
    """Update an agent."""
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    # Validate AI config if changing
    if agent_data.ai_config_id is not None:
        ai_result = await db.execute(
            select(AiConfig).where(AiConfig.id == agent_data.ai_config_id)
        )
        if not ai_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"AI config with id {agent_data.ai_config_id} not found"
            )
        agent.ai_config_id = agent_data.ai_config_id
    
    # Validate bot if changing
    if agent_data.bot_id is not None:
        bot_result = await db.execute(select(Bot).where(Bot.id == agent_data.bot_id))
        if not bot_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Bot with id {agent_data.bot_id} not found"
            )
        agent.bot_id = agent_data.bot_id
    
    # If setting as default, unset other defaults
    if agent_data.is_default:
        from sqlalchemy import update
        await db.execute(
            update(Agent).where(Agent.is_default == True, Agent.id != agent_id).values(is_default=False)
        )
    
    # Update fields
    update_data = agent_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field in ["permissions", "tools", "response_settings", "knowledge_base", "schedule"]:
            if value is not None:
                setattr(agent, field, value.model_dump() if hasattr(value, 'model_dump') else value)
        elif field not in ["ai_config_id", "bot_id", "is_default"]:
            setattr(agent, field, value)
    
    await db.commit()
    await db.refresh(agent)
    
    # Get related objects for response
    ai_config = None
    bot = None
    if agent.ai_config_id:
        ai_result = await db.execute(select(AiConfig).where(AiConfig.id == agent.ai_config_id))
        ai_config = ai_result.scalar_one_or_none()
    if agent.bot_id:
        bot_result = await db.execute(select(Bot).where(Bot.id == agent.bot_id))
        bot = bot_result.scalar_one_or_none()
    
    return APIResponse(
        data=_agent_to_response(agent, ai_config, bot),
        message="Agent updated successfully"
    )


@router.delete("/{agent_id}", response_model=APIResponse)
async def delete_agent(
    agent_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_user: Annotated[Admin, Depends(require_admin)],
) -> APIResponse:
    """Delete an agent."""
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    # Delete related conversations and messages
    await db.execute(
        delete(AgentMessage).where(
            AgentMessage.conversation_id.in_(
                select(AgentConversation.id).where(AgentConversation.agent_id == agent_id)
            )
        )
    )
    await db.execute(delete(AgentConversation).where(AgentConversation.agent_id == agent_id))
    
    await db.delete(agent)
    await db.commit()
    
    return APIResponse(message="Agent deleted successfully")


@router.post("/{agent_id}/test", response_model=APIResponse)
async def test_agent(
    agent_id: int,
    test_data: AgentTestRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_user: Annotated[Admin, Depends(require_admin)],
) -> APIResponse:
    """Test an agent with a message."""
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    if not agent.ai_config_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Agent has no AI configuration"
        )
    
    # Get AI config
    ai_result = await db.execute(select(AiConfig).where(AiConfig.id == agent.ai_config_id))
    ai_config = ai_result.scalar_one_or_none()
    
    if not ai_config:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="AI configuration not found"
        )
    
    # Test the AI
    start_time = time.time()
    try:
        # Build messages with system prompt
        messages = []
        if agent.system_prompt:
            messages.append({"role": "system", "content": agent.system_prompt})
        messages.append({"role": "user", "content": test_data.message})
        
        # Get response settings
        response_settings = agent.response_settings or {}
        temperature = response_settings.get("temperature", 0.7)
        max_tokens = response_settings.get("max_tokens", 2000)
        
        # Call AI handler
        response = await ai_handler.generate_response(
            messages=messages,
            ai_config=ai_config,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        
        latency_ms = int((time.time() - start_time) * 1000)
        
        return APIResponse(
            data=AgentTestResponse(
                response=response.get("content", "No response"),
                tokens_used=response.get("tokens_used"),
                tool_calls=response.get("tool_calls"),
                latency_ms=latency_ms,
            )
        )
    except Exception as e:
        logger.exception("Agent test failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent test failed: {str(e)}"
        )


@router.get("/{agent_id}/conversations", response_model=APIResponse)
async def get_agent_conversations(
    agent_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_user: Annotated[Admin, Depends(require_admin)],
    limit: int = 50,
    offset: int = 0,
) -> APIResponse:
    """Get conversations for an agent."""
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    # Get conversations
    conv_result = await db.execute(
        select(AgentConversation)
        .where(AgentConversation.agent_id == agent_id)
        .order_by(AgentConversation.last_activity_at.desc())
        .limit(limit)
        .offset(offset)
    )
    conversations = conv_result.scalars().all()
    
    # Get total count
    count_result = await db.execute(
        select(func.count(AgentConversation.id)).where(AgentConversation.agent_id == agent_id)
    )
    total = count_result.scalar_one()
    
    return APIResponse(
        data={
            "conversations": [
                {
                    "id": c.id,
                    "tg_user_id": c.tg_user_id,
                    "chat_id": c.chat_id,
                    "status": c.status,
                    "started_at": c.started_at.isoformat() if c.started_at else None,
                    "last_activity_at": c.last_activity_at.isoformat() if c.last_activity_at else None,
                }
                for c in conversations
            ],
            "total": total,
        }
    )


# Import update for SQLAlchemy
from sqlalchemy import update
