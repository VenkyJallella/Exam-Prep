"""
Seed script to populate initial exam data.
Run: python -m scripts.seed_data
"""
import asyncio
from app.database import AsyncSessionLocal, init_db
from app.models.exam import Exam, Subject, Topic
from app.models.user import User, UserProfile, UserRole
from app.models.gamification import UserGamification
from app.core.security import hash_password

EXAMS_DATA = [
    {
        "name": "UPSC",
        "slug": "upsc",
        "full_name": "Union Public Service Commission - Civil Services Examination",
        "description": "India's premier civil services examination for IAS, IPS, IFS officers.",
        "order": 1,
        "subjects": [
            {
                "name": "Indian Polity",
                "slug": "indian-polity",
                "topics": ["Constitution", "Fundamental Rights", "Parliament", "Judiciary", "Federalism", "Local Government", "Constitutional Bodies"],
            },
            {
                "name": "History",
                "slug": "history",
                "topics": ["Ancient India", "Medieval India", "Modern India", "Indian Freedom Struggle", "Post-Independence India", "World History"],
            },
            {
                "name": "Geography",
                "slug": "geography",
                "topics": ["Physical Geography", "Indian Geography", "World Geography", "Climatology", "Oceanography", "Economic Geography"],
            },
            {
                "name": "Economy",
                "slug": "economy",
                "topics": ["Indian Economy", "Banking & Finance", "Fiscal Policy", "Monetary Policy", "International Trade", "Economic Development"],
            },
            {
                "name": "Science & Technology",
                "slug": "science-technology",
                "topics": ["Physics Basics", "Chemistry Basics", "Biology Basics", "Space Technology", "IT & Computers", "Biotechnology"],
            },
            {
                "name": "Environment",
                "slug": "environment",
                "topics": ["Ecology", "Biodiversity", "Climate Change", "Environmental Laws", "Conservation", "Pollution"],
            },
        ],
    },
    {
        "name": "JEE",
        "slug": "jee",
        "full_name": "Joint Entrance Examination (Main + Advanced)",
        "description": "Engineering entrance exam for IITs, NITs, and other top engineering colleges.",
        "order": 2,
        "subjects": [
            {
                "name": "Physics",
                "slug": "physics",
                "topics": ["Mechanics", "Thermodynamics", "Electromagnetism", "Optics", "Modern Physics", "Waves & Oscillations"],
            },
            {
                "name": "Chemistry",
                "slug": "chemistry",
                "topics": ["Physical Chemistry", "Organic Chemistry", "Inorganic Chemistry", "Chemical Bonding", "Thermochemistry", "Electrochemistry"],
            },
            {
                "name": "Mathematics",
                "slug": "mathematics",
                "topics": ["Algebra", "Calculus", "Coordinate Geometry", "Trigonometry", "Probability & Statistics", "Vectors & 3D"],
            },
        ],
    },
    {
        "name": "SSC CGL",
        "slug": "ssc-cgl",
        "full_name": "Staff Selection Commission - Combined Graduate Level",
        "description": "Recruitment exam for Group B and Group C posts in central government.",
        "order": 3,
        "subjects": [
            {
                "name": "Quantitative Aptitude",
                "slug": "quantitative-aptitude",
                "topics": ["Number System", "Percentage", "Profit & Loss", "Time & Work", "Geometry", "Algebra", "Trigonometry"],
            },
            {
                "name": "English Language",
                "slug": "english-language",
                "topics": ["Reading Comprehension", "Grammar", "Vocabulary", "Sentence Correction", "Cloze Test", "Idioms & Phrases"],
            },
            {
                "name": "General Intelligence",
                "slug": "general-intelligence",
                "topics": ["Logical Reasoning", "Coding-Decoding", "Series", "Analogies", "Blood Relations", "Direction Sense"],
            },
            {
                "name": "General Awareness",
                "slug": "general-awareness",
                "topics": ["Current Affairs", "Indian History", "Geography", "Indian Polity", "Economics", "Science"],
            },
        ],
    },
    {
        "name": "Banking",
        "slug": "banking",
        "full_name": "Banking Examinations (IBPS PO/Clerk, SBI PO/Clerk)",
        "description": "Competitive exams for bank officer and clerk recruitment.",
        "order": 4,
        "subjects": [
            {
                "name": "Reasoning Ability",
                "slug": "reasoning-ability",
                "topics": ["Syllogisms", "Coding-Decoding", "Seating Arrangement", "Puzzles", "Blood Relations", "Inequalities"],
            },
            {
                "name": "Quantitative Aptitude",
                "slug": "quant-aptitude",
                "topics": ["Number Series", "Data Interpretation", "Simplification", "Percentage", "Time & Distance", "Probability"],
            },
            {
                "name": "English Language",
                "slug": "english",
                "topics": ["Reading Comprehension", "Cloze Test", "Error Spotting", "Para Jumbles", "Fill in the Blanks"],
            },
            {
                "name": "General Awareness",
                "slug": "general-awareness-banking",
                "topics": ["Banking Awareness", "Financial Awareness", "Current Affairs", "Static GK"],
            },
        ],
    },
]


async def seed():
    await init_db()

    async with AsyncSessionLocal() as db:
        # Check if data already exists
        from sqlalchemy import select, func
        count = (await db.execute(select(func.count(Exam.id)))).scalar()
        if count > 0:
            print(f"Database already has {count} exams. Skipping seed.")
            return

        for exam_data in EXAMS_DATA:
            exam = Exam(
                name=exam_data["name"],
                slug=exam_data["slug"],
                full_name=exam_data["full_name"],
                description=exam_data["description"],
                order=exam_data["order"],
            )
            db.add(exam)
            await db.flush()

            for idx, subj_data in enumerate(exam_data["subjects"]):
                subject = Subject(
                    exam_id=exam.id,
                    name=subj_data["name"],
                    slug=subj_data["slug"],
                    order=idx,
                )
                db.add(subject)
                await db.flush()

                for tidx, topic_name in enumerate(subj_data["topics"]):
                    topic = Topic(
                        subject_id=subject.id,
                        name=topic_name,
                        slug=topic_name.lower().replace(" ", "-").replace("&", "and"),
                        order=tidx,
                    )
                    db.add(topic)

        # Create admin user
        admin = User(
            email="admin@examprep.com",
            hashed_password=hash_password("admin123456"),
            full_name="Admin",
            role=UserRole.ADMIN,
            email_verified=True,
        )
        db.add(admin)
        await db.flush()

        profile = UserProfile(user_id=admin.id, display_name="Admin")
        db.add(profile)

        gamification = UserGamification(user_id=admin.id)
        db.add(gamification)

        await db.commit()
        print("Seed data created successfully!")
        print(f"  - {len(EXAMS_DATA)} exams with subjects and topics")
        print(f"  - Admin user: admin@examprep.com / admin123456")


if __name__ == "__main__":
    asyncio.run(seed())
