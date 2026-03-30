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
    {
        "name": "NEET",
        "slug": "neet",
        "full_name": "National Eligibility cum Entrance Test",
        "description": "Medical entrance exam for MBBS, BDS, and AYUSH admissions across India.",
        "order": 5,
        "subjects": [
            {
                "name": "Physics",
                "slug": "neet-physics",
                "topics": ["Mechanics", "Thermodynamics", "Electrostatics", "Current Electricity", "Optics", "Modern Physics", "Waves"],
            },
            {
                "name": "Chemistry",
                "slug": "neet-chemistry",
                "topics": ["Physical Chemistry", "Organic Chemistry", "Inorganic Chemistry", "Chemical Bonding", "Coordination Compounds", "Biomolecules"],
            },
            {
                "name": "Biology",
                "slug": "neet-biology",
                "topics": ["Cell Biology", "Genetics", "Human Physiology", "Plant Physiology", "Ecology", "Evolution", "Biotechnology", "Reproduction"],
            },
        ],
    },
    {
        "name": "GATE CS",
        "slug": "gate-cs",
        "full_name": "Graduate Aptitude Test in Engineering - Computer Science",
        "description": "Postgraduate entrance exam for M.Tech admissions and PSU recruitment.",
        "order": 6,
        "subjects": [
            {
                "name": "Data Structures & Algorithms",
                "slug": "dsa",
                "topics": ["Arrays & Strings", "Linked Lists", "Trees", "Graphs", "Sorting & Searching", "Dynamic Programming", "Greedy Algorithms"],
            },
            {
                "name": "Operating Systems",
                "slug": "operating-systems",
                "topics": ["Process Management", "Memory Management", "File Systems", "CPU Scheduling", "Deadlocks", "Synchronization"],
            },
            {
                "name": "DBMS",
                "slug": "dbms",
                "topics": ["Relational Model", "SQL", "Normalization", "Transactions", "Indexing", "ER Model"],
            },
            {
                "name": "Computer Networks",
                "slug": "computer-networks",
                "topics": ["OSI Model", "TCP/IP", "Routing", "Network Security", "Application Layer", "Transport Layer"],
            },
            {
                "name": "Theory of Computation",
                "slug": "toc",
                "topics": ["Finite Automata", "Context-Free Grammar", "Turing Machines", "Regular Languages", "Pushdown Automata", "Decidability"],
            },
            {
                "name": "Digital Logic & Computer Organization",
                "slug": "digital-logic",
                "topics": ["Boolean Algebra", "Combinational Circuits", "Sequential Circuits", "Pipelining", "Cache Memory", "I/O Systems"],
            },
        ],
    },
    {
        "name": "CAT",
        "slug": "cat",
        "full_name": "Common Admission Test",
        "description": "MBA entrance exam for IIMs and top business schools in India.",
        "order": 7,
        "subjects": [
            {
                "name": "Verbal Ability & Reading Comprehension",
                "slug": "varc",
                "topics": ["Reading Comprehension", "Para Jumbles", "Sentence Completion", "Critical Reasoning", "Summary Questions", "Odd Sentence Out"],
            },
            {
                "name": "Data Interpretation & Logical Reasoning",
                "slug": "dilr",
                "topics": ["Tables & Charts", "Bar Graphs", "Pie Charts", "Seating Arrangement", "Puzzles", "Logical Connectives", "Binary Logic"],
            },
            {
                "name": "Quantitative Ability",
                "slug": "cat-quant",
                "topics": ["Arithmetic", "Algebra", "Number System", "Geometry", "Mensuration", "Combinatorics", "Probability"],
            },
        ],
    },
    {
        "name": "Coding",
        "slug": "coding",
        "full_name": "Coding & Programming Practice",
        "description": "Data structures, algorithms, and programming for IT placements and interviews.",
        "order": 8,
        "subjects": [
            {
                "name": "Data Structures",
                "slug": "data-structures",
                "topics": ["Arrays", "Linked Lists", "Stacks & Queues", "Trees", "Graphs", "Hash Tables", "Heaps"],
            },
            {
                "name": "Algorithms",
                "slug": "algorithms",
                "topics": ["Sorting", "Searching", "Dynamic Programming", "Greedy", "Divide & Conquer", "Backtracking", "Graph Algorithms"],
            },
            {
                "name": "Programming Concepts",
                "slug": "programming-concepts",
                "topics": ["OOP", "Recursion", "Bit Manipulation", "String Algorithms", "Math & Number Theory", "System Design Basics"],
            },
        ],
    },
]


async def seed():
    await init_db()

    async with AsyncSessionLocal() as db:
        from sqlalchemy import select
        created = 0
        for exam_data in EXAMS_DATA:
            # Check if this specific exam already exists
            existing = (await db.execute(
                select(Exam).where(Exam.slug == exam_data["slug"])
            )).scalar_one_or_none()
            if existing:
                print(f"  Exam '{exam_data['name']}' already exists, skipping.")
                continue

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

            created += 1
            print(f"  + Created exam '{exam_data['name']}' with {len(exam_data['subjects'])} subjects")

        # Create admin user (skip if already exists)
        existing_admin = (await db.execute(
            select(User).where(User.role == UserRole.ADMIN)
        )).scalar_one_or_none()
        if not existing_admin:
            admin = User(
                email="admin@zencodio.com",
                hashed_password=hash_password("Admin@2026"),
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
            print(f"  - Admin user: admin@zencodio.com")
        else:
            print(f"  - Admin user already exists: {existing_admin.email}")

        await db.commit()
        print(f"Seed complete! Created {created} new exams (total defined: {len(EXAMS_DATA)})")


if __name__ == "__main__":
    asyncio.run(seed())
