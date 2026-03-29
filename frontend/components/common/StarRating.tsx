'use client';
import { Star } from 'lucide-react';

export default function StarRating({
  rating,
  max = 5,
}: {
  rating: number;
  max?: number;
}) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'fill-none text-slate-500'}`}
        />
      ))}
    </div>
  );
}
