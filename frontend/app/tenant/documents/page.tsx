'use client';
import { FileText } from 'lucide-react';

export default function TenantDocumentsPage() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-white mb-6">Documents</h1>
      <p className="text-slate-300 mb-8">
        View and download your important leasing and property documents.
      </p>

      <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-8 shadow-xl text-center">
        <FileText className="w-12 h-12 text-blue-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">
          No documents yet
        </h3>
        <p className="text-slate-400">
          Your landlord hasn&apos;t uploaded any documents for your account.
        </p>
      </div>
    </div>
  );
}
