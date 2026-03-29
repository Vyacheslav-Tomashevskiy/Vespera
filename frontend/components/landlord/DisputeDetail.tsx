'use client';
import Link from 'next/link';
import DisputeTimeline from './DisputeTimeline';

const mockDispute = {
  id: '1',
  title: 'Leaking Sink',
  property: '123 Main St',
  tenant: 'Alice Smith',
  type: 'Maintenance',
  status: 'open',
  date: '2026-03-25',
  description: 'The sink has been leaking for two weeks.',
  timeline: [
    {
      action: 'Dispute Created',
      date: '2026-03-25 10:00 AM',
      actor: 'Alice Smith',
    },
    {
      action: 'Evidence Uploaded',
      date: '2026-03-25 10:05 AM',
      actor: 'Alice Smith',
    },
  ],
};

export default function DisputeDetail({ id: _id }: { id: string }) {
  const data = mockDispute; // Fake fetching by id

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <Link
          href="/landlords/disputes"
          className="text-blue-400 hover:text-blue-300"
        >
          ← Back to Disputes
        </Link>
      </div>
      <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6 shadow-xl">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">{data.title}</h1>
            <p className="text-slate-400">
              Property: {data.property} • Tenant: {data.tenant}
            </p>
          </div>
          <span className="px-3 py-1 bg-yellow-500/20 text-yellow-500 rounded-full text-sm font-bold uppercase">
            {data.status}
          </span>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-4 text-white mb-6">
          <p className="font-semibold mb-2">Description:</p>
          <p className="text-slate-300">{data.description}</p>
        </div>
      </div>
      <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6 shadow-xl">
        <h2 className="text-xl font-bold text-white mb-4">Timeline</h2>
        <DisputeTimeline events={data.timeline} />
      </div>
    </div>
  );
}
