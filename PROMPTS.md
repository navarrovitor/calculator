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
_Pending author review._

**Outcome:**
Branch `feat/calculate-endpoint`; PR opened, pending review. Tests follow in
prompt 002.

## Design pass

Design-pass prompts (the visual restyling pass in CLAUDE.md) are logged here
with `D001`-style numbering, using the same template fields.

_None logged yet._
