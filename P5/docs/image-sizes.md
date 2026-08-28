# Tamaño de imágenes — antes / después (sección G de Make.md)

"Antes" = Dockerfile original de P4 (`docker build`, medido en esta misma
máquina). "Después" = Dockerfile de P5 en `apps/<servicio>/Dockerfile`
(multi-stage real, usuario no-root, `npm prune --omit=dev`, base mínima).
`notifications-service` y `cron-jobs` son servicios nuevos de P5 (sin
equivalente en P4).

| Servicio | Antes (P4) | Después (P5) | Reducción |
|---|---:|---:|---:|
| auth-service | 1.03 GB | 813 MB | ~21% |
| authorization-service | 582 MB | 322 MB | ~45% |
| products-service | 578 MB | 305 MB | ~47% |
| orders-service | 946 MB | 849 MB | ~10% |
| gateway | 282 MB | 265 MB | ~6% |
| frontend | 289 MB | 289 MB | ~0%¹ |
| notifications-service | — (nuevo) | 799 MB | — |
| cron-jobs | — (nuevo) | 741 MB | — |

(auth-service/orders-service/notifications-service/cron-jobs crecieron unos
~10MB respecto a una medición previa de esta misma práctica: se añadió un
bucle de reintento a `prisma migrate deploy` en el `CMD`/`ENTRYPOINT` para
tolerar que Postgres tarde en aceptar conexiones en un arranque en frío —
son unas pocas líneas de shell, el cambio de tamaño es ruido de capas, no
una regresión real.)

¹ El Dockerfile de `frontend` ya era multi-stage real en P4 (Next.js
`output: standalone`); P5 solo le añadió endurecimiento de seguridad
(usuario no-root), sin tocar la estructura de capas — por eso el tamaño no
cambia.

## Qué se optimizó

- **products-service / authorization-service** (mayor reducción, ~45-47%):
  el Dockerfile de P4 era de una sola etapa — `gcc`/`libpq-dev` (products) y
  todas las devDependencies de Node (authorization) terminaban en la imagen
  final. P5 separa build y runtime: la etapa `builder` instala herramientas
  de compilación / devDependencies, la etapa final solo copia lo
  estrictamente necesario para ejecutar.
- **auth-service / orders-service / notifications-service / cron-jobs**
  (NestJS + Prisma): el mayor costo restante es Prisma mismo — el CLI
  `prisma` (necesario en runtime para `prisma migrate deploy` al arrancar el
  pod) arrastra como dependencias transitivas **Prisma Studio** y
  **Prisma Dev** (~60 MB combinados), herramientas interactivas de
  desarrollo que el contenedor nunca ejecuta. Se intentó podarlas a mano
  (`rm -rf node_modules/@prisma/studio-core node_modules/@prisma/dev`)
  después de `npm prune --omit=dev`, pero **rompe el arranque**: el propio
  `prisma/build/cli.js` hace un `require('@prisma/studio-core/data/bff')` a
  nivel de módulo (no solo cuando se invoca `prisma studio`), así que
  `prisma migrate deploy` también falla con `MODULE_NOT_FOUND` sin ese
  paquete presente — se revirtió el intento. El resto
  (`@prisma/client/runtime`, el motor de schema) es necesario para que
  Prisma funcione y no es reducible sin abandonar el ORM.
- **gateway** (reducción modesta, ~6%): ya era una imagen pequeña (proxy
  Express sin build step); el ahorro viene solo de mover a
  `npm ci --omit=dev` en una etapa `builder` separada en vez de instalar
  directo en la imagen final.
- **Todos los servicios Node**: usuario no-root explícito (`USER node`,
  aprovechando el usuario `node` ya presente en `node:24-alpine`) en vez de
  `root`, requisito de la sección G (`runAsNonRoot: true` en el
  `securityContext` de Kubernetes exige que la imagen realmente pueda
  arrancar como ese usuario).

## Reproducir la medición

```bash
# "antes" (P4 original, sin modificar)
docker build -t p4-before/auth-service:orig P4/backend
docker build -t p4-before/authorization-service:orig P4/authorization-service
docker build -t p4-before/products-service:orig P4/products-service
docker build -t p4-before/orders-service:orig P4/orders-service
docker build -t p4-before/gateway:orig P4/gateway
docker build -t p4-before/frontend:orig --build-arg NEXT_PUBLIC_API_URL=http://localhost:8080/api --build-arg NEXT_PUBLIC_GATEWAY_URL=http://localhost:8080 P4/frontend

# "después" (P5, ver README para el build completo de los 8 servicios)
docker build -t sa-platform/auth-service:dev P5/apps/auth-service
# ...

docker images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}" | grep -E "p4-before|sa-platform"
```
