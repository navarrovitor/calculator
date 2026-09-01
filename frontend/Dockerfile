# syntax=docker/dockerfile:1
# Multi-stage build for the calculator UI: Node builder -> nginx static serve.

FROM node:22-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./

# Optional `ca` secret: extra CA roots for `npm ci` behind a TLS-inspecting
# proxy. Absent by default, so npm uses its built-in roots. See
# docker-compose.override.yml.example.
RUN --mount=type=secret,id=ca,target=/run/secrets/ca.pem \
    --mount=type=cache,target=/root/.npm \
    if [ -s /run/secrets/ca.pem ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca.pem; fi; \
    npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
