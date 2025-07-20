"use client"

import { DocumentScanner } from "@/components/dashboard/document-scanner";
import { SmartMailbox } from "@/components/dashboard/smart-mailbox";
import { Separator } from "@/components/ui/separator";

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="grid gap-12">
        <DocumentScanner />
        <Separator />
        <SmartMailbox />
      </div>
    </div>
  );
}
