import { Injectable, inject, signal, Signal, DestroyRef } from '@angular/core';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  QueryConstraint,
  CollectionReference,
  DocumentReference,
  serverTimestamp,
  DocumentData
} from 'firebase/firestore';
import { FirebaseService } from '../../core/firebase/firebase.service';
import { AuthService } from '../../core/auth/auth.service';

export interface BaseEntity {
  id: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class FirestoreBaseService {
  private readonly firebase = inject(FirebaseService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef, { optional: true });

  /**
   * Retrieves the current user's UID or throws a clean error if unauthenticated.
   */
  get currentUserId(): string {
    const user = this.auth.currentUser();
    if (!user) {
      throw new Error('Firestore operation rejected: User is not authenticated.');
    }
    return user.uid;
  }

  /**
   * User-partitioned collection reference: `users/{uid}/{subcollection}`
   */
  getUserCollectionRef<T = DocumentData>(subcollection: string): CollectionReference<T> {
    return collection(this.firebase.db, 'users', this.currentUserId, subcollection) as CollectionReference<T>;
  }

  /**
   * User-partitioned document reference: `users/{uid}/{subcollection}/{docId}`
   */
  getUserDocRef<T = DocumentData>(subcollection: string, docId: string): DocumentReference<T> {
    return doc(this.firebase.db, 'users', this.currentUserId, subcollection, docId) as DocumentReference<T>;
  }

  /**
   * Root-level collection reference: `{collectionName}`
   */
  getRootCollectionRef<T = DocumentData>(collectionName: string): CollectionReference<T> {
    return collection(this.firebase.db, collectionName) as CollectionReference<T>;
  }

  /**
   * Creates a new document with an auto-generated ID inside the user's subcollection.
   */
  async create<T extends object>(subcollection: string, data: T): Promise<string> {
    const colRef = this.getUserCollectionRef(subcollection);
    const payload = {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    const docRef = await addDoc(colRef, payload);
    return docRef.id;
  }

  /**
   * Sets or updates a specific document by ID with automatic timestamp tracking.
   */
  async set<T extends object>(
    subcollection: string,
    docId: string,
    data: T,
    merge = true
  ): Promise<void> {
    const docRef = this.getUserDocRef(subcollection, docId);
    const payload = {
      ...data,
      updatedAt: serverTimestamp()
    };
    await setDoc(docRef, payload, { merge });
  }

  /**
   * Updates fields of an existing document.
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
   * Deletes a document from the user's subcollection.
   */
  async delete(subcollection: string, docId: string): Promise<void> {
    const docRef = this.getUserDocRef(subcollection, docId);
    await deleteDoc(docRef);
  }

  /**
   * One-time fetch of a single document by ID.
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
   * One-time fetch of multiple documents with optional query constraints (where, orderBy, limit).
   */
  async getAll<T extends BaseEntity>(
    subcollection: string,
    ...queryConstraints: QueryConstraint[]
  ): Promise<T[]> {
    const colRef = this.getUserCollectionRef(subcollection);
    const q = queryConstraints.length > 0 ? query(colRef, ...queryConstraints) : colRef;
    const snapshot = await getDocs(q);

    return snapshot.docs.map(
      (d) =>
        ({
          id: d.id,
          ...d.data()
        }) as T
    );
  }

  /**
   * Real-time reactive Signal stream of a user collection.
   * Automatically unregisters Firestore listener when the calling component is destroyed.
   */
  collectionSignal<T extends BaseEntity>(
    subcollection: string,
    ...queryConstraints: QueryConstraint[]
  ): Signal<T[]> {
    const colRef = this.getUserCollectionRef(subcollection);
    const q = queryConstraints.length > 0 ? query(colRef, ...queryConstraints) : colRef;
    const resultSignal = signal<T[]>([]);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map(
          (d) =>
            ({
              id: d.id,
              ...d.data()
            }) as T
        );
        resultSignal.set(items);
      },
      (error) => {
        console.error(`[FirestoreBaseService] Error listening to ${subcollection}:`, error);
      }
    );

    if (this.destroyRef) {
      this.destroyRef.onDestroy(() => {
        unsubscribe();
      });
    }

    return resultSignal.asReadonly();
  }

  /**
   * Real-time reactive Signal stream of a single document.
   */
  docSignal<T extends BaseEntity>(subcollection: string, docId: string): Signal<T | null> {
    const docRef = this.getUserDocRef(subcollection, docId);
    const resultSignal = signal<T | null>(null);

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
        console.error(`[FirestoreBaseService] Error listening to ${subcollection}/${docId}:`, error);
      }
    );

    if (this.destroyRef) {
      this.destroyRef.onDestroy(() => {
        unsubscribe();
      });
    }

    return resultSignal.asReadonly();
  }
}
