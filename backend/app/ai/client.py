import json
import logging
import hashlib
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

    response = client.models.generate_content(
        model=model,
        contents=prompt,
        config=genai.types.GenerateContentConfig(
            temperature=temperature,
            max_output_tokens=max_tokens,
        ),
    )

    result = response.text.strip()

    # Cache result
    if use_cache:
        await cache_set(cache_key, result, ttl_seconds=86400)  # 24h

    logger.info("AI generation complete. Model: %s", model)
    return result


async def generate_questions_json(prompt: str, model: str | None = None) -> list[dict]:
    """Generate questions and parse as JSON."""
    result = await generate_completion(prompt, model=model, temperature=0.8)

    # Clean markdown code blocks if present
    if result.startswith("```"):
        result = result.split("\n", 1)[1]
        result = result.rsplit("```", 1)[0]

    return json.loads(result)
