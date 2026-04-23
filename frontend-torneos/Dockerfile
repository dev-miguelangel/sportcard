# ── Development ────────────────────────────────────────
FROM node:20-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 4201

# ── Build ───────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG BUILD_CONFIG=production
RUN npm run build -- --configuration=${BUILD_CONFIG}

# ── Production ──────────────────────────────────────────
FROM nginx:alpine AS production
COPY --from=build /app/dist/frontend-torneos/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["/bin/sh", "-c", "echo \"window.__API_URL__ = '${API_URL}'; window.__DEV_AUTH_ENABLED__ = '${DEV_AUTH_ENABLED}';\" > /usr/share/nginx/html/config.js && nginx -g 'daemon off;'"]
