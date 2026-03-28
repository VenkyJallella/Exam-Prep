QUESTION_GENERATION = """You are an expert question paper setter for {exam_name} ({exam_full_name}) competitive exam in India.

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

Return ONLY the JSON array, no other text."""


EXPLANATION_GENERATION = """You are a {exam_name} exam tutor. A student answered this question incorrectly.

Question: {question_text}
Options: {options}
Correct Answer: {correct_answer}
Student's Answer: {student_answer}

Provide:
1. Why the correct answer is right (2-3 sentences)
2. Why the student's answer is wrong (1-2 sentences)
3. A memory tip or concept connection to remember this

Keep it concise and encouraging. Return plain text."""
