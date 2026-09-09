#!/bin/bash
# PreToolUse guard on Edit|Write|MultiEdit. Blocks edits to the test files this
# ticket froze at its RED step.
#
# Why this exists: the single most likely way a bounded fix loop "succeeds"
# wrongly is by editing the failing assertion instead of the code under it.
# Nothing else in the pipeline catches that — the suite goes green and the
# evidence bundle looks clean. So it is a hook, not an instruction.
#
# Fails OPEN when no scope contract exists (nothing in flight) or when
# frozen_tests is empty (RED step not reached yet — the implementer is still
# allowed to write the tests in the first place).

set -euo pipefail

INPUT="$(cat)"
FILE_PATH="$(echo "$INPUT" | python3 -c "import json,sys
try:
    print(json.load(sys.stdin).get('tool_input',{}).get('file_path',''))
except Exception:
    print('')")"
[ -z "$FILE_PATH" ] && exit 0

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
SCOPE_FILE="$REPO_ROOT/.claude/current-scope.yaml"
[ ! -f "$SCOPE_FILE" ] && exit 0

REL_PATH="${FILE_PATH#"$REPO_ROOT"/}"

FROZEN="$(awk '/^frozen_tests:/{flag=1;next}/^[a-z_]+:/{flag=0}flag' "$SCOPE_FILE" | sed 's/^[[:space:]]*-[[:space:]]*//')"
[ -z "$FROZEN" ] && exit 0

while IFS= read -r pattern; do
  [ -z "$pattern" ] && continue
  regex="^$(echo "$pattern" | sed 's/\*\*/.*/g; s/\*/[^\/]*/g')$"
  if echo "$REL_PATH" | grep -Eq "$regex"; then
    echo "Blocked: $REL_PATH is a frozen test for this ticket." >&2
    echo "" >&2
    echo "These tests were written from the approved test plan and confirmed failing" >&2
    echo "at the RED step. Changing one to make the suite pass would invalidate the" >&2
    echo "evidence the review gate reads." >&2
    echo "" >&2
    echo "If the test is genuinely wrong, that is a finding, not a fix: stop, report" >&2
    echo "which assertion is wrong and why, and let a human decide. Fixing it means" >&2
    echo "re-approving the test plan, not editing this file." >&2
    exit 2
  fi
done <<< "$FROZEN"

exit 0
