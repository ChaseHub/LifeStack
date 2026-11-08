import { App, getApps, initializeApp } from "firebase-admin/app";
import { Firestore, getFirestore } from "firebase-admin/firestore";
import { setGlobalOptions } from "firebase-functions/options";

export const FUNCTION_REGION = "us-central1";
export const MAX_FUNCTION_INSTANCES = 10;

const DEFAULT_APP_NAME = "[DEFAULT]";

let cachedDb: Firestore | null = null;

/**
 * Returns the `[DEFAULT]` Firebase Admin App, initializing it if needed.
 *
 * Never check `getApps().length > 0` here: `firebase-functions` v7 registers its
 * own internal named Admin app (`__FIREBASE_FUNCTIONS_SDK__`) during Callable
 * auth token verification before invoking user handlers, which makes `getApps()`
 * non-empty even when the `[DEFAULT]` app has not been initialized yet.
 */
export function getAdminApp(): App {
  const existingDefaultApp = getApps().find((app) => app.name === DEFAULT_APP_NAME);
  return existingDefaultApp ?? initializeApp();
}

export function getDb(): Firestore {
  if (!cachedDb) {
    cachedDb = getFirestore(getAdminApp());
  }
  return cachedDb;
}

export function configureGlobalFunctionOptions(): void {
  setGlobalOptions({
    region: FUNCTION_REGION,
    maxInstances: MAX_FUNCTION_INSTANCES
  });
}
