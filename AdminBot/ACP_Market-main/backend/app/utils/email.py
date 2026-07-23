from __future__ import annotations

import asyncio
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import httpx

from app.config import settings

logger = logging.getLogger("acp_market.email")


async def send_email(to: str, subject: str, html_body: str) -> bool:
    """Send email via SMTP (primary) with SendGrid API fallback.

    Returns True if sent successfully, False otherwise.
    """
    # Try SMTP first (run in thread pool to avoid blocking the event loop)
    if settings.SMTP_HOST:
        try:
            await asyncio.to_thread(_send_smtp, to, subject, html_body)
            logger.info("Email sent via SMTP to %s", to)
            return True
        except Exception as exc:
            logger.warning("SMTP send failed: %s, trying SendGrid fallback", exc)

    # Fallback: SendGrid API
    if settings.SENDGRID_API_KEY:
        try:
            await _send_sendgrid(to, subject, html_body)
            logger.info("Email sent via SendGrid to %s", to)
            return True
        except Exception as exc:
            logger.error("SendGrid send failed: %s", exc)

    logger.error("No email provider configured or all providers failed for %s", to)
    return False


def _send_smtp(to: str, subject: str, html_body: str) -> None:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to
    msg.attach(MIMEText(html_body, "html"))

    if settings.SMTP_USE_TLS:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            if settings.SMTP_USER:
                server.login(settings.SMTP_USER, settings.SMTP_PASS)
            server.sendmail(settings.SMTP_FROM, [to], msg.as_string())
    else:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            if settings.SMTP_USER:
                server.login(settings.SMTP_USER, settings.SMTP_PASS)
            server.sendmail(settings.SMTP_FROM, [to], msg.as_string())


async def _send_sendgrid(to: str, subject: str, html_body: str) -> None:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.sendgrid.com/v3/mail/send",
            headers={
                "Authorization": f"Bearer {settings.SENDGRID_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "personalizations": [{"to": [{"email": to}]}],
                "from": {"email": settings.SMTP_FROM},
                "subject": subject,
                "content": [{"type": "text/html", "value": html_body}],
            },
        )
        resp.raise_for_status()
