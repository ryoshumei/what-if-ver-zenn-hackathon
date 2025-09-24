# Phase 0 — Research & Decisions

Feature: Hackathon AI Agent — "What If" Idea Visualizer
Spec: `/specs/001-hackathon-ai-agent/spec.md`
Date: 2025-09-21

## Goals
- Excellent UX for fast iteration on "what if" ideas (image/video) with streaming feedback.
- Reliable Vertex AI integration on Cloud Run; simple, cost-aware architecture.
- Library-first design: agent, adapters, and storage isolated under `src/lib/*`.

## Unknowns → Decisions

1) Vertex AI authentication and runtime
- Decision: On Cloud Run, use Application Default Credentials (service account) with `aiplatform` scope via the official Vertex AI Node.js client. For Edge routes that cannot access ADC, use a short-lived bearer token provided via environment variable or switch those routes to Node.js runtime when needed.
- Rationale: ADC is the recommended, secure auth on GCP. Edge runtime improves latency for lightweight chat streaming but cannot mint tokens; we therefore keep streaming endpoints simple or run them on Node when tokens must be fetched programmatically.
- Alternatives: (a) OAuth client credentials flow (adds complexity), (b) Proxy token via a dedicated token service (overkill for hackathon). Rejected for simplicity and time constraints.

2) Model selection and mapping
- Decision: 
  - Chat/interaction: `gemini-2.5-flash`
  - Prompt planning/refinement: `gemini-2.5-pro`
  - Image generation/edit: `gemini-2.5-flash-image-preview`
  - Video generation: `veo-3.0-fast-generate-001` (short clips, <= 6s)
- Rationale: Aligns with user intent and balances speed vs quality.
- Alternatives: Imagen for images; different Gemini variants. Kept scope tight for hackathon.

3) Streaming strategy and UX
- Decision: 
  - Chat: stream tokens to UI via ReadableStream (SSE-like) using App Router route.
  - Generation (image/video): asynchronous job pattern → immediate "queued" response; poll `GET /api/generations/{id}` until `status: complete|failed`. Show progress and allow retry.
- Rationale: Generation can take seconds; polling simplifies infra over bidirectional websockets.
- Alternatives: Server-Sent Events for job progress; WebSockets. Deferred due to time.

4) Storage and data model
- Decision: Firestore for metadata (`IdeaPrompt`, `Generation`, `CommunityPost`, `PolicyFlag`), Cloud Storage for media assets and thumbnails. Bucket path convention: `gs://<project>-assets/{userId}/{generationId}/{file}`. Publicly shared items use signed or public-read URLs gated by visibility.
- Rationale: Firebase integrates well with Google Cloud, quick to set up, matches hackathon scope.
- Alternatives: Cloud SQL/Postgres; more schema power but slower setup.

5) Content safety & policy
- Decision: Use Vertex safety filters and basic heuristic validation. Block unsafe prompts before generation; annotate `PolicyFlag` on violations; return user-friendly guidance.
- Rationale: Spec requires policy enforcement (violations blocked with reasons).
- Alternatives: External moderation APIs. Unnecessary for initial scope.

6) Internationalization (EN/zh-CN/ja)
- Decision: Accept these languages directly; rely on Gemini multilingual understanding. If unsupported language detected, suggest guidance and English fallback.
- Rationale: Matches spec FR-014 without heavy i18n infra.
- Alternatives: Explicit translation step. Deferred.

7) Accessibility
- Decision: Auto-suggest image `alt` from prompt; require user confirmation for publish. For video, auto-suggest brief description/captions if feasible; allow user edit before publish.
- Rationale: Meets FR-017; keeps UX simple.

8) Deployment target and CI
- Decision: Cloud Run for SSR/API. Include minimal healthcheck (Vertex connectivity) in CI script. Region `us-central1`.
- Rationale: Satisfies hackathon rules and simplifies ops.

## Best Practices Summary
- Validate env at startup; never expose secrets to client. Use `process.env` on server routes only.
- Keep agent/business logic in libraries; API/UI are thin adapters.
- Use structured logs with request IDs; keep logs quiet in production.
- Rate limit mutating endpoints; CSRF protection for state-changing requests.

## Output
All unknowns identified for Phase 0 are addressed. Proceed to Phase 1: Design & Contracts.


