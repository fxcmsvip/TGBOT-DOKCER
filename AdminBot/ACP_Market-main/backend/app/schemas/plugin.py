from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class PluginListItem(BaseModel):
    id: int
    plugin_id: str
    name: str
    description: str
    icon: str | None = None
    color: str | None = None
    categories: list[str] = []
    author_name: str
    pricing_model: str
    price_cents: int = 0
    currency: str = "usd"
    download_count: int = 0
    is_featured: bool = False
    is_published: bool = False
    latest_version: str | None = None
    review_status: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class PluginVersionOut(BaseModel):
    id: int
    version: str
    changelog: str | None = None
    min_panel_version: str | None = None
    bundle_size: int = 0
    bundle_hash: str = ""
    signature: str | None = None  # Ed25519 base64 signature
    review_status: str = "pending"
    published_at: datetime | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class PluginDetail(BaseModel):
    id: int
    plugin_id: str
    name: str
    description: str
    long_description: str | None = None
    icon: str | None = None
    color: str | None = None
    categories: list[str] = []
    tags: list[str] = []
    author_name: str
    author_username: str
    pricing_model: str
    price_cents: int = 0
    currency: str = "usd"
    download_count: int = 0
    is_featured: bool = False
    latest_version: str | None = None
    versions: list[dict] = []
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class PluginSubmitMeta(BaseModel):
    plugin_id: str
    name: str
    description: str
    long_description: str | None = None
    version: str = "1.0.0"
    icon: str | None = None
    color: str | None = None
    categories: list[str] = []
    tags: list[str] = []
    changelog: str | None = None
    min_panel_version: str | None = None
    manifest: dict = {}
    pricing: dict = {}


class InstalledPlugin(BaseModel):
    id: str
    version: str


class CheckUpdatesRequest(BaseModel):
    installed: list[InstalledPlugin]
    panel_version: str | None = None


class UpdateAvailable(BaseModel):
    plugin_id: str
    current_version: str
    latest_version: str
    changelog: str | None = None
    bundle_size: int = 0
    min_panel_version: str | None = None


class CheckUpdatesResponse(BaseModel):
    updates: list[UpdateAvailable] = []
