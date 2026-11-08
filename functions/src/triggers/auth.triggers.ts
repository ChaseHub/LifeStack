import { onUserCreated, onUserDeleted } from "firebase-functions/identity";
import * as logger from "firebase-functions/logger";
import { getDb } from "../config/firebase.js";
import { ensureUserProfile, purgeUserData } from "../services/user-profile.service.js";

/**
 * 2nd Gen Auth Trigger (Eventarc): Idempotently initializes a user profile
 * document in Firestore (`users/{uid}`) when a Firebase Auth account is created.
 */
export const authUserCreated = onUserCreated(async (event) => {
  const user = event.data;
  if (!user?.uid) {
    logger.warn("Received user.created event without a valid user payload", {
      eventId: event.id
    });
    return;
  }

  logger.info("Initializing profile for new user", {
    uid: user.uid,
    eventId: event.id
  });

  try {
    await ensureUserProfile(getDb(), {
      uid: user.uid,
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      photoURL: user.photoURL ?? null
    });
    logger.info("Successfully initialized user profile", { uid: user.uid });
  } catch (error) {
    logger.error("Failed to initialize user document", {
      uid: user.uid,
      eventId: event.id,
      error
    });
    throw error;
  }
});

/**
 * 2nd Gen Auth Trigger (Eventarc): Recursively purges a user's profile document
 * and all nested subcollections (`users/{uid}/**`) upon Firebase Auth account deletion.
 */
export const authUserDeleted = onUserDeleted(async (event) => {
  const user = event.data;
  if (!user?.uid) {
    logger.warn("Received user.deleted event without a valid user payload", {
      eventId: event.id
    });
    return;
  }

  logger.info("Purging Firestore data for deleted user", {
    uid: user.uid,
    eventId: event.id
  });

  try {
    await purgeUserData(getDb(), user.uid);
    logger.info("Successfully purged user profile and subcollections", {
      uid: user.uid
    });
  } catch (error) {
    logger.error("Failed to purge deleted user data", {
      uid: user.uid,
      eventId: event.id,
      error
    });
    throw error;
  }
});

