
"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Camera, Loader2, Sparkles, FileEdit, Save, Trash2, XCircle, FileText, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { analyzeDocumentAction, saveDocumentAction } from "@/app/actions";
import type { GenerateSmartFilenameOutput } from "@/ai/flows/generate-filename";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Alert, AlertTitle, AlertDescription } from "../ui/alert";
import { Textarea } from "../ui/textarea";

type ScannerState = "idle" | "capturing" | "processing" | "reviewing" | "saving" | "camera_active";

export function DocumentScanner() {
  const { user, isFirebaseEnabled } = useAuth();
  const [scannerState, setScannerState] = useState<ScannerState>("idle");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<"image" | "pdf" | null>(null);
  const [aiResult, setAiResult] = useState<GenerateSmartFilenameOutput | null>(null);
  const { toast } = useToast();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play(); // Explicitly play the video
        setScannerState("camera_active");
      }
    } catch (err) {
      console.error("Error accessing camera: ", err);
      toast({
        variant: "destructive",
        title: "Camera Access Denied",
        description:
          "Please enable camera permissions in your browser settings to use this feature.",
      });
    }
  };


  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUri = canvas.toDataURL('image/jpeg');
        setImagePreview(dataUri);
        setFileType('image');
        setScannerState('capturing');
        stopCamera();
      }
    }
  };

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
    stopCamera();
    setScannerState("idle");
    setImagePreview(null);
    setAiResult(null);
    setFileType(null);
  };
  
  const handleBackToIdle = () => {
    stopCamera();
    setScannerState("idle");
  }

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
    if (!imagePreview || !aiResult ) return;
    setScannerState("saving");

    const formData = new FormData(event.currentTarget);
    const filename = formData.get('filename') as string;
    const summary = formData.get('summary') as string;
    const tags = aiResult.folderTags;
    
    if (!isFirebaseEnabled) {
        toast({
            title: "Save Skipped",
            description: "Cannot save document. Firebase is not configured.",
        });
        setScannerState("reviewing");
        return;
    }
    
    const result = await saveDocumentAction({
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
  
  useEffect(() => {
    return () => {
      stopCamera();
    }
  }, []);

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
            {scannerState === 'idle' && <Camera />}
            {scannerState === 'camera_active' && <Camera />}
            {scannerState === 'capturing' && <FileEdit />}
            {scannerState === 'processing' && <Loader2 className="animate-spin"/>}
            {scannerState === 'reviewing' && <Sparkles />}
            {scannerState === 'saving' && <Loader2 className="animate-spin"/>}
            Hello {user?.displayName?.split(' ')[0] || 'there'}! Ready to scan?
        </CardTitle>
        <CardDescription>
          {scannerState === 'idle' && 'Click the button below to scan or upload a document.'}
          {scannerState === 'camera_active' && 'Position the document within the frame and capture.'}
          {scannerState === 'capturing' && 'Your document is ready. Let Lia work her magic!'}
          {scannerState === 'processing' && 'Lia is analyzing your document, please wait a moment...'}
          {scannerState === 'reviewing' && "Here's what Lia found. You can edit the details before saving."}
          {scannerState === 'saving' && 'Filing your document securely in the Smart Mailbox...'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {scannerState === "idle" && (
          <div className="text-center p-8 border-2 border-dashed rounded-lg space-y-4">
            <Button size="lg" onClick={startCamera}>
              <Camera className="mr-2 h-6 w-6" />
              Scan Document
            </Button>
            <div>
              <p className="text-sm text-muted-foreground my-2">or</p>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
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
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Accepts images and PDFs</p>
          </div>
        )}

        {scannerState === "camera_active" && (
          <div className="relative space-y-4">
              <video ref={videoRef} className="w-full rounded-lg" playsInline autoPlay muted />
              <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
                  <div className="w-full h-full border-4 border-dashed border-primary/50 rounded-lg" />
              </div>
              <canvas ref={canvasRef} className="hidden" />
              <div className="flex justify-between items-center">
                  <Button variant="ghost" onClick={handleBackToIdle}><ArrowLeft className="mr-2"/> Back</Button>
                  <Button
                      onClick={handleCapture}
                      className="rounded-full h-16 w-16 border-4 border-primary/30 bg-primary/20 hover:bg-primary/30"
                  >
                      <Camera className="h-8 w-8 text-primary" />
                  </Button>
                  <div className="w-20"></div>
              </div>
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
                 {renderPreview()}
            </div>
        )}

      </CardContent>
    </Card>
  );
}

    