
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Sparkles, LogIn, AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
      console.log("Start Google SignIn Process")
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
          <div className="font-headline text-2xl font-bold tracking-tighter">Lia</div>
        </div>
      </header>
      <main className="flex-grow">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center pt-20 pb-16">
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

        <section id="pricing" className="py-16 bg-secondary/50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold font-headline tracking-tighter sm:text-4xl">
                Simple, transparent pricing
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Choose the plan that's right for you.
              </p>
            </div>
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline">Hobby</CardTitle>
                  <CardDescription>For personal use and light document management.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-4xl font-bold font-headline">
                    $0<span className="text-lg font-normal text-muted-foreground">/month</span>
                  </div>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-primary" />
                      <span>50 documents</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-primary" />
                      <span>1GB storage</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-primary" />
                      <span>AI-powered organization</span>
                    </li>
                     <li className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-primary" />
                      <span>Community support</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full font-headline">Get Started</Button>
                </CardFooter>
              </Card>
              <Card className="border-primary shadow-lg">
                 <CardHeader>
                  <CardTitle className="font-headline">Pro</CardTitle>
                  <CardDescription>For power users with advanced needs.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                   <div className="text-4xl font-bold font-headline">
                    $10<span className="text-lg font-normal text-muted-foreground">/month</span>
                  </div>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-primary" />
                      <span>Unlimited documents</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-primary" />
                      <span>100GB storage</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-primary" />
                      <span>Advanced search & filtering</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-primary" />
                      <span>Priority email support</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full font-headline">Start 30-Day Free Trial</Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>
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
