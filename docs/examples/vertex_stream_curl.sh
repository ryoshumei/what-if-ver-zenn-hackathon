#!/usr/bin/env bash
set -euo pipefail

# Comments: Stream responses from Vertex AI Gemini using REST with curl (SSE-like via chunked JSON lines if supported).

ACCESS_TOKEN="${ACCESS_TOKEN:-$(gcloud auth application-default print-access-token)}"
PROJECT_ID="${GCP_PROJECT_ID:-}"
LOCATION="${GCP_LOCATION:-us-central1}"
MODEL="${VERTEX_MODEL:-gemini-1.5-pro}" 

if [[ -z "${PROJECT_ID}" ]]; then
  echo "GCP_PROJECT_ID is required" >&2
  exit 1
fi

URL="https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:streamGenerateContent"

curl -N -s -X POST \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  "${URL}" \
  -d '{
    "contents": [{"role":"user","parts":[{"text":"Stream hello from Vertex AI."}]}]
  }' | sed -u 's/\\r//g'


