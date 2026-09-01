# Architecture Decision Records

Each record uses Status / Context / Decision / Consequences.

---

## ADR-0001 — Single `POST /calculate` endpoint with the operation in the payload

**Status:** Accepted

**Context:**
The API exposes several arithmetic operations of mixed arity (unary square
root, binary add/subtract/multiply/divide, etc.). One option is a route per
operation (`/add`, `/divide`, …); another is a single endpoint that names the
operation in the request body. Per-route handlers duplicate parsing,
validation, and error formatting once per operation, and unary vs. binary
still needs per-route special-casing.

**Decision:**
Expose a single endpoint: `POST /calculate`, accepting
`{"operation": string, "operands": [number, ...]}`. The `operation` field
selects the operation; `operands` carries one or more numbers. There is no
route per operation.

**Consequences:**
- One parsing, validation, and error-formatting path for every operation.
- Unary and binary operations share a request shape; arity is checked per
  operation against the operand count.
- Adding an operation is a dispatch-table change, not a new route.
- Clients must POST a JSON body even for trivial calls; there is no GET form.

---

## ADR-0002 — HTTP status codes distinguish malformed input from invalid calculations

**Status:** Accepted

**Context:**
Two failure classes exist: the request is malformed (invalid JSON, missing
fields, non-numeric operands, wrong operand count), or the request is
well-formed but the calculation is not valid (division by zero, square root
of a negative number, an unrecognised `operation`). The frontend needs to
tell "you typed something invalid" from "that calculation isn't valid"
without parsing message text.

**Decision:**
- `400 Bad Request` for malformed input.
- `422 Unprocessable Entity` for well-formed requests that are
  mathematically invalid or name an unsupported operation.
- Both return the same body shape: `{"error": "message"}`.
- Tests assert on the status code for each case.

The HTTP layer uses the Go standard library (`net/http`) only.

**Consequences:**
- The frontend branches on status code alone.
- Error mapping is centralised (`internal/httperr`); handlers return domain
  errors and the mapping layer produces a status + body.
- The `{"error": ...}` body is written by exactly one function, so the shape
  cannot drift between cases.

---

## ADR-0003 — Implement all seven operations

**Status:** Accepted

**Context:**
Four operations (add, subtract, multiply, divide) are required;
exponentiation, square root, and percentage are optional. `percentage` has
no single accepted meaning across calculators.

**Decision:**
Implement all seven: add, subtract, multiply, divide, exponentiation, sqrt,
percentage. Define `percentage(a, b) = (a / 100) * b` ("a% of b"), stated
explicitly in code and docs.

In scope as edge cases: division by zero, square root of a negative number,
operand-count mismatch, exponentiation overflow.

Out of scope: factorials, trigonometric functions, and any operation not
listed above.

**Consequences:**
- sqrt and percentage exercise mixed-arity handling the ADR-0001 payload
  already supports.
- The `percentage` definition is a documented assumption; a reviewer
  expecting a different formula finds the intended one stated.
- Exponentiation can overflow `float64`; that case is handled and tested
  rather than left to produce `+Inf` silently.

---

## ADR-0004 — Button-grid calculator UI

**Status:** Accepted

**Context:**
The frontend can present the API as a form (an operation dropdown plus
number inputs) or as a traditional on-screen calculator with a button grid.
The requirement calls for an intuitive input UI.

**Decision:**
Build a traditional button-grid calculator. Input state — the current input
buffer, the pending operator, and operator chaining — lives in one
reducer/hook (`useCalculator`); components stay presentational and read from
the hook.

In scope as input edge cases: multiple decimal points, chained operators, a
trailing operator on submit, leading zeros, a redundant `=`, and empty
submission.

Out of scope, handled by manual/visual QA and noted in the README:
screen-rotation layout shifts, font-render truncation, and dynamic
font-resize bounds.

**Consequences:**
- Calculator behavior is unit-testable through the hook without rendering
  styling.
- The visual edge cases are recorded as known manual-QA items rather than
  silently dropped.
- Component code carries no calculator logic, which keeps the two-pass
  frontend rule (see CLAUDE.md) enforceable.

---

## ADR-0005 — Validate on both sides; the backend is the source of truth

**Status:** Accepted

**Context:**
Validation can live on the client, the server, or both. Duplicating
mathematical-validity rules on the client keeps them in sync only by
discipline and tempts the client to suppress requests the server would
reject.

**Decision:**
Validate on both sides. The backend is authoritative and is never assumed to
have been pre-validated by the client. Client-side checks stay shallow —
empty and non-numeric input only. Every backend `400` and `422` response is
surfaced in the UI regardless of what the client checked.

**Consequences:**
- Mathematical validity is a backend-only concern, reached through the API
  error shape.
- The client cannot hide a server rejection; all error responses render.
- Shallow client checks give fast feedback for obvious mistakes without a
  second copy of the rules.

---

## ADR-0006 — AI usage boundaries across the SDLC

**Status:** Accepted

**Context:**
The project is a time-boxed exercise that explicitly evaluates how AI
tooling is used across the software lifecycle. The choice is between
maximising the number of AI agents/phases and demonstrating judgment about
which phases benefit from delegation.

**Decision:**
Use a single AI agent (Claude Code) for implementation and test-writing
only, driven by distinct, explicitly scoped prompts. Human-only, with no
agent delegation: requirements and planning (done solo first), architecture
(the author writes these ADRs; the agent implements within them), and code
review (the author reads every diff).

Continuous delivery and monitoring are out of scope — there is no running
system. Continuous integration is in scope, narrowly: one GitHub Actions
workflow running backend and frontend tests with coverage on every push and
PR. No other infrastructure.

**Consequences:**
- Every prompt and its outcome is logged (see PROMPTS.md).
- The agent works inside the ADRs and does not re-derive them.
- CI reinforces the testing requirement at near-zero infrastructure cost.
- Demonstrated judgment about delegation boundaries is the intended signal,
  not agent count.
