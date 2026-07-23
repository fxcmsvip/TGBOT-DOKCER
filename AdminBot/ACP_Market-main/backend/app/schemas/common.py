from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel


class APIResponse(BaseModel):
    code: int = 200
    message: str = "success"
    data: Optional[Any] = None


class ErrorResponse(BaseModel):
    error: dict  # {"code": "ERROR_CODE", "message": "...", "details": {}}
