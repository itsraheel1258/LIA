
"use client";

import Image from "next/image";
import { Document as DocumentType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FileText,
  Download,
  Trash2,
  Loader2,
  CalendarPlus,
  Send,
  Calendar as CalendarIcon,
  Tag,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";

interface DocumentPreviewProps {
  document: DocumentType;
  onDownload: (doc: DocumentType) => void;
  onDelete: (doc: DocumentType) => void;
  isDownloading: boolean;
}

export function DocumentPreview({
  document,
  onDownload,
  onDelete,
  isDownloading,
}: DocumentPreviewProps) {
  const isPdf = document.filename.toLowerCase().endsWith(".pdf");

  const createGoogleCalendarLink = (event: {
    title: string;
    startDate: string;
    description?: string | null;
  }) => {
    if (!event.startDate || !event.title) return "";
    const start = new Date(event.startDate).toISOString().replace(/[-:]|\.\d{3}/g, "");
    const end = start; 
    const url = new URL("https://www.google.com/calendar/render");
    url.searchParams.append("action", "TEMPLATE");
    url.searchParams.append("text", event.title);
    url.searchParams.append("dates", `${start}/${end}`);
    if (event.description)
      url.searchParams.append("details", event.description);
    return url.toString();
  };

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col">
      <div className="flex-shrink-0">
        <div className="relative aspect-[4/5] sm:aspect-video w-full bg-muted rounded-lg overflow-hidden mb-4">
          {isPdf ? (
            <div className="flex flex-col items-center justify-center h-full">
              <FileText className="h-16 w-16 text-primary" />
              <p className="mt-2 text-sm text-muted-foreground">PDF Document</p>
            </div>
          ) : (
            <Image
              src={document.downloadUrl}
              alt={`Preview of ${document.filename}`}
              layout="fill"
              objectFit="contain"
              className="bg-white"
            />
          )}
        </div>

        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-bold font-headline leading-tight">
            {document.filename}
          </h3>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onDownload(document)}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="destructive"
              size="icon"
              className="h-8 w-8"
              onClick={() => onDelete(document)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {document.metadata.summary}
        </p>
      </div>

      <Separator className="my-6" />

      <div className="space-y-6 text-sm flex-grow overflow-y-auto pr-2 -mr-2">
        <div className="grid grid-cols-2 gap-4">
            {document.metadata.sender && (
                <div className="flex items-start gap-3">
                    <Send className="h-4 w-4 mt-0.5 text-muted-foreground"/>
                    <div>
                        <p className="font-medium text-muted-foreground">Sender</p>
                        <p className="text-foreground">{document.metadata.sender}</p>
                    </div>
                </div>
            )}
             {document.metadata.date && (
                <div className="flex items-start gap-3">
                    <CalendarIcon className="h-4 w-4 mt-0.5 text-muted-foreground"/>
                    <div>
                        <p className="font-medium text-muted-foreground">Date</p>
                        <p className="text-foreground">{document.metadata.date}</p>
                    </div>
                </div>
            )}
        </div>
        
        <div className="flex items-start gap-3">
            <Tag className="h-4 w-4 mt-0.5 text-muted-foreground"/>
            <div>
                <p className="font-medium text-muted-foreground">Tags</p>
                <div className="flex flex-wrap gap-2 mt-1">
                    {document.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                        {tag}
                        </Badge>
                    ))}
                </div>
            </div>
        </div>

        {document.event && document.event.events && document.event.events.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-headline flex items-center gap-2">
                <CalendarPlus /> Detected Events
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-4">
              {document.event.events.map((event, index) => (
                <div key={index}>
                  <div className="font-semibold">{event.title}</div>
                  <div className="text-muted-foreground">
                    {format(parseISO(event.startDate), "PPP p")}
                  </div>
                  {event.description && (
                    <p className="mt-1 text-xs">{event.description}</p>
                  )}
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    <a
                      href={createGoogleCalendarLink(event)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <CalendarPlus className="mr-2 h-4 w-4" /> Add to
                      Calendar
                    </a>
                  </Button>
                  {document.event && document.event.events && index < document.event.events.length - 1 && (
                    <Separator className="my-4" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
