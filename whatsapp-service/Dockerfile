# syntax=docker/dockerfile:1
FROM node:20-bookworm-slim

# Apenas as libs de sistema que o Chrome precisa — o Chrome em si
# é baixado pelo Puppeteer durante o npm install (versão compatível)
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates \
        fonts-liberation \
        libasound2 \
        libatk-bridge2.0-0 \
        libatk1.0-0 \
        libcups2 \
        libdbus-1-3 \
        libdrm2 \
        libgbm1 \
        libgtk-3-0 \
        libnspr4 \
        libnss3 \
        libxcomposite1 \
        libxdamage1 \
        libxext6 \
        libxfixes3 \
        libxkbcommon0 \
        libxrandr2 \
        libxss1 \
        libxtst6 \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    # Puppeteer baixa o Chrome aqui durante npm install
    PUPPETEER_CACHE_DIR=/app/.puppeteer-cache

WORKDIR /app

COPY package.json ./
# npm install já faz o download do Chrome compatível com esta versão do puppeteer
RUN --mount=type=cache,target=/root/.npm \
    npm install --omit=dev

COPY server.js ./

RUN mkdir -p .wwebjs_auth .puppeteer-cache && chown -R node:node /app

USER node

EXPOSE 3100

CMD ["node", "server.js"]
