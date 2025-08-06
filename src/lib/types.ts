import type { Timestamp } from "firebase-admin/firestore";
import type { DetectEventOutput } from "@/ai/flows/detect-event";

export interface Document {
  id: string;
  userId: string;
  filename: string;
  tags: string[];
  folderPath: string;
  storagePath: string;
  downloadUrl:string;
  metadata: {
    sender?: string;
    date?: string;
    category?: string;
    summary?: string;
  };
  event?: DetectEventOutput;
  createdAt: Timestamp | Date;
}
