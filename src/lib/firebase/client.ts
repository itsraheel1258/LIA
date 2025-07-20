import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { firebaseConfig } from "./config";

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

if (typeof window !== "undefined" && firebaseConfig.apiKey) {
    // This code will only run on the client side
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
} else if (typeof window !== "undefined") {
    console.error("Firebase API key is missing. Please add it to your .env.local file. The app will not function correctly without it.");
}

// We export the initialized services, which will be undefined on the server.
// Components using these should also ensure they run only on the client.
export { app, auth, db, storage };
