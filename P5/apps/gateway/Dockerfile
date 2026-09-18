FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY . .

FROM node:24-alpine AS runtime
WORKDIR /app

ARG P8_INDUCED_FAILURE=false
ENV P8_INDUCED_FAILURE=${P8_INDUCED_FAILURE}

COPY --from=builder --chown=node:node /app .

USER node

EXPOSE 8080

CMD ["node", "src/server.js"]
