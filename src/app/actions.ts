"use server";

import { generateSmartFilename } from "@/ai/flows/generate-filename";
import { auth, db, storage } from "@/lib/firebase/client";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadString } from "firebase/storage";
import { revalidatePath } from "next/cache";

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
  metadata: {
    sender?: string;
    date?: string;
    category?: string;
  };
}

export async function saveDocumentAction(input: SaveDocumentInput) {
    // This action requires an authenticated user.
    // In prototyping mode, we're skipping actual sign-in.
    // To make this work, we'd need to re-enable authentication.
    const user = auth?.currentUser;
    // For prototyping, let's use a mock user ID if none is present
    const userId = user?.uid || 'prototyping-user';

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
            metadata: input.metadata,
            createdAt: serverTimestamp(),
        });

        revalidatePath("/dashboard");
        return { success: true };
    } catch (error: any) {
        console.error("Error saving document:", error);
        return { success: false, error: error.message || "Failed to save document." };
    }
}
