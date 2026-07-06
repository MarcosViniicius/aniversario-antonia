# syntax=docker/dockerfile:1
FROM node:20-bookworm-slim

# BuildKit cache mount — apt packages ficam em cache entre builds
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
        chromium \
        libxss1 \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production \
    # Suprime tentativas de conexão D-Bus (inexistente em containers)
    DBUS_SESSION_BUS_ADDRESS=/dev/null

WORKDIR /app

# BuildKit cache mount — node_modules ficam em cache entre builds
COPY package.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm install --omit=dev

COPY server.js ./

RUN mkdir -p .wwebjs_auth && chown -R node:node /app

USER node

EXPOSE 3100

CMD ["node", "server.js"]
