# syntax=docker/dockerfile:1
# Multi-stage build for the calculator API: Go builder -> distroless/static.

FROM golang:1.26-alpine AS build
WORKDIR /src

COPY go.mod ./
RUN go mod download

COPY . .

# Static (no cgo) so it runs on the empty distroless image. Cache mounts keep
# the stdlib compile and module cache across rebuilds.
RUN --mount=type=cache,target=/root/.cache/go-build \
    --mount=type=cache,target=/go/pkg/mod \
    CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /server ./cmd/server

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /server /server
EXPOSE 8080
ENTRYPOINT ["/server"]
