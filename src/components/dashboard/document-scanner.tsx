
"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Loader2, Sparkles, FileEdit, Save, Trash2, XCircle, FileText, UploadCloud, Copy, FilePlus2, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { analyzeDocumentAction, saveDocumentAction } from "@/app/actions";
import type { GenerateSmartFilenameOutput } from "@/ai/flows/generate-filename";
import type { DetectEventOutput } from "@/ai/flows/detect-event";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Textarea } from "../ui/textarea";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Label } from "../ui/label";
import { cn } from "@/lib/utils";
import { Checkbox } from "../ui/checkbox";
import { format } from 'date-fns';


type ScannerState = "idle" | "capturing" | "processing" | "reviewing" | "saving";
type AiResult = GenerateSmartFilenameOutput & { finalDataUri: string, event: DetectEventOutput };

export function DocumentScanner() {
  const { user, isFirebaseEnabled } = useAuth();
  const [scannerState, setScannerState] = useState<ScannerState>("idle");
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [fileType, setFileType] = useState<"image" | "pdf" | null>(null);
  const [detectEvents, setDetectEvents] = useState(false);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const { toast } = useToast();
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      if (files[0].type.startsWith('image/')) {
        if (files.length > 1) {
            toast({ title: `${files.length} pages loaded.`, description: "For multi-page documents, only the first page will be processed and saved."});
        }
        setFileType('image');
        const fileReaders = Array.from(files).map(file => {
            return new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        });
        Promise.all(fileReaders).then(newPreviews => {
            setImagePreviews(previews => [...previews, ...newPreviews]);
            setScannerState("capturing");
        });

      } else if (files[0].type === 'application/pdf') {
        if (imagePreviews.length > 0 || files.length > 1) {
            toast({ variant: 'destructive', title: 'Mixing file types is not allowed.'});
            return;
        }
        setFileType('pdf');
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviews([reader.result as string]);
          setScannerState("capturing");
        };
        reader.readAsDataURL(files[0]);

      } else {
        toast({
          variant: 'destructive',
          title: 'Unsupported File Type',
          description: 'Please upload an image or a PDF file.',
        });
        return;
      }
    }
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };
  
  const handleReset = () => {
    setScannerState("idle");
    setImagePreviews([]);
    setAiResult(null);
    setFileType(null);
    setDetectEvents(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  const handleAnalyze = async () => {
    if (imagePreviews.length === 0 || !fileType) return;
    setScannerState("processing");

    try {
      const result = await analyzeDocumentAction({dataUris: imagePreviews, fileType, detectEvents});
      if (result.success && result.data) {
        setAiResult(result.data as AiResult);
        setScannerState("reviewing");
      } else {
        toast({
          variant: "destructive",
          title: "Analysis Failed",
          description: result.error || "Lia could not understand this document. Please check your Gemini API key.",
        });
        setScannerState("capturing");
      }
    } catch (error: any) {
       toast({
          variant: "destructive",
          title: "Analysis Failed",
          description: error.message || "An unexpected error occurred during analysis.",
        });
        setScannerState("capturing");
    }
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!aiResult || !user ) return;
    setScannerState("saving");

    const formData = new FormData(event.currentTarget);
    const filename = formData.get('filename') as string;
    const summary = formData.get('summary') as string;
    const folderPath = formData.get('folderPath') as string;
    const tags = folderPath.split('/').map(t => t.trim()).filter(Boolean);
    
    if (!isFirebaseEnabled) {
        toast({
            title: "Save Skipped",
            description: "Cannot save document. Firebase is not configured.",
        });
        setScannerState("reviewing");
        return;
    }
    
    const result = await saveDocumentAction({
        userId: user.uid,
        imageDataUri: aiResult.finalDataUri,
        filename,
        tags,
        folderPath,
        summary,
        metadata: aiResult.metadata
    });

    if (result.success) {
      toast({
        title: "Document Saved!",
        description: "Your document is now available in your Smart Mailbox.",
      });
      handleReset();
    } else {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: result.error,
      });
      setScannerState("reviewing");
    }
  };

  const createGoogleCalendarLink = (event: DetectEventOutput) => {
    if (!event.startDate || !event.title) return '';
  
    const formatDateForGoogle = (date: string) => {
      // Removes dashes, colons, and milliseconds, then adds 'Z'
      return new Date(date).toISOString().replace(/[-:]|\.\d{3}/g, '');
    };
  
    const start = formatDateForGoogle(event.startDate);
    // If no end date, make it same as start date for an all-day or point-in-time event
    const end = event.endDate ? formatDateForGoogle(event.endDate) : start;
  
    const url = new URL('https://www.google.com/calendar/render');
    url.searchParams.append('action', 'TEMPLATE');
    url.searchParams.append('text', event.title);
    url.searchParams.append('dates', `${start}/${end}`);
    url.searchParams.append('details', event.description || '');
    url.searchParams.append('location', event.location || '');
  
    return url.toString();
  };
  
  const renderPreview = () => {
    const isReviewingOrSaving = scannerState === 'reviewing' || scannerState === 'saving';
    let src = imagePreviews;
    
    if (isReviewingOrSaving && fileType === 'pdf' && aiResult?.finalDataUri) {
         return (
            <div className="flex flex-col items-center justify-center bg-muted p-8 rounded-lg">
                <FileText className="h-24 w-24 text-primary" />
                <p className="mt-4 text-sm text-muted-foreground">PDF Document</p>
            </div>
        );
    }
    
    // On review screen, we just show the first image, which is what will be saved.
    if (isReviewingOrSaving && aiResult?.finalDataUri) {
        src = [aiResult.finalDataUri];
    }

    if (src.length === 0) return null;

    if (fileType === 'pdf' && !isReviewingOrSaving) {
      return (
        <div className="flex flex-col items-center justify-center bg-muted p-8 rounded-lg">
          <FileText className="h-24 w-24 text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">PDF Document Ready for Analysis</p>
        </div>
      );
    }
    
    return (
        <Carousel className="w-full">
            <CarouselContent>
                {src.map((s, i) => (
                    <CarouselItem key={i}>
                         <Image src={s} alt={`Document page ${i+1}`} width={400} height={500} className="rounded-lg w-full object-contain max-h-[400px]" />
                    </CarouselItem>
                ))}
            </CarouselContent>
            {src.length > 1 && <>
                <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2" />
                <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2" />
            </>
            }
        </Carousel>
    )
  }

  const getCardTitle = () => {
    const name = user?.displayName?.split(' ')[0] || 'there';
    switch(scannerState) {
        case 'idle': return <><UploadCloud /> Hello {name}! Ready to file?</>;
        case 'capturing': return <><FileEdit /> Document ready for processing.</>;
        case 'processing': return <><Loader2 className="animate-spin"/> Lia is processing your document...</>;
        case 'reviewing': return <><Sparkles /> Here's what Lia found.</>;
        case 'saving': return <><Loader2 className="animate-spin"/> Filing your document...</>
    }
  }
  
   const getCardDescription = () => {
    switch(scannerState) {
        case 'idle': return 'Click the button below to upload a document.';
        case 'capturing': {
            if (fileType === 'pdf') return 'Your PDF is ready. Let Lia work her magic!';
            return `${imagePreviews.length} page(s) loaded. Add more pages or let Lia work her magic!`;
        }
        case 'processing': return 'Lia is analyzing the content of your document.';
        case 'reviewing': return "Review the details below or edit them before saving.";
        case 'saving': return 'Filing your document securely in the Smart Mailbox...';
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
            {getCardTitle()}
        </CardTitle>
        <CardDescription>
          {getCardDescription()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {scannerState === "idle" && (
          <div className="text-center p-8 border-2 border-dashed rounded-lg space-y-4">
             <Label 
                htmlFor="file-upload" 
                className={cn(
                    "font-headline inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                    "bg-primary text-primary-foreground hover:bg-primary/90",
                    "h-11 rounded-md px-8",
                    "cursor-pointer"
                 )}>
              <UploadCloud className="mr-2 h-6 w-6" />
              Upload File(s)
            </Label>
            <input
              id="file-upload"
              name="file-upload"
              type="file"
              className="sr-only"
              accept="image/*,application/pdf"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple={true}
            />
             <p className="mt-1 text-xs text-muted-foreground">Accepts images and PDFs. You can also take photos.</p>
          </div>
        )}

        {(scannerState === "capturing" || scannerState === "processing") && imagePreviews.length > 0 && (
          <div className="space-y-4">
            {renderPreview()}
            <div className="flex items-center space-x-2">
                <Checkbox id="detect-events" checked={detectEvents} onCheckedChange={(checked) => setDetectEvents(Boolean(checked))} />
                <label
                    htmlFor="detect-events"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                    Detect calendar events & tasks
                </label>
            </div>
            <div className="flex justify-between items-center gap-2">
                 <div className="flex gap-2">
                    {fileType === 'image' && (
                        <Label 
                            htmlFor="add-pages-upload" 
                            className={cn(
                                "font-sans inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                                "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                                "h-10 px-4 py-2",
                                scannerState === 'processing' ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                            )}>
                            <FilePlus2 /> Add Pages
                        </Label>
                    )}
                     <input
                        id="add-pages-upload"
                        name="add-pages-upload"
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        multiple={true}
                        disabled={scannerState === 'processing'}
                    />
                    <Button variant="outline" onClick={handleReset} disabled={scannerState === 'processing'}> <XCircle /> Cancel</Button>
                 </div>
                 <Button onClick={handleAnalyze} disabled={scannerState === 'processing'}>
                    {scannerState === 'processing' ? <Loader2 className="animate-spin"/> : <Sparkles />}
                    Process with Lia
                </Button>
            </div>
          </div>
        )}

        {scannerState === "reviewing" && aiResult && (
           <form onSubmit={handleSave} className="space-y-6">
                {renderPreview()}
                
                <div className="space-y-4">
                    <div>
                        <label htmlFor="filename" className="block text-sm font-medium text-muted-foreground mb-1">Filename</label>
                        <Input id="filename" name="filename" defaultValue={aiResult.filename} className="font-medium" />
                    </div>
                     <div>
                        <label htmlFor="summary" className="block text-sm font-medium text-muted-foreground mb-1">Summary</label>
                        <Textarea id="summary" name="summary" defaultValue={aiResult.summary} rows={3} />
                    </div>
                    <div>
                        <label htmlFor="folderPath" className="block text-sm font-medium text-muted-foreground mb-1">Folder Path</label>
                        <Input id="folderPath" name="folderPath" defaultValue={aiResult.folderPath} />
                        <p className="text-xs text-muted-foreground mt-1">Use ' / ' to create nested folders.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        {aiResult.metadata.sender && <p><strong className="text-muted-foreground">Sender:</strong> {aiResult.metadata.sender}</p>}
                        {aiResult.metadata.date && <p><strong className="text-muted-foreground">Date:</strong> {aiResult.metadata.date}</p>}
                        {aiResult.metadata.category && <p><strong className="text-muted-foreground">Category:</strong> {aiResult.metadata.category}</p>}
                    </div>
                </div>

                {detectEvents && aiResult.event && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg font-headline flex items-center gap-2">
                        <CalendarPlus /> Detected Event
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-3">
                      {aiResult.event.found ? (
                        <>
                          <p><strong>Title:</strong> {aiResult.event.title}</p>
                          {aiResult.event.startDate && <p><strong>Starts:</strong> {format(new Date(aiResult.event.startDate), 'PPP p')}</p>}
                          {aiResult.event.endDate && <p><strong>Ends:</strong> {format(new Date(aiResult.event.endDate), 'PPP p')}</p>}
                          {aiResult.event.location && <p><strong>Location:</strong> {aiResult.event.location}</p>}
                          {aiResult.event.description && <p><strong>Description:</strong> {aiResult.event.description}</p>}
                           {aiResult.event.startDate && aiResult.event.title && (
                            <Button asChild variant="outline" size="sm">
                                <a href={createGoogleCalendarLink(aiResult.event)} target="_blank" rel="noopener noreferrer">
                                <CalendarPlus className="mr-2 h-4 w-4" /> Add to Calendar
                                </a>
                            </Button>
                          )}
                        </>
                      ) : (
                        <p className="text-muted-foreground">No calendar event was found in this document.</p>
                      )}
                    </CardContent>
                  </Card>
                )}


                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={handleReset}><Trash2 /> Start Over</Button>
                    <Button type="submit"><Save /> Save to Mailbox</Button>
                </div>
            </form>
        )}

        {(scannerState === "saving") && (
            <div className="flex flex-col items-center gap-4 py-8">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">Saving your document securely...</p>
                 {renderPreview()}
            </div>
        )}
      </CardContent>
    </Card>
  );
}
