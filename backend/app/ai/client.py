import json
import logging
import hashlib
import asyncio
from functools import partial
from google import genai
from app.config import settings
from app.core.cache import cache_get, cache_set

logger = logging.getLogger("examprep.ai")

_client: genai.Client | None = None


def get_gemini_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _client


def _sync_generate(client: genai.Client, model: str, prompt: str, temperature: float, max_tokens: int) -> str:
    """Synchronous Gemini call — runs in a thread pool to avoid blocking the event loop."""
    response = client.models.generate_content(
        model=model,
        contents=prompt,
        config=genai.types.GenerateContentConfig(
            temperature=temperature,
            max_output_tokens=max_tokens,
        ),
    )
    text = response.text
    if not text:
        raise ValueError(f"Gemini returned empty response for model {model}")
    return text.strip()


async def generate_completion(
    prompt: str,
    model: str | None = None,
    temperature: float = 0.7,
    max_tokens: int = 4000,
    use_cache: bool = True,
) -> str:
    """Generate a completion from Gemini with optional caching."""
    model = model or settings.GEMINI_MODEL

    # Check cache
    if use_cache:
        cache_key = f"ai:completion:{hashlib.md5(prompt.encode()).hexdigest()}"
        cached = await cache_get(cache_key)
        if cached:
            logger.info("AI cache hit for prompt hash")
            return cached

    client = get_gemini_client()

    # Run synchronous Gemini SDK call in thread pool so it doesn't block the event loop
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None,
        partial(_sync_generate, client, model, prompt, temperature, max_tokens),
    )

    # Cache result
    if use_cache:
        await cache_set(cache_key, result, ttl_seconds=86400)  # 24h

    logger.info("AI generation complete. Model: %s", model)
    return result


async def generate_questions_json(prompt: str, model: str | None = None) -> list[dict]:
    """Generate questions and parse as JSON with retry on truncated output."""
    result = await generate_completion(
        prompt, model=model, temperature=0.8, max_tokens=16000, use_cache=False,
    )

    # Clean markdown code blocks if present
    if result.startswith("```"):
        result = result.split("\n", 1)[1]
        result = result.rsplit("```", 1)[0]

    result = result.strip()

    # Try to parse as-is
    try:
        return json.loads(result)
    except json.JSONDecodeError:
        pass

    # Truncated JSON — try to salvage complete question objects
    # Find the last complete object by looking for the last "},"  or "}\n]"
    last_complete = result.rfind("},")
    if last_complete > 0:
        repaired = result[:last_complete + 1] + "]"
        try:
            data = json.loads(repaired)
            logger.warning("Repaired truncated JSON: salvaged %d questions", len(data))
            return data
        except json.JSONDecodeError:
            pass

    # Try finding last complete object ending with "}"
    last_brace = result.rfind("}")
    if last_brace > 0:
        repaired = result[:last_brace + 1] + "]"
        if not repaired.startswith("["):
            repaired = "[" + repaired
        try:
            data = json.loads(repaired)
            logger.warning("Repaired truncated JSON (method 2): salvaged %d questions", len(data))
            return data
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Failed to parse AI response as JSON. First 200 chars: {result[:200]}")
