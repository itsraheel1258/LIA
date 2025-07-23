import type { Timestamp } from "firebase-admin/firestore";

export interface Document {
  id: string;
  userId: string;
  filename: string;
  tags: string[];
  storagePath: string;
  downloadUrl:string;
  metadata: {
    sender?: string;
    date?: string;
    category?: string;
    summary?: string;
  };
  createdAt: Timestamp | Date;
}
