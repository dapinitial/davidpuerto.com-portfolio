# davidpuerto.com — the container App Platform runs.
# Built in layers so a deploy only re-sends what changed: packages, then the
# locked NDA media, then the built site, then the server code. The git
# history never comes along (see .dockerignore).

# 1. build the site
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN apk add --no-cache git && npm ci --no-audit --no-fund
COPY vite.config.js ./
COPY tools ./tools
COPY voice ./voice
COPY site ./site
RUN npm run build

# 2. the runtime: production packages only, plus what the server reads
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY content-locked ./content-locked
COPY --from=build /app/dist ./dist
COPY server ./server
EXPOSE 3000
USER node
CMD ["node", "server/index.js"]
