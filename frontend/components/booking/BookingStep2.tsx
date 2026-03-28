'use client';

import { useState } from 'react';

interface Props {
  onNext: (data: { specialRequests: string }) => void;
  onPrevious: () => void;
}

export function BookingStep2({ onNext, onPrevious }: Props) {
  const [specialRequests, setSpecialRequests] = useState('');

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Any special requests?</h2>
      <p className="text-blue-200/60">
        Let the host know if you have any specific needs.
      </p>
      <textarea
        value={specialRequests}
        onChange={(e) => setSpecialRequests(e.target.value)}
        rows={5}
        placeholder="e.g. early check-in, ground floor room, allergies..."
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-blue-300/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
      />
      <div className="flex gap-3">
        <button
          onClick={onPrevious}
          className="flex-1 py-3 bg-white/10 border border-white/10 rounded-xl font-semibold hover:bg-white/20 transition-all"
        >
          Back
        </button>
        <button
          onClick={() => onNext({ specialRequests })}
          className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
