// This file is intended for SERVER-SIDE use only.
// It initializes the Firebase Admin SDK to be used in server-side
// functions (e.g., Next.js API routes, server actions).
// It is crucial that this file is not imported into any client-side components.

import "server-only";

import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage, Storage } from 'firebase-admin/storage';
import { getAuth, Auth } from 'firebase-admin/auth';
import { firebaseAdminConfig } from "./config";

let app: App;

const serviceAccount = {
    projectId: firebaseAdminConfig.projectId,
    clientEmail: firebaseAdminConfig.clientEmail,
    privateKey: firebaseAdminConfig.privateKey,
}

if (!getApps().length) {
    if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
        throw new Error("Firebase Admin SDK configuration is missing. Please check your .env file.");
    }
    app = initializeApp({
        credential: cert(serviceAccount),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    });
} else {
    app = getApp();
}

const adminAuth: Auth = getAuth(app);
const adminDb: Firestore = getFirestore(app);
const adminStorage: Storage = getStorage(app);

export { adminAuth, adminDb, adminStorage };
