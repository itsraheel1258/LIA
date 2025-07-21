
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { firebaseConfig } from "./config";

// This file is intended for server-side use only.
// It initializes the Firebase app and services, ensuring that environment
// variables are correctly loaded in the server environment.

let app: FirebaseApp;

// Check if the app is already initialized to prevent re-initialization
if (!getApps().length) {
    if (!firebaseConfig.apiKey) {
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
