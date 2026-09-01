# OPTIONAL deliverable — shape only, not a working build.
# TODO: multi-stage build.
#
# Builder stage:
#   FROM node:<version> AS build
#   WORKDIR /app
#   COPY package.json package-lock.json ./
#   RUN npm ci
#   COPY . .
#   RUN npm run build              # outputs /app/dist
#
# Runtime stage (open decision: static file server vs. vite preview):
#   FROM nginx:alpine             (or a static file server)
#   COPY --from=build /app/dist /usr/share/nginx/html
#   EXPOSE 80

FROM scratch
