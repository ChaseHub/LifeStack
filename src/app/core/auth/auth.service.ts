import { Injectable, inject, signal, computed } from '@angular/core';
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User
} from 'firebase/auth';
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
          this.currentUser.set({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
          });
        } else {
          this.currentUser.set(null);
        }
        this.isInitialized.set(true);
        resolve();
      });
    });
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
