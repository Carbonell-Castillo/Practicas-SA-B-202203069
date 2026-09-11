#!/usr/bin/env bash
set -Eeuo pipefail

SERVICE="${1:?Uso: test-service.sh <servicio>}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP="${ROOT}/P5/apps/${SERVICE}"
cd "${APP}"

case "${SERVICE}" in
  auth-service)
    npm ci
    npx prisma generate
    npm test -- --runInBand src/app.controller.spec.ts
    ;;
  authorization-service)
    npm ci
    npm test -- --runInBand src/app.controller.spec.ts
    ;;
  products-service)
    python -m compileall -q app
    python -m venv "${RUNNER_TEMP:-/tmp}/products-test-venv"
    # shellcheck disable=SC1091
    source "${RUNNER_TEMP:-/tmp}/products-test-venv/bin/activate"
    pip install --disable-pip-version-check -r requirements.txt
    python -c "from app.main import app; assert app.title == 'Products Service'"
    ;;
  gateway)
    npm ci
    NODE_BIN="$(command -v node || command -v node.exe)"
    while IFS= read -r -d '' file; do "${NODE_BIN}" --check "${file}"; done \
      < <(find src -type f -name '*.js' -print0)
    ;;
  *) echo "No hay suite definida para ${SERVICE}." >&2; exit 1 ;;
esac

echo "OK: test ${SERVICE}."
