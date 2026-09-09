#!/bin/bash
# PreToolUse guard on Edit|Write|MultiEdit. Enforces the CURRENT ticket's
# declared scope contract (.claude/current-scope.yaml) — the allowlist half
# of the scope guard described in the POC design doc (section 5). The
# planner agent writes this file once a plan is approved; the tester/
# implementer agents work inside it; pr-reviewer clears it after merge.
#
# Fails OPEN (does not block) if no scope file exists yet — during
# planning/exploration, before a plan is approved, there's nothing to
# enforce against. Once current-scope.yaml exists, edits outside its
# allowed_paths are blocked.

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

ALLOWED="$(awk '/allowed_paths:/{flag=1;next}/^[a-z_]+:/{flag=0}flag' "$SCOPE_FILE" | sed 's/^[[:space:]]*-[[:space:]]*//')"
[ -z "$ALLOWED" ] && exit 0

MATCH=0
while IFS= read -r pattern; do
  [ -z "$pattern" ] && continue
  regex="^$(echo "$pattern" | sed 's/\*\*/.*/g; s/\*/[^\/]*/g')$"
  if echo "$REL_PATH" | grep -Eq "$regex"; then
    MATCH=1
    break
  fi
done <<< "$ALLOWED"

if [ "$MATCH" -eq 0 ]; then
  if [ "${ALLOW_SENSITIVE:-0}" != "1" ]; then
    echo "Blocked: $REL_PATH is outside this ticket's declared scope." >&2
    echo "Allowed paths are listed in $SCOPE_FILE." >&2
    echo "If this file genuinely needs to change, stop and ask a human to update the scope contract — don't override silently." >&2
    exit 2
  fi
fi

exit 0
