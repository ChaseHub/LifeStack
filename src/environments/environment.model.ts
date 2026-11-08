export interface FirebaseClientConfig {
  readonly projectId: string;
  readonly appId: string;
  readonly storageBucket: string;
  readonly apiKey: string;
  readonly authDomain: string;
  readonly messagingSenderId: string;
  readonly measurementId?: string;
}

export interface AppEnvironment {
  readonly production: boolean;
  /**
   * Optional flag to route Auth, Firestore, and Cloud Functions to local Firebase Emulators.
   * Marked optional so CI-injected production `environment.ts` files compile cleanly with or without it.
   */
  readonly useEmulators?: boolean;
  readonly firebase: FirebaseClientConfig;
}

