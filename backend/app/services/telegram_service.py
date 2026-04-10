"""Telegram Bot API client — free, no auth other than bot token.

Create a bot via @BotFather → get token → set TELEGRAM_BOT_TOKEN env.
Users start chat with the bot → bot receives /start with chat_id.
"""
import logging
import httpx
from app.config import settings

logger = logging.getLogger("examprep.telegram")


BASE_URL = "https://api.telegram.org/bot{token}"


def is_configured() -> bool:
    return bool(settings.TELEGRAM_BOT_TOKEN)


async def send_message(chat_id: str, text: str, parse_mode: str = "HTML") -> bool:
    """Send a single message to a Telegram chat."""
    if not is_configured():
        logger.warning("Telegram not configured; skipping send to %s", chat_id)
        return False

    url = BASE_URL.format(token=settings.TELEGRAM_BOT_TOKEN) + "/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text[:4000],  # Telegram limit is 4096
        "parse_mode": parse_mode,
        "disable_web_page_preview": False,
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(url, json=payload)
            r.raise_for_status()
            return True
    except Exception as e:
        logger.warning("Telegram send failed (chat_id=%s): %s", chat_id, e)
        return False


async def get_updates(offset: int | None = None) -> list[dict]:
    """Long-poll Telegram for new updates (used to capture chat_ids when users /start)."""
    if not is_configured():
        return []
    url = BASE_URL.format(token=settings.TELEGRAM_BOT_TOKEN) + "/getUpdates"
    params: dict = {"timeout": 0}
    if offset is not None:
        params["offset"] = offset
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            r = await client.get(url, params=params)
            r.raise_for_status()
            return r.json().get("result", [])
    except Exception as e:
        logger.warning("Telegram getUpdates failed: %s", e)
        return []


async def set_webhook(webhook_url: str) -> bool:
    """Register a webhook URL so Telegram POSTs updates to your API."""
    if not is_configured():
        return False
    url = BASE_URL.format(token=settings.TELEGRAM_BOT_TOKEN) + "/setWebhook"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(url, json={"url": webhook_url})
            r.raise_for_status()
            return True
    except Exception as e:
        logger.warning("Telegram setWebhook failed: %s", e)
        return False
