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
  } catch (error) {
    console.error("Error analyzing document:", error);
    return { success: false, error: "Failed to analyze document." };
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
    const user = auth.currentUser;
    if (!user) {
        return { success: false, error: "User not authenticated." };
    }

    try {
        const storagePath = `documents/${user.uid}/${Date.now()}-${input.filename}`;
        const storageRef = ref(storage, storagePath);
        
        // Upload image to Firebase Storage
        const uploadResult = await uploadString(storageRef, input.imageDataUri, 'data_url');
        const downloadUrl = await getDownloadURL(uploadResult.ref);

        // Save metadata to Firestore
        await addDoc(collection(db, "documents"), {
            userId: user.uid,
            filename: input.filename,
            tags: input.tags,
            storagePath,
            downloadUrl,
            metadata: input.metadata,
            createdAt: serverTimestamp(),
        });

        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Error saving document:", error);
        return { success: false, error: "Failed to save document." };
    }
}
