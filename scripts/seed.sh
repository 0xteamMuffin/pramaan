#!/usr/bin/env bash
# Reseed the synthetic dataset (deterministic).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/backend"
# shellcheck disable=SC1091
[ -d .venv ] && . .venv/bin/activate
python -m app.seed --reset
