"""AI Chatbot Service — context-aware assistant with full DB access.

The chatbot can:
1. Answer questions about user's performance, weak areas, progress
2. Provide exam-specific study tips and strategies
3. Answer general knowledge / exam-related questions
4. Give personalized recommendations based on user data

It builds a context prompt from the user's actual DB data before each response.
"""
import logging
from uuid import UUID
from datetime import datetime, timezone, timedelta
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.client import generate_completion
from app.config import settings

logger = logging.getLogger("examprep.chatbot")


async def _build_user_context(db: AsyncSession, user_id: UUID) -> str:
    """Build a context string from the user's data for the AI."""
    from app.models.user import User
    from app.models.practice import PracticeSession, UserAnswer
    from app.models.gamification import UserGamification
    from app.models.adaptive import UserTopicMastery
    from app.models.payment import Subscription
    from app.models.exam import Topic

    # User info
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        return "User not found."

    # Gamification
    gam = (await db.execute(select(UserGamification).where(UserGamification.user_id == user_id))).scalar_one_or_none()

    # Subscription
    sub = (await db.execute(
        select(Subscription).where(Subscription.user_id == user_id, Subscription.is_active == True)
        .order_by(Subscription.created_at.desc()).limit(1)
    )).scalar_one_or_none()

    # Overall stats
    total_answers = (await db.execute(select(func.count()).select_from(UserAnswer).where(UserAnswer.user_id == user_id))).scalar() or 0
    correct_answers = (await db.execute(select(func.count()).select_from(UserAnswer).where(UserAnswer.user_id == user_id, UserAnswer.is_correct == True))).scalar() or 0
    total_sessions = (await db.execute(select(func.count()).select_from(PracticeSession).where(PracticeSession.user_id == user_id))).scalar() or 0

    accuracy = round((correct_answers / total_answers * 100), 1) if total_answers > 0 else 0

    # Recent activity (last 7 days)
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    recent_answers = (await db.execute(
        select(func.count()).select_from(UserAnswer).where(UserAnswer.user_id == user_id, UserAnswer.created_at >= week_ago)
    )).scalar() or 0
    recent_correct = (await db.execute(
        select(func.count()).select_from(UserAnswer).where(UserAnswer.user_id == user_id, UserAnswer.is_correct == True, UserAnswer.created_at >= week_ago)
    )).scalar() or 0
    recent_accuracy = round((recent_correct / recent_answers * 100), 1) if recent_answers > 0 else 0

    # Topic mastery (top 10 practiced topics)
    mastery_result = await db.execute(
        select(UserTopicMastery, Topic.name)
        .join(Topic, UserTopicMastery.topic_id == Topic.id)
        .where(UserTopicMastery.user_id == user_id)
        .order_by(UserTopicMastery.questions_attempted.desc())
        .limit(10)
    )
    topic_lines = []
    weak_topics = []
    strong_topics = []
    for m, tname in mastery_result.all():
        acc = round((m.questions_correct / m.questions_attempted * 100), 1) if m.questions_attempted > 0 else 0
        topic_lines.append(f"  - {tname}: {acc}% accuracy ({m.questions_correct}/{m.questions_attempted}), mastery {m.mastery_level:.0f}%")
        if acc < 50 and m.questions_attempted >= 3:
            weak_topics.append(tname)
        elif acc >= 75 and m.questions_attempted >= 5:
            strong_topics.append(tname)

    context = f"""USER PROFILE:
- Name: {user.full_name}
- Plan: {sub.plan.value if sub else 'free'}
- Member since: {user.created_at.strftime('%d %b %Y')}

PERFORMANCE STATS:
- Total questions answered: {total_answers}
- Correct answers: {correct_answers}
- Overall accuracy: {accuracy}%
- Total practice sessions: {total_sessions}
- XP: {gam.total_xp if gam else 0}, Level: {gam.level if gam else 1}
- Current streak: {gam.current_streak if gam else 0} days
- Longest streak: {gam.longest_streak if gam else 0} days

LAST 7 DAYS:
- Questions answered: {recent_answers}
- Accuracy: {recent_accuracy}%

TOPIC PERFORMANCE (top practiced):
{chr(10).join(topic_lines) if topic_lines else '  No topics practiced yet.'}

WEAK AREAS (below 50% accuracy): {', '.join(weak_topics) if weak_topics else 'None identified yet'}
STRONG AREAS (above 75% accuracy): {', '.join(strong_topics) if strong_topics else 'None yet'}
"""

    # Add coding stats
    try:
        from app.models.coding import CodingSubmission

        coding_total = (await db.execute(
            select(func.count()).select_from(CodingSubmission).where(CodingSubmission.user_id == user_id)
        )).scalar() or 0

        coding_solved = (await db.execute(
            select(func.count(func.distinct(CodingSubmission.question_id))).where(
                CodingSubmission.user_id == user_id, CodingSubmission.status == "accepted"
            )
        )).scalar() or 0

        coding_attempted = (await db.execute(
            select(func.count(func.distinct(CodingSubmission.question_id))).where(CodingSubmission.user_id == user_id)
        )).scalar() or 0

        context += f"""
CODING PERFORMANCE:
- Problems attempted: {coding_attempted}
- Problems solved: {coding_solved}
- Total submissions: {coding_total}
- Coding acceptance rate: {round(coding_solved / coding_attempted * 100, 1) if coding_attempted > 0 else 0}%
"""
    except Exception:
        pass

    return context


async def chat(
    db: AsyncSession,
    user_id: UUID,
    message: str,
    conversation_history: list[dict] | None = None,
) -> str:
    """Process a chat message with full user context."""

    # Build user context from DB
    user_context = await _build_user_context(db, user_id)

    # Build conversation history
    history_text = ""
    if conversation_history:
        for msg in conversation_history[-6:]:  # Last 6 messages for context
            role = "Student" if msg["role"] == "user" else "Assistant"
            history_text += f"{role}: {msg['content']}\n"

    from datetime import date
    today = date.today()

    system_prompt = f"""You are ExamPrep AI Assistant — a friendly, knowledgeable tutor for Indian competitive exam aspirants.

TODAY'S DATE: {today.strftime('%d %B %Y')}
CURRENT YEAR: {today.year}

IMPORTANT: All your answers must reflect current {today.year} information. Use the latest exam patterns, cut-offs, syllabus, and current affairs. Do not provide outdated information.

You have access to the student's real performance data:

{user_context}

RULES:
1. When asked about performance, use the ACTUAL data above. Give specific numbers, percentages, and comparisons.
2. For weak areas, suggest targeted practice with specific topics and strategies.
3. For exam-related questions, give accurate, exam-specific answers.
4. For general knowledge questions, answer accurately and concisely.
5. Always be encouraging but honest about areas needing improvement.
6. Use Indian English naturally (lakh, crore, aspirants, preparation, etc.)
7. Keep responses 3-5 paragraphs. Give complete, detailed answers — never cut off mid-sentence.
8. If the student hasn't practiced much, encourage them to start with specific suggestions.
9. Never make up data — only use what's provided above.
10. For study strategies, reference actual exam patterns and toppers' methods.
11. NEVER use AI-sounding words: "delve", "dive into", "landscape", "realm", "navigate", "crucial", "embark".
12. Sound like a friendly senior mentor, not a robot. Use phrases like "Let me break this down...", "Here's what I see...", "The good news is...".

{f"CONVERSATION HISTORY:{chr(10)}{history_text}" if history_text else ""}

Student's message: {message}

Respond as a helpful, encouraging AI tutor:"""

    models_to_try = [settings.GEMINI_MODEL, settings.GEMINI_MODEL_PRO]
    last_error = None
    for model in models_to_try:
        try:
            response = await generate_completion(
                system_prompt,
                model=model,
                temperature=0.7,
                max_tokens=2000,
                use_cache=False,
            )
            return response.strip()
        except Exception as e:
            logger.warning("Chatbot failed with %s: %s", model, e)
            last_error = e
            continue

    logger.error("Chatbot failed with all models: %s", last_error)
    return "I'm having trouble connecting right now. Please try again in a moment."
