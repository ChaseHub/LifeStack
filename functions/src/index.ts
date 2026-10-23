import { onRequest, onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { auth } from "firebase-functions/v1";
import { successResponse, errorResponse } from "./utils/response";

initializeApp();
const db = getFirestore();

/**
 * Health check endpoint for system monitoring
 */
export const apiHealth = onRequest((request, response) => {
  logger.info("apiHealth called", { structuredData: true });
  response.json(
    successResponse({
      status: "healthy",
      service: "LifeStack Serverless Cloud Functions",
      runtime: "Node.js 22"
    })
  );
});

/**
 * Background Trigger: Automatically initializes a user profile document
 * in Firestore (`users/{uid}`) upon first signup through Firebase Auth.
 */
export const onUserCreated = auth.user().onCreate(async (user) => {
  logger.info("Initializing profile for new user", { uid: user.uid });

  try {
    await db.collection("users").doc(user.uid).set(
      {
        uid: user.uid,
        email: user.email || null,
        displayName: user.displayName || null,
        photoURL: user.photoURL || null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
    logger.info("Successfully created user profile", { uid: user.uid });
  } catch (error) {
    logger.error("Failed to initialize user document", { uid: user.uid, error });
  }
});

/**
 * Background Trigger: Cleans up user profile document in Firestore
 * when a user is deleted from Firebase Auth.
 */
export const onUserDeleted = auth.user().onDelete(async (user) => {
  logger.info("Cleaning up profile for deleted user", { uid: user.uid });

  try {
    await db.collection("users").doc(user.uid).delete();
    logger.info("Successfully removed user profile", { uid: user.uid });
  } catch (error) {
    logger.error("Failed to delete user document", { uid: user.uid, error });
  }
});

/**
 * Sample Callable Function: Demonstrates automatic token verification in Firebase Functions v2
 * and returns standard ApiResponse.
 */
export const getMyProfile = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated to call this function.");
  }

  const userDoc = await db.collection("users").doc(request.auth.uid).get();

  if (!userDoc.exists) {
    return errorResponse("NOT_FOUND", "User document was not found.");
  }

  return successResponse(userDoc.data());
});
