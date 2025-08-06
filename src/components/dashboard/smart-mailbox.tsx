
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { collection, query, where, onSnapshot, orderBy, Timestamp } from "firebase/firestore";
import type { Document as DocumentType } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Folder, Inbox, AlertTriangle, FileText, ChevronRight, Trash2, Home } from "lucide-react";
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


interface TreeNode {
  name: string;
  path: string;
  children: Record<string, TreeNode>;
  documents: DocumentType[];
}

export function SmartMailbox() {
  const { user, isFirebaseEnabled, db } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPath, setSelectedPath] = useState<string[]>([]);
  const [docToDelete, setDocToDelete] = useState<DocumentType | null>(null);

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
    }, (error) => {
        console.error("Error fetching documents: ", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isFirebaseEnabled, db]);
  
  const folderTree = useMemo(() => {
    const root: TreeNode = { name: "Root", path: "", children: {}, documents: [] };

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
    
    return root;
  }, [documents]);

  const handleSelect = (path: string) => {
    setSelectedPath(path ? path.split('/') : []);
  };

  const handleBreadcrumbClick = (index: number) => {
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


  const columns = useMemo(() => {
    const cols: (TreeNode | DocumentType)[][] = [];
    let currentNode = folderTree;
    
    // First column is always the root's children
    cols.push(Object.values(currentNode.children));

    // Subsequent columns based on selected path
    for (let i = 0; i < selectedPath.length; i++) {
        const node = getNodeFromPath(selectedPath.slice(0, i + 1), folderTree);
        if (node) {
             const children = Object.values(node.children);
             const docs = node.documents;
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
             <Card className="h-[400px]">
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
                <button onClick={() => handleBreadcrumbClick(index)} className="hover:text-primary truncate">
                    {part}
                </button>
            </div>
        ))}
    </nav>
  );

  return (
    <div>
      <h2 className="text-2xl font-bold font-headline mb-4 flex items-center gap-2"><Folder /> Your Smart Mailbox</h2>
      <Card className="min-h-[400px] bg-card text-card-foreground flex flex-col">
        <Breadcrumbs />
        <CardContent className="p-0 h-full overflow-hidden flex-grow">
          {documents.length > 0 ? (
            <div className="flex flex-col md:flex-row h-full w-full overflow-x-auto">
                {columns.map((columnItems, colIndex) => (
                     <div key={colIndex} className="flex-shrink-0 w-full md:w-64 border-b md:border-b-0 md:border-r border-border last:border-r-0">
                         <ul className="p-1 space-y-0.5 h-full overflow-y-auto">
                             {columnItems.map((item, itemIndex) => {
                                 const isSelected = selectedPath[colIndex] === item.name;

                                 return (
                                     <li key={itemIndex} className="flex items-center justify-between rounded-md text-sm hover:bg-muted/50">
                                        {isNode(item) ? (
                                            <button
                                                onClick={() => handleSelect(item.path)}
                                                className={cn(
                                                    "w-full text-left flex items-center justify-between p-2",
                                                    isSelected ? "bg-primary/80 text-primary-foreground rounded-md" : ""
                                                )}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Folder className="h-5 w-5" />
                                                    <span className="truncate">{item.name}</span>
                                                </div>
                                                <ChevronRight className="h-4 w-4 text-muted-foreground"/>
                                            </button>
                                        ) : (
                                            <div className="flex items-center w-full">
                                            <Link 
                                              href={item.downloadUrl} 
                                              target="_blank" 
                                              rel="noopener noreferrer" 
                                              className="flex-grow text-left flex items-center p-2"
                                            >
                                               <div className="flex items-center gap-2">
                                                    <FileText className="h-5 w-5" />
                                                    <span className="truncate">{item.filename}</span>
                                                </div>
                                            </Link>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 mr-1 flex-shrink-0" onClick={() => setDocToDelete(item)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                            </div>
                                        )}
                                     </li>
                                 );
                             })}
                         </ul>
                    </div>
                ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-12">
                <Inbox className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-lg font-medium font-headline">Your mailbox is empty</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    Scan your first document to see it appear here.
                </p>
            </div>
          )}
        </CardContent>
      </Card>

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
