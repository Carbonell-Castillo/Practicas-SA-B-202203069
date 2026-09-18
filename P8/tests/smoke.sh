#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"
TIMEOUT="${TIMEOUT:-10}"

body="$(curl --fail --silent --show-error --max-time "$TIMEOUT" "$BASE_URL/health")"
jq -e '.gateway == "ok" and .allServicesUp == true' <<<"$body" >/dev/null
printf 'Smoke OK: %s/health\n' "$BASE_URL"
