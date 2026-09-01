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

## Design pass

Design-pass prompts (the visual restyling pass in CLAUDE.md) are logged here
with `D001`-style numbering, using the same template fields.

_None logged yet._
