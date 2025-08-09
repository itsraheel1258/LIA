
"use client"

import { SmartMailbox } from "@/components/dashboard/smart-mailbox";
import React from 'react';

export default function DocumentsPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <React.Suspense fallback={<div>Loading Mailbox...</div>}>
         <SmartMailbox />
      </React.Suspense>
    </div>
  );
}
