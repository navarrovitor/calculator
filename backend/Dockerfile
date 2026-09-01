# OPTIONAL deliverable — shape only, not a working build.
# TODO: multi-stage build.
#
# Builder stage:
#   FROM golang:<version> AS build
#   WORKDIR /src
#   COPY go.mod go.sum ./
#   RUN go mod download
#   COPY . .
#   RUN go build -o /server ./cmd/server
#
# Runtime stage:
#   FROM gcr.io/distroless/static   (or alpine)
#   COPY --from=build /server /server
#   EXPOSE <port>                   # default 8080, see cmd/server
#   ENTRYPOINT ["/server"]

FROM scratch
