
"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Loader2, Sparkles, FileEdit, Save, Trash2, XCircle, FileText, UploadCloud, Copy, FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { analyzeDocumentAction, saveDocumentAction } from "@/app/actions";
import type { GenerateSmartFilenameOutput } from "@/ai/flows/generate-filename";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Textarea } from "../ui/textarea";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Label } from "../ui/label";
import { cn } from "@/lib/utils";


type ScannerState = "idle" | "capturing" | "processing" | "reviewing" | "saving";
type AiResult = GenerateSmartFilenameOutput & { croppedDataUri: string };

export function DocumentScanner() {
  const { user, isFirebaseEnabled } = useAuth();
  const [scannerState, setScannerState] = useState<ScannerState>("idle");
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [fileType, setFileType] = useState<"image" | "pdf" | null>(null);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const { toast } = useToast();
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // For simplicity, we'll handle multiple files only for images.
      // PDFs are often multi-page already.
      if (files[0].type.startsWith('image/')) {
        if (files.length > 1) {
            toast({ title: `${files.length} pages ready to be processed.`});
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
        toast({
          title: 'PDFs cannot be cropped',
          description: 'PDF processing will skip the AI cropping step.',
        });
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
     // Reset the file input so the user can upload the same file again if they want
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };
  
  const handleReset = () => {
    setScannerState("idle");
    setImagePreviews([]);
    setAiResult(null);
    setFileType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const stitchImages = async (imageSrcs: string[]): Promise<string> => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');

        const images = await Promise.all(imageSrcs.map(src => new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new window.Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        })));

        const totalHeight = images.reduce((sum, img) => sum + img.height, 0);
        const maxWidth = Math.max(...images.map(img => img.width));

        canvas.width = maxWidth;
        canvas.height = totalHeight;

        let y = 0;
        for (const img of images) {
            ctx.drawImage(img, 0, y);
            y += img.height;
        }

        return canvas.toDataURL('image/jpeg'); // Or 'image/png'
    };
  
  const handleAnalyze = async () => {
    if (imagePreviews.length === 0 || !fileType) return;
    setScannerState("processing");
    
    let dataUriToAnalyze = imagePreviews[0];
    
    // If we have multiple images, stitch them together before analyzing.
    if (fileType === 'image' && imagePreviews.length > 1) {
        try {
            dataUriToAnalyze = await stitchImages(imagePreviews);
        } catch (error) {
             toast({
                variant: "destructive",
                title: "Image Stitching Failed",
                description: "Could not combine pages. Please try again.",
            });
            setScannerState("capturing");
            return;
        }
    }

    try {
      const result = await analyzeDocumentAction(dataUriToAnalyze, fileType);
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
        imageDataUri: aiResult.croppedDataUri, // Save the cropped image or original PDF
        filename,
        tags,
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
  
  const renderPreview = () => {
    const src = (scannerState === 'reviewing' || scannerState === 'saving') && aiResult?.croppedDataUri ? [aiResult.croppedDataUri] : imagePreviews;
    if (src.length === 0) return null;
    if (fileType === 'pdf' && scannerState !== 'reviewing') {
      return (
        <div className="flex flex-col items-center justify-center bg-muted p-8 rounded-lg">
          <FileText className="h-24 w-24 text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">PDF Document Ready for Analysis</p>
        </div>
      );
    }
    if (fileType === 'pdf') {
         return (
            <div className="flex flex-col items-center justify-center bg-muted p-8 rounded-lg">
                <FileText className="h-24 w-24 text-primary" />
                <p className="mt-4 text-sm text-muted-foreground">PDF Document</p>
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
        case 'processing': return 'First, Lia will crop and enhance the image, then analyze its content.';
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

    