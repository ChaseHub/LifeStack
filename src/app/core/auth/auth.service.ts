import { Injectable, inject, signal, computed } from '@angular/core';
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

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly firebase = inject(FirebaseService);

  readonly currentUser = signal<AuthUser | null>(null);
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly isInitialized = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);

  private readonly authReadyPromise: Promise<void>;

  constructor() {
    this.authReadyPromise = new Promise<void>((resolve) => {
      onAuthStateChanged(this.firebase.auth, (user: User | null) => {
        if (user) {
          const authUser: AuthUser = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
          };
          this.currentUser.set(authUser);
          void this.syncUserProfile(authUser);
        } else {
          this.currentUser.set(null);
        }
        this.isInitialized.set(true);
        resolve();
      });
    });
  }

  /**
   * Atomically synchronizes the authenticated user's profile in `users/{uid}`,
   * setting `createdAt` on initial creation while preserving it on subsequent sign-ins.
   */
  private async syncUserProfile(user: AuthUser): Promise<void> {
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
        tx.set(
          userRef,
          {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            ...(existing['createdAt'] ? {} : { createdAt: serverTimestamp() }),
            updatedAt: serverTimestamp()
          },
          { merge: true }
        );
      });
    } catch (err) {
      console.warn('Failed to sync user profile to Firestore:', err);
    }
  }

  /**
   * Resolves when the initial Firebase Auth state is restored from storage.
   * Prevents router guards from redirecting prematurely.
   */
  async waitForAuthReady(): Promise<void> {
    await this.authReadyPromise;
  }

  async loginWithGoogle(): Promise<void> {
    this.isLoading.set(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(this.firebase.auth, provider);
    } finally {
      this.isLoading.set(false);
    }
  }

  async logout(): Promise<void> {
    this.isLoading.set(true);
    try {
      await signOut(this.firebase.auth);
    } finally {
      this.isLoading.set(false);
    }
  }

  async getIdToken(): Promise<string | null> {
    const rawUser = this.firebase.auth.currentUser;
    return rawUser ? rawUser.getIdToken() : null;
  }
}
