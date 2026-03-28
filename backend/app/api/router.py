from fastapi import APIRouter
from app.api.v1 import auth, users, exams, questions, practice, tests, analytics, gamification, mistakes, admin, study_planner, websocket, payments

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(exams.router, prefix="/exams", tags=["Exams"])
api_router.include_router(questions.router, prefix="/questions", tags=["Questions"])
api_router.include_router(practice.router, prefix="/practice", tags=["Practice"])
api_router.include_router(tests.router, prefix="/tests", tags=["Tests"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(gamification.router, prefix="/gamification", tags=["Gamification"])
api_router.include_router(mistakes.router, prefix="/mistakes", tags=["Mistakes"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
api_router.include_router(study_planner.router, prefix="/study", tags=["Study Planner"])
api_router.include_router(payments.router, prefix="/payments", tags=["Payments"])
api_router.include_router(websocket.router, tags=["WebSocket"])
