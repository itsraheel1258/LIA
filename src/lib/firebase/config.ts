// IMPORTANT: Create a .env.local file in the root of your project
// and add your Firebase project's configuration keys there.
// These are for the CLIENT-SIDE SDK.
// Example .env.local:
// NEXT_PUBLIC_FIREBASE_API_KEY="your-api-key"
// NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-auth-domain"
// NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
// NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-storage-bucket"
// NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-messaging-sender-id"
// NEXT_PUBLIC_FIREBASE_APP_ID="your-app-id"

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// IMPORTANT: Create a .env file in the root of your project
// and add your Firebase Admin SDK service account credentials.
// This is for SERVER-SIDE use only and must be kept secret.
export const firebaseAdminConfig = {
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};
