# Calculator

## Overview

A REST calculator API (Go, standard-library `net/http`) plus a button-grid
calculator UI (React + TypeScript + Vite), kept in one monorepo:
[`backend/`](backend) and [`frontend/`](frontend). The backend is the single
source of truth for every calculation; the UI never does arithmetic locally
(ADR-0005).

The API is one endpoint, `POST /calculate`, covering all seven operations
(ADR-0003): `add`, `subtract`, `multiply`, `divide`, `exponentiation`,
`sqrt`, `percentage`. The frontend is built in two passes (see CLAUDE.md): a
functional pass — the button-grid calculator wired to the endpoint
(ADR-0004) — and a visual restyling pass that applies a design-system handoff
as CSS only, with no behaviour change, plus a follow-up pass implementing the
handoff items that needed markup/state changes: a pending-expression line
above the display, a single-grid keypad in the handoff's key order, and a
viewport-driven mobile layout. The visual work was done with Claude Design.

## Setup

**Prerequisites:** Go 1.26+ (`backend/go.mod` declares `go 1.26`); Node.js
20+ with npm (frontend). Or just Docker — see
[With Docker](#with-docker), which needs neither toolchain installed.

**Backend:**

```sh
cd backend
go mod download
```

`backend/go.mod` declares only the module path and Go version — the HTTP
layer is standard library only (ADR-0002), so there are no third-party
modules to fetch yet.

**Frontend:**

```sh
cd frontend
npm ci
```

Installs the exact versions pinned in `frontend/package-lock.json`. The
ranges in `frontend/package.json`: React 19.1, Vite 7.1, TypeScript 5.9,
Vitest 3.2, Biome 2.5.

## Running the app

**Backend:**

```sh
cd backend
go run ./cmd/server
```

Listens on `PORT` (default `8080`).

**Frontend:**

```sh
cd frontend
npm run dev
```

Vite serves the UI on `http://localhost:5173` and proxies `POST /calculate`
to the backend (default `http://localhost:8080`, override with
`VITE_API_PROXY_TARGET`) so the browser always talks to a same-origin path.
Start the backend first.

### With Docker

`Dockerfile`s for each side (multi-stage: Go builder → `distroless/static`
for the backend, Node builder → nginx for the frontend) plus a
`docker-compose.yml` that runs both:

```sh
docker compose up --build
```

Frontend on `http://localhost:5173`, backend on `http://localhost:8080`. The
frontend's nginx serves the built assets and proxies `/calculate` to the
`backend` container, so the browser still talks to a same-origin path — no
`VITE_API_PROXY_TARGET` needed.

## API Examples

`POST /calculate` accepts `{"operation": string, "operands": [number, ...]}`
and returns `{"result": number}` (the `response` struct in
[`backend/internal/api/api.go`](backend/internal/api/api.go)). `sqrt` takes
one operand; the other six take two. All errors share one shape,
`{"error": string}`, written in one place
([`backend/internal/httperr/httperr.go`](backend/internal/httperr/httperr.go)),
per ADR-0002.

The seven operations, one success call each:

```sh
$ curl -s localhost:8080/calculate -d '{"operation":"add","operands":[2,3]}'
{"result":5}
$ curl -s localhost:8080/calculate -d '{"operation":"subtract","operands":[10,4]}'
{"result":6}
$ curl -s localhost:8080/calculate -d '{"operation":"multiply","operands":[6,7]}'
{"result":42}
$ curl -s localhost:8080/calculate -d '{"operation":"divide","operands":[20,4]}'
{"result":5}
$ curl -s localhost:8080/calculate -d '{"operation":"exponentiation","operands":[2,10]}'
{"result":1024}
$ curl -s localhost:8080/calculate -d '{"operation":"sqrt","operands":[144]}'
{"result":12}
$ curl -s localhost:8080/calculate -d '{"operation":"percentage","operands":[50,200]}'
{"result":100}
```

`percentage` is `(a / 100) * b` — "a% of b", so `[50, 200]` is 50% of 200
(ADR-0003).

**400 Bad Request** — malformed input (invalid JSON, missing `operation`,
non-numeric operands, wrong operand count). Here the operand count does not
match the operation's arity:

```sh
$ curl -s -w '%{http_code}\n' localhost:8080/calculate -d '{"operation":"add","operands":[1,2,3]}'
{"error":"wrong operand count for operation"}
400
```

**422 Unprocessable Entity** — well-formed request, invalid calculation
(division by zero, square root of a negative number, unsupported operation,
non-finite result):

```sh
$ curl -s -w '%{http_code}\n' localhost:8080/calculate -d '{"operation":"divide","operands":[1,0]}'
{"error":"division by zero"}
422
```

## Design Decisions & Assumptions

Architecture decisions live in [docs/ADR.md](docs/ADR.md) and are not
restated here. What follows is only what the ADRs do not cover.

Backend:

- The `operation` field is one of the literal strings `add`, `subtract`,
  `multiply`, `divide`, `exponentiation`, `sqrt`, `percentage`.
- A missing or empty `operation` is malformed input (`400`); a present but
  unrecognised one is `422` (`unsupported operation`).
- A non-numeric value in `operands` is malformed input (`400`,
  `operands must be numbers`).
- The body must be exactly one JSON object; trailing data or a second object
  is `400` (`request body must be a single JSON object`).
- A result that overflows `float64` to a non-finite number is `422`
  (`result is not a finite number`).
- Non-POST requests to `/calculate` return `405` in the same `{"error"}`
  shape, with an `Allow: POST` header.

Frontend (ADR-0004 fixes the button-grid model and single hook; ADR-0005 the
shallow client-side validation):

- The browser POSTs to a same-origin `/calculate`; the Vite dev server
  proxies it to the backend. Production hosting of the built assets is out of
  scope.
- Every result comes from the backend — one request per binary operation, no
  local computation, so chaining `2 + 3 × 4` makes two requests.
- Input edge-case behaviour (ADR-0004 lists the cases, not the resolutions):
  a second decimal point is ignored; leading zeros collapse (`007` → `7`); a
  repeated operator swaps the pending one; `=` after a trailing operator
  reuses the left operand (`2 + =` → `4`); a redundant `=` and an empty
  submission are no-ops; `√` is applied immediately to the current entry.
- `√` pressed with a half-entered operation (`2 + √`, nothing typed for the
  right operand) is treated as empty input and prompts for a number rather
  than rooting the left operand.
- A request still in flight when `Clear` is pressed is abandoned; its result
  never lands on the cleared state.
- Backend `400`/`422` messages are shown verbatim; transport failures show a
  generic "could not reach the service" message. The error persists (in a
  `role="alert"`, with the last value dimmed) until `Clear` or the next digit
  — it is not auto-dismissed.
- The visual restyling pass is CSS / `className` only (CLAUDE.md two-pass
  rule), done with Claude Design against a design-system handoff; a follow-up
  pass then implemented the handoff items that needed markup/state changes
  (below). Neither changed the `useCalculator` state model.
- A pending binary operation shows a `left-operand operator` line above the
  display (e.g. `12 +`), using the operator's button glyph; it clears on `=`
  or `Clear`. `sqrt` is unary and never produces this line.
- Exponentiation's button glyph is `^`. The keypad is one 5-column grid laid
  out in the design-handoff order, not three separate rows.
- Below 480px the card docks as a full-width bottom sheet; the switch is
  driven by `window.matchMedia`, so the layout also updates on resize /
  rotation rather than only at load.

Manual / visual-QA items from ADR-0004, checked by hand: screen-rotation
layout shifts and dynamic font-resize bounds. Long-decimal results are shown
numerically unformatted (e.g. `√2` → `1.4142135623730951`) and now wrap
within the card rather than being clipped; numeric formatting of the result
remains out of scope.

## Testing

**Backend:**

```sh
cd backend
go test ./... -cover
```

Table-driven tests across `internal/calc`, `internal/httperr`, and
`internal/api` — all seven operations, the 400/422 split, and the error body
shape. Coverage from `go test ./... -cover`:

| Package | Coverage |
| --- | --- |
| `internal/calc` | 100.0% |
| `internal/httperr` | 100.0% |
| `internal/api` | 100.0% |
| `cmd/server` | 0.0% — no test files; entrypoint only (`main` starts the listener) |

**Frontend:**

```sh
cd frontend
npm test                 # vitest run
npm run test:coverage    # vitest run --coverage
```

Vitest + React Testing Library, driving behaviour through the DOM: each
operation's happy path, the ADR-0004 input edge cases, backend errors
surfaced in the UI (e.g. division by zero, plus a non-OK or malformed
response body), an in-flight request abandoned on `Clear`, the
pending-expression line, and the `matchMedia`-driven layout switch. Coverage
(v8), PLACEHOLDER_COUNT tests:

| Metric | Coverage |
| --- | --- |
| Statements | PLACEHOLDER_STMT |
| Branches | PLACEHOLDER_BRANCH |
| Functions | PLACEHOLDER_FUNC |
| Lines | PLACEHOLDER_LINES |

Uncovered lines are defensive fallbacks only (a non-`Error` thrown value; a
malformed backend response body; reducer guards unreachable while the buttons
are disabled).
