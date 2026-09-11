#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHART="${ROOT}/charts/sa-platform"
HELM_BIN="$(command -v helm || command -v helm.exe)"
VALUES="$(mktemp)"
trap 'rm -f "${VALUES}"' EXIT

helm_path() {
  local path="$1"
  if [[ "${HELM_BIN}" == *.exe ]]; then
    wslpath -w "$(realpath "${path}")"
  else
    realpath "${path}"
  fi
}

for subchart in "${CHART}"/charts/*; do
  [[ -f "${subchart}/Chart.yaml" ]] || continue
  "${HELM_BIN}" dependency build "$(helm_path "${subchart}")"
done
"${HELM_BIN}" dependency build "$(helm_path "${CHART}")"

sed -E 's/CHANGE_ME_[A-Za-z0-9_]+/ci-safe-placeholder/g' \
  "${CHART}/values.example.yaml" >"${VALUES}"
"${HELM_BIN}" lint "$(helm_path "${CHART}")" \
  -f "$(helm_path "${CHART}/values-kind.yaml")" -f "$(helm_path "${VALUES}")"
"${HELM_BIN}" template sa-platform "$(helm_path "${CHART}")" --namespace sa-p7 \
  -f "$(helm_path "${CHART}/values-kind.yaml")" -f "$(helm_path "${VALUES}")" >/dev/null

echo "OK: dependencias, lint y renderizado Helm."
