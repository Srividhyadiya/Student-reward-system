// Minimal Firebase client setup (modular SDK v9+)
// This reads config from Vite environment variables. Create a file named
// `.env` or `.env.local` at the project root with values like:
//
// VITE_FIREBASE_API_KEY=...
// VITE_FIREBASE_AUTH_DOMAIN=...
// VITE_FIREBASE_PROJECT_ID=...
// VITE_FIREBASE_STORAGE_BUCKET=...
// VITE_FIREBASE_MESSAGING_SENDER_ID=...
// VITE_FIREBASE_APP_ID=...
//
// Then restart the dev server (Vite) so the env vars are picked up.

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID",
};

if (!firebaseConfig.apiKey || firebaseConfig.projectId.includes("YOUR_PROJECT_ID")) {
  // Friendly runtime warning so you can spot a missing config quickly in the console
  // The Firestore errors you saw (400 / failed Listen) typically come from an
  // invalid projectId (the placeholder YOUR_PROJECT_ID) or network issues.
  // Replace the placeholders above or create a `.env` with the VITE_FIREBASE_* values.
  // Example: VITE_FIREBASE_PROJECT_ID=my-real-project-id
  // Do NOT commit real API keys to public repos; use env files and gitignore.
  // See https://firebase.google.com/docs/web/setup for how to get these values.
  // We still initialize (so dev UI loads) but Firestore calls will fail until config is set.
  // Log helpful debugging info below:
  // eslint-disable-next-line no-console
  console.error(
    "Firebase config looks incomplete. Fill in VITE_FIREBASE_* env vars in a .env file or replace values in src/firebase.js"
  );
}

const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);

