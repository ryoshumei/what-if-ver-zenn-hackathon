# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
```bash
npm run dev          # Start development server with Turbopack
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run Biome linter/formatter checks
npm run format       # Auto-fix formatting with Biome
```

### Testing Strategy
```bash
npm run test:unit         # Unit tests (Vitest) - tests/unit/**
npm run test:contract     # Contract/API tests (Vitest) - tests/contract/**
npm run test:integration  # E2E tests (Playwright) - tests/integration/**
```

**Test Separation**: Unit tests validate isolated logic, contract tests validate API endpoints against OpenAPI spec, integration tests validate full user workflows.

## Architecture Overview

### "What If" AI Visualizer Application
This is a **Zenn Hackathon** project building an AI-powered image/video generation platform with community feed features. The architecture follows **spec-driven development** with library-first principles.

### Technology Stack
- **Framework**: Next.js 15 (App Router) with TypeScript
- **AI**: Google Vertex AI (Gemini models) for generation
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage for media assets
- **Deployment**: Google Cloud Run (Docker-based)
- **Validation**: Zod schemas throughout
- **Testing**: Vitest (unit/contract) + Playwright (E2E)

### Core Domain Models
Located in `src/lib/models/`:
- **Generation**: AI generation requests/status tracking
- **IdeaPrompt**: User input prompts with metadata
- **MediaAsset**: Generated images/videos with accessibility data
- **CommunityPost**: Published generations for community feed
- **User**: User profiles and preferences
- **PolicyFlag**: Content safety and policy enforcement

### Repository Pattern
All data access goes through `src/lib/repositories/`:
- **FirestoreRepository**: Centralized Firestore operations with type safety
- **StorageRepository**: File upload/download with Firebase Storage
- **MediaRepository**: Media asset management and processing

### Key Service Layers

#### Agent & Planning (`src/lib/agent/`)
- **Planner**: Validates prompts, detects language, plans generation strategy
- Orchestrates the generation pipeline from prompt to completion

#### Safety & Policy (`src/lib/safety/`)
- **PolicyEnforcer**: Content filtering, safety checks, violation detection
- Prevents harmful content generation and enforces community guidelines

#### Job Processing (`src/lib/jobs/`)
- **Runner**: Background job processing for AI generation
- Handles status updates, error recovery, and completion workflows

#### Vertex AI Integration (`src/lib/adapters/`)
- **VertexAdapter**: Abstracts Vertex AI SDK for image/video generation
- Handles streaming responses and model-specific configurations

### API Routes Architecture

#### Generation Lifecycle
- `POST /api/generations` - Create new generation request
- `GET /api/generations/[id]` - Check generation status/results
- `POST /api/generations/[id]/refine` - Refine existing generation

#### Community Features
- `GET /api/feed` - Browse community generations (paginated)
- `POST /api/publish` - Publish generation to community
- `POST /api/feedback` - Record user alignment feedback

#### Streaming
- `POST /api/vertex/stream` - Direct Vertex AI streaming proxy

### Frontend Components
Located in `src/app/components/`:
- **chat/**: Conversational interface (PromptInput, ChatMessage, GenerationResult)
- **results/**: Generation viewing (CompareView, HistoryView)
- **publish/**: Community sharing (PublishModal, ShareButton)
- **accessibility/**: A11y tools (CaptionsEditor, AltTextEditor)

### Configuration & Environment

#### Required Environment Variables
Validated in `src/lib/config/env.ts`:
- `GCP_PROJECT_ID` - Google Cloud Project
- `VERTEX_AI_REGION` - Vertex AI region (default: us-central1)
- Firebase configuration for both client and server

#### Next.js 15 Compatibility
- Uses **async params** pattern for dynamic routes: `{ params: Promise<{ id: string }> }`
- **Export pattern**: Functions must be explicitly exported (no default exports for API routes)

### Logging & Observability
- **Structured logging** via `src/lib/logging/logger.ts`
- Request correlation IDs, performance tracking
- Development: formatted console output
- Production: JSON structured logs for aggregation

### Content Safety Pipeline
1. **Prompt validation** (Planner)
2. **Policy enforcement** (Safety)
3. **Generation processing** (Jobs/Vertex)
4. **Result validation** (Policy)
5. **Community moderation** (Publish)

### Testing Architecture
- **Unit tests**: Isolated validation logic, model schemas
- **Contract tests**: API endpoint compliance with OpenAPI spec
- **Integration tests**: Full user workflows via Playwright

### Deployment Notes
- **Docker**: Multi-stage build optimized for Cloud Run
- **IaC**: Service configuration at `infra/cloud-run/service.yaml`
- **CI/CD**: GitHub Actions with Vertex AI healthchecks
- **Artifact Registry**: Container images stored in Google Cloud

### Development Patterns
- **Library-first**: All business logic in `src/lib/` before UI integration
- **Zod validation**: Every API boundary has schema validation
- **Error boundaries**: Graceful degradation with user-friendly messages
- **TypeScript strict**: Full type safety across the stack

## Hackathon Compliance

This project follows Zenn Hackathon rules embedded in `.specify/memory/constitution.md`:
- **Google Cloud Runtime**: Primary deployment on Cloud Run
- **Google Cloud AI**: Vertex AI as the AI provider
- **Public repository**: This GitHub repo serves as submission artifact
- **Article submission**: Draft at `docs/zenn-draft.md`