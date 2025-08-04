
"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { collection, query, where, onSnapshot, orderBy, Timestamp } from "firebase/firestore";
import type { Document as DocumentType } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Folder, Inbox, AlertTriangle, FileText } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Link from "next/link";
import { Badge } from "../ui/badge";
import { format } from "date-fns";

interface Folder {
  name: string;
  path: string;
  count: number;
  children: Record<string, Folder>;
  documents: DocumentType[];
}

export function SmartMailbox() {
  const { user, isFirebaseEnabled, db } = useAuth();
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
  }, [user, isFirebaseEnabled, db]);
  
  const folderTree = useMemo(() => {
    const root: Folder = { name: "Root", path: "", count: 0, children: {}, documents: [] };

    documents.forEach(doc => {
      // Reconstruct folder path from tags for grouping.
      // Assumes tags are ordered hierarchically.
      const path = doc.tags.join(' / ') || "Uncategorized";
      const pathParts = path.split(' / ');
      let currentNode = root;

      pathParts.forEach((part, index) => {
        if (!currentNode.children[part]) {
          currentNode.children[part] = {
            name: part,
            path: pathParts.slice(0, index + 1).join(' / '),
            count: 0,
            children: {},
            documents: []
          };
        }
        currentNode = currentNode.children[part];
      });
      
      currentNode.documents.push(doc);
    });

    // Recursively count documents
    const countDocs = (node: Folder): number => {
        let count = node.documents.length;
        Object.values(node.children).forEach(child => {
            count += countDocs(child);
        });
        node.count = count;
        return count;
    };
    countDocs(root);
    
    return root.children;
  }, [documents]);


  const renderFolders = (folders: Record<string, Folder>) => {
    return (
        <Accordion type="multiple" className="w-full">
            {Object.values(folders).map(folder => (
                <AccordionItem value={folder.path} key={folder.path}>
                    <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-4">
                            <Folder className="h-6 w-6 text-primary" />
                            <span className="text-lg font-medium">{folder.name}</span>
                             <Badge variant="secondary">{folder.count}</Badge>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-6">
                        {Object.keys(folder.children).length > 0 && renderFolders(folder.children)}
                        {folder.documents.length > 0 && (
                            <ul className="space-y-2 pt-2">
                                {folder.documents.map(doc => (
                                    <li key={doc.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                                      <Link href={doc.downloadUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
                                         <FileText className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                                         <span className="group-hover:underline">{doc.filename}</span>
                                      </Link>
                                      <span className="text-sm text-muted-foreground">{doc.createdAt ? format(doc.createdAt as Date, "MMM d, yyyy") : '...'}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    );
  };

  if (!isFirebaseEnabled) {
    return (
        <div>
            <h2 className="text-2xl font-bold font-headline mb-4 flex items-center gap-2"><Folder /> Your Smart Mailbox</h2>
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
            <h2 className="text-2xl font-bold font-headline mb-4 flex items-center gap-2"><Folder /> Your Smart Mailbox</h2>
             <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        </div>
      )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold font-headline mb-4 flex items-center gap-2"><Folder /> Your Smart Mailbox</h2>
      <Card>
        <CardContent className="p-4">
          {documents.length > 0 ? (
            renderFolders(folderTree)
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
