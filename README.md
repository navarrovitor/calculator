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
`exponentiation`, `sqrt`, and `percentage` — and the frontend functional pass:
a button-grid calculator (ADR-0004) wired to the endpoint. Visual styling is a
separate later pass.

<!--
  Setup: prerequisites (Go version, Node version) and one-time install steps
  per side (backend: go mod download; frontend: npm ci). No deploy steps.
-->
## Setup

**Prerequisites:** Go 1.26+ (backend); Node.js LTS (frontend).

**Backend:**

```sh
cd backend
go mod download
```

**Frontend:**

```sh
cd frontend
npm ci
```

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

**Frontend:**

```sh
cd frontend
npm run dev
```

The Vite dev server serves the UI on `http://localhost:5173` and proxies
`POST /calculate` to the backend so the browser talks to a same-origin path.
It expects the backend on `http://localhost:8080`; override with
`VITE_API_PROXY_TARGET`. Start the backend first.

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

Frontend assumptions the ADRs do not cover ([ADR-0004](docs/ADR.md) fixes the
button-grid model and single hook, [ADR-0005](docs/ADR.md) the shallow
client-side validation):

- The browser POSTs to a same-origin `/calculate`; the Vite dev server proxies
  it to the backend. Production hosting of the built assets is out of scope.
- Every arithmetic result comes from the backend — the client sends one
  request per binary operation and never computes locally, so a chained
  entry like `2 + 3 × 4` makes two requests.
- Edge-case resolutions (ADR-0004 lists the cases, not the behaviour): a
  second decimal point is ignored; leading zeros collapse (`007` → `7`); a
  repeated operator swaps the pending one; `=` with a trailing operator
  reuses the left operand (`2 + =` → `4`); a redundant `=` and an empty
  submission are no-ops; `√` is applied immediately to the current entry.
- `√` pressed with a half-entered operation (`2 + √`, nothing typed for the
  right operand) is treated as empty input and prompts for a number rather
  than rooting the left operand.
- A request still in flight when `Clear` is pressed is abandoned; its result
  never lands on the cleared state.
- Backend `400`/`422` messages are shown verbatim; transport failures show a
  generic "could not reach the service" message.

Manual / visual-QA items from ADR-0004, deferred to the visual pass and
checked by hand: screen-rotation layout shifts, font-render truncation,
dynamic font-resize bounds. Also by hand: long-decimal results are shown
unformatted (e.g. `√2` → `1.4142135623730951`); display formatting is part of
the visual pass.

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

**Frontend:**

```sh
cd frontend
npm test              # vitest run
npx vitest run --coverage
```

Vitest + React Testing Library, exercising behaviour through the DOM: each
operation's happy path, the ADR-0004 input edge cases, backend errors
surfaced in the UI (e.g. division by zero), and an in-flight request
abandoned on `Clear`. Coverage (v8), 27 tests:

| Metric | Coverage |
| --- | --- |
| Statements | 98.13% |
| Branches | 94.62% |
| Functions | 100% |
| Lines | 98.13% |

Uncovered lines are defensive fallbacks only (a non-`Error` thrown value; a
malformed backend response body).
