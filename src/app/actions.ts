
"use server";

import { generateSmartFilename } from "@/ai/flows/generate-filename";
import { summarizeText } from "@/ai/flows/summarize-text";
import { extractText } from "@/ai/flows/extract-text";
import { revalidatePath } from "next/cache";
// Import the initialized server-side Admin Firebase services
import { adminDb, adminStorage } from "@/lib/firebase/server";
import { detectEvent } from "@/ai/flows/detect-event";
import type { DetectEventOutput } from "@/Schema/detecteventSchema";
import type { CalendarEvent } from "@/lib/types";
import type { GenerateSmartFilenameOutput } from "@/ai/flows/generate-filename";

interface AnalyzeDocumentParams {
  dataUris: string[];
  fileType: "image" | "pdf" | "word";
}

// Overload signatures
export async function analyzeDocumentAction(
  params: AnalyzeDocumentParams & { detectEvents: true }
): Promise<{ success: true; data: GenerateSmartFilenameOutput & { finalDataUri: string, events: CalendarEvent[] } } | { success: false, error: string }>;

export async function analyzeDocumentAction(
  params: AnalyzeDocumentParams & { detectEvents: false }
): Promise<{ success: true; data: GenerateSmartFilenameOutput & { finalDataUri: string } } | { success: false, error: string }>;

// Combined implementation
export async function analyzeDocumentAction(
  params: AnalyzeDocumentParams & { detectEvents: boolean }
): Promise<any> {
  try {
    const { dataUris, fileType, detectEvents } = params;
    let analysisResult;
    let finalDataUri: string;
    let textContent: string | undefined;

    // The first image is always used for analysis and saving.
    finalDataUri = dataUris[0];

    if (fileType === 'image') {
      analysisResult = await generateSmartFilename({ photoDataUri: finalDataUri });
    } else { // PDF or Word
      textContent = await extractText({ dataUri: finalDataUri });
      analysisResult = await summarizeText({ textContent });
    }

    if (detectEvents) {
      let eventResult: DetectEventOutput = { events: [] };
      if (fileType === 'image') {
        eventResult = await detectEvent({ photoDataUri: finalDataUri, summary: analysisResult.summary });
      } else {
        eventResult = await detectEvent({ textContent: textContent!, summary: analysisResult.summary });
      }
      
      const validEvents = eventResult.events.filter(e => e.title && e.startDate && e.title.toLowerCase() !== 'no event found' && e.startDate.toLowerCase() !== 'no start date found');
      
      return {
        success: true,
        data: {
          ...analysisResult,
          finalDataUri,
          events: validEvents,
        },
      };
    }

    return {
      success: true,
      data: {
        ...analysisResult,
        finalDataUri,
      },
    };

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
  events: CalendarEvent[];
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

        const docRef = await adminDb.collection("documents").add({
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
            // Save the event data to firestore. If there are events, `found` will be true.
            event: {
              events: input.events,
              found: input.events && input.events.length > 0
            },
            createdAt: new Date(), // Use server-side timestamp
        });

        revalidatePath("/dashboard");
        revalidatePath("/dashboard/calendar");
        return { success: true, documentId: docRef.id };
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
