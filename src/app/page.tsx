
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Sparkles, LogIn, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LiaLogo } from "@/components/icons/lia-logo";

export default function Home() {
  const { user, loading, signInWithGoogle, isFirebaseEnabled } = useAuth();
  const [showFirebaseAlert, setShowFirebaseAlert] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // This check runs only on the client, after hydration
    setShowFirebaseAlert(!isFirebaseEnabled);
  }, [isFirebaseEnabled]);


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
          <LiaLogo className="h-10" />
        </div>
      </header>
      <main className="flex-grow flex items-center">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto">
            {showFirebaseAlert && (
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
              Lia – AI Document Assistance.
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
                <Button size="lg" onClick={handleSignIn} disabled={!isFirebaseEnabled || loading} className="font-headline">
                    <LogIn className="mr-2 h-5 w-5" />
                    {loading ? "Loading..." : "Sign In & Get Started"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
      <footer className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-muted-foreground text-sm">
        <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4">
            <span>© {new Date().getFullYear()} Lia. All rights reserved.</span>
            <div className="flex gap-4">
                <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
                <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            </div>
        </div>
      </footer>
    </div>
  );
}
