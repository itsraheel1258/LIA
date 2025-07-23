
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase/client";
import { collection, query, where, onSnapshot, orderBy, Timestamp } from "firebase/firestore";
import type { Document as DocumentType } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, Inbox, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { Skeleton } from "../ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

export function SmartMailbox() {
  const { user, isFirebaseEnabled } = useAuth();
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isFirebaseEnabled || !db) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const q = query(
        collection(db, "documents"), 
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const docs: DocumentType[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        docs.push({
          id: doc.id,
          ...data,
          // Convert Firestore Timestamp to Date for client-side use
          createdAt: (data.createdAt as Timestamp)?.toDate() 
        } as DocumentType);
      });
      setDocuments(docs);
      setLoading(false);
    }, (error) => {
        console.error("Error fetching documents: ", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isFirebaseEnabled]);

  if (!isFirebaseEnabled) {
    return (
        <div>
            <h2 className="text-2xl font-bold font-headline mb-4 flex items-center gap-2"><FolderOpen /> Your Smart Mailbox</h2>
             <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Firebase Not Configured</AlertTitle>
                <AlertDescription>
                    Cannot load documents. Please configure your Firebase API keys to view your mailbox.
                </AlertDescription>
            </Alert>
        </div>
    )
  }

  if (loading) {
      return (
        <div>
            <h2 className="text-2xl font-bold font-headline mb-4 flex items-center gap-2"><FolderOpen /> Your Smart Mailbox</h2>
            <Card>
                <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Filename</TableHead>
                            <TableHead className="hidden sm:table-cell">Tags</TableHead>
                            <TableHead className="text-right">Date Added</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[...Array(3)].map((_, i) => (
                             <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-32" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>
        </div>
      )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold font-headline mb-4 flex items-center gap-2"><FolderOpen /> Your Smart Mailbox</h2>
      <Card>
        <CardContent className="p-0">
          {documents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filename</TableHead>
                  <TableHead className="hidden sm:table-cell">Tags</TableHead>
                  <TableHead className="text-right">Date Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">
                        <Link href={doc.downloadUrl} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary">
                            {doc.filename}
                        </Link>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {doc.tags.map(tag => <Badge key={tag} variant="outline">{tag}</Badge>)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                        {doc.createdAt ? format(doc.createdAt as Date, "MMM d, yyyy") : '...'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center p-12">
                <Inbox className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-lg font-medium font-headline">Your mailbox is empty</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    Scan your first document to see it appear here.
                </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
