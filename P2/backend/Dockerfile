FROM node:24-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
# "src" solo se necesita para poder correr "npx prisma db seed" (ts-node)
# dentro del contenedor; la app en si corre desde "dist".
COPY --from=builder /app/src ./src

EXPOSE 4000

# Aplica migraciones pendientes contra la DB del compose y luego arranca la API.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]
