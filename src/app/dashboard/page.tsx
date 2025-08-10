
"use client"

import { DocumentScanner } from "@/components/dashboard/document-scanner";
import { RecentUploads } from "@/components/dashboard/recent-uploads";
import { useAuth } from "@/hooks/use-auth";
import { Document } from "@/lib/types";
import { collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import { useEffect, useState } from "react";
import type { Timestamp } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader } from "@/components/ui/card";
import { Clock } from "lucide-react";

function RecentUploadsSkeleton() {
    return (
        <div className="mt-8">
            <Card>
                <CardHeader>
                    <h3 className="text-xl font-bold font-headline flex items-center gap-2">
                        <Clock className="h-5 w-5" /> Recent Uploads
                    </h3>
                </CardHeader>
                 <div className="p-6 pt-0 space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
            </Card>
        </div>
    )
}


export default function DashboardPage() {
  const { user, db } = useAuth();
  const [recentDocuments, setRecentDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db) {
        setLoading(false);
        return;
    }

    const q = query(
        collection(db, "documents"), 
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(5)
    );
     
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const docs: Document[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const createdAt = data.createdAt as Timestamp;
            docs.push({
            id: doc.id,
            ...data,
            createdAt: createdAt ? createdAt.toDate() : new Date()
            } as Document);
        });
        setRecentDocuments(docs);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching recent documents: ", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user, db]);


  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <DocumentScanner />
      {loading ? (
        <RecentUploadsSkeleton />
      ) : (
        <RecentUploads documents={recentDocuments} showLinkToAll={true} />
      )}
    </div>
  );
}
