#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
command -v helm >/dev/null || { echo "Falta helm" >&2; exit 1; }
for script in "${ROOT}"/scripts/*.sh; do bash -n "${script}"; done
secrets="$(mktemp)"; trap 'rm -f "${secrets}"' EXIT
sed 's/CHANGE_ME_[A-Za-z0-9_]*/testvalue/g' "${ROOT}/charts/sa-platform/values.example.yaml" >"${secrets}"
helm dependency build "${ROOT}/charts/sa-platform"
helm lint "${ROOT}/charts/sa-platform" -f "${ROOT}/charts/sa-platform/values-gke.yaml" -f "${secrets}"
helm template sa-platform "${ROOT}/charts/sa-platform" -n sa-p6 -f "${ROOT}/charts/sa-platform/values-gke.yaml" -f "${secrets}" >/dev/null
echo "OK: sintaxis Bash, dependencias, lint y renderizado Helm."
