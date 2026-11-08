import { Firestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/https";
import * as logger from "firebase-functions/logger";
import { AuthData } from "firebase-functions/tasks";
import { getDb } from "../config/firebase.js";
import {
  ensureUserProfile,
  toUserProfileDto,
  UserProfileDto
} from "../services/user-profile.service.js";
import { ApiResponse } from "../types/api-response.js";
import { successResponse } from "../utils/response.js";

export async function resolveCallerProfile(
  db: Firestore,
  auth: AuthData | undefined
): Promise<ApiResponse<UserProfileDto>> {
  if (!auth?.uid) {
    throw new HttpsError(
      "unauthenticated",
      "User must be authenticated to call this function."
    );
  }

  try {
    const profile = await ensureUserProfile(db, {
      uid: auth.uid,
      email: auth.token.email ?? null,
      displayName: auth.token.name ?? null,
      photoURL: auth.token.picture ?? null
    });

    return successResponse(toUserProfileDto(profile));
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    logger.error("Failed to resolve caller profile in getMyProfile", {
      uid: auth.uid,
      error
    });
    throw new HttpsError("internal", "Unable to retrieve user profile.");
  }
}

/**
 * 2nd Gen Callable Function: Verifies caller authentication and returns
 * the caller's Firestore profile DTO (initializing it atomically if not yet created).
 */
export const getMyProfile = onCall(async (request) => {
  return resolveCallerProfile(getDb(), request.auth);
});
