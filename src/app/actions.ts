
"use server";

import { generateSmartFilename } from "@/ai/flows/generate-filename";
import { summarizeText } from "@/ai/flows/summarize-text";
import { cropDocument } from "@/ai/flows/crop-document";
import { extractText } from "@/ai/flows/extract-text";
import { revalidatePath } from "next/cache";
// Import the initialized server-side Admin Firebase services
import { adminDb, adminStorage } from "@/lib/firebase/server";

export async function analyzeDocumentAction(dataUri: string, fileType: "image" | "pdf") {
  try {
    let analysisResult;
    let croppedDataUri = dataUri;

    if (fileType === 'image') {
      croppedDataUri = await cropDocument({ photoDataUri: dataUri });
      analysisResult = await generateSmartFilename({ photoDataUri: croppedDataUri });
    } else {
      // For PDFs, extract text and then generate the filename from the text.
      const textContent = await extractText({ dataUri });
      analysisResult = await summarizeText({ textContent });
    }

    return { success: true, data: { ...analysisResult, croppedDataUri } };
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
        const bucket = adminStorage.bucket();
        const storagePath = `documents/${input.userId}/${Date.now()}-${input.filename}`;
        
        // Remove the data URI prefix for upload
        const base64Data = input.imageDataUri.split(',')[1];
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const file = bucket.file(storagePath);

        const contentType = input.imageDataUri.split(',')[0].split(':')[1].split(';')[0];

        await file.save(imageBuffer, {
            metadata: {
                contentType: contentType,
            },
        });
        
        // Make the file public to get a download URL
        await file.makePublic();
        const downloadUrl = file.publicUrl();

        await adminDb.collection("documents").add({
            userId: input.userId,
            filename: input.filename,
            tags: input.tags,
            storagePath,
            downloadUrl,
            metadata: {
                ...input.metadata,
                summary: input.summary,
            },
            createdAt: new Date(), // Use server-side timestamp
        });

        revalidatePath("/dashboard");
        return { success: true, downloadUrl };
    } catch (error: any) {
        console.error("Error saving document:", error);
        if (error.code === 'storage/unauthorized' || error.code === 7) {
            return { success: false, error: "Save failed. You don't have permission to upload to this location. Please check your Firebase Storage security rules and Admin SDK setup." };
        }
        if (error.code === 'storage/unknown' || error.code === 'storage/object-not-found') {
             return { success: false, error: "Save failed. Have you enabled Cloud Storage in your Firebase project console? Go to the 'Storage' tab and click 'Get Started'." };
        }
        return { success: false, error: error.message || "Failed to save document." };
    }
}
