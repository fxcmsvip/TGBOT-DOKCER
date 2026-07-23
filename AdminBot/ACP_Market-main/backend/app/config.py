from __future__ import annotations

import logging

from pydantic import model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/acp_market"
    REDIS_URL: str = "redis://localhost:6379/1"

    # JWT
    JWT_SECRET_KEY: str = "CHANGE-ME-IN-PRODUCTION"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Storage
    PLUGIN_STORAGE_PATH: str = "/data/plugins"  # Local path for plugin bundles

    # Stripe
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PLATFORM_FEE_PERCENT: int = 30

    # Signing
    ED25519_PRIVATE_KEY: str = ""  # PEM format, for signing bundles

    # Email / SMTP
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    SMTP_FROM: str = "noreply@acpmarket.novahelix.org"
    SMTP_USE_TLS: bool = True
    SENDGRID_API_KEY: str = ""

    # Password reset
    PASSWORD_RESET_EXPIRE_MINUTES: int = 30
    FRONTEND_URL: str = "http://localhost:5173"

    # Cookie Auth
    COOKIE_NAME: str = "acp_session"
    COOKIE_SECURE: bool = True  # Set False for local dev (HTTP)
    SESSION_COOKIE_MAX_AGE_DAYS: int = 30  # For "remember me"

    # Market
    MARKET_DOMAIN: str = "acpmarket.novahelix.org"
    CDN_DOMAIN: str = "cdn.acpmarket.novahelix.org"

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Admin
    INIT_ADMIN_EMAIL: str = "admin@novahelix.org"
    INIT_ADMIN_PASSWORD: str = "changeme"

    DEBUG: bool = False

    class Config:
        env_file = ".env"

    @model_validator(mode='after')
    def check_production_settings(self):
        logger = logging.getLogger("acp_market.config")
        if self.JWT_SECRET_KEY == "CHANGE-ME-IN-PRODUCTION":
            logger.warning("JWT_SECRET_KEY is using default value! Change it in production.")
        if not self.STRIPE_SECRET_KEY:
            logger.warning("STRIPE_SECRET_KEY is not set. Billing features disabled.")
        if self.INIT_ADMIN_PASSWORD == "changeme":
            logger.warning("INIT_ADMIN_PASSWORD is using default! Change it immediately.")
        return self


settings = Settings()
