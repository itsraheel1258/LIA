
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Mail, Sparkles, LogIn, AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { user, loading, signInWithGoogle, isFirebaseEnabled } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleSignIn = async () => {
    if (!isFirebaseEnabled) return;
    try {
      await signInWithGoogle();
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Sign in failed", error);
      toast({
        variant: "destructive",
        title: "Sign-In Failed",
        description: "Could not sign in. Please check your Firebase configuration and ensure the API key is valid.",
      });
    }
  };

  const handleGoToDashboard = () => {
    router.push("/dashboard");
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Mail className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold font-headline text-foreground">
            Lia
          </h1>
        </div>
      </header>
      <main className="flex-grow flex items-center">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto">
            {!isFirebaseEnabled && (
                <Alert variant="destructive" className="mb-8 text-left">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Firebase Not Configured</AlertTitle>
                    <AlertDescription>
                        Your Firebase API keys are missing or invalid. Please check your <code>.env.local</code> file and ensure the keys from your Firebase project are copied correctly.
                    </AlertDescription>
                </Alert>
            )}
            <div className="inline-block bg-primary/10 text-primary px-4 py-1 rounded-full text-sm font-medium font-headline mb-4">
              <Sparkles className="inline-block h-4 w-4 mr-2" />
              Now with AI-powered organization
            </div>
            <h2 className="text-4xl md:text-6xl font-bold font-headline text-foreground tracking-tighter">
              HeyLia – Your AI Mail Assistant.
            </h2>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Stop drowning in paperwork. Snap a photo of any document, and let Lia intelligently name, tag, and file it away in your secure smart mailbox.
            </p>
            <div className="mt-8 flex justify-center">
              {user ? (
                 <Button size="lg" onClick={handleGoToDashboard} className="font-headline">
                  Go to Your Dashboard
                </Button>
              ) : (
                <Button size="lg" onClick={handleGoToDashboard} className="font-headline">
                    Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
      <footer className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-muted-foreground text-sm">
        © {new Date().getFullYear()} HeyLia.ai. All rights reserved.
      </footer>
    </div>
  );
}
