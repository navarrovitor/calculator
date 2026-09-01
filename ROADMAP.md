# Roadmap

Ordered delivery plan. Architecture is fixed in docs/ADR.md and is not
revisited here — this file tracks sequence and status only.

## Phase 0 — Scaffold

Repository structure, docs, CI workflow, ignore rules, placeholder folders.

## Phase 1 — Backend calc core

Pure arithmetic in `internal/calc`: the seven operations (ADR-0003), the
`Calculate` dispatch, and sentinel errors. No HTTP. Table-driven tests.

## Phase 2 — Backend HTTP API

`POST /calculate` in `internal/api`, error→status mapping in
`internal/httperr` (ADR-0001, ADR-0002), `cmd/server` entrypoint with `PORT`
(default 8080). Tests assert status code per case.

## Phase 3 — Frontend functional pass

Button-grid calculator (ADR-0004): the `useCalculator` hook, presentational
components, `api.ts` + `types.ts`, shallow client validation (ADR-0005), all
400/422 responses surfaced. Unstyled. Full Vitest coverage.

## Phase 4 — Deliverables polish

README prose and API examples, real coverage numbers, the assumptions list,
manual-QA notes.

## Phase 5 — Optional

Working Docker builds (backend/frontend Dockerfiles, docker-compose) and the
frontend visual restyling pass (styling only, per CLAUDE.md).
