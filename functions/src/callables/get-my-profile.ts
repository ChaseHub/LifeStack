import { Firestore } from "firebase-admin/firestore";
import { AuthData } from "firebase-functions/tasks";
import { HttpsError, onCall } from "firebase-functions/https";
import { getDb } from "../config/firebase.js";
import { ensureUserProfile, UserProfileDocument } from "../services/user-profile.service.js";
import { ApiResponse } from "../types/api-response.js";
import { successResponse } from "../utils/response.js";

export async function resolveCallerProfile(
  db: Firestore,
  auth: AuthData | undefined
): Promise<ApiResponse<UserProfileDocument>> {
  if (!auth?.uid) {
    throw new HttpsError(
      "unauthenticated",
      "User must be authenticated to call this function."
    );
  }

  const profile = await ensureUserProfile(db, {
    uid: auth.uid,
    email: auth.token.email ?? null,
    displayName: auth.token.name ?? null,
    photoURL: auth.token.picture ?? null
  });

  return successResponse(profile);
}

/**
 * 2nd Gen Callable Function: Verifies caller authentication and returns
 * the caller's Firestore profile (initializing it atomically if not yet created).
 */
export const getMyProfile = onCall(async (request) => {
  return resolveCallerProfile(getDb(), request.auth);
});

