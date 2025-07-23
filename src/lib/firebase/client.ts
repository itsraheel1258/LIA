// This file is intended for CLIENT-SIDE use only.
// It initializes Firebase for the browser environment.

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { firebaseConfig } from "./config";

let app: FirebaseApp;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

// This check ensures Firebase is initialized only on the client side.
if (typeof window !== "undefined") {
    if (firebaseConfig.apiKey) {
        app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        auth = getAuth(app);
        db = getFirestore(app);
        storage = getStorage(app);
    } else {
        console.error("Firebase API key is missing. Please add it to your .env.local file. The app will not function correctly without it.");
    }
}

// We export the initialized services. They will be null on the server.
// Components using these should ensure they only run on the client.
export { app, auth, db, storage };
