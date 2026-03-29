QUESTION_GENERATION = """You are an expert question paper setter for {exam_name} ({exam_full_name}) competitive exam in India.

Generate {count} multiple-choice questions.
- Subject: {subject_name}
- Topic: {topic_name}
- Required Difficulty: Level {difficulty} out of 5

DIFFICULTY LEVEL {difficulty} MEANS:
{difficulty_description}

CRITICAL: Every single question MUST be at difficulty level {difficulty}. If level is 4 or 5, questions should require multi-step solving, involve tricky distractors, combine multiple concepts, or need careful analysis. Do NOT produce basic recall questions for high difficulty levels.

Rules:
- STRICTLY generate questions ONLY from {subject_name} > {topic_name} as per {exam_name} syllabus
- Do NOT generate questions from any other subject or topic
- Each question: exactly 4 options (A, B, C, D), one correct answer
- Include a clear 2-3 sentence explanation for the correct answer
- All {count} questions must be UNIQUE — different concepts, different approaches, no repetition
- Options should be plausible (common mistakes as wrong options, not obviously wrong)
- For numerical subjects: include calculation-heavy problems at higher levels
- For theory subjects: include application-based and statement analysis at higher levels
- Use Indian English conventions
- IMPORTANT: Do NOT use LaTeX notation like $, \frac, \alpha etc. Use plain text for math: x^2, sqrt(x), alpha, beta, pi. This is critical for JSON parsing.

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


BLOG_GENERATION = """You are an experienced Indian education blogger who writes for competitive exam aspirants in India.

Topic: {topic}
Explanation/Context from admin: {explanation}
Target exam (if any): {exam_name}

Write a comprehensive, SEO-friendly blog post following these strict rules:

1. **Writing Style**:
   - Write in natural Indian English (use phrases like "lakh", "crore", "aspirants", "preparation", etc.)
   - Human writing style — conversational yet informative, like a senior who is guiding juniors
   - Use short paragraphs (3-4 sentences max), subheadings, and bullet points for readability
   - Include relatable examples that Indian students connect with
   - Avoid robotic or AI-sounding language — no "delve", "landscape", "realm", "unleash"
   - Add personal touches like "In my experience..." or "Many toppers suggest..."

2. **SEO Requirements**:
   - Include the main keyword naturally 3-5 times throughout
   - Use H2 and H3 subheadings with relevant keywords
   - Write a compelling introduction that hooks the reader in the first 2 lines
   - Include a strong conclusion with a call-to-action
   - Content should be 1200-1800 words

3. **Uniqueness**:
   - Provide unique insights, not generic advice found everywhere
   - Include specific tips, strategies, or data points
   - Reference current exam patterns or recent changes where relevant

4. **Content Format**: Use Markdown formatting (## for H2, ### for H3, **bold**, - for bullets)

Return valid JSON:
{{
  "title": "SEO-optimised title (50-60 characters ideally)",
  "excerpt": "Compelling 1-2 sentence summary for blog cards (max 150 chars)",
  "content": "Full blog post in Markdown format",
  "meta_description": "SEO meta description (max 155 characters)",
  "meta_keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "tags": ["tag1", "tag2", "tag3"]
}}

Return ONLY the JSON object, no other text."""
