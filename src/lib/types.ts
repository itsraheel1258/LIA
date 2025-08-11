import type { Timestamp } from "firebase-admin/firestore";

// This is the new, more specific type for a single event.
export interface CalendarEvent {
  title: string;
  startDate: string;
  endDate?: string;
  description?: string;
}

// This is the shape of the 'event' field within a Document, which contains an array of events.
export interface DocumentEventData {
  found: boolean;
  events: CalendarEvent[];
}

export interface Document {
  id: string;
  userId: string;
  filename: string;
  tags: string[];
  folderPath: string;
  storagePath: string;
  downloadUrl:string;
  previewUrl?: string; // The URL for the AI-generated preview image
  metadata: {
    sender?: string;
    date?: string;
    category?: string;
    summary?: string;
  };
  event?: DocumentEventData; // This now uses the more detailed type
  createdAt: Timestamp | Date;
}
