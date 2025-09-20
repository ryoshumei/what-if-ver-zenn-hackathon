This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Hackathon Compliance

This project participates in the Zenn Hackathon and follows the rules embedded in `/.specify/memory/constitution.md`.

- Google Cloud Runtime: Will deploy to Cloud Run (primary). Cloud Functions may be used for lightweight tasks.
- Google Cloud AI: Will use Vertex AI (Gemini via Vertex AI) as default AI provider.

### Submission Artifacts
- Public GitHub repository: this repository.
- Deployment URL: to be added before the judging period (9/25–10/8).
- Zenn article (category "Idea"): draft lives at `docs/zenn-draft.md` and will be published before submission.

### Architecture Diagram
- Store diagrams under `docs/architecture/` and embed in the Zenn article.
- Current placeholder: `docs/architecture/diagram.png` (replace with your diagram) and `docs/architecture/README.md` for context.

### CI Compliance Checks
- Vertex AI healthcheck: validates API connectivity using ADC.
- Cloud Run target validation: validates deployment target settings.

See `scripts/ci/vertex_ai_healthcheck.sh` and `scripts/ci/cloud_run_target_check.sh`. GitHub Actions workflow: `.github/workflows/ci.yml`.

## Cloud Run Deployment (Minimal)

Docker-based deploy scripts are provided:

```bash
# Build & push & deploy (requires gcloud and docker login)
export GCP_PROJECT_ID=your-project
export GCP_RUN_REGION=us-central1
export CLOUD_RUN_SERVICE=what-if-agent
export AR_REPO=web
export IMAGE_TAG=$(git rev-parse --short HEAD)
bash scripts/deploy/cloud_run_deploy.sh
```

### IaC (Cloud Run service.yaml)
Minimal service configuration for Cloud Run is available at `infra/cloud-run/service.yaml`.
Replace `REGION`, `PROJECT`, `REPO`, `TAG` placeholders before applying via `gcloud run services replace`.

## Vertex AI (Gemini) Quickstart

See `docs/vertex-ai-quickstart.md` and run the minimal example:

```bash
export ACCESS_TOKEN="$(gcloud auth application-default print-access-token)"
export GCP_PROJECT_ID=your-project
node docs/examples/vertex_gemini_min.js
```

### Streaming examples
- cURL streaming (server output): `docs/examples/vertex_stream_curl.sh`
- Next.js Edge API proxy (POST JSON: `{ "prompt": "..." }`): `POST /api/vertex/stream`
