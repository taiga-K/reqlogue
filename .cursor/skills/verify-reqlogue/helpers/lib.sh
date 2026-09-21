# Shared by launch, doctor, and cleanup. Source only; do not execute.

export LANG="${LANG:-C.UTF-8}"
export LC_ALL="${LC_ALL:-C.UTF-8}"

VERIFY_SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$VERIFY_SKILL_DIR/../../.." && pwd)"
VERIFY_BASE_DIR="${REQLOGUE_VERIFY_BASE_DIR:-/tmp/reqlogue-verify}"
CURRENT_FILE="$VERIFY_BASE_DIR/CURRENT"

default_run_id() {
  date -u +%Y%m%dT%H%M%SZ
}

run_dir_for() {
  printf '%s/%s/run' "$VERIFY_BASE_DIR" "$1"
}

evidence_dir_for() {
  printf '%s/%s/evidence' "$VERIFY_BASE_DIR" "$1"
}

meta_file_for() {
  printf '%s/meta.env' "$(run_dir_for "$1")"
}

resolve_run_id() {
  if [[ -n "${REQLOGUE_VERIFY_RUN_ID:-}" ]]; then
    printf '%s\n' "$REQLOGUE_VERIFY_RUN_ID"
    return 0
  fi
  if [[ -f "$CURRENT_FILE" ]]; then
    tr -d '[:space:]' < "$CURRENT_FILE"
    return 0
  fi
  return 1
}

load_meta() {
  local run_id="$1"
  local meta
  meta="$(meta_file_for "$run_id")"
  if [[ ! -f "$meta" ]]; then
    echo "doctor: no meta for run $run_id at $meta" >&2
    echo "Launch this verification instance first: $VERIFY_SKILL_DIR/helpers/launch" >&2
    return 1
  fi
  # shellcheck disable=SC1090
  source "$meta"
}

pid_alive() {
  local pid="$1"
  [[ -n "$pid" && "$pid" != "0" ]] && kill -0 "$pid" 2>/dev/null
}

listening_pids() {
  local port="$1"
  python3 - "$port" <<'PY'
import os
import sys
from pathlib import Path

port = int(sys.argv[1])
inodes: set[str] = set()


def collect(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text().splitlines()[1:]:
        parts = line.split()
        local = parts[1]
        state = parts[3]
        inode = parts[9]
        _ip, raw_port = local.rsplit(":", 1)
        if int(raw_port, 16) == port and state == "0A":
            inodes.add(inode)


collect(Path("/proc/net/tcp"))
collect(Path("/proc/net/tcp6"))
pids: set[str] = set()
for proc in Path("/proc").iterdir():
    if not proc.name.isdigit():
        continue
    fd_dir = proc / "fd"
    try:
        for link in fd_dir.iterdir():
            try:
                target = os.readlink(link)
            except OSError:
                continue
            if target.startswith("socket:[") and target[8:-1] in inodes:
                pids.add(proc.name)
    except OSError:
        continue
print("\n".join(sorted(pids, key=int)))
PY
}

ppid_of() {
  local pid="$1"
  awk '/^PPid:/ {print $2}' "/proc/$pid/status" 2>/dev/null
}

pid_is_self_or_descendant() {
  local ancestor="$1"
  local candidate="$2"
  local current
  current="$candidate"
  local steps=0
  while [[ -n "$current" && "$current" != "0" && "$steps" -lt 32 ]]; do
    if [[ "$current" == "$ancestor" ]]; then
      return 0
    fi
    if [[ ! -r "/proc/$current/status" ]]; then
      return 1
    fi
    current="$(ppid_of "$current")"
    steps=$((steps + 1))
  done
  return 1
}

# Start a command in a new session and record the session-leader PID.
# Usage: start_session PIDFILE LOGFILE [working-dir] -- cmd args...
start_session() {
  local pidfile="$1"
  local logfile="$2"
  local workdir="$3"
  shift 3
  if [[ "$1" != "--" ]]; then
    echo "start_session: expected -- before command" >&2
    return 2
  fi
  shift
  rm -f "$pidfile"
  setsid bash -c '
    printf "%s\n" "$$" > "$0"
    cd "$1"
    shift
    exec "$@"
  ' "$pidfile" "$workdir" "$@" < /dev/null >"$logfile" 2>&1 &
  local waited=0
  while [[ ! -s "$pidfile" && "$waited" -lt 50 ]]; do
    sleep 0.1
    waited=$((waited + 1))
  done
  if [[ ! -s "$pidfile" ]]; then
    echo "start_session: pid file was not written: $pidfile" >&2
    return 1
  fi
  tr -d "[:space:]" < "$pidfile"
}

port_owned_by_pid() {
  local owner="$1"
  local port="$2"
  local pid
  local found=0
  while read -r pid; do
    [[ -z "$pid" ]] && continue
    found=1
    if pid_is_self_or_descendant "$owner" "$pid"; then
      return 0
    fi
  done < <(listening_pids "$port")
  if [[ "$found" -eq 0 ]]; then
    return 1
  fi
  return 1
}

port_is_free() {
  local port="$1"
  [[ -z "$(listening_pids "$port")" ]]
}

kill_tree() {
  local pid="$1"
  if ! pid_alive "$pid"; then
    return 0
  fi
  kill -TERM -- "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
  local waited=0
  while pid_alive "$pid" && [[ "$waited" -lt 20 ]]; do
    sleep 0.25
    waited=$((waited + 1))
  done
  if pid_alive "$pid"; then
    kill -KILL -- "-$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null || true
  fi
}

html_has_reqlogue_home() {
  local url="$1"
  local body
  body="$(curl -fsS --max-time 5 "$url/" 2>/dev/null || true)"
  [[ "$body" == *"<title>reqlogue</title>"* ]] && [[ "$body" == *"話すことに、集中しよう。"* ]]
}
