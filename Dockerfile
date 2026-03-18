# Base image
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy application files
COPY server/ ./server/
COPY shared/ ./shared/
COPY client/ ./client/
COPY api/ ./api/
COPY public/ ./public/
COPY tsconfig.json vite.config.ts tailwind.config.ts postcss.config.js drizzle.config.ts ./

# Build frontend
RUN npm run build

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

CMD ["npm", "start"]
