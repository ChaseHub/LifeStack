# LifeStack ⚡

> Your personal life command center: finances, important dates, and personal analytics.
> Built with **Angular 22** and **Pure Firebase Serverless (2nd Gen)**.

---

## Architecture Overview

LifeStack follows the **Modern Firebase Serverless Architecture** (Zero Docker, zero backend servers to manage):

* **Frontend (`src/`)**: Modern **Angular 22** Single Page App (Signals, Standalone components, Zoneless change detection) targeting **Node.js 24 LTS**.
* **Database & Auth**: Direct client connection to **Cloud Firestore** and **Firebase Authentication** with real-time reactive signals.
* **Security (`firestore.rules`)**: Granular security rules enforcing user-partitioned data access (`users/{uid}/**`).
* **Serverless Backend (`functions/`)**: **2nd Gen** Google Cloud Run Functions (**Node.js 24** + TypeScript 6 + Eventarc) for Auth lifecycle triggers, callable APIs, scheduled tasks, and secret-backed integrations.
* **Hosting**: **Firebase Hosting** global edge CDN with automatic SSL and Cloud Run function rewrites.

---

## Getting Started

### 1. Prerequisites
* **Node.js 24 LTS** (pinned in `.nvmrc`) and **npm 11+**
* Authenticate with the Firebase CLI (`firebase-tools` v15+):
```bash
firebase login --reauth
```

### 2. Local Development

#### Start the Angular App:
```bash
npm install
npm --prefix functions install
npm start
```
Access the app at `http://localhost:4200`.

#### Run the Full Firebase Emulator Suite (Auth, Firestore, Functions, Hosting):
```bash
npm run emulate
```
Access the Firebase Local Emulator UI at `http://localhost:4000`.

---

## Deployment & CI/CD Setup

### Manual Deployment
```bash
npm run deploy:all
```

### One-Time Artifact Registry Cleanup Policy Setup
To ensure old Cloud Run container images in `us-central1` are automatically pruned after 1 day:
```bash
firebase functions:artifacts:setpolicy --location us-central1 --days 1 --project lifestack-371ab --force
```

### Required IAM Roles for the GitHub Actions Service Account
Ensure the service account stored in `secrets.FIREBASE_SERVICE_ACCOUNT_LIFESTACK_371AB` holds the following roles in Google Cloud IAM for `lifestack-371ab`:
* `roles/firebasehosting.admin` — Deploy live and preview Hosting channels
* `roles/firebaserules.admin` & `roles/datastore.indexAdmin` — Release Firestore rules & composite indexes
* `roles/cloudfunctions.admin` & `roles/run.admin` — Deploy 2nd Gen Cloud Functions on Cloud Run
* `roles/eventarc.admin` — Provision Eventarc triggers (`authUserCreated`, `authUserDeleted`)
* `roles/artifactregistry.repoAdmin` — Inspect/configure Artifact Registry image cleanup policies
* `roles/iam.serviceAccountUser` — Act as the runtime service account during function deployment
* `roles/serviceusage.serviceUsageConsumer` & `roles/firebaseextensions.viewer` — Validate enabled APIs & extensions manifest cleanly without warnings
