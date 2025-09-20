# what-if-ver-zenn-hackathon Constitution
<!-- Spec-driven development constitution for a Next.js AI Agent web app. -->

## Core Principles

### I. Library-First (Spec-Driven)
<!-- Every feature begins as a standalone library to enforce modularity and reuse. -->
- Every feature MUST begin life as a standalone library, not inside application code.
- Libraries are self-contained, independently testable, and documented with clear purpose.
- Domain, planning, prompt, tools, and agent logic live in `src/lib/` (or `packages/`) and are consumed by UI/API layers.
- Contracts are expressed with pure functions and JSON-serializable inputs/outputs.
- No speculative or "might need" features; every addition must trace to a concrete requirement.

### II. CLI / Text I-O Contracts
<!-- Libraries expose optional CLI for automation and contract testing. -->
- Functionality MAY be exposed via CLI with text I/O: stdin/args → stdout; errors → stderr.
- Support both JSON and human-readable output; prefer JSON for contracts/tests.
- Commands must be deterministic, idempotent, and return non-zero on failure.

### III. Test-First (NON-NEGOTIABLE)
<!-- TDD: write tests from the spec and contracts before implementation. -->
- Red-Green-Refactor is mandatory.
- Contract tests are authored from the specification and accepted before implementation.
- Unit tests cover library logic; integration tests cover API routes and RSC boundaries.

### IV. Integration & Contract Testing
<!-- Integration tests are required for cross-boundary behavior and contract changes. -->
- Require integration tests for: new libraries, contract changes, server↔client boundaries, and external provider adapters.
- External services are wrapped with adapters; contracts are verified via fixtures/snapshots.

### V. Observability, Versioning, Simplicity
<!-- Keep systems observable, versioned, and simple. -->
- Structured logging with correlation/trace identifiers; avoid noisy logs in production.
- Semantic versioning for libraries; breaking changes require major version bump and migration notes.
- Prefer simple solutions (YAGNI); minimize dependencies; ensure accessibility and usability.

## Next.js AI Agent App Constraints
<!-- Stack, security, performance, and runtime expectations for this project. -->
- Next.js 14 App Router with Server Components by default; Client Components only when necessary.
- TypeScript with `strict` enabled; avoid `any` and unsafe casts.
- Lint/format with Biome as configured in `biome.json`; formatting is non-negotiable.
- API endpoints live under `app/api/*`; prefer Edge runtime for low-latency AI streaming when feasible, otherwise Node.js runtime.
- Stream model responses (ReadableStream) to the UI; avoid blocking requests.
- Secrets are provided via environment variables; never commit secrets. Validate required env at startup.
- Input validation at API boundaries; sanitize outputs rendered in Client Components.
- Rate limiting and CSRF protections enabled for mutating routes; default to same-origin CORS.
- State management prefers Server Components and URL/search params; use client state sparingly.
- Agent architecture (planner, tools, memory, prompts) is isolated in libraries and invoked by API routes/UI actions.

## Development Workflow, Review Process, Quality Gates
<!-- Spec-driven workflow powered by Spec-Kit, with enforceable gates. -->
- Specification-first: describe functionality with `/specify`. Mark ambiguities with `[NEEDS CLARIFICATION: question]` instead of guessing.
- Planning: derive a technical plan with `/plan`. Apply task rules: different files → mark `[P]` for parallel; same file → sequential; tests precede implementation.
- Implementation: execute from the plan file; keep libraries independent from the Next.js app until contracts are stable.
- Branching & reviews: work on short-lived feature branches; PRs must verify compliance with this constitution and link to the spec/plan.
- Quality gates (all required to merge):
  - Type check (`tsc --noEmit`) passes.
  - Lint/format checks pass (Biome).
  - Unit and integration tests pass (including contract tests).
  - `next build` completes without errors.
  - Documentation updated (library READMEs/contracts, project `README.md`).

## Governance
<!-- Amendments and enforcement rules for this constitution. -->
- This constitution supersedes ad-hoc practices. Non-compliant code must be refactored before merge.
- Amendments require documentation, reviewer approval, and a migration plan for impacted libraries/app code.
- PRs must justify complexity and demonstrate alignment with spec-driven principles.
- Breaking changes require SemVer bump, deprecation notes, and upgrade guidance.
- Spec-driven safeguards: do not include speculative features; unresolved `[NEEDS CLARIFICATION]` items block implementation.

**Version**: 1.0.0 | **Ratified**: 2025-09-20 | **Last Amended**: 2025-09-20
<!-- Source inspirations: Library-First, explicit uncertainty markers, review checklist, and CLI contracts are aligned with Spec-Kit guidance. -->

## Zenn Hackathon Requirements & Compliance
<!-- Mandatory constraints and deliverables for the Zenn Hackathon participation. -->

### Required: Google Cloud Runtime Product
- The deployed application MUST use at least one of: App Engine, Google Compute Engine, Google Kubernetes Engine (GKE), Cloud Run, Cloud Functions, or Cloud TPU/GPU.
- Default decision: Prefer Cloud Run for Next.js SSR/API and background workers; Cloud Functions optional for lightweight webhooks/tasks.

### Required: Google Cloud AI Technology
- The solution MUST use at least one of: Vertex AI, Gemini API, Gemma, Imagen, Agent Builder, ADK (Agents Development Kit), Speech-to-Text / Text-to-Speech, Vision AI, Natural Language AI, Translation AI.
- Default decision: Prefer Vertex AI with Gemini models via Vertex AI for text/multimodal; optionally add Speech-to-Text/Text-to-Speech when relevant.

### Optional: Other Technologies
- If using Flutter, Firebase, or Veo, document usage in `README.md` and the submission form.

### Submission Deliverables
- Public GitHub repository URL (repo must be public at submission).
- Deployed application URL.
- Zenn article URL (category "Idea") that includes:
  - i. Target users, problem statement, solution, and key features.
  - ii. System architecture diagram (image allowed).
  - iii. ~3-minute demo video embedded via YouTube.
- Note: The deployed URL need not be included in the article, but consider cloud costs if you make it public.

### Repository & Deployment Requirements
- Keep the GitHub repository public and preserve the submitted state until Oct 31.
- If development continues after submission, push a tag created before the deadline and submit that tag URL in the form.
- Keep the deployed app available for verification during Sep 25–Oct 8 (judging period).
- Store artifacts:
  - Architecture diagram under `docs/architecture/` and embed it in the Zenn article.
  - Demo plan/script under `docs/demo.md`; publish the final demo on YouTube and embed in the article.

### Judging Criteria Alignment
- Novelty: Address a widely felt, yet unmet problem; summarize user/problem discovery in `README.md`.
- Effectiveness: Demonstrate how the solution addresses the core problem; include scenarios/metrics where possible.
- Implementation quality & scalability: Use managed GCP services, design for scalability and cost efficiency, provide rationale and (optionally) IaC.

### Compliance Checklist (Must satisfy before submission)
- [ ] Uses at least one Google Cloud runtime: App Engine | GCE | GKE | Cloud Run | Cloud Functions | TPU/GPU
- [ ] Uses at least one Google AI tech: Vertex AI | Gemini API | Gemma | Imagen | Agent Builder | ADK | STT/TTS | Vision | Natural Language | Translation
- [ ] Public GitHub repository prepared and will remain public until 10/31
- [ ] Deployment URL live and accessible during 9/25–10/8
- [ ] Zenn article (Idea) includes user/problem/solution, architecture diagram, and 3-minute demo video
- [ ] Tag pushed before deadline if continuing development post-submission

### Governance Addendum (Hackathon)
- Non-compliance with these hackathon rules blocks merges into `main`.
- Design records (ADRs) must state how chosen GCP runtime and AI services satisfy mandatory requirements.
- CI should include smoke tests verifying connectivity to the selected GCP AI service (e.g., Vertex AI endpoint) and that deployment configuration targets the selected runtime (e.g., Cloud Run).
- `README.md` must contain a "Hackathon Compliance" section linking to artifacts and the Zenn article.