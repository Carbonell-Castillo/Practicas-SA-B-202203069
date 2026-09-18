#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"
TIMEOUT="${TIMEOUT:-10}"

root="$(curl --fail --silent --show-error --max-time "$TIMEOUT" "$BASE_URL/")"
jq -e '.service == "api-gateway" and .routes.products_rest == "/api/products/*"' <<<"$root" >/dev/null

products="$(curl --fail --silent --show-error --max-time "$TIMEOUT" "$BASE_URL/api/products")"
jq -e 'type == "array"' <<<"$products" >/dev/null
printf 'Integración OK: gateway y catálogo responden correctamente\n'
