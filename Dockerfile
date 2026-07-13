# GrudgeDot launcher — production Docker image for Railway
FROM node:22-alpine

WORKDIR /app

# Install dependencies.
# --ignore-scripts avoids native gyp packages (fast-find-in-files, canvas, etc.)
# that are not required for the launcher server runtime.
COPY package*.json ./
RUN npm install --legacy-peer-deps --ignore-scripts

# App sources
COPY server/ ./server/
COPY shared/ ./shared/
COPY client/ ./client/
COPY public/ ./public/
COPY scripts/ ./scripts/
COPY workers/ ./workers/
COPY migrations/ ./migrations/
COPY apps/ ./apps/
COPY tsconfig.json vite.config.ts tailwind.config.ts postcss.config.js drizzle.config.ts ./
# Optional registry files used at runtime
COPY asset-registry.json model-registry.json ./

# Build client (dist/public) + server bundle (dist/index.js)
RUN npm run build

ENV NODE_ENV=production
EXPOSE 5000
# Railway injects $PORT at runtime
ENV PORT=5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 5000) + '/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1))"

CMD ["npm", "start"]
