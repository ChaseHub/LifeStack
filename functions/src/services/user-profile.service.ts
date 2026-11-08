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

export interface UserProfileDto {
  readonly uid: string;
  readonly email: string | null;
  readonly displayName: string | null;
  readonly photoURL: string | null;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
}

export function normalizeNullableString(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function serializeTimestamp(value: unknown): string | null {
  if (!value) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  if (
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: unknown }).toDate === "function"
  ) {
    return (value as { toDate(): Date }).toDate().toISOString();
  }
  return null;
}

export function toUserProfileDto(doc: UserProfileDocument): UserProfileDto {
  return {
    uid: doc.uid,
    email: doc.email ?? null,
    displayName: doc.displayName ?? null,
    photoURL: doc.photoURL ?? null,
    createdAt: serializeTimestamp(doc.createdAt),
    updatedAt: serializeTimestamp(doc.updatedAt)
  };
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
    const existingEmail = normalizeNullableString(
      existingData["email"] as string | null | undefined
    );
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
