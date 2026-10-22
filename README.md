# LifeStack ⚡

> Your personal life command center: finances, important dates, and personal analytics.
> Built with **Angular 22** and **Pure Firebase Serverless**.

---

## Architecture Overview

LifeStack follows the **Standard Firebase Serverless Architecture** (Zero Docker, zero backend servers to manage):

* **Frontend (`src/`)**: Modern **Angular 22** Single Page App (Signals, Standalone components, Zoneless change detection).
* **Database & Auth**: Direct client connection to **Cloud Firestore** and **Firebase Authentication** with real-time sync.
* **Security (`firestore.rules`)**: Granular security rules enforcing user-partitioned data access.
* **Serverless Backend (`functions/`)**: Google Cloud Functions (Node.js 22 + TypeScript) for background automation, scheduled reminders, and private API keys (AI receipt processing).
* **Hosting**: **Firebase Hosting** global edge CDN with free automatic SSL.

---

## Getting Started

### 1. Prerequisites
Ensure you are authenticated with the Firebase CLI:
```bash
firebase login --reauth
```

### 2. Local Development

#### Start the Angular App:
```bash
npm start
```
Access the app at `http://localhost:4200`.

#### Run the Serverless Functions Locally:
```bash
npm --prefix functions run build
firebase emulators:start
```
Access the Firebase Local Emulator UI at `http://localhost:4000`.

---

## Deployment to Firebase

To build and deploy both the frontend and serverless functions to Firebase Hosting and Google Cloud:

```bash
npm run build
firebase deploy
```
