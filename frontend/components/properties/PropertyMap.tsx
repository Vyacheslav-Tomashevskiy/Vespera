'use client';

import dynamic from 'next/dynamic';

// Dynamically import the Leaflet map to avoid SSR issues
const Map = dynamic(() => import('./PropertiesMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-900/50 flex items-center justify-center animate-pulse">
      <div className="text-blue-200/20 font-black text-4xl tracking-tighter uppercase italic">
        Loading Map...
      </div>
    </div>
  ),
});

interface Property {
  id: number;
  price: string;
  title: string;
  lat?: number;
  lng?: number;
}

interface PropertyMapProps {
  properties: Property[];
  className?: string;
}

export default function PropertyMap({
  properties,
  className = 'h-[400px] md:h-[600px] w-full',
}: PropertyMapProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-[2.5rem] border border-white/10 shadow-2xl ${className}`}
    >
      <Map properties={properties} />

      {/* Map Overlay Info */}
      <div className="absolute top-6 left-6 z-10 hidden sm:block">
        <div className="backdrop-blur-xl bg-slate-900/80 border border-white/10 px-6 py-4 rounded-2xl shadow-2xl space-y-1">
          <h3 className="text-white font-bold tracking-tight">
            Interactive View
          </h3>
          <p className="text-blue-200/40 text-xs font-medium uppercase tracking-[0.1em]">
            {properties.length} Properties Found
          </p>
        </div>
      </div>

      {/* Map Controls Tip */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
        <div className="backdrop-blur-md bg-slate-950/40 border border-white/5 px-4 py-2 rounded-full text-[10px] font-bold text-blue-200/30 uppercase tracking-[0.2em] whitespace-nowrap">
          Scroll to Zoom • Drag to Move
        </div>
      </div>
    </div>
  );
}
