
"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Loader2, Sparkles, FileEdit, Save, Trash2, XCircle, FileText, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { analyzeDocumentAction, saveDocumentAction } from "@/app/actions";
import type { GenerateSmartFilenameOutput } from "@/ai/flows/generate-filename";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Textarea } from "../ui/textarea";

type ScannerState = "idle" | "capturing" | "processing" | "reviewing" | "saving";

export function DocumentScanner() {
  const { user, isFirebaseEnabled } = useAuth();
  const [scannerState, setScannerState] = useState<ScannerState>("idle");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<"image" | "pdf" | null>(null);
  const [aiResult, setAiResult] = useState<GenerateSmartFilenameOutput | null>(null);
  const { toast } = useToast();
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setFileType('image');
      } else if (file.type === 'application/pdf') {
        setFileType('pdf');
      } else {
        toast({
          variant: 'destructive',
          title: 'Unsupported File Type',
          description: 'Please upload an image or a PDF file.',
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setScannerState("capturing");
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleReset = () => {
    setScannerState("idle");
    setImagePreview(null);
    setAiResult(null);
    setFileType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  const handleAnalyze = async () => {
    if (!imagePreview) return;
    setScannerState("processing");
    try {
      const result = await analyzeDocumentAction(imagePreview);
      if (result.success && result.data) {
        setAiResult(result.data);
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
    if (!imagePreview || !aiResult || !user ) return;
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
        imageDataUri: imagePreview,
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
    if (!imagePreview) return null;
    if (fileType === 'pdf') {
      return (
        <div className="flex flex-col items-center justify-center bg-muted p-8 rounded-lg">
          <FileText className="h-24 w-24 text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">PDF Document Ready for Analysis</p>
        </div>
      );
    }
    return <Image src={imagePreview} alt="Document preview" width={400} height={500} className="rounded-lg w-full object-contain max-h-[400px]" />
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
            {scannerState === 'idle' && <UploadCloud />}
            {scannerState === 'capturing' && <FileEdit />}
            {scannerState === 'processing' && <Loader2 className="animate-spin"/>}
            {scannerState === 'reviewing' && <Sparkles />}
            {scannerState === 'saving' && <Loader2 className="animate-spin"/>}
            Hello {user?.displayName?.split(' ')[0] || 'there'}! Ready to file?
        </CardTitle>
        <CardDescription>
          {scannerState === 'idle' && 'Click the button below to upload a document.'}
          {scannerState === 'capturing' && 'Your document is ready. Let Lia work her magic!'}
          {scannerState === 'processing' && 'Lia is analyzing your document, please wait a moment...'}
          {scannerState === 'reviewing' && "Here's what Lia found. You can edit the details before saving."}
          {scannerState === 'saving' && 'Filing your document securely in the Smart Mailbox...'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {scannerState === "idle" && (
          <div className="text-center p-8 border-2 border-dashed rounded-lg space-y-4">
             <Button size="lg" onClick={() => fileInputRef.current?.click()} className="font-headline">
              <UploadCloud className="mr-2 h-6 w-6" />
              Upload File
            </Button>
            <input
              id="file-upload"
              name="file-upload"
              type="file"
              className="sr-only"
              accept="image/*,application/pdf"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
             <p className="mt-1 text-xs text-muted-foreground">Accepts images and PDFs. You can also take a photo.</p>
          </div>
        )}

        {(scannerState === "capturing" || scannerState === "processing") && imagePreview && (
          <div className="space-y-4">
            {renderPreview()}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleReset} disabled={scannerState === 'processing'}> <XCircle className="mr-2 h-4 w-4"/> Cancel</Button>
              <Button onClick={handleAnalyze} disabled={scannerState === 'processing'}>
                {scannerState === 'processing' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4"/>}
                Process with Lia
              </Button>
            </div>
          </div>
        )}

        {scannerState === "reviewing" && imagePreview && aiResult && (
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
                    <Button type="button" variant="outline" onClick={handleReset}><Trash2 className="mr-2 h-4 w-4"/> Start Over</Button>
                    <Button type="submit"><Save className="mr-2 h-4 w-4"/> Save to Mailbox</Button>
                </div>
            </form>
        )}

        {(scannerState === "saving") && imagePreview && (
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
