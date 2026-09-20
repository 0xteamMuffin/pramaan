#!/usr/bin/env bash
# Local dev runner: backend (FastAPI) + frontend (Next.js). Runs with empty .env.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Backend setup"
cd "$ROOT/backend"
if [ ! -d .venv ]; then python3 -m venv .venv; fi
# shellcheck disable=SC1091
. .venv/bin/activate
pip install -q --upgrade pip
pip install -q -r requirements.txt
echo "==> Seeding synthetic data"
python -m app.seed --reset
echo "==> Starting API on http://localhost:8000 (docs at /docs)"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
API_PID=$!
trap 'kill $API_PID 2>/dev/null || true' EXIT

echo "==> Frontend setup"
cd "$ROOT/frontend"
npm install
echo "==> Starting web on http://localhost:3000"
NEXT_PUBLIC_API_BASE="http://localhost:8000/api/v1" npm run dev
