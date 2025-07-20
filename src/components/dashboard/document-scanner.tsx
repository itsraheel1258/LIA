"use client";

import { useState } from "react";
import Image from "next/image";
import { Camera, Loader2, Sparkles, Upload, FileEdit, Save, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { analyzeDocumentAction, saveDocumentAction } from "@/app/actions";
import type { GenerateSmartFilenameOutput } from "@/ai/flows/generate-filename";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

type ScannerState = "idle" | "capturing" | "processing" | "reviewing" | "saving";

export function DocumentScanner() {
  const { user } = useAuth();
  const [scannerState, setScannerState] = useState<ScannerState>("idle");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<GenerateSmartFilenameOutput | null>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
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
  };

  const handleAnalyze = async () => {
    if (!imagePreview) return;
    setScannerState("processing");
    const result = await analyzeDocumentAction(imagePreview);
    if (result.success && result.data) {
      setAiResult(result.data);
      setScannerState("reviewing");
    } else {
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: result.error,
      });
      setScannerState("capturing");
    }
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!imagePreview || !aiResult) return;
    setScannerState("saving");

    const formData = new FormData(event.currentTarget);
    const filename = formData.get('filename') as string;
    const tags = aiResult.folderTags; // For simplicity, not making tags editable in this form
    
    const result = await saveDocumentAction({
        imageDataUri: imagePreview,
        filename,
        tags,
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

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
            {scannerState === 'idle' && <Camera />}
            {scannerState === 'capturing' && <FileEdit />}
            {scannerState === 'processing' && <Loader2 className="animate-spin"/>}
            {scannerState === 'reviewing' && <Sparkles />}
            {scannerState === 'saving' && <Loader2 className="animate-spin"/>}
            Hello {user?.displayName?.split(' ')[0] || 'there'}! Ready to scan?
        </CardTitle>
        <CardDescription>
          {scannerState === 'idle' && 'Click the button below to scan a document with your camera.'}
          {scannerState === 'capturing' && 'Your document is ready. Let Lia work her magic!'}
          {scannerState === 'processing' && 'Lia is analyzing your document, please wait a moment...'}
          {scannerState === 'reviewing' && "Here's what Lia found. You can edit the details before saving."}
          {scannerState === 'saving' && 'Filing your document securely in the Smart Mailbox...'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {scannerState === "idle" && (
          <div className="text-center p-8 border-2 border-dashed rounded-lg">
             <label
              htmlFor="file-upload"
              className="cursor-pointer inline-flex items-center justify-center rounded-full border-4 border-primary/20 bg-primary/10 h-32 w-32 transition-transform hover:scale-105"
            >
                <Camera className="h-12 w-12 text-primary" />
                <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" capture="environment" onChange={handleFileChange} />
            </label>
            <p className="mt-4 text-muted-foreground font-medium">Tap to Scan Document</p>
          </div>
        )}

        {(scannerState === "capturing" || scannerState === "processing") && imagePreview && (
          <div className="space-y-4">
             <Image src={imagePreview} alt="Document preview" width={400} height={500} className="rounded-lg w-full object-contain max-h-[400px]" />
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
                <Image src={imagePreview} alt="Document preview" width={400} height={500} className="rounded-lg w-full object-contain max-h-[400px]" />
                <div className="space-y-4">
                    <div>
                        <label htmlFor="filename" className="block text-sm font-medium text-muted-foreground mb-1">Filename</label>
                        <Input id="filename" name="filename" defaultValue={aiResult.filename} className="font-medium" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">Suggested Tags</label>
                        <div className="flex flex-wrap gap-2">
                        {aiResult.folderTags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                        </div>
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
                 <Image src={imagePreview} alt="Document preview" width={200} height={250} className="rounded-lg opacity-50" />
            </div>
        )}

      </CardContent>
    </Card>
  );
}
