import { FieldValue, Firestore, Timestamp } from "firebase-admin/firestore";

export interface UserProfileSeed {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}

export interface UserProfileDocument {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
}

/**
 * Idempotently initializes or updates a user profile document in `users/{uid}`.
 * Uses a Firestore transaction so `createdAt` is never overwritten across
 * Eventarc retries (at-least-once delivery) or concurrent client sign-in syncs.
 */
export async function ensureUserProfile(
  db: Firestore,
  seed: UserProfileSeed
): Promise<UserProfileDocument> {
  const userRef = db.collection("users").doc(seed.uid);

  await db.runTransaction(async (tx) => {
    const existingSnap = await tx.get(userRef);

    if (!existingSnap.exists) {
      tx.set(userRef, {
        uid: seed.uid,
        email: seed.email ?? null,
        displayName: seed.displayName ?? null,
        photoURL: seed.photoURL ?? null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
      return;
    }

    const existingData = existingSnap.data() ?? {};
    const patch: Record<string, unknown> = {
      uid: seed.uid,
      email: seed.email ?? (existingData["email"] as string | null | undefined) ?? null,
      displayName:
        seed.displayName ?? (existingData["displayName"] as string | null | undefined) ?? null,
      photoURL: seed.photoURL ?? (existingData["photoURL"] as string | null | undefined) ?? null,
      updatedAt: FieldValue.serverTimestamp()
    };

    if (!existingData["createdAt"]) {
      patch["createdAt"] = FieldValue.serverTimestamp();
    }

    tx.set(userRef, patch, { merge: true });
  });

  const savedSnap = await userRef.get();
  return (savedSnap.data() as UserProfileDocument | undefined) ?? {
    uid: seed.uid,
    email: seed.email ?? null,
    displayName: seed.displayName ?? null,
    photoURL: seed.photoURL ?? null
  };
}

/**
 * Recursively deletes a user's profile document and all nested subcollections (`users/{uid}/**`).
 */
export async function purgeUserData(db: Firestore, uid: string): Promise<void> {
  const userRef = db.collection("users").doc(uid);
  await db.recursiveDelete(userRef);
}

