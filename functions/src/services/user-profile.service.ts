import { FieldValue, Firestore, Timestamp } from "firebase-admin/firestore";

export interface UserProfileSeed {
  readonly uid: string;
  readonly email?: string | null;
  readonly displayName?: string | null;
  readonly photoURL?: string | null;
}

export interface UserProfileDocument {
  readonly uid: string;
  readonly email: string | null;
  readonly displayName: string | null;
  readonly photoURL: string | null;
  readonly createdAt?: Timestamp | FieldValue;
  readonly updatedAt?: Timestamp | FieldValue;
}

export function normalizeNullableString(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Idempotently initializes or updates a user profile document in `users/{uid}`.
 * Uses a Firestore transaction so `createdAt` is never overwritten across
 * Eventarc retries (at-least-once delivery) or concurrent client sign-in syncs,
 * and skips unnecessary writes when profile attributes are already up to date.
 */
export async function ensureUserProfile(
  db: Firestore,
  seed: UserProfileSeed
): Promise<UserProfileDocument> {
  const normalizedEmail = normalizeNullableString(seed.email);
  const normalizedDisplayName = normalizeNullableString(seed.displayName);
  const normalizedPhotoURL = normalizeNullableString(seed.photoURL);

  const userRef = db.collection("users").doc(seed.uid);

  await db.runTransaction(async (tx) => {
    const existingSnap = await tx.get(userRef);

    if (!existingSnap.exists) {
      tx.set(userRef, {
        uid: seed.uid,
        email: normalizedEmail,
        displayName: normalizedDisplayName,
        photoURL: normalizedPhotoURL,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
      return;
    }

    const existingData = existingSnap.data() ?? {};
    const existingEmail = normalizeNullableString(existingData["email"] as string | null | undefined);
    const existingDisplayName = normalizeNullableString(
      existingData["displayName"] as string | null | undefined
    );
    const existingPhotoURL = normalizeNullableString(
      existingData["photoURL"] as string | null | undefined
    );

    const nextEmail = normalizedEmail ?? existingEmail;
    const nextDisplayName = normalizedDisplayName ?? existingDisplayName;
    const nextPhotoURL = normalizedPhotoURL ?? existingPhotoURL;
    const hasCreatedAt = Boolean(existingData["createdAt"]);

    if (
      hasCreatedAt &&
      existingData["uid"] === seed.uid &&
      existingEmail === nextEmail &&
      existingDisplayName === nextDisplayName &&
      existingPhotoURL === nextPhotoURL
    ) {
      return;
    }

    const patch: Record<string, unknown> = {
      uid: seed.uid,
      email: nextEmail,
      displayName: nextDisplayName,
      photoURL: nextPhotoURL,
      updatedAt: FieldValue.serverTimestamp()
    };

    if (!hasCreatedAt) {
      patch["createdAt"] = FieldValue.serverTimestamp();
    }

    tx.set(userRef, patch, { merge: true });
  });

  const savedSnap = await userRef.get();
  return (
    (savedSnap.data() as UserProfileDocument | undefined) ?? {
      uid: seed.uid,
      email: normalizedEmail,
      displayName: normalizedDisplayName,
      photoURL: normalizedPhotoURL
    }
  );
}

/**
 * Recursively deletes a user's profile document and all nested subcollections (`users/{uid}/**`).
 */
export async function purgeUserData(db: Firestore, uid: string): Promise<void> {
  const userRef = db.collection("users").doc(uid);
  await db.recursiveDelete(userRef);
}

