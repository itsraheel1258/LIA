// This file is intended for CLIENT-SIDE use only.
// It initializes Firebase for the browser environment.

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { firebaseConfig } from "./config";

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;

function initializeFirebase() {
    if (firebaseConfig.apiKey && typeof window !== 'undefined') {
        if (!getApps().length) {
            try {
                app = initializeApp(firebaseConfig);
                auth = getAuth(app);
                db = getFirestore(app);
                storage = getStorage(app);
            } catch (e) {
                console.error("Failed to initialize Firebase", e)
            }
        } else {
            app = getApp();
            auth = getAuth(app);
            db = getFirestore(app);
            storage = getStorage(app);
        }
    } else {
        console.warn("Firebase API key is missing or not in a client environment. Firebase will not be initialized.");
    }
}

// Initialize on script load
initializeFirebase();

// We export a getter function to ensure that consumers of these services
// always get the initialized instances.
export function getFirebase() {
    // This check is in case initialization failed.
    if (!app) {
        // You might want to throw an error or handle this case differently.
        console.error("Firebase has not been initialized.");
        return { app: null, auth: null, db: null, storage: null, isFirebaseEnabled: false };
    }
    return { app, auth, db, storage, isFirebaseEnabled: !!app };
}
