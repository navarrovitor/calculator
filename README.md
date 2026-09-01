# Calculator

<!--
  Overview: one short paragraph — a REST calculator API (Go, stdlib
  net/http) plus a button-grid calculator UI (React + TypeScript + Vite),
  in a monorepo (/backend, /frontend).
-->
## Overview

<!--
  Setup: prerequisites (Go version, Node version) and one-time install steps
  per side (backend: go mod download; frontend: npm ci). No deploy steps.
-->
## Setup

<!--
  Running the app: start the backend (cmd/server, PORT env, default 8080)
  and the frontend dev server, and how they talk to each other.
-->
## Running the app

<!--
  API Examples: a few curl calls against POST /calculate — one success, one
  400, one 422 — showing the {"operation", "operands"} request and the
  {"error"} response shape. Keep consistent with docs/ADR.md (ADR-0001/0002).
-->
## API Examples

<!--
  Design Decisions & Assumptions: link to docs/ADR.md for the architecture
  decisions — do not restate them. List only assumptions NOT already in the
  ADRs, plus the manual/visual-QA items called out in ADR-0004.
-->
## Design Decisions & Assumptions

<!--
  Testing: how to run backend and frontend tests, and the real coverage
  numbers once tests exist (per package for Go; overall for the frontend).
  Fill with actual figures — no placeholder percentages.
-->
## Testing
