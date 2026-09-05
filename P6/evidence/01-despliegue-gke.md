# Evidencia real — despliegue GKE

Fecha de verificación: **2026-09-05 05:07–05:08 UTC**  
Proyecto: `softwareavanzado-507703`  
Clúster: `sa-p6`, zona `us-central1-a`  
Release Helm: `sa-platform`, revisión 3, estado `deployed`  
IP pública: **http://136.113.87.253**

## Clúster

Se verificaron dos nodos `e2-standard-2`, ambos en estado `Ready`, con Kubernetes `v1.35.7-gke.1027000`.

## Registro

Artifact Registry `us-central1-docker.pkg.dev/softwareavanzado-507703/sa-platform` contiene las ocho imágenes con tag `1.0.0`:

1. auth-service
2. authorization-service
3. products-service
4. orders-service
5. notifications-service
6. gateway
7. frontend
8. cron-jobs

## Persistencia y workloads

- `data-postgres-0`: `Bound`, 10 GiB, `standard-rwo`.
- `data-rabbitmq-0`: `Bound`, 10 GiB, `standard-rwo`.
- PostgreSQL y RabbitMQ: `1/1 Running`.
- Las siete aplicaciones web tienen sus réplicas `1/1 Running`.
- Los CronJobs heartbeat terminan en `Completed` y escriben el carnet `202203069`.

## Petición desde internet

`GET http://136.113.87.253/health` respondió HTTP 200:

```json
{
  "gateway": "ok",
  "allServicesUp": true,
  "services": [
    {"name": "auth-service", "ok": true},
    {"name": "authorization-service", "ok": true},
    {"name": "products-service", "ok": true},
    {"name": "orders-service", "ok": true}
  ]
}
```

`GET http://136.113.87.253/` respondió HTTP 200 con 11,163 bytes, confirmando el frontend público.

## Comunicación asíncrona

Se creó el producto de prueba con ID `5`. Luego se enviaron dos órdenes por el endpoint público:

| Orden | Total | Evidencia del consumidor |
|---|---:|---|
| `9f41957b-3e1f-46fb-81e1-4cbe2b419058` | 25.00 | Persistida 2026-09-05 05:07:29 UTC |
| `bfa302fc-82bc-4e35-92a0-6e2fa9ec249e` | 12.50 | Persistida 2026-09-05 05:08:46 UTC |

Ambas filas existen en `p5_notifications_db.order_notifications`. Esto demuestra el flujo real: API pública → orders-service → evento `order.created` → RabbitMQ → notifications-service → PostgreSQL.

## Protección de costos

Se creó `Practica-6-limite-10USD`, con presupuesto de USD 10 y alertas al 25 %, 50 %, 75 %, 90 % y 100 %. Las alertas no constituyen un límite rígido. El costo real puede tardar hasta 24 horas en aparecer.

> Pendiente manual: agregar capturas de la consola de GKE, Artifact Registry y navegador para complementar esta evidencia textual.
