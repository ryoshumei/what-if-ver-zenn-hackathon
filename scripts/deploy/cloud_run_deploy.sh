#!/usr/bin/env bash
set -euo pipefail

# Comments: Build container image and deploy to Cloud Run.
# Required env: GCP_PROJECT_ID, GCP_RUN_REGION, CLOUD_RUN_SERVICE, AR_REPO (artifact registry repo), IMAGE_TAG

PROJECT_ID="${GCP_PROJECT_ID:-}"
REGION="${GCP_RUN_REGION:-us-central1}"
SERVICE="${CLOUD_RUN_SERVICE:-what-if-agent}"
AR_REPO="${AR_REPO:-web}"
TAG="${IMAGE_TAG:-latest}"

if [[ -z "$PROJECT_ID" ]]; then echo "GCP_PROJECT_ID is required" >&2; exit 1; fi
if ! command -v gcloud >/dev/null 2>&1; then echo "gcloud CLI required" >&2; exit 1; fi

gcloud config set project "$PROJECT_ID" >/dev/null
gcloud auth configure-docker "${REGION}-docker.pkg.dev" -q

IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/${SERVICE}:${TAG}"

echo "Building image: ${IMAGE}"
docker build -t "$IMAGE" .

echo "Pushing image: ${IMAGE}"
docker push "$IMAGE"

echo "Deploying to Cloud Run: ${SERVICE} (${REGION})"
gcloud run deploy "$SERVICE" \
  --image "$IMAGE" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --set-env-vars NODE_ENV=production

echo "Deployment complete."

