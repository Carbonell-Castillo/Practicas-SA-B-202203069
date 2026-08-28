FROM node:24-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build
# "prisma" vive en "dependencies" (runtime lo necesita para `migrate
# deploy`); el resto de devDependencies se podan aqui antes de copiar
# node_modules a la imagen final.
RUN npm prune --omit=dev

FROM node:24-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl
ENV NODE_ENV=production

COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/prisma.config.ts ./prisma.config.ts

USER node

# Sin EXPOSE: este job no levanta ningun servidor.
#
# El modo ("heartbeat" | "summary") lo decide el CronJob de Kubernetes via
# `args`, NO `command` (el ENTRYPOINT ya es el wrapper de shell de abajo).
# Ejemplo de spec.jobTemplate...containers[0]: `args: ["heartbeat"]`.
#
# El truco `sh -c '... "$@"' --` reenvia los argumentos que Kubernetes pase
# en `args` como $1, $2... del script, que a su vez los pasa tal cual a
# `node dist/src/main`, donde `main.ts` los lee de `process.argv[2]`.
# Reintento corto (hasta ~20s) de `migrate deploy`: un Job de una sola
# ejecución no debería morir solo porque Postgres tardó unos segundos más en
# aceptar conexiones — backoffLimit sigue cubriendo fallos reales más allá
# de esta ventana.
ENTRYPOINT ["sh", "-c", "for i in $(seq 1 10); do npx prisma migrate deploy && break; echo \"[migrate] intento $i/10 fallo, reintentando en 2s...\"; sleep 2; done; node dist/src/main \"$@\"", "--"]
