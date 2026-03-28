'use client';

import { Heart, MapPin, Bed, Bath } from 'lucide-react';
import Link from 'next/link';

// Favorites are stored client-side (localStorage) until a backend endpoint exists
export default function GuestFavoritesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Favorites</h1>
      <div className="text-center py-20 text-blue-300/60">
        <Heart size={48} className="mx-auto mb-4 text-blue-300/20" />
        <p className="text-xl mb-4">No saved properties yet</p>
        <Link href="/stays" className="text-blue-400 hover:underline">
          Browse stays and save your favorites →
        </Link>
      </div>
    </div>
  );
}
