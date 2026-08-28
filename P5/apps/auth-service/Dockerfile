FROM node:24-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build
# "prisma" (el CLI) se movio a "dependencies" porque el CMD de runtime lo
# necesita para `prisma migrate deploy`; el resto de devDependencies
# (typescript, eslint, jest, ts-node...) no hacen falta despues de compilar,
# asi que se podan aqui MISMO (antes de copiar node_modules a la imagen
# final) en vez de copiar el node_modules completo sin optimizar como hacia
# el Dockerfile original de P4. Nota: esto tambien podo "ts-node", asi que
# `npx prisma db seed` (que lo necesita) ya no corre dentro del contenedor
# runtime — usar la imagen builder o correrlo en local para sembrar datos.
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
COPY --from=builder --chown=node:node /app/tsconfig.json ./tsconfig.json

USER node

EXPOSE 4000

# Aplica migraciones pendientes contra la DB del compose y luego arranca la API.
# Reintenta `migrate deploy` (hasta 60s) en vez de fallar a la primera: en un
# arranque en frío del clúster, Postgres puede tardar unos segundos más que
# este pod en aceptar conexiones — sin el reintento, el contenedor moría con
# exit 1 y dependía de que Kubernetes lo reiniciara solo (visto en vivo en
# esta práctica: 1 reinicio en el primer `helm install` limpio).
CMD ["sh", "-c", "for i in $(seq 1 30); do npx prisma migrate deploy && break; echo \"[migrate] intento $i/30 fallo, reintentando en 2s...\"; sleep 2; done; node dist/src/main"]
