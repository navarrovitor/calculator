# CLAUDE.md

Working conventions for this repository. These override default behavior.

## Scope discipline

- Flag assumptions; don't silently make them. If a requirement is ambiguous,
  the ADRs don't cover it, or this file conflicts with a prompt — stop and
  ask.
- Implement within the ADRs (docs/ADR.md). Don't re-derive or second-guess
  an accepted decision. If an ADR seems wrong, raise it rather than route
  around it.
- No scope creep. Build only what the current prompt asks. "While I'm here"
  changes belong in a separate prompt.

## Branching & PRs

- Every change lands on a feature branch and merges via PR. Never commit to
  `main`.
- Branch naming: `type/short-description` (e.g. `feat/calculate-endpoint`,
  `test/calc-edge-cases`), using the commit type vocabulary below.
- One branch per logical unit of work / per implementation prompt. Keep PRs
  reviewable in one sitting.
- When a branch's stated scope is met, open the PR immediately. Don't hold
  finished work locally; don't fold unrelated follow-up into the same
  branch.
- Do not merge your own PR — open it and stop for the author's review.

## Commit messages

- Conventional Commits: `type(scope): summary`.
  - types: `feat`, `fix`, `test`, `docs`, `chore`, `refactor`.
  - scope: `backend`, `frontend`, `docs`, or a package (e.g. `backend/calc`).
- Imperative mood, ≤ 72 characters, no trailing period.
- No body; the summary line is the whole message.
- One logical change per commit. Tests land with the code they cover.
- No AI-authorship footer — not in commits, not in PR descriptions (no
  "Generated with", no `Co-Authored-By`).

## Go style

- Idiomatic Go: `gofmt` / `goimports` clean; passes `go vet`.
- Standard library only for the HTTP layer (`net/http`), per ADR-0002.
- Errors: wrap with `fmt.Errorf("...: %w", err)`. Use sentinel errors where
  the API layer needs to branch (400 vs. 422).
- Package layout: pure logic in `internal/calc`, HTTP in `internal/api`,
  error→status mapping in `internal/httperr`. No HTTP types in `calc`.
- Table-driven tests, one table per behavior. Assert on the status code per
  case, not just `err != nil`.
- Exported identifiers get doc comments starting with the identifier name.

## TypeScript / React style

- Idiomatic TS: `strict` on. No `any` — use `unknown` plus narrowing.
- Biome for lint and format (`biome check`); config in `frontend/biome.json`.
  Clean before commit.
- Function components and hooks only. No class components.
- Calculator state lives in one reducer/hook (`useCalculator`), per
  ADR-0004. Components stay presentational and read from the hook.
- API contract types in `src/types.ts`, shared by `api.ts` and the hook.
- Client-side validation stays shallow (empty / non-numeric), per ADR-0005.
  Surface all 400/422 responses in the UI.
- Vitest + React Testing Library. Test behavior through the DOM, not
  internals.

## Frontend: two passes

1. **Functional pass (first).** Plain unstyled semantic markup, minimal or no
   CSS. The goal is correct behavior, state handling, API wiring, and full
   test coverage. No visual effort.
2. **Visual restyling pass (later, separate prompt).** Styling only. Must not
   touch component logic, state, hook code, event handlers, or tests.
   Allowed: CSS/styles, `className` changes, purely presentational wrapper
   elements, behavior-neutral markup reordering. If a restyle seems to need a
   logic change, stop and flag it.

## Prompt logging

- Every prompt and its outcome is recorded in PROMPTS.md using the template
  there. The design pass has its own section with `D001`-style numbering.
