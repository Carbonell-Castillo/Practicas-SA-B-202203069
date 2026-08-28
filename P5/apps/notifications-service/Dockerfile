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
COPY --from=builder --chown=node:node /app/tsconfig.json ./tsconfig.json

USER node

EXPOSE 4004

# Reintenta `migrate deploy` (hasta 60s) en vez de fallar a la primera: ver
# nota equivalente en apps/auth-service/Dockerfile.
CMD ["sh", "-c", "for i in $(seq 1 30); do npx prisma migrate deploy && break; echo \"[migrate] intento $i/30 fallo, reintentando en 2s...\"; sleep 2; done; node dist/src/main"]
