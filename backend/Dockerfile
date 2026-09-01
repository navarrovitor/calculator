# Multi-stage build for the calculator API.
# Builder: full Go toolchain. Runtime: distroless/static (no shell, no libc).

# --- Builder stage ---
FROM golang:1.26 AS build
WORKDIR /src

# Module metadata first so `go mod download` is cached independently of the
# source. There is no go.sum yet (stdlib-only, per ADR-0002); the wildcard
# keeps this working if one is added later.
COPY go.mod go.su[m] ./
RUN go mod download

COPY . .

# Static binary: no cgo, stripped, so it runs on the empty distroless image.
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /server ./cmd/server

# --- Runtime stage ---
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /server /server
EXPOSE 8080
ENTRYPOINT ["/server"]
