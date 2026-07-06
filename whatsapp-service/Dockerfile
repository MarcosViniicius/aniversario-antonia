FROM node:20-bookworm-slim

# Install Chromium and dependencies needed for headless browser
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    libxss1 \
  && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to skip its own Chromium download and use the system one
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY server.js ./

# Create session dir and hand ownership to the non-root node user
RUN mkdir -p .wwebjs_auth && chown -R node:node /app

USER node

EXPOSE 3100

CMD ["node", "server.js"]
