#!/usr/bin/env bash
set -euo pipefail

# Comments: Validate Cloud Run target configuration. Fails if service not found or region mismatched.

# Load env file if present (behavior aligned with deploy script)
ENV_FILE="${ENV_FILE:-.env.example}"
if [[ -f "$ENV_FILE" ]]; then
  # Comments: use POSIX-compatible auto-export to load .env style files
  # shellcheck disable=SC1090
  set -a
  . "$ENV_FILE"
  set +a
fi

PROJECT_ID="${GCP_PROJECT_ID:-}"
REGION="${GCP_RUN_REGION:-${GCP_LOCATION:-us-central1}}"
SERVICE="${CLOUD_RUN_SERVICE:-what-if-agent}"

if [[ -z "${PROJECT_ID}" ]]; then
  if command -v gcloud >/dev/null 2>&1; then
    PROJECT_ID="$(gcloud config get-value project 2>/dev/null || true)"
  fi
fi

if [[ -z "${PROJECT_ID}" ]]; then
  echo "GCP_PROJECT_ID is required" >&2
  exit 1
fi

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud CLI is required for Cloud Run validation" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required for parsing gcloud output" >&2
  exit 1
fi

gcloud config set project "${PROJECT_ID}" >/dev/null

if ! gcloud run services describe "${SERVICE}" --region "${REGION}" --format json | jq -e . >/dev/null; then
  echo "Cloud Run target validation failed: service '${SERVICE}' not found in ${REGION}" >&2
  exit 1
fi

echo "Cloud Run target validation passed for service ${SERVICE} in ${REGION}."

