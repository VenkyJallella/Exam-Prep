from pydantic import BaseModel


class OverviewStats(BaseModel):
    total_questions_attempted: int
    total_correct: int
    accuracy_pct: float
    avg_time_seconds: float
    tests_taken: int
    current_streak: int
    longest_streak: int
    total_xp: int
    level: int


class WeakArea(BaseModel):
    topic_id: str
    topic_name: str
    attempted: int
    correct: int
    accuracy_pct: float
    recommendation: str


class SpeedAnalytics(BaseModel):
    overall_avg_seconds: float
    recent_avg_seconds: float
    trend: list[dict]
    improving: bool
