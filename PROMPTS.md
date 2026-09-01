# Prompt Log

Every prompt given to the AI agent is recorded here with its outcome, per
CLAUDE.md. Implementation and testing prompts use the template below and are
numbered `001`, `002`, … . Design-pass prompts have their own section and
are numbered `D001`, `D002`, … .

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
Create branch `feat/calculate-endpoint`. Implement `POST /calculate` per
ADR-0001 (endpoint shape) and ADR-0002 (status codes), following the CLAUDE.md
conventions exactly. Scope this pass to only the four required operations
(add, subtract, multiply, divide) — no exponentiation, sqrt, or percentage.
Accept `{"operation": string, "operands": [number, ...]}`; return
`{"result": number}`. `400` for malformed input (invalid JSON, missing or
non-numeric operands, wrong operand count — all binary, exactly two operands);
`422` for division by zero; consistent `{"error": "message"}` shape. Package
layout per CLAUDE.md (`internal/calc`, `internal/api`, `internal/httperr`, no
HTTP types in `calc`). No tests yet. Follow-up in the same branch: return
`405` for non-POST `/calculate`, update README, and add this log entry.

**Response summary:**
Added `backend/go.mod` (module `github.com/navarrovitor/calculator/backend`,
Go 1.26) and four packages:
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

Also filled the backend-relevant README sections (Overview, Setup, Running,
API Examples, Design Decisions & Assumptions); Testing left for the test
prompt.

**My review:**
First PR looks good. Only add, subtract, multiply and divide added with 400, 405 and 422 errors handled. Ran /code-review and /simplify for any hidden bug/simplification that can be corrected.

**Outcome:**
Branch `feat/calculate-endpoint`; PR opened, pending review. Tests follow in
prompt 002.

### 002 — Tests for POST /calculate (add, subtract, multiply, divide)
*(2026-09-01, testing)*

**Prompt:**
Add tests for the `POST /calculate` endpoint, covering only the four
implemented operations. Follow CLAUDE.md: table-driven, one table per
behaviour, assert the status code per case. Cover each operation's happy path;
division by zero -> 422; missing / non-numeric / wrong-count operands -> 400;
malformed JSON -> 400; unsupported operation -> 422. Test across
`internal/calc`, `internal/httperr`, and `internal/api`. Run
`go test ./... -cover`, `gofmt -l`, `go vet ./...` and report results.

**Response summary:**
Added three `_test.go` files on the same branch (tests land with the code
they cover; PR #1 still open):
- `internal/calc/calc_test.go` — `TestCalculateOperations` (happy paths),
  `TestCalculateErrors` (division by zero, unsupported name, operand count,
  overflow), asserting the sentinel via `errors.Is`.
- `internal/httperr/httperr_test.go` — `TestErrorMessage` and
  `TestWriteStatusMapping` (helper errors and wrapped/unwrapped calc
  sentinels -> status + `{"error"}` body + Content-Type).
- `internal/api/api_test.go` — `TestCalculateSuccess`,
  `TestCalculateErrorStatus` (10 malformed/invalid cases by status code),
  `TestCalculateMethodNotAllowed` (405 + `Allow` header).

`gofmt -l` clean, `go vet ./...` clean. Coverage: `internal/calc` 100.0%,
`internal/httperr` 100.0%, `internal/api` 100.0%, `cmd/server` 0.0%
(entrypoint only).

**My review:**
Tests added, everything looks good. Merged on main.

**Outcome:**
Pushed to branch `feat/calculate-endpoint` (PR #1).

## Design pass

Design-pass prompts (the visual restyling pass in CLAUDE.md) are logged here
with `D001`-style numbering, using the same template fields.

_None logged yet._
