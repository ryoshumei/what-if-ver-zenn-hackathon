
# Implementation Plan: Hackathon AI Agent — "What If" Visualizer

**Branch**: `001-hackathon-ai-agent` | **Date**: 2025-09-21 | **Spec**: `/Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/specs/001-hackathon-ai-agent/spec.md`
**Input**: Feature specification from `/specs/001-hackathon-ai-agent/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Generate tasks.md (for this hackathon workflow, we generate here)
9. STOP - Ready for implementation
```

## Summary
Build a Next.js 15 App Router web app that lets users input a short "what if" description and receive faithful visuals (image or short video) with a refinement loop, then optionally publish to a public gallery. Backend uses Vertex AI via Google Cloud (Gemini family, VEO for video). Auth is Google Sign-In via Firebase. Data is stored in Firestore (metadata) and Cloud Storage (assets). Deploy on Cloud Run. Stream interactions for responsive UX and enforce content policies.

## Technical Context
**Language/Version**: TypeScript 5.x; Next.js 15 App Router; Node.js 20 + Edge runtime where feasible  
**Primary Dependencies**: Next.js; `@google-cloud/vertexai` (Gemini/VEO via Vertex AI); Firebase Web SDK (Auth, Firestore, Storage); Biome; Tailwind CSS; (to add) Vitest + Playwright for tests; (optional) `ai` (Next.js AI Chat UI toolkit)  
**Storage**: Firestore for prompts/generations/posts; Cloud Storage for media assets and thumbnails  
**Testing**: Vitest (unit), contract tests from OpenAPI schemas, Playwright (integration, RSC/API)  
**Target Platform**: Google Cloud Run (us-central1); local dev via `next dev`  
**Project Type**: web (frontend + backend in a single Next.js repo; libraries in `src/lib`)  
**Performance Goals**: Perceived latency <1s for chat responses; image generation status feedback within 250ms; end-to-end image turnaround <10s p95; video <60s with progress  
**Constraints**: Stream UI updates; validate env at startup; rate limit mutating routes; content policy enforcement; outputs: image up to 1024×1024; video up to 6s  
**Scale/Scope**: Hackathon-scale; single region; low concurrency; cost-aware defaults

### Arguments incorporated (user-provided stack)
- Next.js for both frontend and backend (App Router)
- Next.js AI Chatbot UI style for chat and share page
- Vertex AI Node.js Client
- Models: `gemini-2.5-flash-image-preview` (image), `gemini-2.5-flash` (chat), `gemini-2.5-pro` (prompt planning), `veo-3.0-fast-generate-001` (video)
- Database/Storage: Firebase/Google Cloud ecosystem (Firestore + Cloud Storage)
- Auth: Firebase Google login only

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Library-First: Core agent logic (planner, prompt builders, safety, adapters) lives in `src/lib/agent/*` and `src/lib/adapters/*`; UI/API consume libraries only. PASS (planned)
- CLI/Text I-O Contracts: Optional CLI shims for library functions; JSON I/O; deterministic exit codes. PASS (deferred to tasks)
- Test-First: Contract tests generated from OpenAPI; unit tests for libraries; integration tests for API routes/RSC boundaries. PASS (planned)
- Integration & Contract Testing: External providers behind adapters; fixtures/snapshots for stability. PASS (planned)
- Observability & Simplicity: Structured logs with request IDs; secrets via env; minimize deps. PASS (planned)
- Next.js Constraints: App Router; Edge streaming where feasible; API under `app/api/*`; input validation at boundaries; rate limiting. PASS (planned)

No unjustified complexity detected; Complexity Tracking remains empty.

## Project Structure

### Documentation (this feature)
```
specs/001-hackathon-ai-agent/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (generated here for hackathon workflow)
```

### Source Code (repository root)
```
src/
├── lib/
│   ├── agent/           # Planner, tools, safety, memory, prompts
│   ├── adapters/        # Vertex AI, Firebase, storage, content-safety
│   └── repositories/    # Firestore/Storage accessors
├── app/                 # Next.js App Router (RSC by default)
│   └── api/             # API routes invoking lib layer
└── tests/
    ├── contract/
    ├── integration/
    └── unit/
```

**Structure Decision**: Option 2 (web app) within a single Next.js project; libraries in `src/lib` per constitution

## Phase 0: Outline & Research
- Unknowns identified from Technical Context have been resolved in `research.md`:
  - Vertex auth (ADC on Cloud Run; local dev via `gcloud auth print-access-token`)
  - Model selection and mapping to user flows (chat, planning, image/video)
  - Storage layout (Firestore entities; Cloud Storage buckets and paths)
  - Safety & policy enforcement strategy
  - Edge vs Node runtime choices and streaming patterns
  - Fallbacks (video→image), i18n, accessibility (alt text/captions)

**Output**: `research.md` created and all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
- Entities extracted to `data-model.md`
- API contracts generated at `contracts/openapi.yaml` (OpenAPI 3.1)
- Quickstart written at `quickstart.md` (env, dev, deploy, sample calls)

**Output**: `data-model.md`, `contracts/openapi.yaml`, `quickstart.md`

## Phase 2: Task Planning Approach
We generated `tasks.md` now (hackathon workflow) describing TDD-first steps derived from contracts, data model, and quickstart. Parallelizable items marked [P].

## Complexity Tracking
*(empty — no deviations requiring justification)*

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command)
- [x] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [ ] Complexity deviations documented

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
