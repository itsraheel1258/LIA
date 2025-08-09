
"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { collection, query, where, onSnapshot, orderBy, Timestamp } from "firebase/firestore";
import type { Document as DocumentType } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Folder, Inbox, AlertTriangle, FileText, ChevronRight, Trash2, Home, Download, Loader2, Clock } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "../ui/alert-dialog";
import { deleteDocumentAction } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { DocumentPreview } from "./document-preview";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { Separator } from "../ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


interface TreeNode {
  name: string;
  path: string;
  children: Record<string, TreeNode>;
  documents: DocumentType[];
}

function RecentUploads({ documents, onSelect, selectedId }: { documents: DocumentType[], onSelect: (doc: DocumentType) => void, selectedId?: string | null }) {
    if (documents.length === 0) return null;

    return (
        <div className="mt-8">
            <h3 className="mb-4 text-xl font-bold font-headline flex items-center gap-2"><Clock className="h-5 w-5" /> Recent Uploads</h3>
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Path</TableHead>
                            <TableHead className="text-right">Created</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {documents.map(doc => (
                            <TableRow 
                                key={doc.id} 
                                onClick={() => onSelect(doc)}
                                className={cn(
                                    "cursor-pointer",
                                    selectedId === doc.id && "bg-muted/50"
                                )}
                            >
                                <TableCell className="font-medium flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    {doc.filename}
                                </TableCell>
                                <TableCell className="text-muted-foreground">{doc.folderPath}</TableCell>
                                <TableCell className="text-right text-muted-foreground text-xs">
                                    {doc.createdAt ? formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true }) : ''}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    )
}

function SmartMailboxComponent() {
  const { user, isFirebaseEnabled, db } = useAuth();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPath, setSelectedPath] = useState<string[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<DocumentType | null>(null);
  const [docToDelete, setDocToDelete] = useState<DocumentType | null>(null);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

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
          createdAt: (data.createdAt as Timestamp)?.toDate() 
        } as DocumentType);
      });
      setDocuments(docs);
      setLoading(false);

      // Check for docId from URL after documents have loaded
      const docIdFromUrl = searchParams.get('doc');
      if (docIdFromUrl) {
        const foundDoc = docs.find(d => d.id === docIdFromUrl);
        if (foundDoc) {
          setSelectedDocument(foundDoc);
          if (foundDoc.folderPath) {
            setSelectedPath(foundDoc.folderPath.split('/'));
          } else {
            setSelectedPath(['Uncategorized']);
          }
        }
      }

    }, (error) => {
        console.error("Error fetching documents: ", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isFirebaseEnabled, db, searchParams]);
  
  const { folderTree, recentUploads } = useMemo(() => {
    const root: TreeNode = { name: "Root", path: "", children: {}, documents: [] };

    const sortedDocs = [...documents].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    documents.forEach(doc => {
      const path = doc.folderPath || "Uncategorized";
      const pathParts = path.split('/').map(p => p.trim());
      let currentNode = root;

      pathParts.forEach((part, index) => {
        if (!currentNode.children[part]) {
          currentNode.children[part] = {
            name: part,
            path: pathParts.slice(0, index + 1).join('/'),
            children: {},
            documents: []
          };
        }
        currentNode = currentNode.children[part];
      });
      
      currentNode.documents.push(doc);
    });
    
    return { folderTree: root, recentUploads: sortedDocs.slice(0, 10) };
  }, [documents]);

  const handleSelectPath = (path: string) => {
    setSelectedPath(path ? path.split('/') : []);
    setSelectedDocument(null);
  };
  
  const handleSelectDocument = (doc: DocumentType) => {
    setSelectedDocument(prev => (prev && prev.id === doc.id ? null : doc));
  };

  const handleBreadcrumbClick = (index: number) => {
    setSelectedDocument(null);
    if (index === -1) {
      setSelectedPath([]);
    } else {
      setSelectedPath(selectedPath.slice(0, index + 1));
    }
  }
  
  const getNodeFromPath = useCallback((path: string[], tree: TreeNode): TreeNode | null => {
    if (path.length === 0) return tree;
    let currentNode = tree;
    for (const part of path) {
      if (currentNode.children[part]) {
        currentNode = currentNode.children[part];
      } else {
        return null;
      }
    }
    return currentNode;
  }, []);

  const handleDeleteConfirm = async () => {
    if (!docToDelete || !user) return;
    
    if(selectedDocument && selectedDocument.id === docToDelete.id) {
        setSelectedDocument(null);
    }

    const result = await deleteDocumentAction({
        documentId: docToDelete.id,
        storagePath: docToDelete.storagePath,
        userId: user.uid
    });

    if (result.success) {
        toast({ title: "Document deleted successfully." });
    } else {
        toast({ variant: "destructive", title: "Deletion Failed", description: result.error });
    }
    setDocToDelete(null);
  };
  
  const handleDownload = async (doc: DocumentType) => {
    setDownloadingDocId(doc.id);
    try {
        const response = await fetch(doc.downloadUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.statusText}`);
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Download failed", error);
        toast({
            variant: "destructive",
            title: "Download Failed",
            description: "Could not download the file. Please try again.",
        });
    } finally {
        setDownloadingDocId(null);
    }
  }


  const columns = useMemo(() => {
    const cols: (TreeNode | DocumentType)[][] = [];
    let currentNode = folderTree;
    
    cols.push(Object.values(currentNode.children).sort((a,b) => a.name.localeCompare(b.name)));

    for (let i = 0; i < selectedPath.length; i++) {
        const node = getNodeFromPath(selectedPath.slice(0, i + 1), folderTree);
        if (node) {
             const children = Object.values(node.children).sort((a,b) => a.name.localeCompare(b.name));
             const docs = node.documents.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
             if (children.length > 0 || docs.length > 0) {
                 cols.push([...children, ...docs]);
             }
        }
    }
    return cols;
  }, [selectedPath, folderTree, getNodeFromPath]);

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
             <Card className="h-[600px]">
                <CardContent className="p-0 h-full">
                    <div className="flex h-full">
                        <div className="w-full md:w-1/3 border-r p-2 space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
                        <div className="hidden md:block w-1/3 border-r p-2"><Skeleton className="h-8 w-full" /></div>
                        <div className="hidden md:block w-1/3 p-2"></div>
                    </div>
                </CardContent>
             </Card>
        </div>
      )
  }
  
  const isNode = (item: any): item is TreeNode => 'children' in item;

  const Breadcrumbs = () => (
    <nav className="flex items-center text-sm text-muted-foreground p-2 border-b">
        <button onClick={() => handleBreadcrumbClick(-1)} className="flex items-center gap-1 hover:text-primary">
            <Home className="h-4 w-4" />
        </button>
        {selectedPath.map((part, index) => (
            <div key={index} className="flex items-center">
                <ChevronRight className="h-4 w-4 mx-1" />
                <button onClick={() => handleBreadcrumbClick(index)} className="hover:text-primary truncate max-w-[150px]">
                    {part}
                </button>
            </div>
        ))}
    </nav>
  );

  return (
    <div>
      <h2 className="text-2xl font-bold font-headline mb-4 flex items-center gap-2"><Folder /> Your Smart Mailbox</h2>
      
      {documents.length > 0 ? (
        <>
            <Card className="min-h-[600px] bg-card text-card-foreground flex flex-col">
                <Breadcrumbs />
                <CardContent className="p-0 h-full overflow-hidden flex-grow">
                    <div className="flex flex-col md:flex-row h-full w-full">
                        <div className="flex flex-row overflow-x-auto h-full">
                            {columns.map((columnItems, colIndex) => (
                                <div key={colIndex} className="flex-shrink-0 w-full md:w-64 border-b md:border-b-0 md:border-r border-border last:border-r-0">
                                    <ul className="p-1 space-y-0.5 h-full overflow-y-auto">
                                        {columnItems.map((item, itemIndex) => {
                                            if (isNode(item)) {
                                                const isSelected = selectedPath[colIndex] === item.name;
                                                return (
                                                    <li key={item.path} className="rounded-md text-sm hover:bg-muted/50">
                                                        <button
                                                            onClick={() => handleSelectPath(item.path)}
                                                            className={cn(
                                                                "w-full text-left flex items-center justify-between p-2",
                                                                isSelected ? "bg-primary/10 text-primary font-semibold" : ""
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-2 truncate">
                                                                <Folder className="h-5 w-5 flex-shrink-0" />
                                                                <span className="truncate">{item.name}</span>
                                                            </div>
                                                            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0"/>
                                                        </button>
                                                    </li>
                                                )
                                            } else {
                                                const isSelected = selectedDocument?.id === item.id;
                                                return (
                                                    <li key={item.id} className="rounded-md text-sm hover:bg-muted/50">
                                                        <button 
                                                          onClick={() => handleSelectDocument(item)}
                                                          className={cn(
                                                            "flex items-center w-full p-2 text-left",
                                                            isSelected ? "bg-primary/10 text-primary font-semibold" : ""
                                                          )}
                                                        >
                                                            <FileText className="h-5 w-5 flex-shrink-0" />
                                                            <span className="truncate ml-2 flex-grow">{item.filename}</span>
                                                        </button>
                                                    </li>
                                                )
                                            }
                                        })}
                                    </ul>
                                </div>
                            ))}
                        </div>
                         {selectedDocument && (
                            <div className="flex-grow border-l overflow-y-auto">
                                <DocumentPreview 
                                    document={selectedDocument} 
                                    onDownload={handleDownload}
                                    onDelete={setDocToDelete}
                                    isDownloading={downloadingDocId === selectedDocument.id}
                                />
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Separator className="my-8" />

            <RecentUploads documents={recentUploads} onSelect={handleSelectDocument} selectedId={selectedDocument?.id} />
        </>
      ) : (
        <Card className="min-h-[600px] flex flex-col items-center justify-center text-center p-12">
            <Inbox className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-lg font-medium font-headline">Your mailbox is empty</h3>
            <p className="mt-1 text-sm text-muted-foreground">
                Scan your first document to see it appear here.
            </p>
            <Button asChild className="mt-4">
                <Link href="/dashboard">Add New Document</Link>
            </Button>
        </Card>
      )}

      <AlertDialog open={!!docToDelete} onOpenChange={(open) => !open && setDocToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete the document "{docToDelete?.filename}" and remove it from storage. This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


export function SmartMailbox() {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <SmartMailboxComponent />
    </React.Suspense>
  )
}
