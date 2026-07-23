"""Pydantic schemas for movie request system."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


# === TMDB API Key Schemas ===

class TmdbApiKeyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    api_key: str = Field(..., min_length=1, max_length=500)
    access_token: Optional[str] = Field(default=None, max_length=500)


class TmdbApiKeyOut(BaseModel):
    id: int
    name: str
    api_key_masked: str
    access_token_masked: Optional[str] = None
    is_active: bool
    is_rate_limited: bool
    rate_limited_until: Optional[datetime] = None
    request_count: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# === Movie Request Schemas ===

class MovieRequestUserOut(BaseModel):
    id: int
    tg_user_id: int
    tg_username: Optional[str] = None
    tg_first_name: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MovieRequestOut(BaseModel):
    id: int
    tmdb_id: int
    media_type: str
    title: str
    original_title: Optional[str] = None
    poster_path: Optional[str] = None
    backdrop_path: Optional[str] = None
    release_date: Optional[str] = None
    overview: Optional[str] = None
    vote_average: Optional[float] = None
    genres: Optional[str] = None
    status: str
    admin_note: Optional[str] = None
    request_count: int
    in_library: bool
    requested_resolution: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MovieRequestDetail(MovieRequestOut):
    request_users: list[MovieRequestUserOut] = Field(default_factory=list)
    tmdb_raw: Optional[dict[str, Any]] = None


class MovieRequestUpdate(BaseModel):
    status: Optional[str] = Field(default=None, pattern=r"^(pending|fulfilled|rejected)$")
    admin_note: Optional[str] = None


class MovieRequestStats(BaseModel):
    total: int = 0
    pending: int = 0
    fulfilled: int = 0
    rejected: int = 0


# === Media Library Config Schemas ===

class MediaLibraryConfigCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    db_type: str = Field(..., pattern=r"^(postgresql|mysql|api)$")
    # DB-mode fields (postgresql / mysql)
    host: Optional[str] = Field(default=None, max_length=200)
    port: Optional[int] = Field(default=None, ge=1, le=65535)
    database: Optional[str] = Field(default=None, max_length=100)
    username: Optional[str] = Field(default=None, max_length=100)
    password: Optional[str] = Field(default=None, max_length=200)
    table_name: Optional[str] = Field(default=None, max_length=100)
    tmdb_id_column: Optional[str] = Field(default=None, max_length=100)
    media_type_column: Optional[str] = Field(default=None, max_length=100)
    # Detail-mode fields — when name_column is set, the plugin queries the
    # filenames and parses them for resolution / HDR / season-episode info.
    name_column: Optional[str] = Field(default=None, max_length=100)
    path_column: Optional[str] = Field(default=None, max_length=100)
    is_dir_column: Optional[str] = Field(default=None, max_length=100)
    trashed_column: Optional[str] = Field(default=None, max_length=100)
    # API-mode fields
    api_url: Optional[str] = Field(default=None, max_length=500)
    api_auth_header: Optional[str] = Field(default=None, max_length=500)
    api_response_path: Optional[str] = Field(default=None, max_length=100)


class MediaLibraryConfigOut(BaseModel):
    id: int
    name: str
    db_type: str
    host: Optional[str] = None
    port: Optional[int] = None
    database: Optional[str] = None
    username: Optional[str] = None
    password_masked: Optional[str] = None
    table_name: Optional[str] = None
    tmdb_id_column: Optional[str] = None
    media_type_column: Optional[str] = None
    name_column: Optional[str] = None
    path_column: Optional[str] = None
    is_dir_column: Optional[str] = None
    trashed_column: Optional[str] = None
    api_url: Optional[str] = None
    api_auth_header_masked: Optional[str] = None
    api_response_path: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
