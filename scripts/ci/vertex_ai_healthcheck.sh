#!/usr/bin/env bash
set -euo pipefail

# Comments: Validate Vertex AI access by listing models (requires ADC or service account JSON via GOOGLE_APPLICATION_CREDENTIALS).

PROJECT_ID="${GCP_PROJECT_ID:-}"
LOCATION="${GCP_LOCATION:-us-central1}"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "GCP_PROJECT_ID is required" >&2
  exit 1
fi

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud CLI is required for Vertex AI healthcheck" >&2
  exit 1
fi

gcloud config set project "${PROJECT_ID}" >/dev/null

# Try to call Vertex AI API. Using models list as a lightweight sanity check.
if ! gcloud ai models list --region "${LOCATION}" --format json | jq -e . >/dev/null; then
  echo "Vertex AI healthcheck failed: cannot list models in ${LOCATION}" >&2
  exit 1
fi

echo "Vertex AI healthcheck passed for project ${PROJECT_ID} (${LOCATION})."

