# Calculator

<!--
  Overview: one short paragraph — a REST calculator API (Go, stdlib
  net/http) plus a button-grid calculator UI (React + TypeScript + Vite),
  in a monorepo (/backend, /frontend).
-->
## Overview

A REST calculator API (Go, standard-library `net/http`) plus a button-grid
calculator UI (React + TypeScript + Vite), in a monorepo:
[`backend/`](backend) and [`frontend/`](frontend).

Implemented so far: the backend `POST /calculate` endpoint for all seven
operations (ADR-0003) — `add`, `subtract`, `multiply`, `divide`,
`exponentiation`, `sqrt`, and `percentage`. The frontend is not built yet.

<!--
  Setup: prerequisites (Go version, Node version) and one-time install steps
  per side (backend: go mod download; frontend: npm ci). No deploy steps.
-->
## Setup

**Prerequisites:** Go 1.26+ (backend); Node.js LTS (frontend, once scaffolded).

**Backend:**

```sh
cd backend
go mod download
```

**Frontend:** not scaffolded yet.

<!--
  Running the app: start the backend (cmd/server, PORT env, default 8080)
  and the frontend dev server, and how they talk to each other.
-->
## Running the app

**Backend:**

```sh
cd backend
go run ./cmd/server
```

The server listens on `PORT` (default `8080`).

The frontend dev server and its wiring to the API are not implemented yet.

<!--
  API Examples: a few curl calls against POST /calculate — one success, one
  400, one 422 — showing the {"operation", "operands"} request and the
  {"error"} response shape. Keep consistent with docs/ADR.md (ADR-0001/0002).
-->
## API Examples

`POST /calculate` takes `{"operation": string, "operands": [number, ...]}`
and returns `{"result": number}`. `add`, `subtract`, `multiply`, `divide`,
`exponentiation`, and `percentage` take two operands; `sqrt` takes one. See
[docs/ADR.md](docs/ADR.md) — ADR-0001 (endpoint shape), ADR-0002 (status
codes), ADR-0003 (the operation set).

Success:

```sh
$ curl -s localhost:8080/calculate -d '{"operation":"add","operands":[2,3]}'
{"result":5}
$ curl -s localhost:8080/calculate -d '{"operation":"exponentiation","operands":[2,10]}'
{"result":1024}
$ curl -s localhost:8080/calculate -d '{"operation":"sqrt","operands":[144]}'
{"result":12}
$ curl -s localhost:8080/calculate -d '{"operation":"percentage","operands":[50,200]}'
{"result":100}
```

`400 Bad Request` — malformed input (invalid JSON, missing fields, non-numeric
operands, wrong operand count):

```sh
$ curl -s localhost:8080/calculate -d '{"operation":"add","operands":[1,2,3]}'
{"error":"wrong operand count for operation"}
```

`422 Unprocessable Entity` — well-formed request, invalid calculation
(division by zero, square root of a negative number, unsupported operation):

```sh
$ curl -s localhost:8080/calculate -d '{"operation":"divide","operands":[1,0]}'
{"error":"division by zero"}
$ curl -s localhost:8080/calculate -d '{"operation":"sqrt","operands":[-1]}'
{"error":"square root of a negative number"}
```

<!--
  Design Decisions & Assumptions: link to docs/ADR.md for the architecture
  decisions — do not restate them. List only assumptions NOT already in the
  ADRs, plus the manual/visual-QA items called out in ADR-0004.
-->
## Design Decisions & Assumptions

Architecture decisions live in [docs/ADR.md](docs/ADR.md) and are not restated
here.

Assumptions made during implementation that the ADRs do not cover:

- The `operation` field uses the literal strings `add`, `subtract`,
  `multiply`, `divide`, `exponentiation`, `sqrt`, `percentage`.
- `percentage` has no universal meaning across calculators; this API uses the
  definition fixed in [ADR-0003](docs/ADR.md).
- A missing or empty `operation` is malformed input (`400`); a present but
  unrecognised operation is `422`.
- A non-numeric value in `operands` is malformed input (`400`).
- The body must be exactly one JSON object; trailing data or a second object
  is malformed input (`400`).
- A result that overflows `float64` to a non-finite number is `422`
  (well-formed request, invalid calculation).
- Non-POST requests to `/calculate` return `405` in the same `{"error"}` body
  shape, with an `Allow: POST` header.

The manual / visual-QA items from ADR-0004 (screen-rotation layout shifts,
font-render truncation, dynamic font-resize bounds) will be recorded here with
the frontend pass.

<!--
  Testing: how to run backend and frontend tests, and the real coverage
  numbers once tests exist (per package for Go; overall for the frontend).
  Fill with actual figures — no placeholder percentages.
-->
## Testing

**Backend:**

```sh
cd backend
go test ./... -cover
```

Table-driven tests cover `internal/calc`, `internal/httperr`, and
`internal/api` (all seven operations, the status-code split, and the error
body shape). Coverage by package:

| Package | Coverage |
| --- | --- |
| `internal/calc` | 100.0% |
| `internal/httperr` | 100.0% |
| `internal/api` | 100.0% |
| `cmd/server` | 0.0% (entrypoint only — `main` starts the listener) |

**Frontend:** tests land with the frontend pass.
