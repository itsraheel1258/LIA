
"use server";

import { generateSmartFilename } from "@/ai/flows/generate-filename";
import { summarizeText } from "@/ai/flows/summarize-text";
import { extractText } from "@/ai/flows/extract-text";
import { revalidatePath } from "next/cache";
import { adminDb, adminStorage } from "@/lib/firebase/server";
import { detectEvent } from "@/ai/flows/detect-event";
import type { CalendarEvent } from "@/lib/types";
import type { GenerateSmartFilenameOutput } from "@/ai/flows/generate-filename";

interface AnalyzeDocumentParams {
  dataUris: string[];
  fileType: "image" | "pdf" | "word";
}

type AnalysisResult = GenerateSmartFilenameOutput & {
  finalDataUri: string;
  events: CalendarEvent[];
};

export async function analyzeDocumentAction(
  params: AnalyzeDocumentParams & { detectEvents: boolean }
): Promise<{ success: true; data: AnalysisResult } | { success: false; error: string }> {
  try {
    const { dataUris, fileType, detectEvents } = params;
    let analysisResult: GenerateSmartFilenameOutput;
    let finalDataUri: string;
    let textContent: string | undefined;

    finalDataUri = dataUris[0];
    if (fileType === 'image') {
      analysisResult = await generateSmartFilename({ photoDataUri: finalDataUri });
    } else { 
      textContent = await extractText({ dataUri: finalDataUri });
      analysisResult = await summarizeText({ textContent });
    }
    
    let validEvents: CalendarEvent[] = [];
    if (detectEvents) {
      let eventResult: { events: any[] } = { events: [] };
      if (fileType === 'image') {
        eventResult = await detectEvent({ photoDataUri: finalDataUri, summary: analysisResult.summary });
      } else {
        eventResult = await detectEvent({ textContent: textContent!, summary: analysisResult.summary });
      }
      const filteredEvents = eventResult.events.filter((e: any) => e.title && e.startDate && e.title.toLowerCase() !== 'no event found' && e.startDate.toLowerCase() !== 'no start date found');
      validEvents = filteredEvents.map((e: any) => ({ ...e, description: e.description || analysisResult.summary }));
    }

    return {
      success: true,
      data: {
        ...analysisResult,
        finalDataUri,
        events: validEvents,
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
        const base64Data = input.imageDataUri.split(',')[1];
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const file = bucket.file(storagePath);

        const contentType = input.imageDataUri.split(',')[0].split(':')[1].split(';')[0];

        await file.save(imageBuffer, {
            metadata: {
                contentType: contentType,
            },
        });

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
            event: {
              events: input.events,
              found: input.events && input.events.length > 0
            },
            createdAt: new Date(), 
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
        await adminStorage.bucket().file(storagePath).delete();
        await docRef.delete();

        revalidatePath("/dashboard");
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting document:", error);
        return { success: false, error: "Failed to delete document." };
    }
}

export async function createCalendarEventAction(input: {
    userId: string;
    title: string;
    startDate: string;
    endDate?: string;
    description?: string;
    location?: string;
}) {
    if (!input.userId) {
        return { success: false, error: "Authentication error: User ID is missing." };
    }

    try {
        const eventRef = await adminDb.collection("calendarEvents").add({
            userId: input.userId,
            title: input.title,
            startDate: input.startDate,
            endDate: input.endDate || null,
            description: input.description || null,
            location: input.location || null,
            createdAt: new Date(),
            type: "manual" 
        });

        revalidatePath("/dashboard/calendar");
        return { success: true, eventId: eventRef.id };
    } catch (error: any) {
        console.error("Error creating calendar event:", error);
        return { success: false, error: error.message || "Failed to create calendar event." };
    }
}

export async function deleteCalendarEventAction(input: {
    userId: string;
    eventId: string;
}) {
    if (!input.userId) {
        return { success: false, error: "Authentication error: User ID is missing." };
    }

    try {
        const eventRef = adminDb.collection("calendarEvents").doc(input.eventId);
        const eventDoc = await eventRef.get();

        if (!eventDoc.exists) {
            return { success: false, error: "Event not found." };
        }
        
        if (eventDoc.data()?.userId !== input.userId) {
            return { success: false, error: "You do not have permission to delete this event." };
        }
        await eventRef.delete();

        revalidatePath("/dashboard/calendar");
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting calendar event:", error);
        return { success: false, error: error.message || "Failed to delete calendar event." };
    }
}
