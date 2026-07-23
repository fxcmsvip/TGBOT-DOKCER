from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine
from app.models.base import Base

# Import all models so they register with Base.metadata
from app.models import billing, plugin, review, user  # noqa: F401

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger("acp_market")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("ACP Market started")

    # Create initial admin
    from app.utils.init_admin import create_initial_admin

    await create_initial_admin()

    yield

    # Shutdown
    await engine.dispose()
    logger.info("ACP Market stopped")


app = FastAPI(title="ACP Market", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api import router  # noqa: E402

app.include_router(router)


@app.get("/health")
async def health():
    return {"status": "ok"}
