# Prompt Log

Every prompt given to the AI agent is recorded here with its outcome, per CLAUDE.md. Implementation and testing prompts use the template below and are numbered `001`, `002`, … . Design-pass prompts have their own section and are numbered `D001`, `D002`, … .

## Template

```
### NNN — <short title>
*(<date>, <implementation | testing>)*

**Prompt:**
<the prompt as given, or a faithful summary>

**Response summary:**
<what the agent produced or changed>

**My review:**
<author's review notes — what was checked, what was corrected>

**Outcome:**
<merged / branch / commit refs / follow-ups>
```

## Implementation & testing prompts

### 001 — POST /calculate endpoint (add, subtract, multiply, divide)
*(2026-09-01, implementation)*

**Prompt:**
Create branch `feat/calculate-endpoint`. Implement `POST /calculate` per ADR-0001 (endpoint shape) and ADR-0002 (status codes), following the CLAUDE.md conventions exactly. Scope this pass to only the four required operations (add, subtract, multiply, divide) — no exponentiation, sqrt, or percentage. Accept `{"operation": string, "operands": [number, ...]}`; return `{"result": number}`. `400` for malformed input (invalid JSON, missing or non-numeric operands, wrong operand count — all binary, exactly two operands); `422` for division by zero; consistent `{"error": "message"}` shape. Package layout per CLAUDE.md (`internal/calc`, `internal/api`, `internal/httperr`, no HTTP types in `calc`). No tests yet. Follow-up in the same branch: return `405` for non-POST `/calculate`, update README, and add this log entry.

**Response summary:**
Added `backend/go.mod` (module `github.com/navarrovitor/calculator/backend`, Go 1.26) and four packages:
- `internal/calc` — dispatch table + `Calculate`; sentinels `ErrOperandCount`
  (400), `ErrUnsupportedOperation` (422), `ErrDivisionByZero` (422); no HTTP
  types.
- `internal/httperr` — `Error{Status, Message}` with `BadRequest` /
  `Unprocessable` / `MethodNotAllowed` constructors and the single `Write`
  that maps an error to a status and emits the `{"error"}` body.
- `internal/api` — `POST /calculate` handler; `405` + `Allow: POST` for other
  methods on that path; `json.UnmarshalTypeError` reported as "operands must
  be numbers".
- `cmd/server` — entrypoint honouring `PORT` (default 8080).

Also filled the backend-relevant README sections (Overview, Setup, Running, API Examples, Design Decisions & Assumptions); Testing left for the test prompt.

**My review:**
First PR looks good. Only add, subtract, multiply and divide added with 400, 405 and 422 errors handled. Ran /code-review and /simplify for any hidden bug/simplification that can be corrected.

**Outcome:**
Branch `feat/calculate-endpoint`; PR opened, pending review. Tests follow in prompt 002.

### 002 — Tests for POST /calculate (add, subtract, multiply, divide)
*(2026-09-01, testing)*

**Prompt:**
Add tests for the `POST /calculate` endpoint, covering only the four implemented operations. Follow CLAUDE.md: table-driven, one table per behaviour, assert the status code per case. Cover each operation's happy path; division by zero -> 422; missing / non-numeric / wrong-count operands -> 400; malformed JSON -> 400; unsupported operation -> 422. Test across `internal/calc`, `internal/httperr`, and `internal/api`. Run `go test ./... -cover`, `gofmt -l`, `go vet ./...` and report results.

**Response summary:**
Added three `_test.go` files on the same branch (tests land with the code they cover; PR #1 still open):
- `internal/calc/calc_test.go` — `TestCalculateOperations` (happy paths),
  `TestCalculateErrors` (division by zero, unsupported name, operand count,
  overflow), asserting the sentinel via `errors.Is`.
- `internal/httperr/httperr_test.go` — `TestErrorMessage` and
  `TestWriteStatusMapping` (helper errors and wrapped/unwrapped calc
  sentinels -> status + `{"error"}` body + Content-Type).
- `internal/api/api_test.go` — `TestCalculateSuccess`,
  `TestCalculateErrorStatus` (10 malformed/invalid cases by status code),
  `TestCalculateMethodNotAllowed` (405 + `Allow` header).

`gofmt -l` clean, `go vet ./...` clean. Coverage: `internal/calc` 100.0%, `internal/httperr` 100.0%, `internal/api` 100.0%, `cmd/server` 0.0% (entrypoint only).

**My review:**
Tests added, everything looks good. Merged on main.

**Outcome:**
Pushed to branch `feat/calculate-endpoint` (PR #1).

### 003 — Optional operations: exponentiation, sqrt, percentage
*(2026-09-01, implementation & testing)*

**Prompt:**
Create branch `feat/optional-operations`. Implement exponentiation, sqrt, and percentage on the existing `POST /calculate` endpoint per ADR-0003, following the same package layout and conventions as the four required operations (no HTTP types in `calc`). `percentage(a, b) = (a / 100) * b`. sqrt is unary, exponentiation and percentage are binary — validate operand count per operation, not a fixed count. `422` for negative sqrt input; `400` for wrong operand count on all three. Reuse the existing error shape and status-code conventions; don't introduce new ones. Show the implementation diff before committing. Then add table-driven tests matching the existing coverage: happy path for each, negative sqrt, exponentiation overflow, wrong operand count for each. Run `go test ./... -cover`, `gofmt -l`, `go vet ./...` and report. Then run `/code-review` and `/simplify` against the branch, reporting every finding without filtering. For the PR: add this log entry, update the README API Examples and Design Decisions sections, open the PR without merging.

**Response summary:**
Implementation (`feat(backend): add exponentiation, sqrt, percentage operations`, 397a155):
- `internal/calc/calc.go` — new `unaryOp` type and `unaryOps` dispatch table
  holding `sqrt`; `exponentiation` and `percentage` added to `binaryOps`.
  `Calculate` checks the unary table first (arity 1), then the binary table
  (arity 2), else `ErrUnsupportedOperation` (unknown-name-before-arity order
  preserved). Extracted a `finite(result, err)` helper for the shared
  non-finite/NaN check. New sentinel `ErrNegativeSqrt` (422), mapped the same
  way as `ErrDivisionByZero`. `ErrOperandCount`'s message changed from
  "expected exactly 2 operands" to "wrong operand count for operation" since
  `httperr` emits the sentinel's own static message and arity is now
  per-operation.
- `internal/httperr/httperr.go` — one `errors.Is(err, calc.ErrNegativeSqrt)`
  case added to `classify`; doc comment updated. No change to `internal/api`.

Tests (`test(backend): cover exponentiation, sqrt, percentage operations`, c2d9ca8) — new rows in the existing tables across all three packages: happy path per operation, negative sqrt -> `ErrNegativeSqrt`/422, exponentiation overflow (`10 ** 400`) -> `ErrNonFiniteResult`/422, wrong operand count per operation -> `ErrOperandCount`/400.

`go test ./... -cover`: 77 pass — `internal/calc` / `internal/httperr` / `internal/api` 100.0%, `cmd/server` 0.0% (entrypoint). `gofmt -l` clean, `go vet ./...` clean.

`/code-review`: no correctness/reuse/simplification/efficiency findings.
`/simplify` (reuse, simplification, efficiency, altitude): no actionable findings — the parallel unary/binary tables and per-sentinel `classify` cases were judged the right altitude for a fixed 7-operation set; unifying them was considered and rejected as clever-not-simpler.

README updated: API Examples gains the three operations (and the refreshed `ErrOperandCount` message text); Design Decisions notes the `percentage` definition with a link to ADR-0003; Overview and Testing lines updated from "four operations" to all seven.

**My review:**
Bigger PR to review considering code and tests were added by the same prompt. Tests cover edge cases and manual tests show everything works fine until now. Simplify raised a finding that would undo a previous finding from prompt 001.

**Outcome:**
Branch `feat/optional-operations`; PR merged.

### 004 — Frontend functional pass: button-grid calculator
*(2026-09-01, implementation & testing)*

**Prompt:**
Create branch `feat/frontend-calculator`. Implement the button-grid calculator
UI per ADR-0004 and ADR-0005 and the CLAUDE.md TS/React conventions — functional
pass only, plain semantic markup, minimal/no CSS. Function components + hooks,
strict TS, no `any`. All calculator state (input buffer, pending operator,
chaining, redundant `=`) in a single `useCalculator` hook; components
presentational. API contract types in `src/types.ts`, shared by `api.ts` and the
hook. Wire to the real backend `POST /calculate` (not mocked). Shallow client
validation only (empty/non-numeric); surface every backend 400/422. Handle the
ADR-0004 input edge cases. Support all seven operations, `sqrt` as a unary
button. Biome-clean. Show the diff before committing. Then add Vitest + RTL
tests (behaviour via the DOM): each operation happy path, the input edge cases,
and a backend-error-surfaced case; run `vitest run --coverage` and report. Then
run `/code-review` and `/simplify` against the branch, output every finding
unfiltered, apply no fix without explicit approval. For the PR: this log entry,
README "Running the app" + frontend assumptions, open the PR without merging.

**Response summary:**
Scaffolded `frontend/` (Vite + React 19 + TS strict, Biome, Vitest + RTL, v8
coverage; Vite dev-server proxy `/calculate` → `:8080`).

- `src/types.ts` — `Operation` union, `BinaryOperation`, `CalculateRequest` /
  `CalculateResponse` / `CalculateErrorResponse`. Shared by `api.ts` and the
  hook.
- `src/lib/api.ts` — `calculate()` POSTs to `/calculate`, resolves the numeric
  result, throws `CalculationError` with the backend `{"error"}` message
  verbatim on any non-2xx and a generic message on transport failure.
- `src/hooks/useCalculator.ts` — all input state in one `useReducer`
  (`buffer` / `accumulator` / `pendingOp` / `lastResult` / `overwrite` /
  `error`); async handlers read fresh state via a ref, call `calculate()`, then
  dispatch. Edge cases: 2nd decimal ignored, leading zeros collapse, repeated
  operator swaps the pending op, chained operators evaluate left-to-right (one
  backend call each), trailing operator on `=` reuses the left operand,
  redundant `=` / empty submission no-op, `sqrt` unary and immediate.
- `src/components/Calculator.tsx` (container, reads the hook) + `Display.tsx`
  (presentational). Operation buttons carry `aria-label` = backend op name.
  `App.tsx` renders `<h1>` + `<Calculator/>`. No CSS.

Tests (`Calculator.test.tsx`, 27, behaviour through the DOM): the seven
operations, the input edge cases, backend errors surfaced (division by zero,
negative sqrt, transport failure), client validation of empty `sqrt`, and an
in-flight request abandoned on `Clear`. `biome check` and `tsc --noEmit` clean.
Coverage (v8): 98.13% stmts / 94.62% branch / 100% funcs / 98.13% lines;
remaining lines are defensive fallbacks.

`/code-review`: 1 code finding — `√` on a half-entered operation (`2 + √`) rooted the left operand and injected it as the right operand. Plus a stray committed `tmp/build-errors.log` (removed separately).
`/simplify`: reuse — twin type guards in `api.ts`, the operand-fallback ladder written three times; simplification — `stateRef`/`useEffect`/`useCallback` scaffolding, unused `pendingOperation` return, three near-identical operator reducer cases, nested ternaries; altitude — actions named as scenarios not intents, `buffer` overloaded with computed values, unary/binary split by name rather than arity.

Applied (author-approved): request-id guard in `runCompute` + `clear()` invalidates in-flight work; `√` on a half-entered op is treated as empty input ("Enter a number first."); `overwrite` flag so a digit after a computed value starts fresh; shared `committedValue(state)` helper for the display and the `sqrt` source; removed the unused `pendingOperation`. Deferred to a later prompt: reworking the reducer to intent-level actions and unifying unary/binary dispatch by arity (`/simplify` altitude findings).

**My review:**
Bigger as I'd like PR, had to spent some time reviewing and testing it while prompt 005 was running. Had to correct 'Clear' button (it did not abandon in-flight requests, so a late error landed on cleared state).
Also, square root edge case found by /code-review and later corrected (check above). /simplify found a reuse case and it was implemented on a different branch through prompt 005.

**Outcome:**
Spent some extra time on making frontend functional, but edge cases were covered by digging in.

### 005 — Rework useCalculator to intent-level actions + arity dispatch
*(2026-09-01, implementation)*

**Prompt:**
On a branch that merges into `feat/frontend-calculator` (not `main`), apply the
deferred `/simplify` altitude findings from prompt 004: (S-A1) make reducer
actions plain user intents and move all interpretation into the reducer;
(S-A5) dispatch by operand count like the backend rather than splitting
unary/sqrt out by name.

**Response summary:**
Branch `refactor/calculator-intent-reducer` off `feat/frontend-calculator`.

- `src/types.ts` — dropped `BinaryOperation`; `Operation` is the single type.
- `src/hooks/useCalculator.ts` — `Action` is now `digit` / `decimal` /
  `operator(op)` / `equals` / `clear` / `resolved` / `failed`. An `ARITY`
  map (`sqrt: 1`, rest `2`) mirrors the backend dispatch; `applyOperator`
  branches on `ARITY[op]`, so sqrt is "an operation with one operand", not a
  bespoke handler/action. The reducer parks a backend call in
  `status: { kind: "computing"; request; then }` where `then` is the
  continuation (`chainInto` / `finish` / `intoBuffer`); one `useEffect`
  drains `status`, calling `calculate()` and dispatching `resolved` /
  `failed`, with a `cancelled` cleanup so a Clear during flight drops the
  result. Removed `stateRef` + its effect, the request-id ref, the separate
  `busy` `useState` (now `status.kind === "computing"`), `runCompute`, and
  the `useCallback` wrappers. `committedValue` / `currentOperand` /
  `displayValue` / `overwrite` behaviour unchanged.
- `src/components/Calculator.tsx` — one `OPERATIONS` list including
  `{ op: "sqrt", label: "√", name: "square root" }`; every operation button
  calls `calc.inputOperation(op)`. Removed the dedicated sqrt button/handler.

All 28 DOM tests pass unchanged plus one new "ignores presses while a
calculation is in flight". `biome check` / `tsc --noEmit` clean. Coverage
(v8): 96.73% stmts / 91.83% branch / 100% funcs / 96.73% lines; uncovered
lines are defensive guards (non-`Error` throw, malformed response body,
reducer intent-guard unreachable while buttons are disabled).

No behaviour change intended — this is the altitude refactor only.

**My review:**
Applying /simplify finding before actually applying Claude Design's frontend.

**Outcome:**
+280, -223, 5 files changed before merging the functional frontend on main

### 006 — Docker packaging: multi-stage builds + compose
*(2026-09-01, implementation)*

**Prompt:**
In a new branch (and a worktree), replace the TODO stubs in
`backend/Dockerfile`, `frontend/Dockerfile`, and `docker-compose.yml` with
real multi-stage builds per the stub comments: backend golang builder →
`distroless/static` runtime; frontend node builder → nginx serving the
static build. `docker compose` must bring up both services with the frontend
able to reach the backend. Show the diff before committing; update the
README Setup/Running sections once it works.

**Response summary:**
- `backend/Dockerfile` — `golang:1.26-alpine` builder (`CGO_ENABLED=0`,
  `-trimpath`, stripped, `--mount=type=cache` for build/mod) →
  `gcr.io/distroless/static-debian12:nonroot`, `EXPOSE 8080`. Image ~15 MB.
- `frontend/Dockerfile` — `node:22-slim` builder runs `npm ci`
  (`--mount=type=cache`) + `npm run build` → `nginx:alpine` serving
  `/app/dist` with `nginx.conf` (SPA fallback + `location /calculate`
  proxying to `backend:8080`, per-request DNS re-resolution). Image ~94 MB.
- `docker-compose.yml` — `backend` (8080:8080) and `frontend` (5173:80,
  `depends_on` backend).
- Added `backend/.dockerignore`, `frontend/.dockerignore`,
  `frontend/nginx.conf`.
- README: new "With Docker" subsection under Running, plus a Setup pointer.

Verified: `docker compose up --build` brings both up;
`curl localhost:5173/calculate` returns `200`/`422` from the backend through
the nginx proxy; `curl localhost:8080/calculate` direct also works. A
follow-up `/simplify` pass slimmed the builder images, added cache mounts,
and trimmed comments/config.

**My review:**
<!-- author -->

**Outcome:**
<!-- author -->

### 007 — Coverage-gap review + tests for the API client error paths
*(2026-09-01, testing)*

**Prompt:**
Review current test coverage across backend and frontend. Identify specific
gaps — untested branches, error paths, or edge cases from ADR-0003/0004 not
yet covered. List them before writing any tests. Don't add tests for
hypothetical scenarios outside what's already implemented. Then add the
recommended tests on a new branch pulled from an updated `main`.

**Response summary:**
Reviewed coverage: backend `calc`/`httperr`/`api` at 100% statements;
frontend at 96.79% stmts / 91.83% branch. Reported gaps, separating
in-scope from defensive dead code:
- **Covered now (this branch):** `lib/api.ts:60-61` — non-OK response whose
  body is not the shared `{"error"}` shape (e.g. a 502 with an HTML body) →
  `CalculationError("Request failed (<status>).")`; `lib/api.ts:64-65` — an
  OK response whose body is not `{result: number}` →
  `CalculationError("Received an unexpected response from the service.")`.
- **Flagged, not added (defensive, unreachable in current code):**
  `useCalculator.ts` 202-203 (in-flight reducer guard — buttons are
  `disabled` while busy, `clear` is exempt), 228 / 232 (`resolved` / `failed`
  when status is not `computing` — prevented by the effect's `cancelled`
  flag), 111-112 (`messageFor` non-`CalculationError` fallback — `calculate()`
  only ever rejects with `CalculationError`).
- **Flagged, ADR-ambiguous, not added pending author call:** `calc.go:81`
  `math.IsNaN` half of `finite` — reachable via
  `exponentiation(-2, 0.5)` → `NaN` → 422, but ADR-0003 names only
  "exponentiation overflow" as the in-scope exponentiation edge case.

Added two cases to the "backend errors are surfaced (ADR-0005)" block in
`Calculator.test.tsx`, driven through the DOM with the existing fetch mock
(`mockResolvedValueOnce`). 30 tests pass; `lib/api.ts` now 100% / 100%.
`biome check` clean.

**My review:**
<!-- author -->

**Outcome:**
<!-- author -->

## Design pass

Design-pass prompts (the visual restyling pass in CLAUDE.md) are logged here
with `D001`-style numbering, using the same template fields.

### D001 — Frontend visual restyle: Organic design-system handoff
*(2026-09-01, design)*

**Prompt:**
Create branch `style/frontend-redesign`. Apply the visual changes from a
Claude Design handoff bundle (`Calculator.dc.html` + the "Organic" design
system: `_ds_bundle.js`, `styles.css`, `support.js`) to the existing
components, following CLAUDE.md conventions (Biome-clean, function components
+ hooks). Hard constraint: no change to component structure, state logic, the
`useCalculator` hook, event handlers, or props — behaviour identical before
and after; only CSS/styles, `className` changes, and purely presentational
markup. Flag anything that would need a logic change instead of making it.
Show the diff before committing. Then run `vitest run --coverage` unchanged
(passing with no test edits is the behaviour-unchanged check) and run
`/code-review` + `/simplify`, reporting every finding unfiltered; apply no fix
without approval. For the PR: this log entry, README update only if
user-facing behaviour changed, open without merging.

**Response summary:**
The handoff MCP was unreachable in this environment; implemented from a local
copy of the bundle instead.

- `frontend/src/styles/organic.css` — the handoff design-system stylesheet,
  vendored verbatim, kept **unimported** as reference / re-sync source.
- `frontend/src/styles/tokens.css` — the `:root` token block plus the base
  rules the app actually uses, curated from the handoff; the file imported at
  runtime. Web fonts moved to `<link rel="preconnect">` + `<link>` in
  `index.html` (off the CSS critical path).
- `frontend/src/styles/calculator.css` — the calculator's own styling built on
  the tokens: warm-cream page shell, rounded `--color-neutral-100` card with
  `--shadow-lg`, right-aligned display, three key grids (digits / operations /
  actions) with neutral / accent / sage / solid-accent button variants keyed
  off each button's `aria-label`, themed hover / `:active` scale / disabled,
  and a `≤480px` bottom-sheet layout.
- Components: `className`-only edits to `App.tsx`, `Calculator.tsx`,
  `Display.tsx`; two CSS imports added to `main.tsx`. No logic, handler, prop,
  or structural change.

Flagged as needing logic (not done in this pass): the pending-expression line
above the display, a single interleaved keypad grid, a transient
auto-clearing in-display error, JS-driven mobile layout switching, and the
`x^y` → `^` glyph.

All 28 Vitest tests pass with no modifications; coverage unchanged
(96.79% stmts / 91.83% branch / 100% funcs). `/code-review` (5 findings) and
`/simplify` (4 agents) reported in full; a follow-up commit applied the agreed
cleanups (tokens/component split, `aria-label` selectors instead of
`:nth-child`, long-result wrapping instead of clipping, dedup of duplicated
`body` / sage rules).

**My review:**
<!-- author -->

**Outcome:**
<!-- author -->

### D002 — Frontend design parity: the deferred handoff items
*(2026-09-01, design)*

**Prompt:**
On a branch based on `style/frontend-redesign` (not `main`), implement the
five items D001 deferred as needing markup/state changes — in one branch:
(1) the pending-expression line above the display; (2) a single interleaved
keypad grid in the handoff's key order; (3) the in-display error treatment,
kept persistent (no auto-dismiss timer, chosen over the prototype's transient
behaviour to preserve ADR-0005 and the existing tests); (4) viewport-driven
switching to the mobile bottom-sheet layout; (5) the `x^y` → `^` glyph.

**Response summary:**
Branch `feat/calculator-design-parity` off `style/frontend-redesign`.

- `src/hooks/useCalculator.ts` — the hook now returns `expression`, a
  `"<accumulator> <operator-glyph>"` string derived from state (empty when no
  binary op is pending). New `OPERATOR_SYMBOL` map. No change to the reducer,
  the request flow, or any existing return value.
- `src/hooks/useMediaQuery.ts` (new) — a small `matchMedia` hook that returns
  `false` where `matchMedia` is absent (jsdom/SSR) rather than throwing.
- `src/App.tsx` — reads `useMediaQuery("(max-width: 480px)")` and adds
  `app--compact` to `<main>`; the bottom-sheet CSS moved from an `@media`
  block onto that class.
- `src/components/Calculator.tsx` — one `KEYS` list rendered into a single
  5-column grid in the handoff's order (`7 8 9 ÷ C` / `4 5 6 × √` /
  `1 2 3 − ^` / `0 . = + %`). Each button gets a semantic
  `calculator__key--{digit,operation,advanced,equals,clear}` class (advanced =
  the sage set: exponentiation, percentage, sqrt). Exponentiation's glyph is
  now `^`. All accessible names unchanged.
- `src/components/Display.tsx` — renders the `expression` line above the
  value; the value gets `calculator__value--muted` while an error shows. The
  `role="alert"` element and its persist-until-Clear/next-digit behaviour are
  unchanged.
- `src/styles/calculator.css` — single-grid keypad, `--key--*` variants,
  `.calculator__expression`, `.calculator__value--muted`, `.app--compact`.

Tests: the 28 existing DOM tests pass **unmodified**; added
`pending-expression line` cases (Calculator.test.tsx), `useMediaQuery`
(hook unit test), and `App layout` (centered vs compact class). 36 tests,
coverage 97.42% stmts / 93.38% branch / 100% funcs; App/Calculator/Display/
useMediaQuery at 100%, remaining gaps are the same pre-existing defensive
fallbacks in `useCalculator.ts` / `api.ts`.

README updated (Overview, frontend assumptions, manual-QA note, Testing
figures) for the now user-facing behaviour. No ADR change: the persistent
error keeps ADR-0005 intact and the expression line stays within ADR-0004
(all state in the hook).

**My review:**
<!-- author -->

**Outcome:**
<!-- author -->

### D003 — Claude Design: redesign the calculator UI's visual style
*(2026-09-01, design)*

Logged after D001/D002 but chronologically upstream of them: this is the
prompt run in Claude Design that produced the handoff bundle D001 applied.

**Prompt:**
Import this repo. Redesign the calculator UI's visual style — layout,
spacing, color, typography, responsive/mobile behavior. It's a button-grid
calculator supporting add, subtract, multiply, divide, exponentiation,
sqrt (unary), percentage.

**Response summary:**
Run in Claude Design, not in this repo. Produced the design handoff bundle —
`Calculator.dc.html` plus the "Organic" design system (`_ds_bundle.js`,
`styles.css`, `support.js`) — that D001 vendored and applied to the
components as CSS, and whose deferred markup/state items D002 implemented.

**My review:**
<!-- author -->

**Outcome:**
<!-- author -->
