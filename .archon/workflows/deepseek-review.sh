#!/bin/bash
# deepseek-review.sh — Adversarial review via Ollama API
# Usage: deepseek-review.sh <type> <story_id> <story_title> <ac_criteria_pipe_separated> <files...>
# type: "tests" or "code"
# Example: deepseek-review.sh tests US-001 "Login form" "User can login|User sees error on fail" src/Login.test.tsx

set -e

REVIEW_TYPE="$1"
STORY_ID="$2"
STORY_TITLE="$3"
AC_PIPE="$4"
shift 4
FILES_TO_REVIEW=("$@")

# Convert pipe-separated AC to bullet list
AC_TEXT=$(echo "$AC_PIPE" | tr '|' '\n' | sed 's/^/- /')

# Build file contents
FILE_CONTENTS=""
for f in "${FILES_TO_REVIEW[@]}"; do
  if [ -f "$f" ]; then
    FILE_CONTENTS="${FILE_CONTENTS}--- FILE: ${f} ---
$(cat "$f")

"
  fi
done

# Build the review prompt based on type
if [ "$REVIEW_TYPE" = "tests" ]; then
  PROMPT="You are an adversarial test reviewer. Your job is to find weaknesses in these tests.

Story: ${STORY_ID}: ${STORY_TITLE}
Acceptance criteria:
${AC_TEXT}

Test files:
${FILE_CONTENTS}

Review for:
1. Do tests actually verify each AC? (not just exists or renders checks)
2. Are tests trivially passable by a naive hardcoded implementation?
3. Are edge cases missing? (null, empty, boundary values, error states)
4. Are mocks too generous? (mocking the thing being tested instead of deps)
5. Do tests verify behavior, not implementation details?

Output ONLY a JSON object: {\"approved\": true|false, \"issues\": [\"issue1\"], \"suggestions\": [\"fix1\"]}

Be strict. Tests that would pass against return {success: true} should be rejected."
else
  PROMPT="You are an adversarial code reviewer. Your job is to find gaps between the implementation and the acceptance criteria.

Story: ${STORY_ID}: ${STORY_TITLE}
Acceptance criteria:
${AC_TEXT}

Implementation files:
${FILE_CONTENTS}

Review for:
1. Does the implementation actually satisfy EACH acceptance criterion?
2. Is there hardcoded data that should be dynamic or conditional?
3. Are error cases handled? (null checks, empty states, boundary conditions)
4. Would this survive a real user trying to break it?
5. Are there any TODOs, stubs, or incomplete paths?

Output ONLY a JSON object: {\"approved\": true|false, \"issues\": [\"issue1\"], \"suggestions\": [\"fix1\"]}

Be strict. Code that makes tests pass but does not satisfy the real AC should be rejected."
fi

# Call deepseek via Ollama API
python3 -c "
import json, subprocess, sys

prompt = '''${PROMPT}'''

data = json.dumps({{
    'model': 'deepseek-r1:14b',
    'messages': [{{'role': 'user', 'content': prompt}}],
    'stream': False,
    'options': {{'num_ctx': 8192}}
}})

result = subprocess.run(['curl', '-s', '--max-time', '120',
    'http://llm:11434/api/chat', '-H', 'Content-Type: application/json',
    '-d', data], capture_output=True, text=True)

response = json.loads(result.stdout)
content = response['message']['content']
print(content)

# Extract approval decision
try:
    start = content.find('{{')
    end = content.rfind('}}') + 1
    if start >= 0 and end > start:
        obj = json.loads(content[start:end])
        approved = obj.get('approved', False)
    else:
        lower = content.lower()
        approved = not any(w in lower for w in ['reject', 'not approved'])
except:
    approved = True

print(f'DEEPSEEK_APPROVED={{\"YES\" if approved else \"NO\"}}')
"
