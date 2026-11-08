#!/usr/bin/env bash
# ==============================================================================
# LifeStack — Google Cloud & Firebase CI/CD IAM Bootstrap Script
# ==============================================================================
# Configures all required Google Cloud APIs, 2nd Gen Cloud Functions / Eventarc
# Service Agent bindings, and least-privilege GitHub Actions Service Account IAM
# roles so non-interactive CI/CD deployments succeed reliably without Owner keys.
#
# Usage (in Google Cloud Shell or any terminal with `gcloud` authenticated as Owner):
#   bash scripts/bootstrap-ci-iam.sh [PROJECT_ID] [CI_SERVICE_ACCOUNT_EMAIL]
# ==============================================================================

set -euo pipefail

PROJECT_ID="${1:-lifestack-371ab}"
CI_SA_EMAIL="${2:-}"

echo "==> Resolving project number for '${PROJECT_ID}'..."
PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
echo "    Project Number: ${PROJECT_NUMBER}"

echo "==> Enabling required Google Cloud & Firebase APIs..."
gcloud services enable \
  cloudresourcemanager.googleapis.com \
  iam.googleapis.com \
  serviceusage.googleapis.com \
  cloudfunctions.googleapis.com \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  eventarc.googleapis.com \
  pubsub.googleapis.com \
  artifactregistry.googleapis.com \
  firestore.googleapis.com \
  firebaserules.googleapis.com \
  firebasehosting.googleapis.com \
  firebaseextensions.googleapis.com \
  identitytoolkit.googleapis.com \
  --project="${PROJECT_ID}"

echo "==> Ensuring Pub/Sub and Eventarc service identities exist..."
gcloud beta services identity create --service=pubsub.googleapis.com --project="${PROJECT_ID}" --quiet || true
gcloud beta services identity create --service=eventarc.googleapis.com --project="${PROJECT_ID}" --quiet || true

PUBSUB_SA="service-${PROJECT_NUMBER}@gcp-sa-pubsub.iam.gserviceaccount.com"
EVENTARC_SA="service-${PROJECT_NUMBER}@gcp-sa-eventarc.iam.gserviceaccount.com"
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

echo "==> Binding required 2nd Gen Cloud Functions & Eventarc Service Agent roles..."
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${PUBSUB_SA}" \
  --role="roles/iam.serviceAccountTokenCreator" \
  --condition=None \
  --quiet >/dev/null

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/run.invoker" \
  --condition=None \
  --quiet >/dev/null

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/eventarc.eventReceiver" \
  --condition=None \
  --quiet >/dev/null

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${EVENTARC_SA}" \
  --role="roles/eventarc.serviceAgent" \
  --condition=None \
  --quiet >/dev/null

if [[ -z "${CI_SA_EMAIL}" ]]; then
  echo "==> Auto-detecting GitHub Actions service account in '${PROJECT_ID}'..."
  CI_SA_EMAIL="$(gcloud iam service-accounts list \
    --project="${PROJECT_ID}" \
    --filter="email ~ ^github-action-" \
    --format='value(email)' | head -n 1)"
fi

if [[ -z "${CI_SA_EMAIL}" ]]; then
  echo "!! Could not auto-detect a 'github-action-*' service account."
  echo "   Available custom service accounts in ${PROJECT_ID}:"
  gcloud iam service-accounts list --project="${PROJECT_ID}" --format='table(email,displayName)'
  echo "   Re-run with: bash scripts/bootstrap-ci-iam.sh ${PROJECT_ID} <YOUR_CI_SERVICE_ACCOUNT_EMAIL>"
  exit 1
fi

echo "==> Granting least-privilege CI/CD deployment roles to '${CI_SA_EMAIL}'..."
CI_ROLES=(
  "roles/firebasehosting.admin"          # Deploy live & PR preview Hosting channels
  "roles/firebaseauth.admin"             # Manage preview channel authorized domains
  "roles/firebaserules.admin"            # Release Firestore security rules
  "roles/datastore.indexAdmin"           # Manage Firestore composite indexes
  "roles/cloudfunctions.admin"           # Deploy 2nd Gen Cloud Functions
  "roles/run.admin"                      # Manage Cloud Run services backing 2nd Gen Functions
  "roles/eventarc.admin"                 # Provision Eventarc triggers (authUserCreated/Deleted)
  "roles/artifactregistry.repoAdmin"     # Inspect & manage gcf-artifacts cleanup policies
  "roles/iam.serviceAccountUser"         # ActAs runtime service account during deploy
  "roles/iam.securityReviewer"           # Read project IAM policy (resourcemanager.projects.getIamPolicy) so firebase-tools preflight succeeds
  "roles/serviceusage.serviceUsageConsumer" # Check enabled Google Cloud APIs
  "roles/firebaseextensions.viewer"      # Read extensions manifest cleanly without warnings
)

for ROLE in "${CI_ROLES[@]}"; do
  echo "    + ${ROLE}"
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${CI_SA_EMAIL}" \
    --role="${ROLE}" \
    --condition=None \
    --quiet >/dev/null
done

echo ""
echo "✔ All GCP APIs, Service Agent bindings, and CI/CD Service Account roles are configured for '${PROJECT_ID}'!"

