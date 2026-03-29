"""Seed coding problems into the database."""
import asyncio
from app.database import AsyncSessionLocal as async_session_factory
from app.services.coding_service import create_problem

PROBLEMS = [
    {
        "title": "Two Sum",
        "description": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.",
        "difficulty": "easy",
        "constraints": "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9",
        "input_format": "First line: space-separated integers (nums)\nSecond line: target integer",
        "output_format": "Two space-separated indices",
        "test_cases": [
            {"input": "2 7 11 15\n9", "expected_output": "0 1", "is_sample": True},
            {"input": "3 2 4\n6", "expected_output": "1 2", "is_sample": True},
            {"input": "3 3\n6", "expected_output": "0 1", "is_sample": False},
        ],
        "starter_code": {"python": "nums = list(map(int, input().split()))\ntarget = int(input())\n\n# Write your solution here\n"},
        "tags": ["Array", "Hash Table"],
        "companies": ["Google", "Amazon", "Microsoft"],
    },
    {
        "title": "Reverse String",
        "description": "Write a function that reverses a string. The input string is given as a single line.",
        "difficulty": "easy",
        "input_format": "A single string",
        "output_format": "The reversed string",
        "test_cases": [
            {"input": "hello", "expected_output": "olleh", "is_sample": True},
            {"input": "Hannah", "expected_output": "hannaH", "is_sample": True},
            {"input": "abcdef", "expected_output": "fedcba", "is_sample": False},
        ],
        "starter_code": {"python": "s = input()\n\n# Write your solution here\n"},
        "tags": ["String"],
        "companies": ["TCS", "Infosys"],
    },
    {
        "title": "FizzBuzz",
        "description": "Given an integer n, print numbers from 1 to n. But for multiples of 3 print Fizz, for multiples of 5 print Buzz, and for multiples of both print FizzBuzz.",
        "difficulty": "easy",
        "input_format": "A single integer n",
        "output_format": "n lines with the number or Fizz/Buzz/FizzBuzz",
        "test_cases": [
            {"input": "5", "expected_output": "1\n2\nFizz\n4\nBuzz", "is_sample": True},
            {"input": "15", "expected_output": "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz", "is_sample": False},
        ],
        "starter_code": {"python": "n = int(input())\n\n# Write your solution here\n"},
        "tags": ["Math", "String"],
        "companies": ["Goldman Sachs"],
    },
    {
        "title": "Maximum Subarray Sum",
        "description": "Given an integer array, find the contiguous subarray with the largest sum. Use Kadane's Algorithm for O(n).",
        "difficulty": "medium",
        "constraints": "1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4",
        "input_format": "Space-separated integers",
        "output_format": "A single integer (maximum subarray sum)",
        "test_cases": [
            {"input": "-2 1 -3 4 -1 2 1 -5 4", "expected_output": "6", "is_sample": True},
            {"input": "1", "expected_output": "1", "is_sample": True},
            {"input": "5 4 -1 7 8", "expected_output": "23", "is_sample": False},
        ],
        "starter_code": {"python": "nums = list(map(int, input().split()))\n\n# Write your solution here\n"},
        "tags": ["Array", "Dynamic Programming"],
        "companies": ["Amazon", "Google"],
    },
    {
        "title": "Valid Parentheses",
        "description": "Given a string containing just brackets ()[]{}. Determine if the input is valid.\n\nOpen brackets must be closed by the same type in correct order.",
        "difficulty": "medium",
        "input_format": "A single string of brackets",
        "output_format": "True or False",
        "test_cases": [
            {"input": "()", "expected_output": "True", "is_sample": True},
            {"input": "()[]{}", "expected_output": "True", "is_sample": True},
            {"input": "(]", "expected_output": "False", "is_sample": True},
            {"input": "([)]", "expected_output": "False", "is_sample": False},
        ],
        "starter_code": {"python": "s = input()\n\n# Write your solution here\n"},
        "tags": ["Stack", "String"],
        "companies": ["Amazon", "Facebook"],
    },
    {
        "title": "Longest Common Subsequence",
        "description": "Given two strings, return the length of their longest common subsequence.\n\nA subsequence can be derived by deleting some elements without changing order.",
        "difficulty": "hard",
        "constraints": "1 <= length <= 1000\nOnly lowercase English characters",
        "input_format": "Two lines, each containing a string",
        "output_format": "A single integer",
        "test_cases": [
            {"input": "abcde\nace", "expected_output": "3", "is_sample": True},
            {"input": "abc\nabc", "expected_output": "3", "is_sample": True},
            {"input": "abc\ndef", "expected_output": "0", "is_sample": False},
        ],
        "starter_code": {"python": "text1 = input()\ntext2 = input()\n\n# Write your solution here\n"},
        "tags": ["Dynamic Programming", "String"],
        "companies": ["Google", "Amazon"],
    },
]


async def seed():
    async with async_session_factory() as db:
        for p in PROBLEMS:
            prob = await create_problem(db, p)
            print(f"Created: {prob.title} ({prob.difficulty.value}) -> /coding/{prob.slug}")
    print(f"\nDone! {len(PROBLEMS)} coding problems seeded.")


asyncio.run(seed())
