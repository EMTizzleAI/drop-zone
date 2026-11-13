#!/usr/bin/env bash
# One-time opt-in to daily Job Goblin runs on Linux with systemd user timers.
set -Eeuo pipefail
ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
if [[ ! -f "$ROOT/profile.json" ]]; then
  echo "Create a private profile.json from profile.example.json first." >&2; exit 1
fi
if [[ ! -x "$ROOT/.venv/bin/python" ]]; then
  echo "Install Python requirements in .venv first. See README." >&2; exit 1
fi
"$ROOT/.venv/bin/python" - "$ROOT/profile.json" <<'PY'
import json, sys
from pathlib import Path
profile = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
if profile.get("autopilot", {}).get("enabled") is not True:
    sys.exit("Not enabled: explicitly set autopilot.enabled=true in private profile.json.")
if not profile.get("targets"):
    sys.exit("Configure at least one job target and its résumé first.")
print("Job Goblin: unattended mode authorized in your local profile.")
PY
DIR="$HOME/.config/systemd/user"
mkdir -p "$DIR"
cat > "$DIR/job-goblin-autopilot.service" <<EOF
[Unit]
Description=Job Goblin local unattended job applications
[Service]
Type=oneshot
WorkingDirectory="$ROOT"
ExecStart=/usr/bin/bash "$ROOT/run-autopilot.sh"
EOF
cat > "$DIR/job-goblin-autopilot.timer" <<'EOF'
[Unit]
Description=Daily Job Goblin local application run
[Timer]
OnCalendar=*-*-* 10:00:00
Persistent=true
Unit=job-goblin-autopilot.service
[Install]
WantedBy=timers.target
EOF
systemctl --user daemon-reload
systemctl --user enable --now job-goblin-autopilot.timer
echo "Scheduled: daily 10 AM, when your Linux user timer can run."
echo "Status: systemctl --user list-timers job-goblin-autopilot.timer"
echo "PAUSE: systemctl --user disable --now job-goblin-autopilot.timer"
