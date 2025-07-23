
// This file is intended for SERVER-SIDE use only.
// It initializes the Firebase Admin SDK to be used in server-side
// functions (e.g., Next.js API routes, server actions).

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { firebaseConfig } from "./config";

let app: FirebaseApp;

// Check if the app is already initialized to prevent re-initialization on hot reloads
if (!getApps().length) {
    if (!firebaseConfig.apiKey) {
        // This error will be visible in the server logs if the config is missing.
        throw new Error("Firebase API key is missing. Please check your .env.local file.");
    }
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

export { app, auth, db, storage };
