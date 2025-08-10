
"use client";

import { Document as DocumentType } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { FileText, Clock, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { Button } from "../ui/button";
import { CardHeader, CardTitle } from "../ui/card";

interface RecentUploadsProps {
  documents: DocumentType[];
  onSelect?: (doc: DocumentType) => void;
  selectedId?: string | null;
  className?: string;
  showLinkToAll?: boolean;
  title?: string;
}

export function RecentUploads({ documents, onSelect, selectedId, className, showLinkToAll = false, title = "Recent Uploads" }: RecentUploadsProps) {
    
    const handleRowClick = (doc: DocumentType) => {
        if (onSelect) {
            onSelect(doc);
        }
    }

    if (documents.length === 0) return (
        <Card className={cn("mt-8", className)}>
            <CardHeader>
                 <h3 className="text-xl font-bold font-headline flex items-center gap-2"><Clock className="h-5 w-5" /> {title}</h3>
            </CardHeader>
            <p className="text-center text-sm text-muted-foreground py-8">
                No recent uploads found.
            </p>
        </Card>
    );

    return (
        <div className={cn("mt-8", className)}>
            <Card>
                 <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-xl font-bold font-headline flex items-center gap-2">
                        <Clock className="h-5 w-5" /> {title}
                    </CardTitle>
                    {showLinkToAll && (
                        <Button asChild variant="ghost" size="sm">
                            <Link href="/dashboard/documents">
                                View All <ArrowRight className="h-4 w-4 ml-2" />
                            </Link>
                        </Button>
                    )}
                </CardHeader>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Path</TableHead>
                            <TableHead className="text-right">Created</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {documents.map(doc => {
                           const rowContent = (
                             <TableRow 
                                key={doc.id} 
                                onClick={() => handleRowClick(doc)}
                                className={cn(
                                    onSelect ? "cursor-pointer" : "cursor-default",
                                    selectedId === doc.id && "bg-muted/50"
                                )}
                            >
                                <TableCell className="font-medium flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    {doc.filename}
                                </TableCell>
                                <TableCell className="text-muted-foreground">{doc.folderPath}</TableCell>
                                <TableCell className="text-right text-muted-foreground text-xs">
                                    {doc.createdAt ? formatDistanceToNow(doc.createdAt instanceof Date ? doc.createdAt : doc.createdAt.toDate(), { addSuffix: true }) : ''}
                                </TableCell>
                            </TableRow>
                           );

                           // If not selectable, wrap in a link to the document preview page
                           return onSelect ? rowContent : (
                                <Link href={`/dashboard/documents?doc=${doc.id}`} key={doc.id} passHref legacyBehavior>
                                    {rowContent}
                                </Link>
                           );
                        })}
                    </TableBody>
                </Table>
            </Card>
        </div>
    )
}
