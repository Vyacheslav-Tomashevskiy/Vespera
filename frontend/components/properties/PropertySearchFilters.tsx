'use client';

import { Search, Home, DollarSign, ChevronDown, Filter, X } from 'lucide-react';
import { useState } from 'react';

interface FilterOption {
  label: string;
  value: string;
}

const propertyTypes: FilterOption[] = [
  { label: 'All Types', value: 'all' },
  { label: 'Apartment', value: 'apartment' },
  { label: 'House', value: 'house' },
  { label: 'Condo', value: 'condo' },
  { label: 'Townhouse', value: 'townhouse' },
];

const priceRanges: FilterOption[] = [
  { label: 'Any Price', value: 'any' },
  { label: '$0 - $1,000', value: '0-1000' },
  { label: '$1,000 - $2,000', value: '1000-2000' },
  { label: '$2,000 - $3,000', value: '2000-3000' },
  { label: '$3,000+', value: '3000-plus' },
];

const bedroomOptions: FilterOption[] = [
  { label: 'Any', value: 'any' },
  { label: '1+', value: '1' },
  { label: '2+', value: '2' },
  { label: '3+', value: '3' },
  { label: '4+', value: '4' },
];

export default function PropertySearchFilters() {
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  return (
    <div className="w-full space-y-4">
      {/* Search Bar - Desktop & Mobile */}
      <div className="flex flex-col md:flex-row gap-4 items-center backdrop-blur-xl bg-slate-800/50 border border-white/10 p-4 rounded-[2rem] shadow-2xl">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-200/50" />
          <input
            type="text"
            placeholder="Search by city, neighborhood, or ZIP"
            className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder:text-blue-200/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          />
        </div>

        <div className="hidden md:flex items-center gap-4 flex-1 w-full">
          <div className="relative flex-1">
            <Home className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-200/50" />
            <select className="w-full appearance-none bg-slate-900/50 border border-white/5 rounded-2xl py-3.5 pl-12 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer">
              {propertyTypes.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-200/50 pointer-events-none" />
          </div>

          <div className="relative flex-1">
            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-200/50" />
            <select className="w-full appearance-none bg-slate-900/50 border border-white/5 rounded-2xl py-3.5 pl-12 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer">
              {priceRanges.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-200/50 pointer-events-none" />
          </div>

          <button className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-3.5 rounded-2xl transition-all shadow-lg shadow-blue-500/20 active:scale-95">
            Search
          </button>
        </div>

        {/* Mobile Toggle */}
        <button
          onClick={() => setIsMobileFiltersOpen(true)}
          className="md:hidden w-full flex items-center justify-center gap-2 bg-slate-800/80 text-white py-3.5 rounded-2xl border border-white/5"
        >
          <Filter className="w-5 h-5" />
          <span>Filters</span>
        </button>
      </div>

      {/* Advanced Filters (Facets) - Desktop Only */}
      <div className="hidden md:flex flex-wrap items-center gap-3">
        <span className="text-blue-200/50 text-sm font-medium pr-2">
          Popular:
        </span>
        {[
          'Verified Only',
          'Pets Allowed',
          'Parking',
          'Gym',
          'Internet Included',
        ].map((tag) => (
          <button
            key={tag}
            className="bg-slate-800/30 hover:bg-slate-700/50 text-blue-200/70 border border-white/5 px-4 py-2 rounded-xl text-sm transition-all hover:text-white"
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Mobile Filters Modal/Drawer */}
      {isMobileFiltersOpen && (
        <div className="fixed inset-0 z-50 md:hidden animate-in fade-in duration-300">
          <div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setIsMobileFiltersOpen(false)}
          />
          <div className="absolute bottom-0 inset-x-0 bg-slate-900 border-t border-white/10 rounded-t-[2.5rem] p-8 space-y-8 animate-in slide-in-from-bottom duration-500">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Filters</h2>
              <button
                onClick={() => setIsMobileFiltersOpen(false)}
                className="p-2 bg-slate-800 rounded-full text-blue-200/50"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-bold text-blue-200/50 uppercase tracking-widest pl-1">
                  Property Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {propertyTypes.slice(1).map((opt) => (
                    <button
                      key={opt.value}
                      className="bg-slate-800 border border-white/5 py-3 rounded-xl text-white font-medium hover:bg-blue-600/20 transition-all"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-blue-200/50 uppercase tracking-widest pl-1">
                  Price Range
                </label>
                <select className="w-full bg-slate-800 border border-white/5 rounded-xl py-4 px-4 text-white focus:outline-none">
                  {priceRanges.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-blue-200/50 uppercase tracking-widest pl-1">
                  Bedrooms
                </label>
                <div className="flex gap-3">
                  {bedroomOptions.map((opt) => (
                    <button
                      key={opt.value}
                      className="flex-1 bg-slate-800 border border-white/5 py-3 rounded-xl text-white font-medium"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsMobileFiltersOpen(false)}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/20 transition-all mt-4"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
