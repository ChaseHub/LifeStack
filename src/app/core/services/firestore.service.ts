import {
  Injectable,
  Injector,
  Signal,
  assertInInjectionContext,
  effect,
  inject,
  signal
} from '@angular/core';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
  onSnapshot,
  query,
  QueryConstraint,
  CollectionReference,
  DocumentReference,
  serverTimestamp,
  DocumentData
} from 'firebase/firestore';
import { FirebaseService } from '../firebase/firebase.service';
import { AuthService } from '../auth/auth.service';

export interface BaseEntity {
  readonly id: string;
  readonly createdAt?: unknown;
  readonly updatedAt?: unknown;
}

export interface RealtimeCollectionOptions {
  readonly injector?: Injector;
  readonly constraints?: readonly QueryConstraint[];
}

export interface RealtimeDocOptions {
  readonly injector?: Injector;
}

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  private readonly firebase = inject(FirebaseService);
  private readonly auth = inject(AuthService);

  /**
   * Returns the authenticated user's UID or throws if unauthenticated.
   */
  requireUserId(): string {
    const user = this.auth.currentUser();
    if (!user) {
      throw new Error('Firestore operation rejected: User is not authenticated.');
    }
    return user.uid;
  }

  /**
   * User-partitioned collection reference: `users/{uid}/{subcollection}`
   */
  getUserCollectionRef<T = DocumentData>(
    subcollection: string,
    uid = this.requireUserId()
  ): CollectionReference<T> {
    return collection(this.firebase.db, 'users', uid, subcollection) as CollectionReference<T>;
  }

  /**
   * User-partitioned document reference: `users/{uid}/{subcollection}/{docId}`
   */
  getUserDocRef<T = DocumentData>(
    subcollection: string,
    docId: string,
    uid = this.requireUserId()
  ): DocumentReference<T> {
    return doc(this.firebase.db, 'users', uid, subcollection, docId) as DocumentReference<T>;
  }

  /**
   * Creates a new document with an auto-generated ID inside `users/{uid}/{subcollection}`.
   */
  async create<T extends object>(subcollection: string, data: T): Promise<string> {
    const colRef = this.getUserCollectionRef(subcollection);
    const docRef = await addDoc(colRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  }

  /**
   * Atomically creates or merges a document by ID inside `users/{uid}/{subcollection}`,
   * initializing `createdAt` on creation and preserving it on subsequent updates.
   */
  async upsert<T extends object>(subcollection: string, docId: string, data: T): Promise<void> {
    const docRef = this.getUserDocRef(subcollection, docId);
    await runTransaction(this.firebase.db, async (tx) => {
      const existing = await tx.get(docRef);
      if (!existing.exists()) {
        tx.set(docRef, {
          ...data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        return;
      }

      tx.set(
        docRef,
        {
          ...data,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    });
  }

  /**
   * Updates specific fields of an existing document in `users/{uid}/{subcollection}/{docId}`.
   */
  async update<T extends object>(
    subcollection: string,
    docId: string,
    data: Partial<T>
  ): Promise<void> {
    const docRef = this.getUserDocRef(subcollection, docId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  }

  /**
   * Deletes a document from `users/{uid}/{subcollection}/{docId}`.
   */
  async delete(subcollection: string, docId: string): Promise<void> {
    const docRef = this.getUserDocRef(subcollection, docId);
    await deleteDoc(docRef);
  }

  /**
   * One-time fetch of a single user-scoped document by ID.
   */
  async getOne<T extends BaseEntity>(subcollection: string, docId: string): Promise<T | null> {
    const docRef = this.getUserDocRef(subcollection, docId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) {
      return null;
    }
    return { id: snapshot.id, ...snapshot.data() } as T;
  }

  /**
   * One-time fetch of user-scoped documents with optional Firestore query constraints.
   */
  async getAll<T extends BaseEntity>(
    subcollection: string,
    ...queryConstraints: QueryConstraint[]
  ): Promise<T[]> {
    const colRef = this.getUserCollectionRef(subcollection);
    const q = queryConstraints.length > 0 ? query(colRef, ...queryConstraints) : colRef;
    const snapshot = await getDocs(q);

    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
  }

  /**
   * Real-time Signal stream of `users/{uid}/{subcollection}`.
   *
   * Must be invoked in an injection context (e.g., component field initializer or constructor)
   * or passed an explicit `{ injector }` so the Firestore `onSnapshot` listener automatically
   * tears down when the calling component is destroyed OR when the user signs out.
   */
  collectionSignal<T extends BaseEntity>(
    subcollection: string,
    options: RealtimeCollectionOptions = {}
  ): Signal<T[]> {
    if (!options.injector) {
      assertInInjectionContext(this.collectionSignal);
    }

    const resultSignal = signal<T[]>([]);

    effect(
      (onCleanup) => {
        const user = this.auth.currentUser();
        if (!user) {
          resultSignal.set([]);
          return;
        }

        const colRef = this.getUserCollectionRef(subcollection, user.uid);
        const constraints = options.constraints ?? [];
        const q = constraints.length > 0 ? query(colRef, ...constraints) : colRef;

        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            resultSignal.set(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as T));
          },
          (error) => {
            console.error(`[FirestoreService] Listener error on ${subcollection}:`, error);
          }
        );

        onCleanup(() => unsubscribe());
      },
      { injector: options.injector }
    );

    return resultSignal.asReadonly();
  }

  /**
   * Real-time Signal stream of a single document `users/{uid}/{subcollection}/{docId}`.
   *
   * Automatically tears down when the calling component is destroyed or when auth state changes.
   */
  docSignal<T extends BaseEntity>(
    subcollection: string,
    docId: string,
    options: RealtimeDocOptions = {}
  ): Signal<T | null> {
    if (!options.injector) {
      assertInInjectionContext(this.docSignal);
    }

    const resultSignal = signal<T | null>(null);

    effect(
      (onCleanup) => {
        const user = this.auth.currentUser();
        if (!user) {
          resultSignal.set(null);
          return;
        }

        const docRef = this.getUserDocRef(subcollection, docId, user.uid);

        const unsubscribe = onSnapshot(
          docRef,
          (snapshot) => {
            if (!snapshot.exists()) {
              resultSignal.set(null);
              return;
            }
            resultSignal.set({ id: snapshot.id, ...snapshot.data() } as T);
          },
          (error) => {
            console.error(`[FirestoreService] Listener error on ${subcollection}/${docId}:`, error);
          }
        );

        onCleanup(() => unsubscribe());
      },
      { injector: options.injector }
    );

    return resultSignal.asReadonly();
  }
}

