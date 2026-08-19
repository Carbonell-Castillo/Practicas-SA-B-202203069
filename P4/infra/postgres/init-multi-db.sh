#!/bin/bash
# Se ejecuta una única vez, la primera vez que arranca el volumen de datos de
# Postgres. Crea las bases de datos de products-service y orders-service
# además de la que ya crea la imagen automáticamente (POSTGRES_DB, usada por
# auth-service). Las tres viven en la misma instancia de Postgres, pero cada
# microservicio solo conoce/usa la suya (aislamiento lógico por base de datos).
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE p4_products_db OWNER $POSTGRES_USER;
    CREATE DATABASE p4_orders_db OWNER $POSTGRES_USER;
EOSQL
