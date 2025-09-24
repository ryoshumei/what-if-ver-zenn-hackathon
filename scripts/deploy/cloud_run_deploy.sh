#!/usr/bin/env bash
set -euo pipefail

# Comments: Build container image and deploy to Cloud Run.
# Required env: GCP_PROJECT_ID (falls back to .env.local), GCP_RUN_REGION (falls back to GCP_LOCATION),
# Optional env: CLOUD_RUN_SERVICE, AR_REPO (artifact registry repo), IMAGE_TAG, ENV_FILE (defaults .env.local), CLOUD_RUN_SA_EMAIL

ENV_FILE="${ENV_FILE:-.env.local}"

# Load from env file for convenience (non-export .env format)
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC2046
  export $(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$ENV_FILE" | sed 's/\r$//' | xargs -0 -I {} sh -c 'printf "%s\n" {}' 2>/dev/null | xargs)
fi

PROJECT_ID="${GCP_PROJECT_ID:-}"
REGION="${GCP_RUN_REGION:-${GCP_LOCATION:-us-central1}}"
SERVICE="${CLOUD_RUN_SERVICE:-what-if-agent}"
AR_REPO="${AR_REPO:-web}"
TAG="${IMAGE_TAG:-latest}"

if [[ -z "$PROJECT_ID" ]]; then echo "GCP_PROJECT_ID is required" >&2; exit 1; fi
if ! command -v gcloud >/dev/null 2>&1; then echo "gcloud CLI required" >&2; exit 1; fi

gcloud config set project "$PROJECT_ID" >/dev/null
gcloud auth configure-docker "${REGION}-docker.pkg.dev" -q

IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/${SERVICE}:${TAG}"

echo "Building image (linux/amd64): ${IMAGE}"
# Prepare production env file for Next.js build inside Docker
BUILD_ENV_FILE=.env.production
grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$ENV_FILE" | \
  grep -v '^GOOGLE_APPLICATION_CREDENTIALS=' | \
  grep -v '^ACCESS_TOKEN=' > "$BUILD_ENV_FILE"

# Ensure cleanup
cleanup() { rm -f "$BUILD_ENV_FILE" || true; }
trap cleanup EXIT

if docker buildx version >/dev/null 2>&1; then
  docker buildx build --platform linux/amd64 -t "$IMAGE" . --push
  PUSHED=1
else
  echo "buildx not found; falling back to docker build (no cross-arch)"
  docker build --platform linux/amd64 -t "$IMAGE" .
  PUSHED=0
fi

if [[ "$PUSHED" -eq 0 ]]; then
  echo "Pushing image: ${IMAGE}"
  docker push "$IMAGE"
fi

echo "Preparing env vars from ${ENV_FILE} (excluding secrets)"
# Build set-env-vars from env file, excluding GOOGLE_APPLICATION_CREDENTIALS and ACCESS_TOKEN
ENV_KV=$(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$ENV_FILE" | sed 's/\r$//' \
  | grep -v '^GOOGLE_APPLICATION_CREDENTIALS=' \
  | grep -v '^ACCESS_TOKEN=' \
  | tr '\n' ',' | sed 's/,$//')

SA_FLAG=()
if [[ -n "${CLOUD_RUN_SA_EMAIL:-}" ]]; then
  SA_FLAG+=("--service-account" "$CLOUD_RUN_SA_EMAIL")
fi

echo "Deploying to Cloud Run: ${SERVICE} (${REGION})"
gcloud run deploy "$SERVICE" \
  --image "$IMAGE" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --set-env-vars NODE_ENV=production${ENV_KV:+,$ENV_KV} \
  "${SA_FLAG[@]}"

echo "Deployment complete."

