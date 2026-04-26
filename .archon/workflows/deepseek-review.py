#!/usr/bin/env python3
"""deepseek-review.py — Adversarial review via Ollama API

Usage:
  deepseek-review.py tests <story_id> <story_title> <ac1|ac2|...> <file1> [file2 ...]
  deepseek-review.py code   <story_id> <story_title> <ac1|ac2|...> <file1> [file2 ...]

Calls qwen2.5-coder:14b on http://llm:11434 for independent adversarial review.
Prints the review output and ends with REVIEW_APPROVED=YES or REVIEW_APPROVED=NO
"""

import json
import os
import sys
import subprocess

# Configurable review model — change this or set TDD_REVIEW_MODEL env var
REVIEW_MODEL = os.environ.get("TDD_REVIEW_MODEL", "qwen2.5-coder:14b")
OLLAMA_BASE = os.environ.get("TDD_OLLAMA_URL", "http://llm:11434")
MAX_RETRIES = int(os.environ.get("TDD_MAX_RETRIES", "5"))


def build_prompt(review_type, story_id, story_title, ac_lines, file_contents):
    """Build the adversarial review prompt."""
    ac_text = "\n".join(f"- {ac}" for ac in ac_lines)

    if review_type == "tests":
        return (
            f"You are an adversarial test reviewer. Your job is to find weaknesses in these tests.\n\n"
            f"Story: {story_id}: {story_title}\n"
            f"Acceptance criteria:\n{ac_text}\n\n"
            f"Test files:\n{file_contents}\n\n"
            f"Review for:\n"
            f"1. Do tests actually verify each AC? (not just exists or renders checks)\n"
            f"2. Are tests trivially passable by a naive hardcoded implementation?\n"
            f"3. Are edge cases missing? (null, empty, boundary values, error states)\n"
            f"4. Are mocks too generous? (mocking the thing being tested instead of deps)\n"
            f"5. Do tests verify behavior, not implementation details?\n\n"
            f'Output ONLY a JSON object: {{"approved": true|false, "issues": ["issue1"], "suggestions": ["fix1"]}}\n\n'
            f"Be strict. Tests that would pass against `return {{success: true}}` should be rejected."
        )
    else:
        return (
            f"You are an adversarial code reviewer. Your job is to find gaps between the implementation and the acceptance criteria.\n\n"
            f"Story: {story_id}: {story_title}\n"
            f"Acceptance criteria:\n{ac_text}\n\n"
            f"Implementation files:\n{file_contents}\n\n"
            f"Review for:\n"
            f"1. Does the implementation actually satisfy EACH acceptance criterion?\n"
            f"2. Is there hardcoded data that should be dynamic or conditional?\n"
            f"3. Are error cases handled? (null checks, empty states, boundary conditions)\n"
            f"4. Would this survive a real user trying to break it?\n"
            f"5. Are there any TODOs, stubs, or incomplete paths?\n\n"
            f'Output ONLY a JSON object: {{"approved": true|false, "issues": ["issue1"], "suggestions": ["fix1"]}}\n\n'
            f"Be strict. Code that makes tests pass but does not satisfy the real AC should be rejected."
        )


def call_deepseek(prompt):
    """Call deepseek-r1:14b via Ollama API."""
    payload = json.dumps({
        "model": REVIEW_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "stream": False,
        "options": {"num_ctx": 8192},
    })

    result = subprocess.run(
        ["curl", "-s", "--max-time", "120", f"{OLLAMA_BASE}/api/chat",
         "-H", "Content-Type: application/json", "-d", payload],
        capture_output=True, text=True,
    )

    if result.returncode != 0:
        print(f"ERROR: curl failed with {result.returncode}: {result.stderr}", file=sys.stderr)
        return None

    try:
        response = json.loads(result.stdout)
        return response["message"]["content"]
    except (json.JSONDecodeError, KeyError) as e:
        print(f"ERROR: Failed to parse deepseek response: {e}", file=sys.stderr)
        return None


def extract_approval(content):
    """Extract approval decision from deepseek's response."""
    try:
        start = content.find("{")
        end = content.rfind("}") + 1
        if start >= 0 and end > start:
            obj = json.loads(content[start:end])
            return "YES" if obj.get("approved", False) else "NO"
    except json.JSONDecodeError:
        pass

    # Heuristic fallback
    lower = content.lower()
    if any(w in lower for w in ["reject", "not approved", '"approved": false']):
        return "NO"
    return "YES"


def main():
    if len(sys.argv) < 6:
        print("Usage: deepseek-review.py <tests|code> <story_id> <story_title> <ac1|ac2|...> <file1> [file2 ...]", file=sys.stderr)
        sys.exit(1)

    review_type = sys.argv[1]
    story_id = sys.argv[2]
    story_title = sys.argv[3]
    ac_pipe = sys.argv[4]
    files = sys.argv[5:]

    if review_type not in ("tests", "code"):
        print(f"ERROR: review_type must be 'tests' or 'code', got '{review_type}'", file=sys.stderr)
        sys.exit(1)

    ac_lines = [ac.strip() for ac in ac_pipe.split("|") if ac.strip()]

    # Read file contents
    file_contents = ""
    for f in files:
        try:
            with open(f) as fh:
                file_contents += f"--- FILE: {f} ---\n{fh.read()}\n\n"
        except FileNotFoundError:
            file_contents += f"--- FILE: {f} (NOT FOUND) ---\n\n"

    prompt = build_prompt(review_type, story_id, story_title, ac_lines, file_contents)
    content = call_deepseek(prompt)

    if content is None:
        print("ERROR: Failed to get review from deepseek")
        print("DEEPSEEK_APPROVED=UNKNOWN")
        sys.exit(1)

    print(content)
    approval = extract_approval(content)
    print(f"DEEPSEEK_APPROVED={approval}")


if __name__ == "__main__":
    main()
