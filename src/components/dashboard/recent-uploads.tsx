
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
                        {documents.map(doc => (
                             <TableRow 
                                key={doc.id} 
                                onClick={() => handleRowClick(doc)}
                                className={cn(
                                    onSelect ? "cursor-pointer" : "",
                                    !onSelect && "hover:bg-muted/50",
                                    selectedId === doc.id && "bg-muted/50"
                                )}
                            >
                                <TableCell className="font-medium">
                                   <Link href={`/dashboard/documents?doc=${doc.id}`} className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                        {doc.filename}
                                    </Link>
                                </TableCell>
                                <TableCell>
                                     <Link href={`/dashboard/documents?doc=${doc.id}`} className="text-muted-foreground">
                                        {doc.folderPath}
                                     </Link>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Link href={`/dashboard/documents?doc=${doc.id}`} className="text-muted-foreground text-xs">
                                        {doc.createdAt ? formatDistanceToNow(doc.createdAt instanceof Date ? doc.createdAt : doc.createdAt.toDate(), { addSuffix: true }) : ''}
                                    </Link>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    )
}
