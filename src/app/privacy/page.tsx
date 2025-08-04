
import Link from "next/link";
import { LiaLogo } from "@/components/icons/lia-logo";

export default function PrivacyPolicyPage() {
  return (
    <div className="flex flex-col min-h-screen">
       <header className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2">
          <LiaLogo className="h-10" />
        </Link>
      </header>
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
          <h1 className="text-4xl font-bold font-headline">Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
          
          <p>
            Welcome to Lia. We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application.
          </p>

          <h2 className="text-2xl font-bold font-headline mt-8">1. Information We Collect</h2>
          <p>
            We may collect information about you in a variety of ways. The information we may collect via the Application includes:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Personal Data:</strong> Personally identifiable information, such as your name, email address, that you voluntarily give to us when you register with the Application.</li>
            <li><strong>Document Data:</strong> Images and content of documents you upload to the service. We process this data to provide our service but do not claim ownership of it.</li>
            <li><strong>Derivative Data:</strong> Information our servers automatically collect when you access the Application, such as your IP address, your browser type, your operating system, your access times, and the pages you have viewed directly before and after accessing the Application.</li>
          </ul>

          <h2 className="text-2xl font-bold font-headline mt-8">2. Use of Your Information</h2>
          <p>
            Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Application to:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Create and manage your account.</li>
            <li>Email you regarding your account.</li>
            <li>Enable user-to-user communications.</li>
            <li>Generate a personal profile about you to make future visits to the Application more personalized.</li>
            <li>Monitor and analyze usage and trends to improve your experience with the Application.</li>
          </ul>

          <h2 className="text-2xl font-bold font-headline mt-8">3. Security of Your Information</h2>
          <p>
            We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.
          </p>
          
          <h2 className="text-2xl font-bold font-headline mt-8">Contact Us</h2>
          <p>If you have questions or comments about this Privacy Policy, please contact us at: privacy@lia.com</p>
        </div>
      </main>
       <footer className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-muted-foreground text-sm">
         <p>© {new Date().getFullYear()} Lia. All rights reserved.</p>
      </footer>
    </div>
  );
}
