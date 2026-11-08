import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deleteApp, getApps, initializeApp } from "firebase-admin/app";
import { Timestamp, type Firestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/https";
import type { AuthData } from "firebase-functions/tasks";
import { resolveCallerProfile } from "../callables/get-my-profile.js";
import { getAdminApp } from "../config/firebase.js";
import { handleApiHealth, MinimalHttpResponse } from "../http/api-health.js";
import {
  ensureUserProfile,
  normalizeNullableString,
  purgeUserData,
  toUserProfileDto
} from "../services/user-profile.service.js";
import { errorResponse, successResponse } from "../utils/response.js";

interface MockFirestoreState {
  docs: Map<string, Record<string, unknown>>;
  setCalls: number;
  recursiveDeletes: string[];
}

function createMockFirestore(initialDocs: Record<string, Record<string, unknown>> = {}): {
  db: Firestore;
  state: MockFirestoreState;
} {
  const state: MockFirestoreState = {
    docs: new Map(Object.entries(initialDocs)),
    setCalls: 0,
    recursiveDeletes: []
  };

  const makeDocRef = (path: string) => ({
    path,
    async get() {
      const data = state.docs.get(path);
      return {
        exists: data !== undefined,
        data: () => (data ? { ...data } : undefined)
      };
    }
  });

  const db = {
    collection(collectionName: string) {
      return {
        doc(docId: string) {
          return makeDocRef(`${collectionName}/${docId}`);
        }
      };
    },
    async runTransaction<T>(
      callback: (tx: {
        get: (ref: { path: string }) => Promise<{
          exists: boolean;
          data: () => Record<string, unknown> | undefined;
        }>;
        set: (
          ref: { path: string },
          data: Record<string, unknown>,
          options?: { merge?: boolean }
        ) => void;
      }) => Promise<T>
    ): Promise<T> {
      const tx = {
        async get(ref: { path: string }) {
          const existing = state.docs.get(ref.path);
          return {
            exists: existing !== undefined,
            data: () => (existing ? { ...existing } : undefined)
          };
        },
        set(
          ref: { path: string },
          data: Record<string, unknown>,
          options?: { merge?: boolean }
        ) {
          state.setCalls += 1;
          if (options?.merge) {
            const prev = state.docs.get(ref.path) ?? {};
            state.docs.set(ref.path, { ...prev, ...data });
          } else {
            state.docs.set(ref.path, { ...data });
          }
        }
      };
      return callback(tx);
    },
    async recursiveDelete(ref: { path: string }): Promise<void> {
      state.recursiveDeletes.push(ref.path);
      state.docs.delete(ref.path);
    }
  } as unknown as Firestore;

  return { db, state };
}

function createMockResponse(): {
  res: MinimalHttpResponse;
  statusCode: () => number;
  headers: Map<string, string>;
  jsonBody: () => unknown;
  ended: () => boolean;
} {
  let code = 200;
  let body: unknown = undefined;
  let isEnded = false;
  const headers = new Map<string, string>();

  const res: MinimalHttpResponse = {
    set(field: string, value: string) {
      headers.set(field, value);
      return res;
    },
    status(nextCode: number) {
      code = nextCode;
      return res;
    },
    json(payload: unknown) {
      body = payload;
      return res;
    },
    end() {
      isEnded = true;
      return res;
    }
  };

  return {
    res,
    statusCode: () => code,
    headers,
    jsonBody: () => body,
    ended: () => isEnded
  };
}

describe("Firebase Admin initialization", () => {
  it("initializes the [DEFAULT] Admin app even when firebase-functions has already registered a named app", async () => {
    for (const existing of getApps()) {
      await deleteApp(existing);
    }

    const internalSdkApp = initializeApp(
      { projectId: "lifestack-test" },
      "__FIREBASE_FUNCTIONS_SDK__"
    );
    assert.equal(getApps().length, 1);

    const defaultApp = getAdminApp();
    assert.equal(defaultApp.name, "[DEFAULT]");
    assert.equal(getAdminApp(), defaultApp);

    await deleteApp(internalSdkApp);
    await deleteApp(defaultApp);
  });
});

describe("Cloud Functions response utilities", () => {
  it("wraps successful payloads in an ApiResponse envelope", () => {
    const res = successResponse({ status: "ok" });
    assert.equal(res.success, true);
    assert.deepEqual(res.data, { status: "ok" });
    assert.equal(typeof res.timestamp, "string");
  });

  it("wraps error payloads in an ApiResponse envelope", () => {
    const res = errorResponse("INVALID_INPUT", "Invalid field", { field: "email" });
    assert.equal(res.success, false);
    assert.equal(res.error?.code, "INVALID_INPUT");
    assert.equal(res.error?.message, "Invalid field");
    assert.deepEqual(res.error?.details, { field: "email" });
  });
});

describe("apiHealth HTTP handler", () => {
  it("returns 200 healthy ApiResponse with Cache-Control: no-store on GET", () => {
    const mock = createMockResponse();
    handleApiHealth({ method: "GET" }, mock.res);

    assert.equal(mock.statusCode(), 200);
    assert.equal(mock.headers.get("Cache-Control"), "no-store");
    const body = mock.jsonBody() as { success: boolean; data: { status: string } };
    assert.equal(body.success, true);
    assert.equal(body.data.status, "healthy");
  });

  it("returns 200 empty body on HEAD", () => {
    const mock = createMockResponse();
    handleApiHealth({ method: "HEAD" }, mock.res);

    assert.equal(mock.statusCode(), 200);
    assert.equal(mock.ended(), true);
    assert.equal(mock.jsonBody(), undefined);
  });

  it("rejects unsupported HTTP methods with 405 METHOD_NOT_ALLOWED", () => {
    const mock = createMockResponse();
    handleApiHealth({ method: "POST" }, mock.res);

    assert.equal(mock.statusCode(), 405);
    assert.equal(mock.headers.get("Allow"), "GET, HEAD");
    const body = mock.jsonBody() as { success: boolean; error?: { code: string } };
    assert.equal(body.success, false);
    assert.equal(body.error?.code, "METHOD_NOT_ALLOWED");
  });
});

describe("user-profile service & getMyProfile callable", () => {
  it("normalizes empty or whitespace-only strings to null", () => {
    assert.equal(normalizeNullableString(""), null);
    assert.equal(normalizeNullableString("   "), null);
    assert.equal(normalizeNullableString(null), null);
    assert.equal(normalizeNullableString(" chase@example.com "), "chase@example.com");
  });

  it("serializes Firestore Timestamp fields into clean ISO-8601 strings in toUserProfileDto", () => {
    const ts = Timestamp.fromMillis(1700000000000);
    const dto = toUserProfileDto({
      uid: "user_123",
      email: "chase@example.com",
      displayName: "Chase",
      photoURL: null,
      createdAt: ts,
      updatedAt: ts
    });

    assert.equal(dto.createdAt, "2023-11-14T22:13:20.000Z");
    assert.equal(dto.updatedAt, "2023-11-14T22:13:20.000Z");
  });

  it("creates a new user profile document on initial sign-up", async () => {
    const { db, state } = createMockFirestore();
    const profile = await ensureUserProfile(db, {
      uid: "user_123",
      email: "chase@example.com",
      displayName: "Chase",
      photoURL: "https://example.com/avatar.png"
    });

    assert.equal(state.setCalls, 1);
    assert.equal(profile.uid, "user_123");
    assert.equal(profile.email, "chase@example.com");
    assert.ok(state.docs.get("users/user_123")?.["createdAt"]);
  });

  it("preserves createdAt and skips writes when profile fields are already up to date", async () => {
    const originalCreatedAt = Timestamp.fromMillis(1700000000000);
    const { db, state } = createMockFirestore({
      "users/user_123": {
        uid: "user_123",
        email: "chase@example.com",
        displayName: "Chase",
        photoURL: "https://example.com/avatar.png",
        createdAt: originalCreatedAt,
        updatedAt: originalCreatedAt
      }
    });

    await ensureUserProfile(db, {
      uid: "user_123",
      email: "chase@example.com",
      displayName: "Chase",
      photoURL: "https://example.com/avatar.png"
    });

    assert.equal(state.setCalls, 0);
    assert.deepEqual(state.docs.get("users/user_123")?.["createdAt"], originalCreatedAt);

    await ensureUserProfile(db, {
      uid: "user_123",
      email: "chase@example.com",
      displayName: "Chase Updated",
      photoURL: "https://example.com/avatar.png"
    });

    assert.equal(state.setCalls, 1);
    assert.deepEqual(state.docs.get("users/user_123")?.["createdAt"], originalCreatedAt);
    assert.equal(state.docs.get("users/user_123")?.["displayName"], "Chase Updated");
  });

  it("recursively deletes user data on account deletion", async () => {
    const { db, state } = createMockFirestore({
      "users/user_999": { uid: "user_999" }
    });

    await purgeUserData(db, "user_999");

    assert.deepEqual(state.recursiveDeletes, ["users/user_999"]);
    assert.equal(state.docs.has("users/user_999"), false);
  });

  it("throws HttpsError('unauthenticated') when getMyProfile is called without auth", async () => {
    const { db } = createMockFirestore();
    await assert.rejects(
      () => resolveCallerProfile(db, undefined),
      (err: unknown) => err instanceof HttpsError && err.code === "unauthenticated"
    );
  });

  it("returns wrapped profile DTO when getMyProfile is called by an authenticated user", async () => {
    const ts = Timestamp.fromMillis(1700000000000);
    const { db } = createMockFirestore({
      "users/uid_abc": {
        uid: "uid_abc",
        email: "member@lifestack.app",
        displayName: "Member",
        photoURL: "https://example.com/pic.jpg",
        createdAt: ts,
        updatedAt: ts
      }
    });
    const mockAuth = {
      uid: "uid_abc",
      token: {
        email: "member@lifestack.app",
        name: "Member",
        picture: "https://example.com/pic.jpg"
      }
    } as unknown as AuthData;

    const response = await resolveCallerProfile(db, mockAuth);
    assert.equal(response.success, true);
    assert.equal(response.data?.uid, "uid_abc");
    assert.equal(response.data?.email, "member@lifestack.app");
    assert.equal(response.data?.createdAt, "2023-11-14T22:13:20.000Z");
  });
});
