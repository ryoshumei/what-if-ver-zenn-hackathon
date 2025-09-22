# Quickstart — What If Visualizer

## Prerequisites
- Node.js 20+
- Google Cloud project with Vertex AI enabled
- Firebase project (Auth, Firestore, Storage)
- Cloud Run enabled

## Environment Variables
Set in `.env.local` (for local dev) and in Cloud Run secrets for production.

```
# Google Cloud
GCP_PROJECT_ID=your-gcp-project
GCP_LOCATION=us-central1
VERTEX_CHAT_MODEL=gemini-2.5-flash
VERTEX_PLAN_MODEL=gemini-2.5-pro
VERTEX_IMAGE_MODEL=gemini-2.5-flash-image-preview
VERTEX_VIDEO_MODEL=veo-3.0-fast-generate-001

# Firebase (client + server usage)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Optional local token for Edge streaming (dev only)
ACCESS_TOKEN=$(gcloud auth print-access-token)
```

## Install & Run
```
npm install
npm run dev
```

## Sample Calls
- Chat stream:
```
POST /api/vertex/stream
{"prompt":"Help me plan an image about a floating chair when a robot arrives."}
```
- (Planned) Generation create:
```
POST /api/generations
{"type":"image","prompt":"A chair floats when a vacuum robot arrives"}
```
- (Planned) Poll status:
```
GET /api/generations/{id}
```

## Deploy to Cloud Run
- Build and deploy with provided scripts under `scripts/deploy/`.
- Ensure service account has Vertex AI, Firestore, and Storage permissions.

## Notes
- Streaming endpoints may require Node runtime when fetching tokens programmatically.
- Respect content policy: unsafe prompts are blocked with clear messaging.
