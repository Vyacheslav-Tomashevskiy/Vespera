'use client';
import { Folder } from 'lucide-react';

export default function TenantFilesPage() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-white mb-6">Files & Media</h1>
      <p className="text-slate-300 mb-8">
        Manage the media files and attachments associated with your leases.
      </p>

      <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-8 shadow-xl text-center">
        <Folder className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">
          File Directory
        </h3>
        <p className="text-slate-400">
          All uploaded media will appear organized here.
        </p>
      </div>
    </div>
  );
}
