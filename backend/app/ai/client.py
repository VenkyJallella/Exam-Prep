import json
import re
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
    """Synchronous Gemini call — runs in a thread pool."""
    try:
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
    except Exception as e:
        raise ValueError(f"Gemini error ({model}): {type(e).__name__}: {e}")


async def generate_completion(
    prompt: str,
    model: str | None = None,
    temperature: float = 0.7,
    max_tokens: int = 4000,
    use_cache: bool = True,
    timeout: float = 35.0,
) -> str:
    """Generate a completion from Gemini with caching, timeout, and rate limit handling."""
    model = model or settings.GEMINI_MODEL

    # Check if we're rate limited (shared across workers via Redis)
    from app.core.cache import get_redis
    r = get_redis()
    rate_ttl = await r.ttl("gemini_rate_limit")
    if rate_ttl > 0:
        raise ValueError(f"Gemini API rate limited. Retry in {rate_ttl}s.")

    # Check cache
    if use_cache:
        cache_key = f"ai:completion:{hashlib.md5(prompt.encode()).hexdigest()}"
        cached = await cache_get(cache_key)
        if cached:
            logger.info("AI cache hit")
            return cached

    client = get_gemini_client()

    # Run in thread pool with configurable timeout
    loop = asyncio.get_event_loop()
    try:
        result = await asyncio.wait_for(
            loop.run_in_executor(
                None,
                partial(_sync_generate, client, model, prompt, temperature, max_tokens),
            ),
            timeout=timeout,
        )
    except asyncio.TimeoutError:
        raise ValueError(f"Gemini API timed out (model: {model})")
    except Exception as e:
        error_str = str(e).lower()
        # Handle rate limits (shared across all workers via Redis)
        if "429" in error_str or "rate" in error_str or "quota" in error_str or "resource_exhausted" in error_str:
            await r.set("gemini_rate_limit", "1", ex=60)
            logger.warning("Gemini rate limited. Backing off 60s. Error: %s", e)
            raise ValueError(f"Gemini API rate limited. Please try again in 60 seconds.")
        raise

    # Cache result
    if use_cache:
        await cache_set(cache_key, result, ttl_seconds=86400)

    logger.info("AI generation complete. Model: %s", model)
    return result


def _fix_json(raw: str) -> str:
    """Fix common JSON issues from AI responses."""
    s = raw.strip()

    if s.startswith("```"):
        s = s.split("\n", 1)[1]
        s = s.rsplit("```", 1)[0].strip()

    def escape_backslashes(m):
        content = m.group(0)
        content = re.sub(r'\\(?![ntrb\\"/fu])', r'\\\\', content)
        return content

    s = re.sub(r'"(?:[^"\\]|\\.)*"', escape_backslashes, s)
    return s


def _parse_json_robust(raw: str) -> list[dict]:
    """Parse JSON with multiple fallback strategies."""
    s = _fix_json(raw)

    try:
        data = json.loads(s)
        return data if isinstance(data, list) else [data]
    except json.JSONDecodeError:
        pass

    for marker in ["},\n", "},", "}\n]"]:
        pos = s.rfind(marker)
        if pos > 0:
            end = pos + len(marker.rstrip(",\n"))
            repaired = s[:end] + "]"
            if not repaired.lstrip().startswith("["):
                repaired = "[" + repaired
            try:
                data = json.loads(repaired)
                logger.warning("Repaired truncated JSON: salvaged %d items", len(data))
                return data if isinstance(data, list) else [data]
            except json.JSONDecodeError:
                continue

    objects = []
    for m in re.finditer(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', s):
        try:
            obj = json.loads(m.group())
            if "question_text" in obj:
                objects.append(obj)
        except json.JSONDecodeError:
            continue

    if objects:
        logger.warning("Extracted %d questions via regex fallback", len(objects))
        return objects

    raise ValueError(f"Failed to parse AI response. First 200 chars: {raw[:200]}")


async def generate_questions_json(prompt: str, model: str | None = None) -> list[dict]:
    """Generate questions and parse as JSON with robust error handling."""
    result = await generate_completion(
        prompt, model=model, temperature=0.8, max_tokens=16000, use_cache=False,
    )
    return _parse_json_robust(result)
