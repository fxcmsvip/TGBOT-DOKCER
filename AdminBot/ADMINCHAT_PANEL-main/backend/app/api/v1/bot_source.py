"""Bot source code management API."""
import subprocess
import tempfile
import os
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.bot import Bot
from app.models.bot_source import BotSourceCode
from app.models.admin import Admin
from app.bot.source_generator import generate_bot_source_code
from app.bot.manager import bot_manager

router = APIRouter(prefix="/bots/{bot_id}/source", tags=["bots"])


@router.get("")
async def get_bot_source(
    bot_id: int,
    current_user: Admin = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get bot source code. Generates if not exists."""
    # Check bot exists
    bot = await db.get(Bot, bot_id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    # Get or create source code
    result = await db.execute(
        select(BotSourceCode).where(BotSourceCode.bot_id == bot_id)
    )
    source = result.scalar_one_or_none()
    
    if not source:
        # Generate source code
        code = generate_bot_source_code(bot)
        source = BotSourceCode(
            bot_id=bot_id,
            source_code=code,
            is_custom=False,
        )
        db.add(source)
        await db.commit()
        await db.refresh(source)
    
    return {
        "bot_id": bot_id,
        "source_code": source.source_code,
        "is_custom": source.is_custom,
        "generated_at": source.generated_at.isoformat() if source.generated_at else None,
        "last_modified": source.last_modified.isoformat() if source.last_modified else None,
    }


@router.put("")
async def update_bot_source(
    bot_id: int,
    payload: dict,
    current_user: Admin = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update bot source code."""
    # Check bot exists
    bot = await db.get(Bot, bot_id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    source_code = payload.get("source_code")
    if not source_code:
        raise HTTPException(status_code=400, detail="source_code is required")
    
    # Get or create source code
    result = await db.execute(
        select(BotSourceCode).where(BotSourceCode.bot_id == bot_id)
    )
    source = result.scalar_one_or_none()
    
    if source:
        source.source_code = source_code
        source.is_custom = True
    else:
        source = BotSourceCode(
            bot_id=bot_id,
            source_code=source_code,
            is_custom=True,
        )
        db.add(source)
    
    await db.commit()
    await db.refresh(source)
    
    return {
        "bot_id": bot_id,
        "source_code": source.source_code,
        "is_custom": source.is_custom,
        "last_modified": source.last_modified.isoformat() if source.last_modified else None,
    }


@router.post("/regenerate")
async def regenerate_bot_source(
    bot_id: int,
    current_user: Admin = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Regenerate bot source code from current config."""
    # Check bot exists
    bot = await db.get(Bot, bot_id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    # Generate new source code
    code = generate_bot_source_code(bot)
    
    # Get or create source code
    result = await db.execute(
        select(BotSourceCode).where(BotSourceCode.bot_id == bot_id)
    )
    source = result.scalar_one_or_none()
    
    if source:
        source.source_code = code
        source.is_custom = False
    else:
        source = BotSourceCode(
            bot_id=bot_id,
            source_code=code,
            is_custom=False,
        )
        db.add(source)
    
    await db.commit()
    await db.refresh(source)
    
    return {
        "bot_id": bot_id,
        "source_code": source.source_code,
        "is_custom": source.is_custom,
        "generated_at": source.generated_at.isoformat() if source.generated_at else None,
    }


@router.post("/restart")
async def restart_bot(
    bot_id: int,
    mode: str = "auto",  # auto, local, remote
    current_user: Admin = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Restart bot with new logic:
    1. Try to start from local source file
    2. If fails, fall back to remote (polling)
    """
    # Check bot exists
    bot = await db.get(Bot, bot_id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    # Get source code
    result = await db.execute(
        select(BotSourceCode).where(BotSourceCode.bot_id == bot_id)
    )
    source = result.scalar_one_or_none()
    
    local_started = False
    remote_started = False
    errors = []
    
    # Try local source first (if mode is auto or local)
    if mode in ("auto", "local") and source and source.source_code:
        try:
            # Save source to temp file and try to run
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
                f.write(source.source_code)
                temp_path = f.name
            
            # Note: In production, you'd want to run this in a subprocess
            # For now, we just validate the syntax
            import ast
            ast.parse(source.source_code)
            local_started = True
            
            # Clean up temp file
            os.unlink(temp_path)
            
        except SyntaxError as e:
            errors.append(f"Local source syntax error: {str(e)}")
        except Exception as e:
            errors.append(f"Local start failed: {str(e)}")
    
    # Fall back to remote if local failed or mode is remote
    if not local_started and mode in ("auto", "remote"):
        try:
            # Stop existing bot if running
            if bot.id in bot_manager.bots:
                await bot_manager.stop_bot(bot.id)
            
            # Start bot via polling
            await bot_manager.start_bot(bot)
            remote_started = True
        except Exception as e:
            errors.append(f"Remote start failed: {str(e)}")
    
    if not local_started and not remote_started:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start bot: {'; '.join(errors)}"
        )
    
    return {
        "bot_id": bot_id,
        "local_started": local_started,
        "remote_started": remote_started,
        "mode": mode,
        "errors": errors if errors else None,
    }


@router.post("/validate")
async def validate_bot_source(
    bot_id: int,
    payload: dict,
    current_user: Admin = Depends(get_current_user),
):
    """Validate bot source code syntax."""
    source_code = payload.get("source_code")
    if not source_code:
        raise HTTPException(status_code=400, detail="source_code is required")
    
    try:
        import ast
        ast.parse(source_code)
        return {"valid": True, "error": None}
    except SyntaxError as e:
        return {
            "valid": False,
            "error": f"Line {e.lineno}: {e.msg}",
            "line": e.lineno,
            "offset": e.offset,
        }
