#!/usr/bin/env bash
# Job Goblin unattended run. Requires one-time approval in private profile.json.
set -Eeuo pipefail
ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
if [[ ! -x "$ROOT/.venv/bin/python" ]]; then
  echo "Missing .venv. Follow README setup first." >&2
  exit 1
fi
if [[ ! -f "$ROOT/profile.json" || ! -d "$ROOT/resumes" ]]; then
  echo "Missing private profile.json or resumes/ folder." >&2
  exit 1
fi
# Lock against overlapping runs. The file contains no personal application data.
exec 9>"$ROOT/.autopilot.lock"
flock -n 9 || { echo "Goblin already working. Skipping overlapping run."; exit 0; }
exec "$ROOT/.venv/bin/python" "$ROOT/agent.py" \
  --profile "$ROOT/profile.json" --resumes "$ROOT/resumes" \
  --discover --submit --unattended --max 10 \
  --log "$ROOT/applications.jsonl"
