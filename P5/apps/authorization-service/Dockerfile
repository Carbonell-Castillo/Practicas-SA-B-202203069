FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build
# Sin Prisma aqui: se pueden podar TODAS las devDependencies (typescript,
# eslint, jest...) antes de copiar node_modules a la imagen final.
RUN npm prune --omit=dev

FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/package.json ./package.json

USER node

EXPOSE 4001

CMD ["node", "dist/main"]
