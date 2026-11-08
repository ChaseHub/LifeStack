import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, Functions, connectFunctionsEmulator } from 'firebase/functions';
import { environment } from '../../../environments/environment';
import { AppEnvironment } from '../../../environments/environment.model';

export const FIREBASE_FUNCTIONS_REGION = 'us-central1';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  readonly app: FirebaseApp;
  readonly auth: Auth;
  readonly db: Firestore;
  readonly functions: Functions;

  constructor() {
    const env: AppEnvironment = environment;

    this.app = initializeApp(env.firebase);
    this.auth = getAuth(this.app);
    this.db = getFirestore(this.app);
    this.functions = getFunctions(this.app, FIREBASE_FUNCTIONS_REGION);

    const shouldUseEmulators =
      Boolean(env.useEmulators) ||
      (typeof window !== 'undefined' &&
        window.location.hostname === 'localhost' &&
        new URLSearchParams(window.location.search).get('useEmulators') === 'true');

    if (shouldUseEmulators) {
      console.warn(
        '⚡ [FirebaseService] Connecting to local Firebase Emulators (Auth:9099, Firestore:8080, Functions:5001)'
      );
      connectAuthEmulator(this.auth, 'http://localhost:9099', { disableWarnings: true });
      connectFirestoreEmulator(this.db, 'localhost', 8080);
      connectFunctionsEmulator(this.functions, 'localhost', 5001);
    }
  }
}
