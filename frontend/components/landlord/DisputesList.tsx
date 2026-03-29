'use client';
import { useState } from 'react';
import Link from 'next/link';

const MOCK_DISPUTES = [
  {
    id: '1',
    property: '123 Main St',
    tenant: 'Alice Smith',
    type: 'Maintenance',
    status: 'open',
    date: '2026-03-25',
    amount: null,
  },
  {
    id: '2',
    property: '456 Oak Ave',
    tenant: 'Bob Jones',
    type: 'Payment',
    status: 'resolved',
    date: '2026-03-20',
    amount: 500,
  },
];

export default function DisputesList() {
  const [filter, setFilter] = useState('all');

  const filtered =
    filter === 'all'
      ? MOCK_DISPUTES
      : MOCK_DISPUTES.filter((d) => d.status === filter);

  return (
    <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6 shadow-lg">
      <div className="flex gap-4 mb-6">
        <select
          className="bg-slate-700 text-white rounded-lg p-2 border border-white/10"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
          <option value="in-progress">In Progress</option>
        </select>
      </div>

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <p className="text-slate-400">No disputes found.</p>
        ) : (
          filtered.map((dispute) => (
            <Link
              key={dispute.id}
              href={`/landlords/disputes/${dispute.id}`}
              className="block"
            >
              <div className="bg-slate-700/50 hover:bg-slate-600 transition-all rounded-xl p-4 border border-white/5 flex justify-between items-center">
                <div>
                  <h3 className="text-white font-semibold">
                    {dispute.property} - {dispute.type}
                  </h3>
                  <p className="text-slate-400 text-sm">
                    Tenant: {dispute.tenant} • {dispute.date}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {dispute.amount && (
                    <span className="text-emerald-400 font-medium">
                      ${dispute.amount}
                    </span>
                  )}
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${dispute.status === 'open' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-emerald-500/20 text-emerald-500'}`}
                  >
                    {dispute.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
