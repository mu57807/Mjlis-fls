# LFI Video Studio - container image. Used by Railway (see README "Put it online")
# and by any company server that runs Docker.
#
#   docker build -t lfi-video-studio .
#   docker run -p 3000:3000 --env-file .env.local -v lfi-data:/app/data lfi-video-studio
FROM node:22-bookworm-slim

# Libraries the headless browser needs to render video frames, plus a fallback font.
RUN apt-get update && apt-get install -y --no-install-recommends \
      libnss3 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 libgbm1 libasound2 \
      libxrandr2 libxkbcommon0 libxfixes3 libxcomposite1 libxdamage1 \
      libpango-1.0-0 libcairo2 libcups2 fonts-dejavu-core ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Build the web app and download the headless browser used for rendering.
RUN npm run build \
    && node -e "require('@remotion/renderer').ensureBrowser().then(() => console.log('Render browser ready'))"

ENV NODE_ENV=production
# Database, videos and audio live here. On Railway, attach a volume at /app/data.
ENV LFI_DATA_DIR=/app/data
EXPOSE 3000
# Railway (and most hosts) tell the app which port to use in $PORT.
CMD ["sh", "-c", "exec npx next start -H 0.0.0.0 -p ${PORT:-3000}"]
