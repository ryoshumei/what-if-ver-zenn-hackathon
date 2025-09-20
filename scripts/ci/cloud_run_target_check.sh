#!/usr/bin/env bash
set -euo pipefail

# Comments: Validate Cloud Run target configuration. Fails if service not found or region mismatched.

PROJECT_ID="${GCP_PROJECT_ID:-}"
REGION="${GCP_RUN_REGION:-us-central1}"
SERVICE="${CLOUD_RUN_SERVICE:-what-if-agent}"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "GCP_PROJECT_ID is required" >&2
  exit 1
fi

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud CLI is required for Cloud Run validation" >&2
  exit 1
fi

gcloud config set project "${PROJECT_ID}" >/dev/null

if ! gcloud run services describe "${SERVICE}" --region "${REGION}" --format json | jq -e . >/dev/null; then
  echo "Cloud Run target validation failed: service '${SERVICE}' not found in ${REGION}" >&2
  exit 1
fi

echo "Cloud Run target validation passed for service ${SERVICE} in ${REGION}."

