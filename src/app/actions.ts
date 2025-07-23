
"use server";

import { generateSmartFilename } from "@/ai/flows/generate-filename";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadString } from "firebase/storage";
import { revalidatePath } from "next/cache";
// Import the initialized server-side Firebase services
import { db, storage } from "@/lib/firebase/server";

export async function analyzeDocumentAction(dataUri: string) {
  try {
    const result = await generateSmartFilename({ photoDataUri: dataUri });
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Error analyzing document:", error);
    return { success: false, error: error.message || "Failed to analyze document." };
  }
}

interface SaveDocumentInput {
  userId: string;
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
    if (!input.userId) {
        return { success: false, error: "Authentication error: User ID is missing." };
    }

    try {
        const storagePath = `documents/${input.userId}/${Date.now()}-${input.filename}`;
        const storageRef = ref(storage, storagePath);
        
        const uploadResult = await uploadString(storageRef, input.imageDataUri, 'data_url');
        const downloadUrl = await getDownloadURL(uploadResult.ref);

        await addDoc(collection(db, "documents"), {
            userId: input.userId,
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
        if (error.code === 'storage/unauthorized') {
            return { success: false, error: "Save failed. You don't have permission to upload to this location. Please check your Firebase Storage security rules." };
        }
        if (error.code === 'storage/unknown' || error.code === 'storage/object-not-found') {
             return { success: false, error: "Save failed. Have you enabled Cloud Storage in your Firebase project console? Go to the 'Storage' tab and click 'Get Started'." };
        }
        return { success: false, error: error.message || "Failed to save document." };
    }
}
