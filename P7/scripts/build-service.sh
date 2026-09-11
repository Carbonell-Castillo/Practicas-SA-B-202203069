#!/usr/bin/env bash
set -Eeuo pipefail

SERVICE="${1:?Uso: build-service.sh <servicio>}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP="${ROOT}/P5/apps/${SERVICE}"
[[ -d "${APP}" ]] || { echo "Servicio inexistente: ${SERVICE}" >&2; exit 1; }
cd "${APP}"

case "${SERVICE}" in
  auth-service|orders-service|notifications-service|cron-jobs)
    npm ci
    npx prisma generate
    npm run build
    ;;
  authorization-service|frontend)
    npm ci
    NEXT_PUBLIC_API_URL=/api NEXT_PUBLIC_GATEWAY_URL=/ npm run build
    ;;
  gateway)
    npm ci
    NODE_BIN="$(command -v node || command -v node.exe)"
    while IFS= read -r -d '' file; do "${NODE_BIN}" --check "${file}"; done \
      < <(find src -type f -name '*.js' -print0)
    ;;
  products-service)
    python -m compileall -q app
    python -m venv "${RUNNER_TEMP:-/tmp}/products-build-venv"
    # shellcheck disable=SC1091
    source "${RUNNER_TEMP:-/tmp}/products-build-venv/bin/activate"
    pip install --disable-pip-version-check -r requirements.txt
    python -c "from app.main import app; assert app.title"
    ;;
  *) echo "Servicio no soportado: ${SERVICE}" >&2; exit 1 ;;
esac

echo "OK: build ${SERVICE}."
