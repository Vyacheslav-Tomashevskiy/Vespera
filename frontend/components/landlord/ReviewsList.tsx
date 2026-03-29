'use client';
import { useState } from 'react';
import Link from 'next/link';
import StarRating from '@/components/common/StarRating';

const MOCK_REVIEWS = [
  {
    id: '1',
    rating: 5,
    text: 'Great landlord!',
    tenant: 'Alice',
    date: '2026-03-25',
    status: 'published',
  },
  {
    id: '2',
    rating: 2,
    text: 'Slow maintenance.',
    tenant: 'Bob',
    date: '2026-03-20',
    status: 'responded',
  },
];

export default function ReviewsList() {
  const [filter, setFilter] = useState('all');

  const filtered =
    filter === 'all'
      ? MOCK_REVIEWS
      : MOCK_REVIEWS.filter((r) => r.status === filter);

  return (
    <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6 shadow-lg">
      <div className="flex gap-4 mb-6">
        <select
          className="bg-slate-700 text-white rounded-lg p-2 border border-white/10"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All</option>
          <option value="published">Published</option>
          <option value="responded">Responded</option>
        </select>
      </div>

      <div className="space-y-4">
        {filtered.map((r) => (
          <Link
            key={r.id}
            href={`/landlords/reviews/${r.id}`}
            className="block"
          >
            <div className="bg-slate-700/50 hover:bg-slate-600 transition-all rounded-xl p-4 border border-white/5 flex flex-col gap-2">
              <div className="flex justify-between">
                <StarRating rating={r.rating} />
                <span className="text-xs text-slate-400">{r.date}</span>
              </div>
              <p className="text-white text-sm">&quot;{r.text}&quot;</p>
              <div className="flex justify-between text-xs mt-2">
                <span className="text-slate-400">By: {r.tenant}</span>
                <span className="text-blue-400 capitalize">{r.status}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
