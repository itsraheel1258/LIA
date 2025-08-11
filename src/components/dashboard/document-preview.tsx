
"use client";

import Image from "next/image";
import { Document as DocumentType, CalendarEvent } from "@/lib/types";
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
import { format, parseISO, isSameDay } from "date-fns";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { createCalendarEventAction } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";

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
  const { user } = useAuth();
  const { toast } = useToast();
  const [addingToCalendar, setAddingToCalendar] = useState<string | null>(null);

  const isPdf = document.filename.toLowerCase().endsWith(".pdf");
  const isWord = document.filename.toLowerCase().endsWith(".doc") || document.filename.toLowerCase().endsWith(".docx");
  const isImage = !isPdf && !isWord;

  const createGoogleCalendarLink = (event: CalendarEvent) => {
    if (!event.startDate || !event.title) return "";
    const start = new Date(event.startDate).toISOString().replace(/[-:]|\.\d{3}/g, "");
    const end = event.endDate ? new Date(event.endDate).toISOString().replace(/[-:]|\.\d{3}/g, "") : start; 
    const url = new URL("https://www.google.com/calendar/render");
    url.searchParams.append("action", "TEMPLATE");
    url.searchParams.append("text", event.title);
    url.searchParams.append("dates", `${start}/${end}`);
    
    const details = event.description 
        ? `${event.description}\n\nGet your own Smart Mail Assistant @ HeyLia.ai`
        : "Get your own Smart Mail Assistant @ HeyLia.ai";

    url.searchParams.append("details", details);
    return url.toString();
  };
  
  const formatEventTime = (start: string, end: string | undefined) => {
    const startDate = parseISO(start);
    if (end) {
        const endDate = parseISO(end);
        if (isSameDay(startDate, endDate)) {
            return `${format(startDate, 'PPP')} @ ${format(startDate, 'p')} - ${format(endDate, 'p')}`;
        }
        return `${format(startDate, 'PPP p')} - ${format(endDate, 'PPP p')}`;
    }
    return format(startDate, "PPP p");
  }

  const addToLiaCalendar = async (event: CalendarEvent) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please sign in to add events to your calendar."
      });
      return;
    }

    setAddingToCalendar(event.title);
    
    try {
      const result = await createCalendarEventAction({
        userId: user.uid,
        title: event.title,
        startDate: event.startDate,
        description: event.description || undefined,
        location: undefined
      });

      if (result.success) {
        toast({
          title: "Event Added to Lia Calendar!",
          description: "Your event has been added to your Lia calendar and will appear in upcoming events."
        });
      } else {
        toast({
          variant: "destructive",
          title: "Failed to Add Event",
          description: result.error || "Could not add event to calendar."
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred while adding the event."
      });
    } finally {
      setAddingToCalendar(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col">
      <div className="flex-shrink-0">
        <div className="relative aspect-[4/5] sm:aspect-video w-full bg-muted rounded-lg overflow-hidden mb-4">
          {isImage ? (
            <Image
              src={document.downloadUrl}
              alt={`Preview of ${document.filename}`}
              layout="fill"
              objectFit="contain"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <FileText className="w-24 h-24 text-primary" />
            </div>
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
                     {formatEventTime(event.startDate, event.endDate)}
                  </div>
                  {event.description && (
                    <p className="mt-1 text-xs">{event.description}</p>
                  )}
                  <div className="flex gap-2 mt-2">
                  <Button
                      asChild
                      variant="outline"
                      size="sm"
                    >
                      <a
                        href={createGoogleCalendarLink(event)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Add to Google Calendar
                      </a>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Add to Lia Calendar to see events in your dashboard, or Add to Google Calendar for external calendar integration.
                  </p>
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
