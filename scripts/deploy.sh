#!/bin/bash
set -euo pipefail

# Deploy Agentverse to Google Cloud Run
# Usage: ./scripts/deploy.sh [--project PROJECT_ID] [--region REGION]

PROJECT_ID="${GCLOUD_PROJECT:-}"
REGION="${CLOUD_RUN_REGION:-europe-west1}"
SERVICE_NAME="agentverse"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Parse args
while [[ $# -gt 0 ]]; do
  case $1 in
    --project) PROJECT_ID="$2"; shift 2 ;;
    --region) REGION="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

if [[ -z "$PROJECT_ID" ]]; then
  echo "Error: Set GCLOUD_PROJECT or pass --project PROJECT_ID"
  exit 1
fi

IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "==> Building Docker image..."
docker build -t "${IMAGE_NAME}" .

echo "==> Pushing to Container Registry..."
docker push "${IMAGE_NAME}"

echo "==> Deploying to Cloud Run (${REGION})..."
gcloud run deploy "${SERVICE_NAME}" \
  --image "${IMAGE_NAME}" \
  --platform managed \
  --region "${REGION}" \
  --project "${PROJECT_ID}" \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "FIREBASE_PROJECT_ID=${PROJECT_ID}" \
  --update-secrets "ANTHROPIC_API_KEY=anthropic-api-key:latest"

echo "==> Done! Service URL:"
gcloud run services describe "${SERVICE_NAME}" \
  --region "${REGION}" \
  --project "${PROJECT_ID}" \
  --format "value(status.url)"
