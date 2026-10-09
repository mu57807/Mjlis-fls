# LFI Video Studio - container for running on a company server.
# Starting point: not yet tested on your infrastructure.
#
#   docker build -t lfi-video-studio .
#   docker run -p 3000:3000 --env-file .env.local -v lfi-data:/app/data lfi-video-studio
FROM node:22-bookworm-slim

# Libraries the headless browser needs to render video frames.
RUN apt-get update && apt-get install -y --no-install-recommends \
      libnss3 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 libgbm1 libasound2 \
      libxrandr2 libxkbcommon0 libxfixes3 libxcomposite1 libxdamage1 \
      libpango-1.0-0 libcairo2 libcups2 ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && node -e "require('@remotion/renderer').ensureBrowser()"

ENV NODE_ENV=production
ENV LFI_DATA_DIR=/app/data
EXPOSE 3000
CMD ["npm", "start"]
