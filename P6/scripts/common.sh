#!/usr/bin/env bash
set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
P6_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
CONFIG_FILE="${CONFIG_FILE:-${P6_DIR}/config.env}"
[[ -f "${CONFIG_FILE}" ]] || { echo "Copia config.env.example a config.env y configura PROJECT_ID." >&2; exit 1; }
set -a
# shellcheck disable=SC1090
source "${CONFIG_FILE}"
set +a
: "${PROJECT_ID:?PROJECT_ID es obligatorio}"
: "${REGION:=us-central1}"; : "${ZONE:=us-central1-a}"; : "${CLUSTER_NAME:=sa-p6}"
: "${REPOSITORY:=sa-platform}"; : "${NAMESPACE:=sa-p6}"; : "${RELEASE:=sa-platform}"
: "${IMAGE_TAG:=1.0.0}"; : "${MACHINE_TYPE:=e2-standard-2}"; : "${NUM_NODES:=2}"; : "${P5_DIR:=../P5}"
P5_ABS="$(cd "${P6_DIR}" && cd "${P5_DIR}" && pwd)"
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}"
SERVICES=(auth-service authorization-service products-service orders-service notifications-service gateway frontend cron-jobs)
need() { command -v "$1" >/dev/null 2>&1 || { echo "Falta el comando: $1" >&2; exit 1; }; }
for tool in gcloud kubectl helm docker; do need "${tool}"; done

