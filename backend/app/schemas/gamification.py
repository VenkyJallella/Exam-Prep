from pydantic import BaseModel
from datetime import datetime


class GamificationStats(BaseModel):
    total_xp: int
    level: int
    current_streak: int
    longest_streak: int
    badges: list[dict]


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    display_name: str
    total_xp: int
    level: int
    current_streak: int


class BadgeDefinition(BaseModel):
    id: str
    name: str
    description: str
    icon: str
