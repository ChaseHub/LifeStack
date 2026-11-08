import { App, getApp, getApps, initializeApp } from "firebase-admin/app";
import { Firestore, getFirestore } from "firebase-admin/firestore";
import { setGlobalOptions } from "firebase-functions/options";

export const FUNCTION_REGION = "us-central1";
export const MAX_FUNCTION_INSTANCES = 10;

let cachedDb: Firestore | null = null;

export function getAdminApp(): App {
  return getApps().length > 0 ? getApp() : initializeApp();
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

