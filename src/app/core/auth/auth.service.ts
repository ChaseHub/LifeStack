import { Injectable, DestroyRef, inject, signal, computed } from '@angular/core';
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User
} from 'firebase/auth';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { FirebaseService } from '../firebase/firebase.service';
import { AuthUser } from './user.model';

function normalizeNullableString(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function mapFirebaseUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: normalizeNullableString(user.email),
    displayName: normalizeNullableString(user.displayName),
    photoURL: normalizeNullableString(user.photoURL)
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly firebase = inject(FirebaseService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _currentUser = signal<AuthUser | null>(null);
  private readonly _isInitialized = signal<boolean>(false);
  private readonly _isLoading = signal<boolean>(false);

  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this._currentUser() !== null);
  readonly isInitialized = this._isInitialized.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();

  private readonly authReadyPromise: Promise<void>;

  constructor() {
    this.authReadyPromise = new Promise<void>((resolve) => {
      const unsubscribe = onAuthStateChanged(this.firebase.auth, (user: User | null) => {
        this._currentUser.set(user ? mapFirebaseUser(user) : null);
        this._isInitialized.set(true);
        resolve();
      });

      this.destroyRef.onDestroy(() => unsubscribe());
    });
  }

  /**
   * Resolves when the initial Firebase Auth session state is restored from browser storage.
   * Prevents router guards from redirecting prematurely on page refresh.
   */
  async waitForAuthReady(): Promise<void> {
    await this.authReadyPromise;
  }

  async loginWithGoogle(): Promise<void> {
    this._isLoading.set(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const credential = await signInWithPopup(this.firebase.auth, provider);
      const authUser = mapFirebaseUser(credential.user);
      this._currentUser.set(authUser);
      await this.syncUserProfileOnSignIn(authUser);
    } finally {
      this._isLoading.set(false);
    }
  }

  async logout(): Promise<void> {
    this._isLoading.set(true);
    try {
      await signOut(this.firebase.auth);
    } finally {
      this._isLoading.set(false);
    }
  }

  async getIdToken(): Promise<string | null> {
    const rawUser = this.firebase.auth.currentUser;
    return rawUser ? rawUser.getIdToken() : null;
  }

  /**
   * Synchronizes OAuth profile metadata (`email`, `displayName`, `photoURL`) into `users/{uid}`
   * only during explicit sign-in, skipping Firestore writes completely if unchanged.
   * Initial account creation is also backed by the 2nd Gen `authUserCreated` Cloud Function.
   */
  private async syncUserProfileOnSignIn(user: AuthUser): Promise<void> {
    try {
      const userRef = doc(this.firebase.db, 'users', user.uid);
      await runTransaction(this.firebase.db, async (tx) => {
        const snapshot = await tx.get(userRef);

        if (!snapshot.exists()) {
          tx.set(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          return;
        }

        const existing = snapshot.data();
        const isUnchanged =
          existing['email'] === user.email &&
          existing['displayName'] === user.displayName &&
          existing['photoURL'] === user.photoURL &&
          Boolean(existing['createdAt']);

        if (isUnchanged) {
          return;
        }

        tx.update(userRef, {
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          updatedAt: serverTimestamp()
        });
      });
    } catch (err) {
      console.warn('[AuthService] Non-fatal error syncing user profile on sign-in:', err);
    }
  }
}
