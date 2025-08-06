
"use client"

import { DocumentScanner } from "@/components/dashboard/document-scanner";
import { SmartMailbox } from "@/components/dashboard/smart-mailbox";
import { Separator } from "@/components/ui/separator";

export default function DashboardPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <DocumentScanner />
      <SmartMailbox />
    </div>
  );
}
