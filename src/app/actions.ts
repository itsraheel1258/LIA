
"use server";

import { generateSmartFilename } from "@/ai/flows/generate-filename";
import { summarizeText } from "@/ai/flows/summarize-text";
import { cropDocument } from "@/ai/flows/crop-document";
import { extractText } from "@/ai/flows/extract-text";
import { revalidatePath } from "next/cache";
// Import the initialized server-side Admin Firebase services
import { adminDb, adminStorage } from "@/lib/firebase/server";
import { detectEvent, type DetectEventOutput } from "@/ai/flows/detect-event";

interface AnalyzeDocumentParams {
  dataUris: string[];
  fileType: "image" | "pdf";
  detectEvents: boolean;
}

export async function analyzeDocumentAction({ dataUris, fileType, detectEvents }: AnalyzeDocumentParams) {
  try {
    let analysisResult;
    let finalDataUri: string;
    let textContent: string | undefined;
    let eventResult: DetectEventOutput = { found: false };

    // Step 1: Crop images or extract text from PDF
    if (fileType === 'image') {
      finalDataUri = await cropDocument({ photoDataUris: dataUris });
    } else {
      finalDataUri = dataUris[0]; // For PDFs, the original URI is used.
      textContent = await extractText({ dataUri: finalDataUri });
    }

    // Step 2: Run filename/summary analysis and event detection in parallel
    const analysisPromises = [];

    if (fileType === 'image') {
      analysisPromises.push(generateSmartFilename({ photoDataUri: finalDataUri }));
    } else {
      analysisPromises.push(summarizeText({ textContent: textContent! }));
    }

    if (detectEvents) {
      const eventInput = fileType === 'image' 
        ? { photoDataUri: finalDataUri } 
        : { textContent: textContent! };
      analysisPromises.push(detectEvent(eventInput));
    }

    const results = await Promise.all(analysisPromises);
    
    analysisResult = results[0];
    if (detectEvents) {
      eventResult = results[1] as DetectEventOutput;
    }

    return { success: true, data: { ...analysisResult, croppedDataUri: finalDataUri, event: eventResult } };
  } catch (error: any) {
    console.error("Error analyzing document:", error);
    return { success: false, error: error.message || "Failed to analyze document." };
  }
}

interface SaveDocumentInput {
  userId: string;
  imageDataUri: string;
  filename: string;
  folderPath: string;
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
            folderPath: input.folderPath,
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


interface DeleteDocumentInput {
    documentId: string;
    storagePath: string;
    userId: string;
}

export async function deleteDocumentAction({ documentId, storagePath, userId }: DeleteDocumentInput) {
    if (!userId) {
        return { success: false, error: "Authentication error: User ID is missing." };
    }
    
    try {
        const docRef = adminDb.collection("documents").doc(documentId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return { success: false, error: "Document not found." };
        }
        
        if (doc.data()?.userId !== userId) {
            return { success: false, error: "You do not have permission to delete this document." };
        }

        // Delete the file from Cloud Storage
        await adminStorage.bucket().file(storagePath).delete();

        // Delete the document from Firestore
        await docRef.delete();

        revalidatePath("/dashboard");
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting document:", error);
        return { success: false, error: "Failed to delete document." };
    }
}
