#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT="${1:-${ROOT}/charts/sa-platform/values-secrets.yaml}"

command -v openssl >/dev/null || { echo "Falta openssl." >&2; exit 1; }
[[ ! -e "${OUTPUT}" ]] || { echo "No se sobrescribió ${OUTPUT}." >&2; exit 1; }

pg_admin="$(openssl rand -hex 24)"
pg_user="$(openssl rand -hex 24)"
rabbit="$(openssl rand -hex 24)"
jwt="$(openssl rand -hex 32)"
aes="$(openssl rand -base64 32 | tr -d '\n')"
umask 077

cat >"${OUTPUT}" <<EOF
postgresql:
  auth:
    postgresPassword: "${pg_admin}"
    password: "${pg_user}"
rabbitmq:
  auth:
    password: "${rabbit}"
authService:
  secret:
    DATABASE_URL: "postgresql://p5_user:${pg_user}@postgres:5432/p4_auth_db?schema=public"
    JWT_SECRET: "${jwt}"
    AES_KEY: "${aes}"
productsService:
  secret:
    DATABASE_URL: "postgresql+psycopg2://p5_user:${pg_user}@postgres:5432/p4_products_db"
ordersService:
  secret:
    DATABASE_URL: "postgresql://p5_user:${pg_user}@postgres:5432/p4_orders_db?schema=public"
    RABBITMQ_URL: "amqp://p5_user:${rabbit}@rabbitmq:5672/"
notificationsService:
  secret:
    DATABASE_URL: "postgresql://p5_user:${pg_user}@postgres:5432/p5_notifications_db?schema=public"
    RABBITMQ_URL: "amqp://p5_user:${rabbit}@rabbitmq:5672/"
cronJobs:
  secret:
    DATABASE_URL: "postgresql://p5_user:${pg_user}@postgres:5432/p5_cron_db?schema=public"
    RABBITMQ_URL: "amqp://p5_user:${rabbit}@rabbitmq:5672/"
EOF

echo "Valores secretos creados con permisos privados en ${OUTPUT}."
