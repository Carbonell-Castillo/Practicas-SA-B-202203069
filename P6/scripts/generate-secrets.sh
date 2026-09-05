#!/usr/bin/env bash
set -Eeuo pipefail
source "$(dirname "$0")/common.sh"
need openssl
out="${P6_DIR}/charts/sa-platform/values-secrets.yaml"
[[ ! -e "${out}" ]] || { echo "${out} ya existe; no se sobrescribio." >&2; exit 1; }
pg_admin="$(openssl rand -hex 24)"; pg_user="$(openssl rand -hex 24)"; rmq="$(openssl rand -hex 24)"
jwt="$(openssl rand -hex 32)"; aes="$(openssl rand -base64 32 | tr -d '\n')"
umask 077
cat >"${out}" <<EOF
postgresql:
  auth: {postgresPassword: "${pg_admin}", password: "${pg_user}"}
rabbitmq:
  auth: {password: "${rmq}"}
authService:
  secret:
    DATABASE_URL: "postgresql://p5_user:${pg_user}@postgres:5432/p4_auth_db?schema=public"
    JWT_SECRET: "${jwt}"
    AES_KEY: "${aes}"
productsService:
  secret: {DATABASE_URL: "postgresql+psycopg2://p5_user:${pg_user}@postgres:5432/p4_products_db"}
ordersService:
  secret:
    DATABASE_URL: "postgresql://p5_user:${pg_user}@postgres:5432/p4_orders_db?schema=public"
    RABBITMQ_URL: "amqp://p5_user:${rmq}@rabbitmq:5672/"
notificationsService:
  secret:
    DATABASE_URL: "postgresql://p5_user:${pg_user}@postgres:5432/p5_notifications_db?schema=public"
    RABBITMQ_URL: "amqp://p5_user:${rmq}@rabbitmq:5672/"
cronJobs:
  secret:
    DATABASE_URL: "postgresql://p5_user:${pg_user}@postgres:5432/p5_cron_db?schema=public"
    RABBITMQ_URL: "amqp://p5_user:${rmq}@rabbitmq:5672/"
EOF
echo "Secretos generados en ${out}; el archivo esta ignorado por Git."
