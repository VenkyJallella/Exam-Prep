# ExamPrep - System Architecture Document
## AI-Powered Competitive Exam Preparation Platform

---

## 1. HIGH-LEVEL SYSTEM ARCHITECTURE

```
                                    ┌─────────────────┐
                                    │   CDN (CloudFront│
                                    │   / Cloudflare)  │
                                    └────────┬────────┘
                                             │
                         ┌───────────────────┼───────────────────┐
                         │                   │                   │
                  ┌──────▼──────┐    ┌───────▼──────┐
                  │  React Web  │    │ Flutter App  │
                  │  (Vite SPA) │    │ (iOS/Android)│
                  └──────┬──────┘    └───────┬──────┘
                         │                   │                   │
                         └───────────────────┼───────────────────┘
                                             │
                                    ┌────────▼────────┐
                                    │  API Gateway /   │
                                    │  Load Balancer   │
                                    │  (Nginx / ALB)   │
                                    └────────┬────────┘
                                             │
                    ┌────────────────────────┬┴────────────────────────┐
                    │                        │                        │
           ┌────────▼────────┐    ┌──────────▼──────────┐   ┌────────▼────────┐
           │  FastAPI         │    │  FastAPI             │   │  FastAPI        │
           │  Instance 1      │    │  Instance 2         │   │  Instance N     │
           │  (Uvicorn)       │    │  (Uvicorn)          │   │  (Uvicorn)      │
           └────────┬────────┘    └──────────┬──────────┘   └────────┬────────┘
                    │                        │                        │
                    └────────────────────────┼────────────────────────┘
                                             │
              ┌──────────────┬───────────────┼───────────────┬──────────────┐
              │              │               │               │              │
     ┌────────▼───┐  ┌──────▼──────┐ ┌──────▼──────┐ ┌─────▼─────┐ ┌─────▼──────┐
     │ PostgreSQL │  │   Redis     │ │  ARQ / Celery│ │ S3/MinIO  │ │ OpenAI /   │
     │ (Primary + │  │ (Cache +    │ │  Workers     │ │ (Media)   │ │ LLM API    │
     │  Replicas) │  │  Pub/Sub)   │ │ (AI Tasks)  │ │           │ │            │
     └────────────┘  └─────────────┘ └─────────────┘ └───────────┘ └────────────┘
```

---

## 2. TECH STACK DECISIONS

| Layer              | Technology                     | Rationale                                        |
|--------------------|--------------------------------|--------------------------------------------------|
| **Backend API**    | FastAPI 0.110+                 | Async native, auto OpenAPI docs, Pydantic validation, high performance |
| **ORM**            | SQLAlchemy 2.0 + Alembic       | Async support, mature, flexible queries          |
| **Database**       | PostgreSQL 16                  | JSONB for question data, full-text search, partitioning |
| **Cache**          | Redis 7                        | Leaderboard sorted sets, caching, pub/sub        |
| **Task Queue**     | ARQ (async) or Celery          | Background AI generation, analytics, emails      |
| **Mobile App**     | Flutter 3.x (Riverpod)        | Single codebase for iOS + Android                |
| **Web App**        | React 18 + Vite 5             | Fast dev server, SPA with client-side routing    |
| **Admin Panel**    | React (same Vite app, route-guarded) | Custom admin UI integrated into web app  |
| **AI/LLM**        | OpenAI API + fallback models   | GPT-4 for generation, with caching layer         |
| **Auth**           | JWT (python-jose) + OAuth2    | Stateless, scalable, FastAPI native support       |
| **File Storage**   | AWS S3 / MinIO                 | Question images, user avatars, reports           |
| **Validation**     | Pydantic v2                    | Request/response validation, serialization       |
| **Search**         | PostgreSQL FTS (→ Meilisearch later) | Start simple, upgrade when needed          |
| **Monitoring**     | Sentry + Prometheus + Grafana  | Error tracking, metrics, dashboards              |
| **CI/CD**          | GitHub Actions                 | Automated testing and deployment                 |
| **Deployment**     | Docker + AWS ECS (or Railway)  | Containerized, horizontally scalable             |

---

## 3. BACKEND ARCHITECTURE (FastAPI)

### 3.1 Project Structure

```
backend/
├── app/
│   ├── main.py                     # FastAPI app entry point
│   ├── config.py                   # Pydantic Settings (env-based config)
│   ├── database.py                 # SQLAlchemy async engine + session
│   ├── dependencies.py             # Shared FastAPI dependencies (get_db, get_current_user)
│   ├── exceptions.py               # Custom exception handlers
│   ├── middleware.py                # CORS, request logging, rate limiting
│   │
│   ├── models/                     # SQLAlchemy models (all DB tables)
│   │   ├── __init__.py             # Re-export all models
│   │   ├── base.py                 # BaseModel (id, created_at, updated_at, is_active)
│   │   ├── user.py                 # User, UserProfile
│   │   ├── exam.py                 # Exam, Subject, Topic
│   │   ├── question.py             # Question
│   │   ├── practice.py             # PracticeSession, UserAnswer
│   │   ├── test.py                 # Test, TestSection, TestAttempt
│   │   ├── adaptive.py             # UserTopicMastery, DifficultyProfile
│   │   ├── analytics.py            # PerformanceSnapshot, TopicStats
│   │   ├── gamification.py         # UserGamification, Badge, XPTransaction
│   │   ├── study_planner.py        # StudyPlan, StudySession
│   │   ├── mistake.py              # MistakeLog
│   │   └── payment.py              # Subscription, Payment (Phase 3)
│   │
│   ├── schemas/                    # Pydantic schemas (request/response)
│   │   ├── __init__.py
│   │   ├── common.py               # PaginatedResponse, APIResponse, ErrorResponse
│   │   ├── auth.py                 # LoginRequest, TokenResponse, RegisterRequest
│   │   ├── user.py                 # UserRead, UserUpdate, ProfileRead
│   │   ├── exam.py                 # ExamRead, SubjectRead, TopicRead
│   │   ├── question.py             # QuestionRead, QuestionCreate, QuestionGenerate
│   │   ├── practice.py             # SessionCreate, AnswerSubmit, SessionResult
│   │   ├── test.py                 # TestRead, AttemptCreate, AttemptResult
│   │   ├── analytics.py            # OverviewStats, TopicPerformance, ProgressData
│   │   ├── gamification.py         # LeaderboardEntry, XPInfo, StreakInfo
│   │   └── mistake.py              # MistakeRead, MistakeUpdate
│   │
│   ├── api/                        # Route handlers (thin — delegate to services)
│   │   ├── __init__.py
│   │   ├── router.py               # Main API router (includes all sub-routers)
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py             # POST /login, /register, /refresh, /otp
│   │   │   ├── users.py            # GET/PATCH /me, GET /me/stats
│   │   │   ├── exams.py            # GET /exams, /exams/{slug}/subjects
│   │   │   ├── questions.py        # GET /questions, POST /generate
│   │   │   ├── practice.py         # POST /sessions, POST /sessions/{id}/answer
│   │   │   ├── tests.py            # GET /tests, POST /tests/{id}/start
│   │   │   ├── analytics.py        # GET /analytics/overview, /topics, /progress
│   │   │   ├── gamification.py     # GET /leaderboard, /me/xp
│   │   │   ├── mistakes.py         # GET /mistakes, PATCH /mistakes/{id}
│   │   │   ├── study_planner.py    # GET/POST /study-planner
│   │   │   └── admin.py            # Admin-only CRUD endpoints
│   │   └── deps.py                 # Route-level dependencies
│   │
│   ├── services/                   # Business logic layer
│   │   ├── __init__.py
│   │   ├── auth_service.py         # Registration, login, token management
│   │   ├── user_service.py         # Profile CRUD, stats
│   │   ├── question_service.py     # Question CRUD, filtering, search
│   │   ├── practice_service.py     # Session management, answer processing
│   │   ├── test_service.py         # Test execution, scoring, auto-submit
│   │   ├── adaptive_service.py     # Mastery calculation, question selection
│   │   ├── analytics_service.py    # Stats aggregation, weak area detection
│   │   ├── gamification_service.py # XP awards, streak tracking, leaderboard
│   │   ├── mistake_service.py      # Mistake logging, revision scheduling
│   │   ├── study_planner_service.py
│   │   └── admin_service.py        # Admin operations
│   │
│   ├── ai/                         # AI/LLM integration
│   │   ├── __init__.py
│   │   ├── client.py               # Async OpenAI client wrapper
│   │   ├── prompts.py              # Prompt templates (Jinja2)
│   │   ├── generator.py            # Question generation logic
│   │   ├── explainer.py            # Explanation generation
│   │   ├── quality.py              # Dedup check, format validation, difficulty calibration
│   │   └── cache.py                # LLM response caching (Redis)
│   │
│   ├── workers/                    # Background task workers
│   │   ├── __init__.py
│   │   ├── arq_worker.py           # ARQ worker config
│   │   ├── ai_tasks.py             # Question generation tasks
│   │   ├── analytics_tasks.py      # Daily aggregation tasks
│   │   └── notification_tasks.py   # Email, push notification tasks
│   │
│   └── core/                       # Shared utilities
│       ├── __init__.py
│       ├── security.py             # JWT encode/decode, password hashing
│       ├── permissions.py          # Role-based access (admin, user, premium)
│       ├── pagination.py           # Cursor + offset pagination
│       ├── cache.py                # Redis cache helpers
│       └── rate_limit.py           # Rate limiting with Redis
│
├── migrations/                     # Alembic migrations
│   ├── env.py
│   ├── versions/
│   └── alembic.ini
│
├── tests/
│   ├── conftest.py                 # Fixtures (async test client, test DB)
│   ├── test_auth.py
│   ├── test_questions.py
│   ├── test_practice.py
│   ├── test_tests.py
│   └── test_analytics.py
│
├── requirements/
│   ├── base.txt
│   ├── dev.txt
│   └── prod.txt
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── pyproject.toml
```

### 3.2 Architecture Pattern: Router → Service → Repository

```python
# app/api/v1/practice.py (THIN — only HTTP concerns)
@router.post("/sessions", response_model=APIResponse[SessionRead])
async def create_session(
    body: SessionCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await practice_service.create_session(db, user.id, body)
    return APIResponse(data=session)

# app/services/practice_service.py (ALL business logic)
async def create_session(
    db: AsyncSession, user_id: UUID, body: SessionCreate
) -> PracticeSession:
    # 1. Fetch questions (adaptive or manual)
    if body.adaptive:
        questions = await adaptive_service.select_questions(db, user_id, body)
    else:
        questions = await question_service.get_by_filters(db, body.filters)

    # 2. Create session
    session = PracticeSession(user_id=user_id, questions=questions, ...)
    db.add(session)
    await db.commit()
    return session
```

### 3.3 FastAPI App Factory

```python
# app/main.py
from fastapi import FastAPI
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: connect DB, Redis, warm caches
    await init_db()
    await init_redis()
    yield
    # Shutdown: close connections
    await close_db()
    await close_redis()

def create_app() -> FastAPI:
    app = FastAPI(
        title="ExamPrep API",
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/api/docs",        # Swagger UI
        redoc_url="/api/redoc",       # ReDoc
    )
    app.include_router(api_router, prefix="/api/v1")
    app.add_middleware(CORSMiddleware, ...)
    app.add_exception_handler(AppException, app_exception_handler)
    return app

app = create_app()
```

### 3.4 Async Database Setup

```python
# app/database.py
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

engine = create_async_engine(
    settings.DATABASE_URL,              # postgresql+asyncpg://...
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
```

---

## 4. DATABASE DESIGN

### 4.1 Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│     User     │       │     Exam     │       │   Subject    │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK,UUID) │       │ id (PK,UUID) │       │ id (PK,UUID) │
│ email        │       │ name         │       │ exam_id (FK) │
│ phone        │       │ slug (unique)│       │ name         │
│ hashed_pass  │       │ description  │       │ slug         │
│ role (enum)  │       │ icon_url     │       │ order (int)  │
│ is_active    │       │ is_active    │       │ is_active    │
│ created_at   │       │ created_at   │       │ created_at   │
└──────┬───────┘       └──────┬───────┘       └──────┬───────┘
       │                      │                      │
       │               ┌──────┘                      │
       │               │                             │
┌──────▼───────┐       │                ┌────────────▼──┐
│ UserProfile  │       │                │    Topic       │
├──────────────┤       │                ├───────────────┤
│ id (PK)      │       │                │ id (PK, UUID) │
│ user_id (FK) │       │                │ subject_id(FK)│
│ display_name │       │                │ parent_id(FK) │ ← Self-ref (subtopics)
│ avatar_url   │       │                │ name          │
│ target_exam  │───────┘                │ slug          │
│ target_date  │                        │ order (int)   │
│ daily_goal   │                        └───────┬───────┘
│ preferences  │ (JSONB)                        │
└──────────────┘                                │
                                                │
                              ┌─────────────────▼──────────────────┐
                              │           Question                 │
                              ├────────────────────────────────────┤
                              │ id (PK, UUID)                      │
                              │ topic_id (FK)                      │
                              │ exam_id (FK)                       │
                              │ question_text (text)               │
                              │ question_type (mcq/msq/numerical)  │
                              │ difficulty (1-5)                   │
                              │ options (JSONB)                    │ ← {"A":"...","B":"...","C":"...","D":"..."}
                              │ correct_answer (JSONB)             │ ← ["A"] or ["A","C"] for MSQ
                              │ explanation (text)                 │
                              │ source (ai/manual/imported)        │
                              │ language (en/hi)                   │
                              │ tags (JSONB)                       │ ← ["kinematics","newton"]
                              │ metadata (JSONB)                   │ ← year, paper, extra info
                              │ is_verified (bool)                 │
                              │ is_active (bool)                   │
                              │ times_attempted (int)              │ ← denormalized counter
                              │ times_correct (int)                │ ← denormalized counter
                              │ avg_time_seconds (float)           │
                              │ created_at / updated_at            │
                              └──────────┬─────────────────────────┘
                                         │
            ┌────────────────────────────┬┴──────────────────────────┐
            │                            │                           │
  ┌─────────▼──────────┐   ┌────────────▼──────────┐   ┌───────────▼──────────┐
  │   UserAnswer       │   │     Test               │   │   MistakeLog         │
  ├────────────────────┤   ├────────────────────────┤   ├──────────────────────┤
  │ id (PK, UUID)      │   │ id (PK, UUID)          │   │ id (PK, UUID)        │
  │ user_id (FK)       │   │ exam_id (FK)           │   │ user_id (FK)         │
  │ question_id (FK)   │   │ title                  │   │ question_id (FK)     │
  │ session_id (FK)    │   │ description            │   │ user_answer_id (FK)  │
  │ selected_answer    │   │ test_type (mock/topic/ │   │ topic_id (FK)        │
  │ is_correct (bool)  │   │   sectional/custom)    │   │ difficulty (1-5)     │
  │ time_taken_sec     │   │ total_marks (int)      │   │ revision_count (int) │
  │ xp_earned (int)    │   │ duration_minutes (int) │   │ last_revised_at      │
  │ created_at         │   │ negative_marking_pct   │   │ is_resolved (bool)   │
  └────────────────────┘   │ questions (M2M)        │   │ notes (text)         │
                           │ is_published (bool)    │   │ created_at           │
                           │ created_by (FK)        │   └──────────────────────┘
                           └────────────┬───────────┘
                                        │
                           ┌────────────▼───────────┐
                           │    TestAttempt          │
                           ├────────────────────────┤
                           │ id (PK, UUID)          │
                           │ user_id (FK)           │
                           │ test_id (FK)           │
                           │ started_at             │
                           │ submitted_at           │
                           │ auto_submitted (bool)  │
                           │ total_score (float)    │
                           │ max_score (float)      │
                           │ accuracy_pct (float)   │
                           │ time_taken_sec (int)   │
                           │ section_scores (JSONB) │
                           │ rank (int, nullable)   │
                           │ status (enum)          │ ← in_progress/submitted/expired
                           └────────────────────────┘

  ┌────────────────────────┐    ┌────────────────────────┐
  │  UserTopicMastery      │    │  PerformanceSnapshot   │
  ├────────────────────────┤    ├────────────────────────┤
  │ id (PK, UUID)          │    │ id (PK, UUID)          │
  │ user_id (FK)           │    │ user_id (FK)           │
  │ topic_id (FK)          │    │ exam_id (FK)           │
  │ mastery_level (0-100)  │    │ snapshot_date (date)   │
  │ questions_attempted    │    │ overall_accuracy       │
  │ questions_correct      │    │ total_questions        │
  │ avg_time_seconds       │    │ total_time_minutes     │
  │ current_difficulty     │    │ topic_breakdown (JSONB)│
  │ streak_count           │    │ percentile_rank        │
  │ last_practiced_at      │    │ created_at             │
  │ UNIQUE(user,topic)     │    └────────────────────────┘
  └────────────────────────┘

  ┌────────────────────────┐    ┌────────────────────────┐
  │  UserGamification      │    │  StudyPlan             │
  ├────────────────────────┤    ├────────────────────────┤
  │ id (PK, UUID)          │    │ id (PK, UUID)          │
  │ user_id (FK, unique)   │    │ user_id (FK)           │
  │ total_xp (int)         │    │ exam_id (FK)           │
  │ level (int)            │    │ target_date (date)     │
  │ current_streak (int)   │    │ daily_hours (float)    │
  │ longest_streak (int)   │    │ schedule (JSONB)       │ ← [{day, topics, hours}]
  │ last_active_date       │    │ is_active (bool)       │
  │ badges (JSONB)         │    │ created_at             │
  └────────────────────────┘    └────────────────────────┘
```

### 4.2 Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **UUID primary keys** | Prevents enumeration attacks, safe for public URLs |
| **JSONB for options/tags** | Flexible schema for MCQ/MSQ/numerical question formats |
| **Soft delete (`is_active`)** | Never lose question or user data |
| **Denormalized counters** | `times_attempted`, `times_correct` on Question avoids COUNT queries |
| **`UserTopicMastery` table** | Precomputed mastery scores for fast adaptive queries |
| **Daily `PerformanceSnapshot`** | Background task aggregates daily — avoids real-time analytics overhead |
| **Self-referential Topic** | Supports hierarchy: Physics → Mechanics → Kinematics |
| **Enum types via SQLAlchemy** | `role`, `question_type`, `source`, `status` as Python enums |

### 4.3 Index Strategy

```sql
-- High-traffic query indexes
CREATE INDEX idx_question_topic_diff ON question(topic_id, difficulty) WHERE is_active = true;
CREATE INDEX idx_question_exam_type ON question(exam_id, question_type) WHERE is_active = true;
CREATE INDEX idx_useranswer_user_session ON user_answer(user_id, session_id);
CREATE INDEX idx_useranswer_user_question ON user_answer(user_id, question_id);
CREATE INDEX idx_testattempt_user ON test_attempt(user_id, started_at DESC);
CREATE INDEX idx_mastery_user_topic ON user_topic_mastery(user_id, topic_id);
CREATE INDEX idx_mistake_user ON mistake_log(user_id, is_resolved) WHERE is_resolved = false;
CREATE INDEX idx_perf_user_date ON performance_snapshot(user_id, snapshot_date DESC);
CREATE INDEX idx_gamification_xp ON user_gamification(total_xp DESC);  -- Leaderboard backup
```

### 4.4 Partitioning Plan

| Table | Strategy | Rationale |
|-------|----------|-----------|
| `user_answer` | Range partition by `created_at` (monthly) | Highest write volume |
| `performance_snapshot` | Range partition by `snapshot_date` | Time-series data |
| `question` | No partition needed initially | ~500K rows is fine |

---

## 5. API DESIGN

### 5.1 URL Structure

```
/api/v1/
├── auth/
│   ├── POST   register/              # Email/phone registration
│   ├── POST   login/                 # JWT login
│   ├── POST   refresh/               # Refresh access token
│   ├── POST   logout/                # Blacklist refresh token
│   ├── POST   otp/send/              # Phone OTP
│   ├── POST   otp/verify/            # Verify OTP
│   ├── POST   password/reset/        # Request password reset
│   ├── POST   password/reset/confirm/ # Confirm reset
│   └── POST   social/{provider}/     # Google/Apple OAuth
│
├── users/
│   ├── GET    me/                     # Current user profile
│   ├── PATCH  me/                     # Update profile
│   ├── GET    me/stats/               # Quick stats summary
│   └── DELETE me/                     # Account deletion (soft)
│
├── exams/
│   ├── GET    /                       # List all exams
│   ├── GET    {slug}/                 # Exam detail
│   ├── GET    {slug}/subjects/        # Subjects for exam
│   └── GET    {slug}/subjects/{id}/topics/  # Topics tree
│
├── questions/
│   ├── GET    /                       # List questions (filtered, paginated)
│   ├── GET    {id}/                   # Question detail
│   ├── POST   generate/              # AI generate (async → returns task_id)
│   ├── GET    generate/{task_id}/     # Poll generation status
│   └── POST   {id}/report/           # Report a question
│
├── practice/
│   ├── POST   sessions/              # Start practice session
│   ├── GET    sessions/{id}/          # Get session with questions
│   ├── POST   sessions/{id}/answer/   # Submit single answer
│   ├── POST   sessions/{id}/complete/ # End session
│   └── GET    sessions/{id}/results/  # Session results + explanations
│
├── tests/
│   ├── GET    /                       # List available tests
│   ├── GET    {id}/                   # Test meta (not questions)
│   ├── POST   {id}/start/            # Start attempt → returns questions
│   ├── POST   attempts/{id}/answer/   # Submit answer during test
│   ├── POST   attempts/{id}/submit/   # Submit test (manual or auto)
│   ├── GET    attempts/{id}/results/  # Detailed results
│   └── GET    attempts/              # User's test history
│
├── analytics/
│   ├── GET    overview/               # Dashboard: accuracy, speed, streak
│   ├── GET    topics/                 # Topic-wise performance
│   ├── GET    progress/               # Progress over time (chart data)
│   ├── GET    speed/                  # Avg time per question, trends
│   └── GET    weak-areas/             # AI-detected weak areas
│
├── mistakes/
│   ├── GET    /                       # Paginated mistake log
│   ├── GET    {id}/                   # Mistake detail + question
│   ├── PATCH  {id}/                   # Add notes, mark resolved
│   └── GET    revision/               # Questions due for revision
│
├── gamification/
│   ├── GET    me/                     # My XP, streak, level, badges
│   ├── GET    leaderboard/            # Global leaderboard (paginated)
│   ├── GET    leaderboard/exam/{id}/  # Exam-specific leaderboard
│   └── GET    leaderboard/weekly/     # Weekly leaderboard
│
├── study-planner/
│   ├── GET    /                       # Current study plan
│   ├── POST   /                       # Create/update plan
│   ├── GET    today/                  # Today's schedule
│   └── POST   log/                   # Log study session completion
│
└── admin/                             # Admin-only (role check)
    ├── GET    dashboard/              # Signups, DAU, revenue, question stats
    ├── CRUD   questions/              # Manage questions + bulk import
    ├── CRUD   tests/                  # Manage tests
    ├── CRUD   exams/                  # Manage exam taxonomy
    ├── GET    users/                  # User list + search
    ├── PATCH  users/{id}/             # Suspend/activate user
    ├── GET    ai/queue/               # AI generation queue status
    ├── POST   ai/generate/            # Trigger bulk generation
    └── GET    reports/                # System reports
```

### 5.2 Consistent Response Format

```python
# app/schemas/common.py
from pydantic import BaseModel
from typing import Generic, TypeVar, Optional

T = TypeVar("T")

class APIResponse(BaseModel, Generic[T]):
    status: str = "success"
    data: T
    meta: Optional[dict] = None        # pagination info

class ErrorResponse(BaseModel):
    status: str = "error"
    error: ErrorDetail

class ErrorDetail(BaseModel):
    code: str                           # e.g. "VALIDATION_ERROR"
    message: str
    details: Optional[dict] = None      # field-level errors
```

```json
// Success
{
  "status": "success",
  "data": { ... },
  "meta": { "page": 1, "per_page": 20, "total": 1500, "total_pages": 75 }
}

// Error
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": { "email": ["This field is required."] }
  }
}
```

### 5.3 Authentication Flow

```
JWT Auth (FastAPI OAuth2PasswordBearer):

1. POST /auth/login → returns { access_token (15min), refresh_token (7d) }
2. Client stores:
   - Web: access_token in memory, refresh_token in httpOnly cookie
   - Mobile: both in Flutter secure_storage
3. All API calls: Authorization: Bearer <access_token>
4. On 401: POST /auth/refresh with refresh_token → new access_token
5. POST /auth/logout → blacklist refresh_token in Redis (TTL = remaining expiry)
```

```python
# app/core/security.py
from fastapi.security import OAuth2PasswordBearer
from jose import jwt

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    user = await db.get(User, payload["sub"])
    if not user or not user.is_active:
        raise HTTPException(401, "Invalid token")
    return user

def require_role(*roles: str):
    """Dependency: require_role("admin", "moderator")"""
    async def checker(user: User = Depends(get_current_user)):
        if user.role not in roles:
            raise HTTPException(403, "Insufficient permissions")
        return user
    return checker
```

---

## 6. FRONTEND ARCHITECTURE (React + Vite)

### 6.1 Project Structure

```
web/
├── src/
│   ├── main.tsx                     # App entry point
│   ├── App.tsx                      # Root component + React Router
│   │
│   ├── routes/                      # React Router v6 pages
│   │   ├── index.tsx                # Route definitions
│   │   │
│   │   ├── marketing/              # Public / landing pages
│   │   │   ├── HomePage.tsx         # Landing page (hero, features, CTA)
│   │   │   ├── AboutPage.tsx
│   │   │   ├── PricingPage.tsx
│   │   │   ├── ExamDetailPage.tsx   # /exams/:slug
│   │   │   └── BlogPostPage.tsx     # /blog/:slug
│   │   │
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   └── ResetPasswordPage.tsx
│   │   │
│   │   ├── dashboard/              # Protected app routes
│   │   │   ├── DashboardLayout.tsx  # Sidebar + topbar shell
│   │   │   ├── DashboardPage.tsx    # Home dashboard
│   │   │   ├── PracticePage.tsx     # Topic/exam selection
│   │   │   ├── PracticeSessionPage.tsx  # Active practice
│   │   │   ├── TestListPage.tsx     # Test catalog
│   │   │   ├── TestDetailPage.tsx   # Test info
│   │   │   ├── TestAttemptPage.tsx  # Active test (full-screen)
│   │   │   ├── AnalyticsPage.tsx
│   │   │   ├── MistakesPage.tsx
│   │   │   ├── LeaderboardPage.tsx
│   │   │   ├── PlannerPage.tsx
│   │   │   └── ProfilePage.tsx      # Profile + settings
│   │   │
│   │   └── admin/                   # Admin routes (role-guarded)
│   │       ├── AdminLayout.tsx      # Admin sidebar
│   │       ├── AdminDashboard.tsx
│   │       ├── AdminQuestions.tsx
│   │       ├── AdminTests.tsx
│   │       ├── AdminUsers.tsx
│   │       ├── AdminExams.tsx
│   │       └── AdminAIQueue.tsx
│   │
│   ├── components/
│   │   ├── ui/                      # shadcn/ui design system
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Dialog.tsx
│   │   │   ├── DataTable.tsx
│   │   │   ├── Chart.tsx            # Recharts wrapper
│   │   │   └── ...
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Topbar.tsx
│   │   │   ├── MobileNav.tsx
│   │   │   ├── AdminSidebar.tsx
│   │   │   ├── AuthGuard.tsx        # Redirect if not authenticated
│   │   │   └── RoleGuard.tsx        # Redirect if not admin
│   │   ├── marketing/
│   │   │   ├── Hero.tsx
│   │   │   ├── Features.tsx
│   │   │   ├── ExamCards.tsx
│   │   │   ├── Testimonials.tsx
│   │   │   └── CTASection.tsx
│   │   ├── question/
│   │   │   ├── QuestionCard.tsx
│   │   │   ├── OptionSelector.tsx
│   │   │   ├── ExplanationPanel.tsx
│   │   │   └── QuestionTimer.tsx
│   │   ├── test/
│   │   │   ├── TestInterface.tsx
│   │   │   ├── QuestionPalette.tsx   # Question navigation grid
│   │   │   └── CountdownTimer.tsx
│   │   ├── analytics/
│   │   │   ├── AccuracyChart.tsx
│   │   │   ├── TopicHeatmap.tsx
│   │   │   ├── ProgressGraph.tsx
│   │   │   └── WeakAreaCards.tsx
│   │   └── profile/
│   │       ├── ProfileHeader.tsx     # Avatar, name, stats summary
│   │       ├── ActivityCalendar.tsx   # GitHub-style heatmap
│   │       ├── BadgeGrid.tsx
│   │       └── ExamProgress.tsx
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useTimer.ts
│   │   ├── usePractice.ts
│   │   └── useInfiniteScroll.ts
│   │
│   ├── lib/
│   │   ├── api/                     # API client (axios + interceptors)
│   │   │   ├── client.ts            # Axios instance, auth interceptor
│   │   │   ├── auth.ts
│   │   │   ├── questions.ts
│   │   │   ├── tests.ts
│   │   │   ├── analytics.ts
│   │   │   └── admin.ts
│   │   ├── store/                   # Zustand stores
│   │   │   ├── authStore.ts
│   │   │   ├── practiceStore.ts
│   │   │   └── testStore.ts
│   │   └── utils/
│   │       ├── formatters.ts
│   │       └── seo.ts               # react-helmet-async helpers
│   │
│   └── styles/
│       └── globals.css              # Tailwind CSS
│
├── public/
│   ├── robots.txt
│   └── _redirects                   # SPA fallback for hosting (Netlify/Vercel)
├── index.html                       # Vite entry HTML
├── vite.config.ts
├── tailwind.config.ts
├── package.json
└── tsconfig.json
```

### 6.2 UI Design Principles

| Principle | Implementation |
|-----------|---------------|
| **Mobile-first** | All layouts start at 320px, scale up |
| **SEO** | Prerender.io / react-snap for public pages + react-helmet-async for meta tags (see Section 11) |
| **Performance** | Vite code splitting per route (React.lazy), lazy-load charts, optimized images |
| **Design System** | shadcn/ui + Tailwind CSS — consistent, accessible |
| **Dark Mode** | System preference + manual toggle (CSS class strategy) |
| **Charts** | Recharts for analytics (lightweight, composable) |
| **Tables** | TanStack Table for admin data tables (sort, filter, paginate) |
| **Routing** | React Router v6 with lazy routes, auth guards, role guards |

### 6.3 Profile Page Design

```
┌─────────────────────────────────────────────────────────┐
│  Profile Header                                          │
│  ┌─────────┐  Rahul Kumar                               │
│  │  Avatar  │  UPSC Aspirant · Joined Jan 2026          │
│  │         │  🔥 15-day streak  ·  Level 12  · 4,520 XP │
│  └─────────┘  [Edit Profile]                            │
├─────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ Questions │ │ Accuracy │ │ Tests    │ │  Rank    │   │
│  │  1,245   │ │  72.3%   │ │   28     │ │  #347    │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
├─────────────────────────────────────────────────────────┤
│  Activity Calendar (GitHub-style heatmap)                │
│  ░░▓▓█░░▓▓▓█░░░▓▓▓▓█▓▓░░▓█▓▓▓▓▓█▓▓░░▓▓▓██▓          │
│  Jan        Feb        Mar                              │
├─────────────────────────────────────────────────────────┤
│  Topic Mastery                        Badges            │
│  ┌─────────────────────┐              ┌────┐┌────┐     │
│  │ Polity     ████░ 82%│              │ 🏆 ││ ⚡ │     │
│  │ History    ███░░ 65%│              └────┘└────┘     │
│  │ Geography  ██░░░ 45%│              ┌────┐┌────┐     │
│  │ Economy    ████░ 78%│              │ 📚 ││ 🎯 │     │
│  └─────────────────────┘              └────┘└────┘     │
├─────────────────────────────────────────────────────────┤
│  Recent Activity                                        │
│  · Completed "Indian Polity" mock test — 76% (2h ago)  │
│  · Practiced 25 questions in Geography (5h ago)         │
│  · Achieved "Week Warrior" badge (yesterday)            │
└─────────────────────────────────────────────────────────┘
```

### 6.4 Admin Panel Features

```
Admin Panel (Role: admin only):
├── Dashboard         → Signups chart, DAU, revenue, questions generated today
├── Question Manager  → DataTable with filters, bulk import CSV, trigger AI gen
├── Test Manager      → Create/edit tests, drag-drop question ordering, publish
├── User Manager      → Search users, view activity, suspend/ban
├── Exam Taxonomy     → Manage exams → subjects → topics tree
├── AI Queue          → View generation jobs, retry failed, quality stats
├── Content Review    → Approve/reject AI-generated questions
├── Reports           → Export CSV, system health, usage analytics
└── Settings          → Feature flags, notification templates
```

---

## 7. FLUTTER MOBILE APP ARCHITECTURE

### 7.1 Project Structure

```
mobile/
├── lib/
│   ├── main.dart
│   ├── app.dart                     # MaterialApp + GoRouter
│   │
│   ├── core/
│   │   ├── config/
│   │   │   ├── app_config.dart      # Environment config
│   │   │   ├── api_config.dart      # Base URLs
│   │   │   └── theme/
│   │   │       ├── app_theme.dart   # Light + dark theme
│   │   │       ├── colors.dart
│   │   │       └── typography.dart
│   │   ├── network/
│   │   │   ├── api_client.dart      # Dio HTTP client
│   │   │   ├── interceptors/
│   │   │   │   ├── auth_interceptor.dart
│   │   │   │   ├── error_interceptor.dart
│   │   │   │   └── cache_interceptor.dart
│   │   │   └── api_response.dart
│   │   ├── storage/
│   │   │   └── secure_storage.dart  # flutter_secure_storage
│   │   ├── routing/
│   │   │   └── app_router.dart      # GoRouter + guards
│   │   └── utils/
│   │       ├── extensions.dart
│   │       ├── formatters.dart
│   │       └── validators.dart
│   │
│   ├── features/                    # Feature-first architecture
│   │   ├── auth/
│   │   │   ├── data/
│   │   │   │   ├── auth_repository.dart
│   │   │   │   └── auth_api.dart
│   │   │   ├── domain/
│   │   │   │   └── auth_state.dart
│   │   │   ├── presentation/
│   │   │   │   ├── login_screen.dart
│   │   │   │   ├── register_screen.dart
│   │   │   │   ├── otp_screen.dart
│   │   │   │   └── widgets/
│   │   │   │       ├── social_login_buttons.dart
│   │   │   │       └── otp_input.dart
│   │   │   └── providers/
│   │   │       └── auth_provider.dart     # Riverpod
│   │   │
│   │   ├── home/
│   │   │   └── presentation/
│   │   │       ├── home_screen.dart
│   │   │       └── widgets/
│   │   │           ├── streak_card.dart
│   │   │           ├── daily_goal_ring.dart
│   │   │           ├── quick_practice_grid.dart
│   │   │           ├── continue_section.dart
│   │   │           └── leaderboard_preview.dart
│   │   │
│   │   ├── practice/
│   │   │   ├── data/
│   │   │   │   ├── practice_repository.dart
│   │   │   │   └── practice_api.dart
│   │   │   ├── presentation/
│   │   │   │   ├── topic_select_screen.dart
│   │   │   │   ├── practice_screen.dart
│   │   │   │   ├── practice_result_screen.dart
│   │   │   │   └── widgets/
│   │   │   │       ├── question_view.dart
│   │   │   │       ├── option_tile.dart
│   │   │   │       └── explanation_sheet.dart
│   │   │   └── providers/
│   │   │       └── practice_provider.dart
│   │   │
│   │   ├── test/
│   │   │   ├── data/
│   │   │   ├── presentation/
│   │   │   │   ├── test_list_screen.dart
│   │   │   │   ├── test_info_screen.dart
│   │   │   │   ├── test_screen.dart       # Full-screen immersive
│   │   │   │   ├── test_result_screen.dart
│   │   │   │   └── widgets/
│   │   │   │       ├── question_palette.dart
│   │   │   │       ├── countdown_timer.dart
│   │   │   │       └── section_tabs.dart
│   │   │   └── providers/
│   │   │
│   │   ├── analytics/
│   │   │   ├── presentation/
│   │   │   │   ├── analytics_screen.dart
│   │   │   │   └── widgets/
│   │   │   │       ├── accuracy_chart.dart    # fl_chart
│   │   │   │       ├── topic_bars.dart
│   │   │   │       ├── progress_line.dart
│   │   │   │       └── weak_area_card.dart
│   │   │   └── providers/
│   │   │
│   │   ├── mistakes/
│   │   │   ├── presentation/
│   │   │   │   ├── mistake_list_screen.dart
│   │   │   │   └── mistake_review_screen.dart
│   │   │   └── providers/
│   │   │
│   │   ├── leaderboard/
│   │   │   └── presentation/
│   │   │       └── leaderboard_screen.dart
│   │   │
│   │   ├── planner/
│   │   │   └── presentation/
│   │   │       ├── planner_screen.dart
│   │   │       └── widgets/
│   │   │           ├── calendar_strip.dart
│   │   │           └── daily_plan_card.dart
│   │   │
│   │   └── profile/
│   │       └── presentation/
│   │           ├── profile_screen.dart
│   │           ├── edit_profile_screen.dart
│   │           ├── settings_screen.dart
│   │           └── widgets/
│   │               ├── profile_header.dart
│   │               ├── stats_row.dart
│   │               ├── activity_heatmap.dart
│   │               ├── mastery_list.dart
│   │               └── badge_grid.dart
│   │
│   └── shared/
│       ├── widgets/
│       │   ├── app_scaffold.dart
│       │   ├── bottom_nav_bar.dart
│       │   ├── loading_shimmer.dart
│       │   └── error_retry.dart
│       └── models/                  # Freezed data classes
│           ├── user.dart
│           ├── question.dart
│           ├── test.dart
│           └── analytics.dart
│
├── assets/
│   ├── images/
│   ├── icons/
│   ├── lottie/                      # Animations (streak, level-up)
│   └── fonts/
├── pubspec.yaml
└── test/
```

### 7.2 Key Flutter Packages

| Package | Purpose |
|---------|---------|
| `flutter_riverpod` | State management |
| `go_router` | Declarative routing + deep links |
| `dio` | HTTP client with interceptors |
| `flutter_secure_storage` | Token storage |
| `freezed` + `json_serializable` | Immutable data classes |
| `fl_chart` | Charts (analytics) |
| `cached_network_image` | Image caching |
| `flutter_local_notifications` | Push notifications |
| `lottie` | Animations (streak, level-up, badges) |

### 7.3 Screen Flow

```
Splash → Auth Check
  ├── Not logged in → Login/Register → OTP → Home
  └── Logged in → Home

Home (Bottom Nav):
  ├── Home       → Dashboard with streak, daily goal, quick actions
  ├── Practice   → Select exam → topic → practice questions → results
  ├── Tests      → Browse tests → test info → take test → results
  ├── Analytics  → Charts, topic performance, weak areas
  └── Profile    → Stats, activity, badges, settings

Test Flow (full-screen, no nav bar):
  Start → Questions (swipe/tap) + Timer + Palette → Submit → Results
```

---

## 8. AI INTEGRATION

### 8.1 Question Generation Pipeline

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Admin / Cron │     │  ARQ Worker  │     │  OpenAI API  │     │  Quality     │
│ Trigger      │────►│  Queue       │────►│  (async)     │────►│  Pipeline    │
└──────────────┘     └──────────────┘     └──────────────┘     └──────┬───────┘
                                                                      │
                                                          ┌───────────┼───────────┐
                                                          │           │           │
                                                    ┌─────▼───┐ ┌────▼────┐ ┌────▼────┐
                                                    │ Dedup   │ │ Format  │ │ Diff    │
                                                    │ (embed  │ │ Valid.  │ │ Calib.  │
                                                    │ cosine) │ │ (JSON)  │ │ Check   │
                                                    └─────┬───┘ └────┬────┘ └────┬────┘
                                                          └──────────┼───────────┘
                                                                     ▼
                                                          Store as is_verified=false
                                                                     ▼
                                                          Admin Review Queue
                                                          (approve / edit / reject)
```

### 8.2 Prompt Templates

```python
# app/ai/prompts.py

QUESTION_GENERATION = """
You are an expert question paper setter for {exam_name} ({exam_full_name}) competitive exam in India.

Generate {count} multiple-choice questions.
- Subject: {subject_name}
- Topic: {topic_name}
- Difficulty: {difficulty}/5 (1=basic recall, 3=application, 5=analysis)

Rules:
- Match actual {exam_name} exam pattern and difficulty
- Each question: exactly 4 options (A, B, C, D), one correct answer
- Include a clear 2-3 sentence explanation for the correct answer
- Test conceptual understanding, not rote memorization
- No ambiguous or controversial questions
- Use Indian English conventions

Return valid JSON array:
[{{
  "question_text": "...",
  "options": {{"A": "...", "B": "...", "C": "...", "D": "..."}},
  "correct_answer": "A",
  "explanation": "...",
  "tags": ["keyword1", "keyword2"]
}}]
"""

EXPLANATION_GENERATION = """
You are a {exam_name} exam tutor. A student answered this question incorrectly.

Question: {question_text}
Options: {options}
Correct Answer: {correct_answer}
Student's Answer: {student_answer}

Provide:
1. Why the correct answer is right (2-3 sentences)
2. Why the student's answer is wrong (1-2 sentences)
3. A memory tip or concept connection to remember this

Keep it concise and encouraging.
"""
```

### 8.3 Cost Optimization

| Strategy | Implementation |
|----------|---------------|
| **Response caching** | Hash prompt → cache in Redis (24h TTL) |
| **Batch generation** | 10-20 questions per API call |
| **Model tiering** | GPT-4o for hard/verified, GPT-4o-mini for easy/medium |
| **Off-peak generation** | Cron job generates during low-traffic hours (2-6 AM IST) |
| **Prompt optimization** | Structured output mode to reduce token waste |

---

## 9. ADAPTIVE LEARNING ENGINE

### 9.1 Algorithm

```
Input:
  ├── UserTopicMastery (all topics for user's target exam)
  ├── Last 50 answers (accuracy, time, difficulty)
  └── Exam syllabus weightage

Algorithm:
  1. mastery_score per topic = weighted(
       accuracy × 0.4,
       recency_decay × 0.2,
       consistency × 0.2,
       speed_efficiency × 0.2
     )

  2. Classify topics:
     - Weak: mastery < 40
     - Medium: 40 ≤ mastery < 70
     - Strong: mastery ≥ 70

  3. Question selection weights:
     - 50% from weak topics (prioritize improvement)
     - 30% from medium topics (build to strong)
     - 20% from strong topics (retention + prevent decay)

  4. Difficulty adjustment:
     - 3+ correct streak in topic → difficulty +1
     - 2+ wrong streak → difficulty -1
     - Otherwise → maintain current_difficulty

  5. Spaced repetition:
     - Mistakes revisited at intervals: 1d, 3d, 7d, 14d, 30d

Output: Ranked list of (question_id, priority_score)
```

---

## 10. SCALABILITY & PERFORMANCE

### 10.1 High User Load Strategy

```
Target: 100K+ concurrent users

Web Layer:
  ├── CloudFront CDN for React SPA static bundle + assets
  ├── Prerender.io for SEO (serves pre-rendered HTML to bots)
  ├── Nginx → ALB → FastAPI instances (auto-scale 2-20)
  └── WebSocket support via FastAPI for real-time test timer sync

Application Layer:
  ├── Fully async (FastAPI + asyncpg + aioredis)
  ├── Connection pooling (SQLAlchemy async pool, size=20)
  ├── Stateless JWT auth → horizontal scaling
  └── Request rate limiting per user (Redis token bucket)

Database Layer:
  ├── PostgreSQL primary + 2 read replicas
  ├── Read replica routing for all GET endpoints
  ├── PgBouncer for connection pooling
  ├── Table partitioning (user_answer, performance_snapshot)
  └── Materialized views for analytics dashboards

Cache Layer (Redis):
  ├── Question lists by topic (TTL: 5min)
  ├── Leaderboard (sorted sets, real-time)
  ├── User session/mastery data (TTL: 15min)
  ├── AI response cache (TTL: 24h)
  └── Rate limit counters

Background Workers:
  ├── ai_queue: Question generation (rate-limited, low priority)
  ├── analytics_queue: Daily aggregation, snapshot creation
  └── notification_queue: Email, push (high priority)
```

### 10.2 Performance Targets

| Metric | Target |
|--------|--------|
| API response (p95) | < 200ms |
| Question fetch | < 100ms (cached) |
| Test submission scoring | < 500ms |
| AI question generation | < 30s (async, user polls) |
| Page load (LCP) | < 2.5s |
| Mobile app cold start | < 2s |

---

## 11. SEO STRATEGY (SPA without SSR)

Since we're using a React SPA (no server-side rendering), SEO requires a different approach:

```
Strategy: Prerendering + FastAPI-served meta pages

┌──────────────────────────────────────────────────────────────┐
│                    SEO Architecture                           │
│                                                               │
│  Google Bot Request                                           │
│       │                                                       │
│       ▼                                                       │
│  ┌─────────────┐    Is bot?     ┌──────────────────┐         │
│  │   Nginx     │───── Yes ─────►│  Prerender.io    │         │
│  │   (proxy)   │                │  (cached HTML)   │         │
│  │             │                └──────────────────┘         │
│  │             │                                              │
│  │             │───── No ──────► React SPA (normal)          │
│  └─────────────┘                                              │
└──────────────────────────────────────────────────────────────┘

Pages that need SEO (public routes):
├── /                           → Landing page
├── /exams/:slug                → "UPSC Exam Preparation Online"
├── /exams/:slug/syllabus       → "UPSC Syllabus 2026 - Complete Guide"
├── /about, /pricing, /contact
└── /blog/:slug                 → Exam tips, strategies

Pages that DON'T need SEO (behind auth):
├── /dashboard, /practice, /tests, /analytics
├── /profile, /mistakes, /leaderboard, /planner
└── /admin/*

SEO Implementation:
├── react-helmet-async         → Dynamic <title>, <meta>, OG tags per route
├── Prerender.io (or react-snap at build time) → Pre-rendered HTML for bots
├── JSON-LD structured data    → Course, FAQ, BreadcrumbList schemas
├── /sitemap.xml               → Generated by FastAPI endpoint (dynamic)
├── /robots.txt                → Static in public/
├── hreflang tags              → English + Hindi
├── OG images                  → Static per exam (designed in Figma, stored in CDN)
└── Blog content               → Fetched from API, rendered with react-helmet meta
```

### Why this works well:
- **Prerender.io** caches HTML snapshots of public pages for search engines
- **react-helmet-async** sets correct `<title>`, `<meta description>`, OG tags per page
- Google can index SPA content via prerendering (used by major SPA sites)
- Dashboard/app pages don't need SEO — they're behind authentication
- **Sitemap** is generated by FastAPI from the database (exams, topics, blog posts)

---

## 12. DEVELOPMENT PHASES

### Phase 1 — MVP (Weeks 1-6)

| Week | Backend (FastAPI) | Web (React + Vite) | Mobile (Flutter) |
|------|-------------------|--------------------|-----------------|
| 1-2 | Project setup, Docker, CI. Auth (JWT + OTP). User, Exam, Subject, Topic models + migrations. | Vite + React Router setup, Tailwind, shadcn/ui. Auth pages. Landing page. | Flutter setup, Riverpod, GoRouter. Auth screens. |
| 3-4 | Question model + CRUD API. Basic AI generation endpoint. Practice session API (start, answer, complete). | Home dashboard. Practice flow UI. Question components. | Home screen. Practice flow. Question UI. |
| 5-6 | Basic analytics API. Mistake log API. Admin endpoints. | Analytics page (basic). Mistakes page. Admin: question manager. Profile page. | Analytics screen. Mistakes screen. Profile screen. |

**MVP**: Register → pick exam → practice AI questions → see accuracy → review mistakes.

### Phase 2 — Core (Weeks 7-12)

| Week | Backend | Web | Mobile |
|------|---------|-----|--------|
| 7-8 | Mock test engine (timer, neg marking, auto-submit, scoring). Test CRUD for admin. | Test UI (full-screen, timer, palette). Results page. Admin: test manager. | Test screens (immersive mode). Results. |
| 9-10 | AI explanation generation. Leaderboard API (Redis). Gamification engine (XP, streaks). | Explanation panel. Leaderboard page. XP/streak widgets. | Explanations. Leaderboard. Gamification widgets. |
| 11-12 | Push notifications. Performance optimization. Load testing. | Dark mode. Prerender SEO setup. Polish. | Push notifications. Dark mode. Polish. |

### Phase 3 — Advanced (Weeks 13-18)

| Week | Backend | Web | Mobile |
|------|---------|-----|--------|
| 13-14 | Adaptive learning engine. Study planner API. | Adaptive practice mode. Study planner with calendar. | Adaptive mode. Planner. |
| 15-16 | Razorpay payment integration. Subscription tiers. Advanced admin analytics. | Pricing page. Payment flow. Admin analytics dashboard. | In-app purchase / payment. |
| 17-18 | Hindi language support. Read replicas. Final performance tuning. | Multi-language. SEO audit + prerender tuning. Final polish. | Hindi support. Final polish. |

---

## 13. REPOSITORY STRUCTURE

```
examprep/                           # Monorepo root
├── backend/                        # FastAPI (see section 3.1)
├── web/                            # React + Vite (see section 6.1)
├── mobile/                         # Flutter (see section 7.1)
├── shared/
│   └── api-types/                  # Auto-generated from OpenAPI spec
│       ├── typescript/             # For web
│       └── dart/                   # For mobile
├── infra/
│   ├── docker-compose.yml          # Local dev: FastAPI + PG + Redis
│   ├── docker-compose.prod.yml
│   ├── nginx/
│   │   └── nginx.conf
│   └── terraform/                  # AWS infra (ECS, RDS, ElastiCache)
├── docs/
│   └── api/                        # Auto-generated from FastAPI /docs
├── scripts/
│   ├── seed_data.py                # Seed exams, subjects, topics
│   ├── generate_types.sh           # OpenAPI → TS + Dart types
│   └── dev_setup.sh
├── .github/
│   └── workflows/
│       ├── backend-ci.yml          # Lint + test + build
│       ├── web-ci.yml
│       └── mobile-ci.yml
├── ARCHITECTURE.md                 # This file
└── README.md
```

---

## 14. KEY ARCHITECTURAL DECISIONS

| # | Decision | Alternative | Why This Choice |
|---|----------|-------------|-----------------|
| 1 | **FastAPI + Uvicorn** | Django + DRF | Async-native, auto OpenAPI docs, Pydantic validation, 3-5x faster |
| 2 | **SQLAlchemy 2.0 async** | Tortoise ORM, SQLModel | Most mature Python ORM, great async support, flexible queries |
| 3 | **Alembic migrations** | Manual SQL | Auto-generates diffs, version-controlled migrations |
| 4 | **ARQ task queue** | Celery | Pure async (matches FastAPI), lighter weight, Redis-native |
| 5 | **React + Vite SPA** | Next.js | Simpler setup, faster dev server, no SSR complexity; SEO via prerendering |
| 6 | **React Router v6** | TanStack Router | Most mature, large ecosystem, lazy route loading |
| 7 | **Zustand** | Redux, Jotai | Minimal boilerplate, TypeScript-first, simple API |
| 8 | **shadcn/ui + Tailwind** | Material UI, Chakra | Customizable, accessible, no CSS-in-JS overhead |
| 9 | **Flutter + Riverpod** | React Native, BLoC | Native performance, compile-safe state management |
| 10 | **Monorepo** | Separate repos | Shared types, unified CI, atomic cross-project changes |
| 11 | **JWT (stateless)** | Session auth | Horizontal scaling, no server-side session store |
| 12 | **JSONB for options** | Separate Option table | Flexible formats (MCQ/MSQ/numerical), single query per question |
| 13 | **Auto-gen API types** | Manual types | OpenAPI spec → TypeScript + Dart, zero drift between client/server |
| 14 | **Prerender.io for SEO** | SSR framework | Decouples SEO from app framework, works with any SPA |

---

## NEXT STEPS

Once you approve this architecture, I'll begin with:
1. **Monorepo scaffolding** — backend/, web/, mobile/ with Docker
2. **FastAPI project** — config, database, auth module
3. **Database models** — all SQLAlchemy models + Alembic migrations
4. **Auth system** — JWT login, registration, OTP
