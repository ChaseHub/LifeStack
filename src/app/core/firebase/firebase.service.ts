import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, Functions, connectFunctionsEmulator } from 'firebase/functions';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  readonly app: FirebaseApp;
  readonly auth: Auth;
  readonly db: Firestore;
  readonly functions: Functions;

  constructor() {
    this.app = initializeApp(environment.firebase);
    this.auth = getAuth(this.app);
    this.db = getFirestore(this.app);
    this.functions = getFunctions(this.app);

    const shouldUseEmulators = 
      ('useEmulators' in environment && (environment as { useEmulators: boolean }).useEmulators) ||
      (typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.search.includes('useEmulators=true'));

    if (shouldUseEmulators) {
      console.warn('⚡ [FirebaseService] Connecting to local Firebase Emulators (Auth:9099, Firestore:8080, Functions:5001)');
      connectAuthEmulator(this.auth, 'http://localhost:9099', { disableWarnings: true });
      connectFirestoreEmulator(this.db, 'localhost', 8080);
      connectFunctionsEmulator(this.functions, 'localhost', 5001);
    }
  }
}
