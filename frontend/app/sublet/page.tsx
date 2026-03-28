'use client';

import Link from 'next/link';
import { FileText, LayoutList, DollarSign, ArrowRight } from 'lucide-react';

export default function SubletPage() {
  const cards = [
    {
      title: 'Request Approval',
      desc: 'Submit a subletting request for your rental',
      href: '/sublet/request',
      icon: FileText,
      color: 'from-blue-500 to-indigo-600',
    },
    {
      title: 'Manage Sublets',
      desc: 'View and manage your active sublet bookings',
      href: '/sublet/manage',
      icon: LayoutList,
      color: 'from-emerald-500 to-teal-600',
    },
    {
      title: 'Sublet Earnings',
      desc: 'Track income from your sublet arrangements',
      href: '/sublet/earnings',
      icon: DollarSign,
      color: 'from-purple-500 to-pink-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Subletting</h1>
        <p className="text-blue-300/60 mb-10">
          Earn from your rental while you're away
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <Link key={c.href} href={c.href} className="block group">
                <div className="backdrop-blur-xl bg-slate-800/50 border border-white/10 rounded-2xl p-6 hover:border-white/20 hover:shadow-xl transition-all h-full">
                  <div
                    className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${c.color} flex items-center justify-center mb-4`}
                  >
                    <Icon size={22} className="text-white" />
                  </div>
                  <h2 className="text-lg font-semibold mb-2">{c.title}</h2>
                  <p className="text-sm text-blue-300/60 mb-4">{c.desc}</p>
                  <span className="flex items-center gap-1 text-sm text-blue-400 group-hover:gap-2 transition-all">
                    Get started <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
