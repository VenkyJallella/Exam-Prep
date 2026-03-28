"""
Seed script to populate sample questions and mock tests.
Run: PYTHONPATH=. python scripts/seed_questions.py
"""
import asyncio
import uuid
from app.database import AsyncSessionLocal, init_db
from app.models.exam import Exam, Subject, Topic
from app.models.question import Question, QuestionType, QuestionSource
from app.models.test import Test, TestQuestion, TestType

QUESTIONS = {
    "UPSC": {
        "Indian Polity": {
            "Constitution": [
                {
                    "q": "The Constitution of India was adopted on which date?",
                    "options": {"A": "26 January 1950", "B": "15 August 1947", "C": "26 November 1949", "D": "26 January 1930"},
                    "answer": "C",
                    "explanation": "The Constitution was adopted by the Constituent Assembly on 26 November 1949 and came into effect on 26 January 1950. November 26 is celebrated as Constitution Day.",
                    "difficulty": 1,
                },
                {
                    "q": "Which article of the Indian Constitution abolishes untouchability?",
                    "options": {"A": "Article 14", "B": "Article 15", "C": "Article 17", "D": "Article 19"},
                    "answer": "C",
                    "explanation": "Article 17 abolishes untouchability and forbids its practice in any form. The Protection of Civil Rights Act, 1955 provides penalties for the preaching and practice of untouchability.",
                    "difficulty": 2,
                },
                {
                    "q": "The concept of 'Basic Structure' of the Constitution was established in which case?",
                    "options": {"A": "Golaknath case", "B": "Kesavananda Bharati case", "C": "Minerva Mills case", "D": "Maneka Gandhi case"},
                    "answer": "B",
                    "explanation": "The Supreme Court in Kesavananda Bharati v. State of Kerala (1973) established that Parliament cannot alter the basic structure of the Constitution. This doctrine is a cornerstone of Indian constitutional law.",
                    "difficulty": 3,
                },
                {
                    "q": "Which Schedule of the Constitution deals with the allocation of seats in the Rajya Sabha?",
                    "options": {"A": "Third Schedule", "B": "Fourth Schedule", "C": "Fifth Schedule", "D": "Sixth Schedule"},
                    "answer": "B",
                    "explanation": "The Fourth Schedule contains provisions regarding the allocation of seats in the Rajya Sabha to the states and union territories.",
                    "difficulty": 3,
                },
                {
                    "q": "Article 356 of the Indian Constitution relates to:",
                    "options": {"A": "National Emergency", "B": "President's Rule in States", "C": "Financial Emergency", "D": "Fundamental Duties"},
                    "answer": "B",
                    "explanation": "Article 356 deals with the imposition of President's Rule in states when the constitutional machinery of a state fails. The President can assume all or any of the functions of the state government.",
                    "difficulty": 2,
                },
            ],
            "Fundamental Rights": [
                {
                    "q": "Right to Education is guaranteed under which article?",
                    "options": {"A": "Article 21", "B": "Article 21A", "C": "Article 19", "D": "Article 45"},
                    "answer": "B",
                    "explanation": "Article 21A was inserted by the 86th Constitutional Amendment Act, 2002. It makes free and compulsory education a fundamental right for children aged 6 to 14 years.",
                    "difficulty": 2,
                },
                {
                    "q": "Which of the following is NOT a Fundamental Right under the Indian Constitution?",
                    "options": {"A": "Right to Equality", "B": "Right to Property", "C": "Right against Exploitation", "D": "Right to Freedom of Religion"},
                    "answer": "B",
                    "explanation": "Right to Property was removed from the list of Fundamental Rights by the 44th Constitutional Amendment Act, 1978. It is now a legal right under Article 300A.",
                    "difficulty": 2,
                },
                {
                    "q": "Article 32 of the Indian Constitution provides for:",
                    "options": {"A": "Right to Freedom", "B": "Right to Constitutional Remedies", "C": "Right to Equality", "D": "Cultural and Educational Rights"},
                    "answer": "B",
                    "explanation": "Article 32 grants the right to move the Supreme Court for the enforcement of Fundamental Rights. Dr. B.R. Ambedkar called it the 'heart and soul' of the Constitution.",
                    "difficulty": 2,
                },
            ],
            "Parliament": [
                {
                    "q": "Money Bills can be introduced in which house of Parliament?",
                    "options": {"A": "Either House", "B": "Only in Lok Sabha", "C": "Only in Rajya Sabha", "D": "Joint Session"},
                    "answer": "B",
                    "explanation": "Under Article 109, a Money Bill can only be introduced in the Lok Sabha (House of the People). Rajya Sabha can only suggest amendments within 14 days.",
                    "difficulty": 1,
                },
                {
                    "q": "The maximum gap between two sessions of Parliament should not exceed:",
                    "options": {"A": "3 months", "B": "6 months", "C": "9 months", "D": "12 months"},
                    "answer": "B",
                    "explanation": "Article 85 stipulates that there should not be a gap of more than six months between two consecutive sessions of Parliament.",
                    "difficulty": 2,
                },
            ],
        },
        "History": {
            "Modern India": [
                {
                    "q": "The Jallianwala Bagh massacre took place in which year?",
                    "options": {"A": "1917", "B": "1919", "C": "1920", "D": "1921"},
                    "answer": "B",
                    "explanation": "The Jallianwala Bagh massacre occurred on 13 April 1919 in Amritsar, when British troops under General Dyer opened fire on a peaceful gathering, killing hundreds.",
                    "difficulty": 1,
                },
                {
                    "q": "Who founded the Indian National Congress in 1885?",
                    "options": {"A": "Dadabhai Naoroji", "B": "A.O. Hume", "C": "Surendranath Banerjee", "D": "W.C. Bonnerjee"},
                    "answer": "B",
                    "explanation": "The Indian National Congress was founded by Allan Octavian Hume, a retired British civil servant, in December 1885. The first session was held in Bombay with W.C. Bonnerjee as the first president.",
                    "difficulty": 1,
                },
                {
                    "q": "The Quit India Movement was launched in which year?",
                    "options": {"A": "1940", "B": "1941", "C": "1942", "D": "1943"},
                    "answer": "C",
                    "explanation": "The Quit India Movement was launched on 8 August 1942 by Mahatma Gandhi at the Bombay session of the All India Congress Committee. Gandhi gave the call 'Do or Die'.",
                    "difficulty": 1,
                },
                {
                    "q": "The Rowlatt Act was passed in which year?",
                    "options": {"A": "1916", "B": "1919", "C": "1920", "D": "1922"},
                    "answer": "B",
                    "explanation": "The Rowlatt Act was passed in March 1919, allowing the British to imprison Indians without trial. This led to widespread protests and ultimately the Jallianwala Bagh massacre.",
                    "difficulty": 2,
                },
            ],
            "Indian Freedom Struggle": [
                {
                    "q": "Who gave the slogan 'Swaraj is my birthright and I shall have it'?",
                    "options": {"A": "Mahatma Gandhi", "B": "Bal Gangadhar Tilak", "C": "Subhas Chandra Bose", "D": "Jawaharlal Nehru"},
                    "answer": "B",
                    "explanation": "Bal Gangadhar Tilak, also known as Lokmanya Tilak, gave this famous slogan which became a rallying cry for the Indian independence movement.",
                    "difficulty": 1,
                },
                {
                    "q": "The Simon Commission was boycotted by Indians because:",
                    "options": {"A": "It proposed to divide India", "B": "It had no Indian member", "C": "It was led by a military officer", "D": "It proposed separate electorates"},
                    "answer": "B",
                    "explanation": "The Simon Commission (1927) was boycotted because it did not include any Indian member. All seven members were British parliamentarians, which was seen as an insult to Indian dignity.",
                    "difficulty": 2,
                },
            ],
        },
    },
    "JEE": {
        "Physics": {
            "Mechanics": [
                {
                    "q": "A body of mass 5 kg is moving with a velocity of 10 m/s. What is its kinetic energy?",
                    "options": {"A": "100 J", "B": "250 J", "C": "500 J", "D": "50 J"},
                    "answer": "B",
                    "explanation": "Kinetic Energy = ½mv² = ½ × 5 × 10² = ½ × 5 × 100 = 250 J.",
                    "difficulty": 1,
                },
                {
                    "q": "A projectile is fired at 60° to the horizontal with initial velocity 20 m/s. The maximum height reached is (g = 10 m/s²):",
                    "options": {"A": "5 m", "B": "10 m", "C": "15 m", "D": "20 m"},
                    "answer": "C",
                    "explanation": "Maximum height H = u²sin²θ/(2g) = 400 × sin²60°/(2×10) = 400 × 0.75/20 = 15 m.",
                    "difficulty": 3,
                },
                {
                    "q": "Newton's third law of motion states that:",
                    "options": {"A": "Force equals mass times acceleration", "B": "Every action has an equal and opposite reaction", "C": "An object at rest stays at rest", "D": "Energy is conserved"},
                    "answer": "B",
                    "explanation": "Newton's third law states that for every action, there is an equal and opposite reaction. The two forces act on different bodies simultaneously.",
                    "difficulty": 1,
                },
                {
                    "q": "A block slides down a frictionless inclined plane of height h. Its velocity at the bottom is:",
                    "options": {"A": "√(gh)", "B": "√(2gh)", "C": "2√(gh)", "D": "√(gh/2)"},
                    "answer": "B",
                    "explanation": "Using energy conservation: mgh = ½mv². Therefore v = √(2gh). This is independent of the mass and the angle of inclination.",
                    "difficulty": 2,
                },
            ],
            "Thermodynamics": [
                {
                    "q": "The efficiency of a Carnot engine working between 500K and 300K is:",
                    "options": {"A": "20%", "B": "30%", "C": "40%", "D": "60%"},
                    "answer": "C",
                    "explanation": "Efficiency of Carnot engine = 1 - T₂/T₁ = 1 - 300/500 = 1 - 0.6 = 0.4 = 40%.",
                    "difficulty": 2,
                },
                {
                    "q": "In an adiabatic process:",
                    "options": {"A": "Heat is constant", "B": "No heat exchange occurs", "C": "Temperature is constant", "D": "Pressure is constant"},
                    "answer": "B",
                    "explanation": "In an adiabatic process, there is no heat exchange between the system and surroundings (Q = 0). All work done comes from internal energy changes.",
                    "difficulty": 1,
                },
            ],
        },
        "Chemistry": {
            "Physical Chemistry": [
                {
                    "q": "The pH of a 0.001 M HCl solution is:",
                    "options": {"A": "1", "B": "2", "C": "3", "D": "4"},
                    "answer": "C",
                    "explanation": "pH = -log[H⁺] = -log(0.001) = -log(10⁻³) = 3. HCl is a strong acid and completely dissociates.",
                    "difficulty": 1,
                },
                {
                    "q": "The unit of rate constant for a first-order reaction is:",
                    "options": {"A": "mol L⁻¹ s⁻¹", "B": "L mol⁻¹ s⁻¹", "C": "s⁻¹", "D": "L² mol⁻² s⁻¹"},
                    "answer": "C",
                    "explanation": "For a first-order reaction, rate = k[A], so k = rate/[A] = (mol L⁻¹ s⁻¹)/(mol L⁻¹) = s⁻¹.",
                    "difficulty": 2,
                },
                {
                    "q": "The number of moles in 11.2 L of a gas at STP is:",
                    "options": {"A": "0.25", "B": "0.5", "C": "1.0", "D": "2.0"},
                    "answer": "B",
                    "explanation": "At STP, 1 mole of an ideal gas occupies 22.4 L. So 11.2 L = 11.2/22.4 = 0.5 moles.",
                    "difficulty": 1,
                },
            ],
            "Organic Chemistry": [
                {
                    "q": "The IUPAC name of CH₃CH₂OH is:",
                    "options": {"A": "Methanol", "B": "Ethanol", "C": "Propanol", "D": "Butanol"},
                    "answer": "B",
                    "explanation": "CH₃CH₂OH has 2 carbon atoms with an -OH group. The IUPAC name is ethanol (ethane + ol suffix for alcohol).",
                    "difficulty": 1,
                },
                {
                    "q": "Markovnikov's rule applies to the addition of HBr to:",
                    "options": {"A": "Alkanes", "B": "Alkenes", "C": "Alkynes only", "D": "Aromatic compounds"},
                    "answer": "B",
                    "explanation": "Markovnikov's rule states that in addition of HX to an unsymmetrical alkene, H adds to the carbon with more H atoms. It primarily applies to electrophilic addition to alkenes.",
                    "difficulty": 2,
                },
            ],
        },
        "Mathematics": {
            "Algebra": [
                {
                    "q": "If the roots of x² - 5x + 6 = 0 are α and β, then α + β equals:",
                    "options": {"A": "5", "B": "6", "C": "-5", "D": "-6"},
                    "answer": "A",
                    "explanation": "By Vieta's formulas, the sum of roots of ax² + bx + c = 0 is -b/a. Here, α + β = -(-5)/1 = 5.",
                    "difficulty": 1,
                },
                {
                    "q": "The value of ¹⁰C₃ is:",
                    "options": {"A": "60", "B": "120", "C": "720", "D": "90"},
                    "answer": "B",
                    "explanation": "¹⁰C₃ = 10!/(3! × 7!) = (10 × 9 × 8)/(3 × 2 × 1) = 720/6 = 120.",
                    "difficulty": 1,
                },
                {
                    "q": "The sum of an infinite geometric series with first term 4 and common ratio 1/2 is:",
                    "options": {"A": "4", "B": "6", "C": "8", "D": "12"},
                    "answer": "C",
                    "explanation": "Sum of infinite GP = a/(1-r) = 4/(1 - 1/2) = 4/(1/2) = 8.",
                    "difficulty": 2,
                },
            ],
            "Calculus": [
                {
                    "q": "The derivative of sin(x²) with respect to x is:",
                    "options": {"A": "cos(x²)", "B": "2x cos(x²)", "C": "x cos(x²)", "D": "2 cos(x²)"},
                    "answer": "B",
                    "explanation": "Using chain rule: d/dx[sin(x²)] = cos(x²) × d/dx(x²) = cos(x²) × 2x = 2x cos(x²).",
                    "difficulty": 2,
                },
                {
                    "q": "∫(1/x)dx equals:",
                    "options": {"A": "x", "B": "1/x²", "C": "ln|x| + C", "D": "eˣ + C"},
                    "answer": "C",
                    "explanation": "The integral of 1/x is the natural logarithm: ∫(1/x)dx = ln|x| + C. This is a standard integral formula.",
                    "difficulty": 1,
                },
            ],
        },
    },
    "SSC CGL": {
        "Quantitative Aptitude": {
            "Percentage": [
                {
                    "q": "If the price of a commodity increases by 20%, by what percentage should consumption be reduced to keep expenditure the same?",
                    "options": {"A": "16.67%", "B": "20%", "C": "25%", "D": "15%"},
                    "answer": "A",
                    "explanation": "Reduction = (increase / (100 + increase)) × 100 = (20/120) × 100 = 16.67%. This is a standard percentage formula.",
                    "difficulty": 3,
                },
                {
                    "q": "A number is increased by 25% and then decreased by 25%. The net change is:",
                    "options": {"A": "No change", "B": "6.25% decrease", "C": "6.25% increase", "D": "12.5% decrease"},
                    "answer": "B",
                    "explanation": "Net effect = -x²/100 = -(25)²/100 = -6.25%. So there is a 6.25% decrease.",
                    "difficulty": 2,
                },
            ],
            "Profit & Loss": [
                {
                    "q": "A shopkeeper buys an article for ₹400 and sells it for ₹500. The profit percentage is:",
                    "options": {"A": "20%", "B": "25%", "C": "30%", "D": "15%"},
                    "answer": "B",
                    "explanation": "Profit = 500 - 400 = ₹100. Profit% = (Profit/CP) × 100 = (100/400) × 100 = 25%.",
                    "difficulty": 1,
                },
            ],
        },
        "General Intelligence": {
            "Logical Reasoning": [
                {
                    "q": "In a certain code, COMPUTER is written as RFUVQNPC. How is PRINTER written in that code?",
                    "options": {"A": "QSJOUFQ", "B": "SFJOUQS", "C": "SFJOQSU", "D": "QSJOUFS"},
                    "answer": "A",
                    "explanation": "Each letter is shifted: odd position letters +1, even position letters -1, then reversed. P→Q, R→S, I→J, N→O, T→U, E→F, R→Q. PRINTER → QSJOUFQ.",
                    "difficulty": 3,
                },
                {
                    "q": "Find the next number in the series: 2, 6, 12, 20, 30, ?",
                    "options": {"A": "40", "B": "42", "C": "44", "D": "46"},
                    "answer": "B",
                    "explanation": "The differences are 4, 6, 8, 10, 12. Each difference increases by 2. So the next number is 30 + 12 = 42.",
                    "difficulty": 2,
                },
            ],
        },
    },
    "Banking": {
        "Reasoning Ability": {
            "Syllogisms": [
                {
                    "q": "Statements: All dogs are cats. All cats are birds. Conclusion: All dogs are birds.",
                    "options": {"A": "True", "B": "False", "C": "Cannot be determined", "D": "Partially true"},
                    "answer": "A",
                    "explanation": "This is a valid syllogism. If all dogs are cats and all cats are birds, then by transitivity, all dogs are birds. This follows the Barbara syllogism pattern.",
                    "difficulty": 1,
                },
                {
                    "q": "Statements: Some books are pens. All pens are pencils. Conclusion I: Some books are pencils. Conclusion II: All pencils are books.",
                    "options": {"A": "Only I follows", "B": "Only II follows", "C": "Both follow", "D": "Neither follows"},
                    "answer": "A",
                    "explanation": "Since some books are pens and all pens are pencils, some books are definitely pencils (Conclusion I follows). But we cannot conclude all pencils are books (Conclusion II doesn't follow).",
                    "difficulty": 2,
                },
            ],
            "Puzzles": [
                {
                    "q": "If A is the brother of B, B is the sister of C, and C is the father of D, how is A related to D?",
                    "options": {"A": "Uncle", "B": "Father", "C": "Grandfather", "D": "Brother"},
                    "answer": "A",
                    "explanation": "C is D's father. B is C's sister, so B is D's aunt. A is B's brother, so A is also a sibling of C. Since C is male (father), A is D's uncle.",
                    "difficulty": 2,
                },
            ],
        },
        "Quantitative Aptitude": {
            "Data Interpretation": [
                {
                    "q": "In a pie chart, if Education sector has 72°, what percentage does it represent?",
                    "options": {"A": "15%", "B": "20%", "C": "25%", "D": "30%"},
                    "answer": "B",
                    "explanation": "Percentage = (Angle/360) × 100 = (72/360) × 100 = 20%.",
                    "difficulty": 1,
                },
            ],
        },
    },
}


async def seed():
    await init_db()

    async with AsyncSessionLocal() as db:
        from sqlalchemy import select, func

        # Check if questions already exist
        count = (await db.execute(select(func.count(Question.id)))).scalar()
        if count > 0:
            print(f"Database already has {count} questions. Skipping seed.")
            return

        # Get all exams, subjects, topics
        exams = {e.name: e for e in (await db.execute(select(Exam))).scalars().all()}
        subjects_all = (await db.execute(select(Subject))).scalars().all()
        topics_all = (await db.execute(select(Topic))).scalars().all()

        # Build lookup: exam_name -> subject_name -> topic_name -> topic_id
        subject_map = {}
        for s in subjects_all:
            subject_map[s.id] = s

        topic_lookup = {}
        for t in topics_all:
            subj = subject_map.get(t.subject_id)
            if subj:
                exam = exams.get(next((e.name for e in exams.values() if e.id == subj.exam_id), ""))
                if exam:
                    key = (exam.name, subj.name, t.name)
                    topic_lookup[key] = t

        total_questions = 0
        exam_question_ids = {}  # exam_name -> list of question ids

        for exam_name, subjects in QUESTIONS.items():
            exam = exams.get(exam_name)
            if not exam:
                print(f"  Exam '{exam_name}' not found, skipping")
                continue

            exam_question_ids[exam_name] = []

            for subject_name, topics in subjects.items():
                for topic_name, questions_data in topics.items():
                    topic = topic_lookup.get((exam_name, subject_name, topic_name))
                    if not topic:
                        print(f"  Topic '{exam_name}/{subject_name}/{topic_name}' not found, skipping")
                        continue

                    for qd in questions_data:
                        question = Question(
                            topic_id=topic.id,
                            exam_id=exam.id,
                            question_text=qd["q"],
                            question_type=QuestionType.MCQ,
                            difficulty=qd["difficulty"],
                            options=qd["options"],
                            correct_answer=[qd["answer"]],
                            explanation=qd["explanation"],
                            source=QuestionSource.MANUAL,
                            is_verified=True,
                        )
                        db.add(question)
                        await db.flush()
                        exam_question_ids[exam_name].append(question.id)
                        total_questions += 1

        print(f"Seeded {total_questions} questions")

        # Create mock tests
        tests_created = 0
        for exam_name, q_ids in exam_question_ids.items():
            if len(q_ids) < 5:
                continue
            exam = exams[exam_name]
            test = Test(
                exam_id=exam.id,
                title=f"{exam_name} Practice Mock Test 1",
                description=f"A practice mock test covering multiple topics from {exam.full_name or exam_name}.",
                test_type=TestType.MOCK,
                total_marks=len(q_ids),
                duration_minutes=max(len(q_ids) * 2, 15),
                negative_marking_pct=25.0 if exam_name in ("JEE", "SSC CGL") else 33.33,
                is_published=True,
                instructions=f"This is a timed mock test for {exam_name}. Each correct answer gets 1 mark. Negative marking applies for wrong answers. You can mark questions for review and come back to them later.",
            )
            db.add(test)
            await db.flush()

            for i, qid in enumerate(q_ids):
                tq = TestQuestion(
                    test_id=test.id,
                    question_id=qid,
                    order=i,
                    marks=1,
                )
                db.add(tq)
            tests_created += 1

        await db.commit()
        print(f"Created {tests_created} mock tests")
        print("Done!")


if __name__ == "__main__":
    asyncio.run(seed())
