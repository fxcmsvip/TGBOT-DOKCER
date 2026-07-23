"""
Scheduled Task API endpoints.

GET    /tasks           - list all tasks
POST   /tasks           - create task
GET    /tasks/:id       - get task details
PATCH  /tasks/:id       - update task
DELETE /tasks/:id       - delete task
POST   /tasks/:id/run   - run task immediately
GET    /tasks/:id/logs  - get task execution logs
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_admin
from app.models.admin import Admin
from app.models.agent import Agent
from app.models.bot import Bot
from app.models.scheduled_task import ScheduledTask, TaskExecutionLog
from app.schemas.agent import (
    ScheduledTaskCreate,
    ScheduledTaskListResponse,
    ScheduledTaskResponse,
    ScheduledTaskUpdate,
)
from app.schemas.common import APIResponse

logger = logging.getLogger(__name__)

router = APIRouter()


def _task_to_response(task: ScheduledTask, agent: Agent = None, bot: Bot = None) -> ScheduledTaskResponse:
    """Convert ScheduledTask model to response schema."""
    return ScheduledTaskResponse(
        id=task.id,
        name=task.name,
        description=task.description,
        agent_id=task.agent_id,
        agent_name=agent.name if agent else None,
        bot_id=task.bot_id,
        bot_name=bot.bot_username if bot else None,
        schedule_type=task.schedule_type,
        cron_expression=task.cron_expression,
        interval_seconds=task.interval_seconds,
        run_at=task.run_at,
        timezone=task.timezone,
        task_type=task.task_type,
        task_config=task.task_config or {},
        is_active=task.is_active,
        last_run_at=task.last_run_at,
        last_run_status=task.last_run_status,
        next_run_at=task.next_run_at,
        error_count=task.error_count,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


@router.get("", response_model=APIResponse)
async def list_tasks(
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_user: Annotated[Admin, Depends(require_admin)],
    agent_id: int = None,
    bot_id: int = None,
) -> APIResponse:
    """List all scheduled tasks, optionally filtered."""
    query = select(ScheduledTask).order_by(ScheduledTask.created_at.desc())
    if agent_id:
        query = query.where(ScheduledTask.agent_id == agent_id)
    if bot_id:
        query = query.where(ScheduledTask.bot_id == bot_id)
    
    result = await db.execute(query)
    tasks = result.scalars().all()
    
    # Get related agents and bots
    agent_ids = [t.agent_id for t in tasks if t.agent_id]
    bot_ids = [t.bot_id for t in tasks if t.bot_id]
    
    agents = {}
    if agent_ids:
        agent_result = await db.execute(select(Agent).where(Agent.id.in_(agent_ids)))
        agents = {a.id: a for a in agent_result.scalars().all()}
    
    bots = {}
    if bot_ids:
        bot_result = await db.execute(select(Bot).where(Bot.id.in_(bot_ids)))
        bots = {b.id: b for b in bot_result.scalars().all()}
    
    task_responses = [
        _task_to_response(t, agents.get(t.agent_id), bots.get(t.bot_id))
        for t in tasks
    ]
    
    return APIResponse(
        data=ScheduledTaskListResponse(tasks=task_responses, total=len(task_responses))
    )


@router.post("", response_model=APIResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_data: ScheduledTaskCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_user: Annotated[Admin, Depends(require_admin)],
) -> APIResponse:
    """Create a new scheduled task."""
    # Validate agent if provided
    if task_data.agent_id:
        agent_result = await db.execute(select(Agent).where(Agent.id == task_data.agent_id))
        if not agent_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Agent with id {task_data.agent_id} not found"
            )
    
    # Validate bot if provided
    if task_data.bot_id:
        bot_result = await db.execute(select(Bot).where(Bot.id == task_data.bot_id))
        if not bot_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Bot with id {task_data.bot_id} not found"
            )
    
    # Validate schedule configuration
    if task_data.schedule_type == "cron" and not task_data.cron_expression:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cron expression is required for cron schedule type"
        )
    if task_data.schedule_type == "interval" and not task_data.interval_seconds:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Interval seconds is required for interval schedule type"
        )
    if task_data.schedule_type == "once" and not task_data.run_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Run at time is required for once schedule type"
        )
    
    task = ScheduledTask(
        name=task_data.name,
        description=task_data.description,
        agent_id=task_data.agent_id,
        bot_id=task_data.bot_id,
        schedule_type=task_data.schedule_type,
        cron_expression=task_data.cron_expression,
        interval_seconds=task_data.interval_seconds,
        run_at=task_data.run_at,
        timezone=task_data.timezone,
        task_type=task_data.task_type,
        task_config=task_data.task_config,
        is_active=task_data.is_active,
    )
    
    db.add(task)
    await db.commit()
    await db.refresh(task)
    
    # Get related objects for response
    agent = None
    bot = None
    if task.agent_id:
        agent_result = await db.execute(select(Agent).where(Agent.id == task.agent_id))
        agent = agent_result.scalar_one_or_none()
    if task.bot_id:
        bot_result = await db.execute(select(Bot).where(Bot.id == task.bot_id))
        bot = bot_result.scalar_one_or_none()
    
    return APIResponse(
        data=_task_to_response(task, agent, bot),
        message="Scheduled task created successfully"
    )


@router.get("/{task_id}", response_model=APIResponse)
async def get_task(
    task_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_user: Annotated[Admin, Depends(require_admin)],
) -> APIResponse:
    """Get task details."""
    result = await db.execute(select(ScheduledTask).where(ScheduledTask.id == task_id))
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    agent = None
    bot = None
    if task.agent_id:
        agent_result = await db.execute(select(Agent).where(Agent.id == task.agent_id))
        agent = agent_result.scalar_one_or_none()
    if task.bot_id:
        bot_result = await db.execute(select(Bot).where(Bot.id == task.bot_id))
        bot = bot_result.scalar_one_or_none()
    
    return APIResponse(data=_task_to_response(task, agent, bot))


@router.patch("/{task_id}", response_model=APIResponse)
async def update_task(
    task_id: int,
    task_data: ScheduledTaskUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_user: Annotated[Admin, Depends(require_admin)],
) -> APIResponse:
    """Update a task."""
    result = await db.execute(select(ScheduledTask).where(ScheduledTask.id == task_id))
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Validate agent if changing
    if task_data.agent_id is not None:
        agent_result = await db.execute(select(Agent).where(Agent.id == task_data.agent_id))
        if not agent_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Agent with id {task_data.agent_id} not found"
            )
    
    # Validate bot if changing
    if task_data.bot_id is not None:
        bot_result = await db.execute(select(Bot).where(Bot.id == task_data.bot_id))
        if not bot_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Bot with id {task_data.bot_id} not found"
            )
    
    # Update fields
    update_data = task_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)
    
    await db.commit()
    await db.refresh(task)
    
    # Get related objects for response
    agent = None
    bot = None
    if task.agent_id:
        agent_result = await db.execute(select(Agent).where(Agent.id == task.agent_id))
        agent = agent_result.scalar_one_or_none()
    if task.bot_id:
        bot_result = await db.execute(select(Bot).where(Bot.id == task.bot_id))
        bot = bot_result.scalar_one_or_none()
    
    return APIResponse(
        data=_task_to_response(task, agent, bot),
        message="Task updated successfully"
    )


@router.delete("/{task_id}", response_model=APIResponse)
async def delete_task(
    task_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_user: Annotated[Admin, Depends(require_admin)],
) -> APIResponse:
    """Delete a task."""
    result = await db.execute(select(ScheduledTask).where(ScheduledTask.id == task_id))
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Delete execution logs
    await db.execute(delete(TaskExecutionLog).where(TaskExecutionLog.task_id == task_id))
    
    await db.delete(task)
    await db.commit()
    
    return APIResponse(message="Task deleted successfully")


@router.post("/{task_id}/run", response_model=APIResponse)
async def run_task_now(
    task_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_user: Annotated[Admin, Depends(require_admin)],
) -> APIResponse:
    """Run a task immediately."""
    result = await db.execute(select(ScheduledTask).where(ScheduledTask.id == task_id))
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Create execution log
    log = TaskExecutionLog(
        task_id=task_id,
        status="running",
        started_at=datetime.now(timezone.utc),
    )
    db.add(log)
    await db.commit()
    
    try:
        # Execute task based on type
        # This is a simplified implementation - real execution would be more complex
        result_data = {"message": f"Task '{task.name}' executed successfully"}
        
        # Update task status
        task.last_run_at = datetime.now(timezone.utc)
        task.last_run_status = "success"
        task.last_run_result = result_data
        task.error_count = 0
        
        # Update log
        log.status = "success"
        log.completed_at = datetime.now(timezone.utc)
        log.result = result_data
        
        await db.commit()
        
        return APIResponse(
            data={"status": "success", "result": result_data},
            message="Task executed successfully"
        )
    except Exception as e:
        logger.exception("Task execution failed")
        
        # Update task status
        task.last_run_status = "failed"
        task.error_count += 1
        task.last_error = str(e)
        
        # Update log
        log.status = "failed"
        log.completed_at = datetime.now(timezone.utc)
        log.error_message = str(e)
        
        await db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Task execution failed: {str(e)}"
        )


@router.get("/{task_id}/logs", response_model=APIResponse)
async def get_task_logs(
    task_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_user: Annotated[Admin, Depends(require_admin)],
    limit: int = 50,
    offset: int = 0,
) -> APIResponse:
    """Get execution logs for a task."""
    result = await db.execute(select(ScheduledTask).where(ScheduledTask.id == task_id))
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Get logs
    log_result = await db.execute(
        select(TaskExecutionLog)
        .where(TaskExecutionLog.task_id == task_id)
        .order_by(TaskExecutionLog.started_at.desc())
        .limit(limit)
        .offset(offset)
    )
    logs = log_result.scalars().all()
    
    # Get total count
    count_result = await db.execute(
        select(func.count(TaskExecutionLog.id)).where(TaskExecutionLog.task_id == task_id)
    )
    total = count_result.scalar_one()
    
    return APIResponse(
        data={
            "logs": [
                {
                    "id": log.id,
                    "status": log.status,
                    "started_at": log.started_at.isoformat() if log.started_at else None,
                    "completed_at": log.completed_at.isoformat() if log.completed_at else None,
                    "duration_ms": log.duration_ms,
                    "result": log.result,
                    "error_message": log.error_message,
                }
                for log in logs
            ],
            "total": total,
        }
    )
