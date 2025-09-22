# Tasks — Hackathon AI Agent — "What If" Visualizer

Feature Dir: `/Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/specs/001-hackathon-ai-agent`
Source Plan: `/Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/specs/001-hackathon-ai-agent/plan.md`
Contracts: `/Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/specs/001-hackathon-ai-agent/contracts/openapi.yaml`

Conventions:
- [P] = Parallelizable (different files, no direct dependency)
- Use absolute paths when creating files
- TDD: Write failing tests before implementation

## Phase 3.1 — Setup
- [x] T001 Update dependencies in `/Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/package.json` (no code): add `@google-cloud/vertexai`, `firebase`, `firebase-admin`, `zod`, `@biomejs/biome` (already), `vitest`, `@vitest/coverage-v8`, `@playwright/test`, `ts-node`, `@types/node`. Add scripts: `test:unit`, `test:contract`, `test:integration`.
- [x] T002 Create test config files [P]: `vitest.config.ts`, `playwright.config.ts` in repo root with TS setup and test dir mapping.
- [x] T003 Create test directories [P]: `/Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/tests/{unit,contract,integration}` with placeholder `.keep` files.
- [x] T004 Create env validation module: `/Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/src/lib/config/env.ts` validating required env (GCP/Firebase/models) using `zod`.
- [x] T005 Initialize Firebase clients:
  - [P] `/Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/src/lib/firebase/client.ts` (browser safe init)
  - [P] `/Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/src/lib/firebase/server.ts` (Admin SDK init)

## Phase 3.2 — Contract Tests (must fail first)
- [x] T006 [P] Contract test for `POST /api/vertex/stream`: `/Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/tests/contract/vertex_stream.post.spec.ts` using OpenAPI schema.
- [x] T007 [P] Contract test for `POST /api/generations`: `/Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/tests/contract/generations.post.spec.ts`.
- [x] T008 [P] Contract test for `GET /api/generations/{id}`: `/Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/tests/contract/generations_id.get.spec.ts`.
- [x] T009 [P] Contract test for `POST /api/generations/{id}/refine`: `/Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/tests/contract/generations_refine.post.spec.ts`.
- [x] T010 [P] Contract test for `POST /api/feedback`: `/Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/tests/contract/feedback.post.spec.ts`.
- [x] T011 [P] Contract test for `POST /api/publish`: `/Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/tests/contract/publish.post.spec.ts`.
- [x] T012 [P] Contract test for `GET /api/feed`: `/Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/tests/contract/feed.get.spec.ts`.

## Phase 3.3 — Integration Tests from User Stories (must fail first)
- [x] T013 [P] Integration test: Generate Image happy path → save history → compare: `/Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/tests/integration/generate_image.spec.ts`.
- [x] T014 [P] Integration test: Generate Video or fallback to Image with notice: `.../tests/integration/generate_video_or_fallback.spec.ts`.
- [x] T015 [P] Integration test: Refine result with guidance and compare: `.../tests/integration/refine_generation.spec.ts`.
- [x] T016 [P] Integration test: Publish to public feed with attribution: `.../tests/integration/publish_feed.spec.ts`.
- [x] T017 [P] Integration test: Prompt validation for empty/ambiguous prompts: `.../tests/integration/prompt_validation.spec.ts`.
- [x] T018 [P] Integration test: Content policy violation blocked with reason: `.../tests/integration/policy_block.spec.ts`.
- [x] T019 [P] Integration test: Retry on transient failure, input preserved: `.../tests/integration/retry_and_preserve.spec.ts`.

## Phase 3.4 — Core Domain Models (each entity → model) [P]
- [x] T020 [P] Create `User` model types: `/Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/src/lib/models/User.ts`.
- [x] T021 [P] Create `IdeaPrompt` model types: `/Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/src/lib/models/IdeaPrompt.ts`.
- [x] T022 [P] Create `Generation` model types: `/Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/src/lib/models/Generation.ts`.
- [x] T023 [P] Create `MediaAsset` model types: `/Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/src/lib/models/MediaAsset.ts`.
- [x] T024 [P] Create `PolicyFlag` model types: `/Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/src/lib/models/PolicyFlag.ts`.
- [x] T025 [P] Create `CommunityPost` model types: `/Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/src/lib/models/CommunityPost.ts`.

## Phase 3.5 — Services & Adapters
- [x] T026 Create planner: `/Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/src/lib/agent/planner.ts` (map what-if description → image/video prompts; supports multilingual).
- [x] T027 Create safety/policy module: `/Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/src/lib/safety/policy.ts` (pre-check prompts; map provider safety to `PolicyFlag`).
- [x] T028 Create Vertex adapter: `/Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/src/lib/adapters/vertex.ts` (chat, image, video; model ids from env; supports polling jobs).
- [x] T029 Create Firestore repository: `/Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/src/lib/repositories/firestore.ts` (IdeaPrompt/Generation/CommunityPost CRUD).
- [x] T030 Create Storage repository: `/Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/src/lib/repositories/storage.ts` (signed URL helpers; save assets; thumbnail pathing).
- [x] T031 Create logger: `/Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/src/lib/logging/logger.ts` (request ids; structured logs).

## Phase 3.6 — API Endpoints (implement after tests exist)
- [x] T032 Implement `POST /api/generations`: `/Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/src/app/api/generations/route.ts` (validate, queue, return 202).
- [x] T033 Implement `GET /api/generations/[id]`: `/Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/src/app/api/generations/[id]/route.ts` (status/result).
- [x] T034 Implement `POST /api/generations/[id]/refine`: `/Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/src/app/api/generations/[id]/refine/route.ts`.
- [x] T035 Implement `POST /api/feedback`: `/Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/src/app/api/feedback/route.ts`.
- [x] T036 Implement `POST /api/publish`: `/Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/src/app/api/publish/route.ts`.
- [x] T037 Implement `GET /api/feed`: `/Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/src/app/api/feed/route.ts`.
- [x] T038 Add rate limiting & CSRF protection middleware for mutating routes: utility under `/Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/src/lib/http/security.ts` used by API routes.
- [x] T039 Adjust `/Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/src/app/api/vertex/stream/route.ts` if needed to Node runtime when fetching tokens; otherwise keep Edge and require `ACCESS_TOKEN` only in dev.

## Phase 3.7 — Job Processing & Persistence
- [x] T040 Dev job runner (in-process) with polling-compatible API: `/Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/src/lib/jobs/runner.ts`; update repositories for `Generation` state transitions.
- [x] T041 Persist `Generation` lifecycle and create `MediaAsset` on completion; store URLs/paths; generate thumbnail metadata.

## Phase 3.8 — UI (App Router)
- [ ] T042 Chat UI using Next.js AI Chatbot style (prompt input + Image/Video toggle): `/Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/src/app/page.tsx` and components under `/Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/src/app/components/chat/*`.
- [ ] T043 Results/history with compare view (two-column diff) [P]: components under `.../src/app/components/results/*`.
- [ ] T044 Publish/share UI with visibility control [P]: components under `.../src/app/components/publish/*`.
- [ ] T045 Community feed page with search and cards [P]: `/Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/src/app/feed/page.tsx`.
- [ ] T046 Accessibility: alt text editor (images) and captions field (video) [P].

## Phase 3.9 — Observability & Ops
- [ ] T047 Structured logging with request ids in API responses and server logs.
- [ ] T048 Wire CI healthcheck for Vertex AI (existing script): add CI step calling `/Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/scripts/ci/vertex_ai_healthcheck.sh`.
- [ ] T049 Validate env at startup; fail fast on missing configs.
- [ ] T050 Update deploy script usage docs in quickstart (Cloud Run).

## Dependencies & Order
- Setup (T001–T005) before tests
- Contract tests (T006–T012) before endpoint implementation (T032–T039)
- Integration tests (T013–T019) before services/endpoints they cover
- Models (T020–T025) before services (T026–T031)
- Services (T026–T031) before endpoints (T032–T039)
- Job processing (T040–T041) before integration tests pass fully
- UI (T042–T046) after endpoints exist
- Observability/Ops (T047–T050) can run in parallel post-core

## Parallel Execution Examples
```bash
# Run contract tests in parallel (zsh)
npm run test:contract -- tests/contract/vertex_stream.post.spec.ts &
npm run test:contract -- tests/contract/generations.post.spec.ts &
npm run test:contract -- tests/contract/generations_id.get.spec.ts &
npm run test:contract -- tests/contract/generations_refine.post.spec.ts &
npm run test:contract -- tests/contract/feedback.post.spec.ts &
npm run test:contract -- tests/contract/publish.post.spec.ts &
npm run test:contract -- tests/contract/feed.get.spec.ts &
wait

# Run integration tests with workers
npx playwright test tests/integration --workers=3
```

## Task Agent Commands (examples)
```bash
# Create files
mkdir -p /Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/src/lib/{agent,adapters,config,firebase,logging,repositories,safety,jobs,models}
mkdir -p /Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/src/app/api/generations/[id]/refine
mkdir -p /Users/ryo/WebstormProjects/what-if-ver-zenn-hackathon/tests/{unit,contract,integration}

# Install deps
npm i @google-cloud/vertexai firebase firebase-admin zod
npm i -D vitest @vitest/coverage-v8 @playwright/test ts-node @types/node
```

## Validation Checklist
- All contract endpoints have tests (T006–T012)
- Each entity has a model task (T020–T025)
- Tests precede implementation
- [P] tasks do not touch the same file
- Paths are absolute and match repo structure
