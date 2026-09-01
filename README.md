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

Implemented so far: the backend `POST /calculate` endpoint for the four
arithmetic operations `add`, `subtract`, `multiply`, and `divide`. The
remaining operations (ADR-0003) and the frontend are not built yet.

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

`POST /calculate` takes `{"operation": string, "operands": [number, number]}`
and returns `{"result": number}`. Each of `add`, `subtract`, `multiply`, and
`divide` takes exactly two operands. See [docs/ADR.md](docs/ADR.md) — ADR-0001
(endpoint shape) and ADR-0002 (status codes).

Success:

```sh
$ curl -s localhost:8080/calculate -d '{"operation":"add","operands":[2,3]}'
{"result":5}
```

`400 Bad Request` — malformed input (invalid JSON, missing fields, non-numeric
operands, wrong operand count):

```sh
$ curl -s localhost:8080/calculate -d '{"operation":"add","operands":[1,2,3]}'
{"error":"expected exactly 2 operands"}
```

`422 Unprocessable Entity` — well-formed request, invalid calculation
(division by zero, unsupported operation):

```sh
$ curl -s localhost:8080/calculate -d '{"operation":"divide","operands":[1,0]}'
{"error":"division by zero"}
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
  `multiply`, `divide`.
- A missing or empty `operation` is malformed input (`400`); a present but
  unrecognised operation is `422`.
- A non-numeric value in `operands` is malformed input (`400`).
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

Backend tests and coverage numbers land in the next prompt; the frontend
follows. This section is filled with real figures once those exist.
