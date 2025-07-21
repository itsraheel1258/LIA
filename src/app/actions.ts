
"use server";

import { generateSmartFilename } from "@/ai/flows/generate-filename";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadString } from "firebase/storage";
import { revalidatePath } from "next/cache";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { firebaseConfig } from "@/lib/firebase/config";

// Helper function to initialize Firebase on the server
function initializeServerApp() {
    if (getApps().length === 0) {
        if (!firebaseConfig.apiKey) {
            throw new Error("Firebase API key is missing from .env.local. Server-side operations will fail.");
        }
        return initializeApp(firebaseConfig);
    } else {
        return getApp();
    }
}


export async function analyzeDocumentAction(dataUri: string) {
  try {
    const result = await generateSmartFilename({ photoDataUri: dataUri });
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Error analyzing document:", error);
    // Pass the specific error message back to the client
    return { success: false, error: error.message || "Failed to analyze document." };
  }
}

interface SaveDocumentInput {
  imageDataUri: string;
  filename: string;
  tags: string[];
  summary: string;
  metadata: {
    sender?: string;
    date?: string;
    category?: string;
  };
}

export async function saveDocumentAction(input: SaveDocumentInput) {
    const app = initializeServerApp();
    const db = getFirestore(app);
    const storage = getStorage(app);

    // For prototyping, we use a static user ID to bypass authentication rules.
    const userId = 'prototyping-user';

    try {
        const storagePath = `documents/${userId}/${Date.now()}-${input.filename}`;
        const storageRef = ref(storage, storagePath);
        
        // Upload image to Firebase Storage
        const uploadResult = await uploadString(storageRef, input.imageDataUri, 'data_url');
        const downloadUrl = await getDownloadURL(uploadResult.ref);

        // Save metadata to Firestore
        await addDoc(collection(db, "documents"), {
            userId: userId,
            filename: input.filename,
            tags: input.tags,
            storagePath,
            downloadUrl,
            metadata: {
                ...input.metadata,
                summary: input.summary,
            },
            createdAt: serverTimestamp(),
        });

        revalidatePath("/dashboard");
        return { success: true };
    } catch (error: any) {
        console.error("Error saving document:", error);
        if (error.code === 'storage/unknown' || error.code === 'storage/object-not-found') {
             return { success: false, error: "Save failed. Have you enabled Cloud Storage in your Firebase project console? Go to the 'Storage' tab and click 'Get Started'." };
        }
        return { success: false, error: error.message || "Failed to save document." };
    }
}
