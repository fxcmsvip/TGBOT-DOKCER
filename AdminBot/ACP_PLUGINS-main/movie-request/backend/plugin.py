"""
TMDB Movie Request Plugin for ADMINCHAT Panel.
Entry point loaded by PluginManager.
"""
from __future__ import annotations

import logging
from pathlib import Path

logger = logging.getLogger("acp.plugin.movie-request")

# Plugin state
_context = None


async def setup(context) -> None:
    """Called when plugin is activated."""
    global _context
    _context = context
    logger.info("Movie Request plugin v%s activated", context.version)


async def teardown() -> None:
    """Called when plugin is deactivated."""
    global _context
    # Close TMDB client if open
    from backend.services.tmdb import close_tmdb_client
    await close_tmdb_client()
    # Dispose media library engine cache
    from backend.services.media_library import dispose_engines
    await dispose_engines()
    _context = None
    logger.info("Movie Request plugin deactivated")


def get_router():
    """Return FastAPI router for API endpoints."""
    from backend.routes import router
    return router


def get_bot_router():
    """Return aiogram Router for bot handlers."""
    from backend.handlers import router
    return router
