
"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { collection, query, where, onSnapshot, orderBy, Timestamp } from "firebase/firestore";
import type { Document as DocumentType } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Folder, Inbox, AlertTriangle, FileText, ChevronRight, Trash2, Home, Download, Loader2, ArrowLeft, Search } from "lucide-react";
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
import { Separator } from "../ui/separator";
import { UpcomingEvents } from "./upcoming-events";


interface TreeNode {
  name: string;
  path: string;
  children: Record<string, TreeNode>;
  documents: DocumentType[];
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
  const [isMobileView, setIsMobileView] = useState(false);

  const searchTerm = searchParams.get('search') || '';

  useEffect(() => {
    const checkMobile = () => setIsMobileView(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
        const createdAt = data.createdAt as Timestamp;
        docs.push({
          id: doc.id,
          ...data,
          createdAt: createdAt ? createdAt.toDate() : new Date()
        } as DocumentType);
      });
      setDocuments(docs);
      setLoading(false);

      const docIdFromUrl = searchParams.get('doc');
      if (docIdFromUrl && !searchTerm) {
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
  }, [user, isFirebaseEnabled, db, searchParams, searchTerm]);
  
  const filteredDocuments = useMemo(() => {
    if (!searchTerm) return documents;
    
    const lowercasedTerm = searchTerm.toLowerCase();
    return documents.filter(doc => {
      const summary = doc.metadata?.summary || '';
      const folderPath = doc.folderPath || '';
      return (
        doc.filename.toLowerCase().includes(lowercasedTerm) ||
        folderPath.toLowerCase().includes(lowercasedTerm) ||
        summary.toLowerCase().includes(lowercasedTerm) ||
        doc.tags.some(tag => tag.toLowerCase().includes(lowercasedTerm))
      );
    });
  }, [documents, searchTerm]);


  const folderTree = useMemo(() => {
    const root: TreeNode = { name: "Root", path: "", children: {}, documents: [] };

    const docsToProcess = filteredDocuments;

    docsToProcess.forEach(doc => {
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
    
    return root;
  }, [filteredDocuments]);

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
             const docs = node.documents.sort((a,b) => {
                const dateA = a.createdAt instanceof Date ? a.createdAt : a.createdAt.toDate();
                const dateB = b.createdAt instanceof Date ? b.createdAt : b.createdAt.toDate();
                return dateB.getTime() - dateA.getTime()
             });
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
    <div className="flex items-center justify-between p-2 border-b">
        <nav className="flex items-center text-sm text-muted-foreground">
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
        {isMobileView && selectedDocument && (
          <Button variant="ghost" size="sm" onClick={() => setSelectedDocument(null)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        )}
    </div>
  );

  const fileBrowserView = (
    <div className="flex flex-row overflow-x-auto h-full">
      {/* Desktop: Show all columns */}
      <div className="hidden md:flex flex-row h-full">
        {columns.map((columnItems, colIndex) => (
            <div key={colIndex} className="flex-shrink-0 w-64 border-r border-border last:border-r-0">
                <ul className="p-1 space-y-0.5 h-full overflow-y-auto">
                    {columnItems.map((item) => {
                        const isSelectedNode = isNode(item) && selectedPath[colIndex] === item.name;
                        const isSelectedDoc = !isNode(item) && selectedDocument?.id === item.id;
                        return (
                          <li key={isNode(item) ? item.path : item.id} className="rounded-md text-sm hover:bg-muted/50">
                            <button
                                onClick={() => isNode(item) ? handleSelectPath(item.path) : handleSelectDocument(item)}
                                className={cn(
                                    "w-full text-left flex items-center justify-between p-2",
                                    (isSelectedNode || isSelectedDoc) ? "bg-primary/10 text-primary font-semibold" : ""
                                )}
                            >
                                <div className="flex items-center gap-2 truncate">
                                    {isNode(item) ? <Folder className="h-5 w-5 flex-shrink-0" /> : <FileText className="h-5 w-5 flex-shrink-0" />}
                                    <span className="truncate">{item.name || (item as DocumentType).filename}</span>
                                </div>
                                {isNode(item) && <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0"/>}
                            </button>
                        </li>
                        )
                    })}
                </ul>
            </div>
        ))}
      </div>
       {/* Mobile: Show only the last column */}
      <div className="block md:hidden w-full h-full">
         {columns.length > 0 && (
            <div className="flex-shrink-0 w-full border-b md:border-b-0 md:border-r border-border last:border-r-0">
                <ul className="p-1 space-y-0.5 h-full overflow-y-auto">
                    {columns[columns.length - 1].map((item) => {
                         const isSelectedNode = isNode(item) && selectedPath[columns.length-1] === item.name;
                         const isSelectedDoc = !isNode(item) && selectedDocument?.id === item.id;
                        return (
                          <li key={isNode(item) ? item.path : item.id} className="rounded-md text-sm hover:bg-muted/50">
                            <button
                                onClick={() => isNode(item) ? handleSelectPath(item.path) : handleSelectDocument(item)}
                                className={cn(
                                    "w-full text-left flex items-center justify-between p-2",
                                     (isSelectedNode || isSelectedDoc) ? "bg-primary/10 text-primary font-semibold" : ""
                                )}
                            >
                                <div className="flex items-center gap-2 truncate">
                                    {isNode(item) ? <Folder className="h-5 w-5 flex-shrink-0" /> : <FileText className="h-5 w-5 flex-shrink-0" />}
                                    <span className="truncate">{item.name || (item as DocumentType).filename}</span>
                                </div>
                                {isNode(item) && <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0"/>}
                            </button>
                        </li>
                        )
                    })}
                </ul>
            </div>
         )}
      </div>
    </div>
  );
  
  const documentPreviewView = selectedDocument && (
     <div className="flex-grow md:border-l overflow-y-auto">
        <DocumentPreview 
            document={selectedDocument} 
            onDownload={handleDownload}
            onDelete={setDocToDelete}
            isDownloading={downloadingDocId === selectedDocument.id}
        />
    </div>
  );


  return (
    <div>
      <h2 className="text-2xl font-bold font-headline mb-4 flex items-center gap-2">
        {searchTerm ? <><Search className="h-5 w-5" /> Search Results for "{searchTerm}"</> : <><Folder /> Your Smart Mailbox</> }
      </h2>
      
      {documents.length > 0 ? (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2">
                     <Card className="min-h-[600px] bg-card text-card-foreground flex flex-col">
                        <Breadcrumbs />
                        <CardContent className="p-0 h-full overflow-hidden flex-grow">
                        {filteredDocuments.length === 0 && searchTerm ? (
                            <div className="flex flex-col items-center justify-center h-full text-center p-12">
                                <Search className="mx-auto h-12 w-12 text-muted-foreground" />
                                <h3 className="mt-2 text-lg font-medium font-headline">No results for "{searchTerm}"</h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Try searching for something else.
                                </p>
                            </div>
                        ) : (
                            <div className="md:flex md:flex-row h-full w-full">
                                {isMobileView ? (
                                    selectedDocument ? documentPreviewView : fileBrowserView
                                ) : (
                                    <>
                                        {fileBrowserView}
                                        {documentPreviewView}
                                    </>
                                )}
                            </div>
                        )}
                        </CardContent>
                    </Card>
                </div>
                 <div className="lg:col-span-1 space-y-8 sticky top-20">
                    <UpcomingEvents />
                </div>
            </div>
            
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

  