'use client';
import DisputesList from '@/components/landlord/DisputesList';

export default function DisputesPage() {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Disputes</h1>
      </div>
      <p className="text-slate-300 mb-6">
        Manage and resolve disputes with your tenants here.
      </p>
      <DisputesList />
    </div>
  );
}
