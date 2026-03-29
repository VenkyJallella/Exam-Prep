"""Scoring engine supporting variable marks, negative marking, and partial credit.

Handles all exam patterns:
- JEE: MCQ (+4/-1), Numerical (+4/0), MSQ with partial marking
- UPSC: MCQ (+2/-0.66)
- Banking: MCQ (+1/-0.25)
- SSC: MCQ (+2/-0.50)
"""
import logging

logger = logging.getLogger("examprep.scoring")


def calculate_question_score(
    selected_answer: list,
    correct_answer: list,
    positive_marks: float = 1.0,
    negative_marks: float = 0.0,
    partial_marks_enabled: bool = False,
) -> tuple[float, bool, bool]:
    """
    Calculate score for a single question.
    Returns: (score, is_correct, is_partial)
    """
    if not selected_answer:
        return 0.0, False, False  # Unattempted

    selected_set = set(selected_answer)
    correct_set = set(correct_answer)

    # Exact match
    if selected_set == correct_set:
        return positive_marks, True, False

    # Partial marking (for MSQ - JEE Advanced style)
    if partial_marks_enabled and len(correct_answer) > 1:
        wrong_selections = selected_set - correct_set
        if wrong_selections:
            return -negative_marks, False, False

        correct_selections = selected_set & correct_set
        if correct_selections:
            partial_score = positive_marks * (len(correct_selections) / len(correct_set))
            return round(partial_score, 2), False, True

    # Wrong answer
    return -negative_marks, False, False


def calculate_test_score(
    answers: list[dict],
    default_positive: float = 1.0,
    default_negative: float = 0.0,
) -> dict:
    """
    Calculate total test score from a list of answer dicts.

    Each answer dict: selected_answer, correct_answer, positive_marks, negative_marks,
    partial_marks_enabled, section (all optional except correct_answer).
    """
    total_score = 0.0
    max_score = 0.0
    correct = 0
    wrong = 0
    partial = 0
    unattempted = 0
    section_scores: dict[str, dict] = {}

    for ans in answers:
        pos = ans.get("positive_marks", default_positive)
        neg = ans.get("negative_marks", default_negative)
        partial_enabled = ans.get("partial_marks_enabled", False)
        section = ans.get("section", "default")

        max_score += pos

        score, is_correct, is_partial = calculate_question_score(
            ans.get("selected_answer", []),
            ans["correct_answer"],
            pos, neg, partial_enabled,
        )

        total_score += score
        if is_correct:
            correct += 1
        elif is_partial:
            partial += 1
        elif not ans.get("selected_answer"):
            unattempted += 1
        else:
            wrong += 1

        if section not in section_scores:
            section_scores[section] = {"score": 0.0, "max": 0.0, "correct": 0, "wrong": 0, "unattempted": 0}
        section_scores[section]["score"] += score
        section_scores[section]["max"] += pos
        if is_correct:
            section_scores[section]["correct"] += 1
        elif not ans.get("selected_answer"):
            section_scores[section]["unattempted"] += 1
        else:
            section_scores[section]["wrong"] += 1

    return {
        "total_score": round(total_score, 2),
        "max_score": round(max_score, 2),
        "percentage": round((total_score / max_score * 100) if max_score > 0 else 0, 1),
        "correct": correct,
        "wrong": wrong,
        "partial": partial,
        "unattempted": unattempted,
        "total_questions": len(answers),
        "section_scores": section_scores,
    }
