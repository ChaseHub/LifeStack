// Template for local development. Copy this file to environment.ts and add your keys.
export const environment = {
  production: false,
  useEmulators: false, // Set to true to route Auth, Firestore, and Functions to local emulators
  firebase: {
    projectId: "YOUR_PROJECT_ID",
    appId: "YOUR_APP_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    measurementId: "YOUR_MEASUREMENT_ID"
  }
};
