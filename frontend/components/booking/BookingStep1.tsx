'use client';

import { useState } from 'react';

interface Props {
  onNext: (data: { checkIn: string; checkOut: string; guests: number }) => void;
}

export function BookingStep1({ onNext }: Props) {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);

  const isValid = checkIn && checkOut && new Date(checkOut) > new Date(checkIn);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">When are you traveling?</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-blue-200/70 mb-2">
            Check-in
          </label>
          <input
            type="date"
            value={checkIn}
            min={new Date().toISOString().split('T')[0]}
            onChange={(e) => setCheckIn(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-blue-200/70 mb-2">
            Check-out
          </label>
          <input
            type="date"
            value={checkOut}
            min={checkIn || new Date().toISOString().split('T')[0]}
            onChange={(e) => setCheckOut(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-blue-200/70 mb-2">
          Guests
        </label>
        <select
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value))}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
            <option key={n} value={n} className="bg-slate-800">
              {n} guest{n > 1 ? 's' : ''}
            </option>
          ))}
        </select>
      </div>
      <button
        onClick={() => onNext({ checkIn, checkOut, guests })}
        disabled={!isValid}
        className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Continue
      </button>
    </div>
  );
}
