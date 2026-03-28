'use client';

import {
  Wifi,
  Car,
  Wind,
  Droplet,
  Dumbbell,
  Shield,
  Tv,
  Trees,
  Battery,
  LucideIcon,
  Check,
  House,
  Waves,
  Gamepad2,
  Microwave,
  Utensils,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  wifi: Wifi,
  internet: Wifi,
  parking: Car,
  garage: Car,
  ac: Wind,
  'air conditioning': Wind,
  pool: Waves,
  gym: Dumbbell,
  fitness: Dumbbell,
  security: Shield,
  tv: Tv,
  cable: Tv,
  kitchen: Utensils,
  garden: Trees,
  power: Battery,
  generator: Battery,
  inverter: Battery,
  laundry: Droplet,
  water: Droplet,
  balcony: House,
  games: Gamepad2,
  microwave: Microwave,
};

export interface Amenity {
  name: string;
  icon?: string;
}

interface PropertyAmenitiesProps {
  amenities: Amenity[];
  title?: string;
  columns?: 2 | 3 | 4;
}

export default function PropertyAmenities({
  amenities,
  title = 'What this place offers',
  columns = 2,
}: PropertyAmenitiesProps) {
  if (!amenities || amenities.length === 0) {
    return (
      <div className="backdrop-blur-xl bg-slate-800/20 border border-white/5 rounded-3xl p-8 text-center">
        <p className="text-blue-200/30 italic">
          No amenities listed for this property.
        </p>
      </div>
    );
  }

  const getIcon = (name: string) => {
    const normalized = name.toLowerCase();
    const key = Object.keys(iconMap).find((k) => normalized.includes(k));
    return key ? iconMap[key] : Check;
  };

  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  }[columns];

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
        {title}
        <span className="text-blue-200/20 text-sm font-medium tracking-normal">
          ({amenities.length})
        </span>
      </h3>

      <div className={`grid ${gridCols} gap-4`}>
        {amenities.map((amenity, idx) => {
          const IconComponent = getIcon(amenity.name);
          return (
            <div
              key={idx}
              className="group flex items-center gap-4 backdrop-blur-xl bg-slate-800/40 border border-white/5 p-4 rounded-2xl transition-all hover:bg-slate-700/40 hover:border-white/10 hover:shadow-xl"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                <IconComponent size={20} />
              </div>
              <span className="text-blue-100/80 font-medium group-hover:text-white transition-colors">
                {amenity.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
