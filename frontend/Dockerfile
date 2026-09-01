# Multi-stage build for the calculator UI.
# Builder: Node toolchain runs `vite build`. Runtime: nginx serves the static
# bundle and proxies /calculate to the backend (same-origin, as in dev).

# --- Builder stage ---
FROM node:22 AS build
WORKDIR /app

COPY package.json package-lock.json ./

# Optional `ca` build secret: a PEM bundle of extra trusted roots, for
# networks behind a TLS-inspecting proxy. Absent on a normal network, so npm
# falls back to its built-in roots. Wired in docker-compose.yml via
# DOCKER_CA_BUNDLE; see README.
RUN --mount=type=secret,id=ca,target=/run/secrets/ca.pem \
    if [ -s /run/secrets/ca.pem ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca.pem; fi; \
    npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# --- Runtime stage ---
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
