'use client';

import {
  MapPin,
  Bed,
  Bath,
  Ruler,
  Share2,
  Heart,
  Shield,
  TrendingUp,
  Calendar,
  MessageCircle,
  Phone,
} from 'lucide-react';
import Image from 'next/image';
import ImageGallery from './ImageGallery';
import AmenitiesList, { Amenity } from './AmenitiesList';

interface PropertyDetailViewProps {
  property: {
    id: number;
    title: string;
    description: string;
    price: string;
    location: string;
    beds: number;
    baths: number;
    sqft: number;
    images: string[];
    verified: boolean;
    amenities: Amenity[];
    manager: {
      name: string;
      avatar?: string;
      verified: boolean;
      responseTime: string;
    };
    category: string;
    listedDate: string;
  };
}

export default function PropertyDetailView({
  property,
}: PropertyDetailViewProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
              {property.title}
            </h1>
            {property.verified && (
              <div className="bg-emerald-600/20 backdrop-blur-md text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1.5 text-xs font-semibold shadow-lg">
                <Shield className="w-4 h-4" />
                Verified
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-blue-200/70 text-lg">
            <MapPin className="w-5 h-5 shrink-0" />
            <p>{property.location}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-800/50 hover:bg-slate-700/50 text-white px-5 py-3 rounded-2xl border border-white/10 transition-all">
            <Share2 className="w-5 h-5" />
            <span>Share</span>
          </button>
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-800/50 hover:bg-slate-700/50 text-white px-5 py-3 rounded-2xl border border-white/10 transition-all">
            <Heart className="w-5 h-5" />
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Gallery & Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Gallery */}
          <div className="backdrop-blur-xl bg-slate-800/30 border border-white/5 rounded-[2.5rem] p-4 shadow-2xl">
            <ImageGallery images={property.images} title={property.title} />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 backdrop-blur-xl bg-slate-800/50 border border-white/10 rounded-3xl p-6 shadow-xl">
            <div className="flex flex-col items-center gap-2 text-center">
              <Bed className="w-6 h-6 text-blue-400" />
              <div className="text-white font-bold text-lg">
                {property.beds}
              </div>
              <div className="text-blue-200/50 text-xs uppercase tracking-wider">
                Bedrooms
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 text-center border-x border-white/10 px-4 text-center">
              <Bath className="w-6 h-6 text-blue-400" />
              <div className="text-white font-bold text-lg">
                {property.baths}
              </div>
              <div className="text-blue-200/50 text-xs uppercase tracking-wider">
                Bathrooms
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <Ruler className="w-6 h-6 text-blue-400" />
              <div className="text-white font-bold text-lg">
                {property.sqft}
              </div>
              <div className="text-blue-200/50 text-xs uppercase tracking-wider">
                sqft Area
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white">
              About this property
            </h2>
            <div className="text-blue-200/70 leading-relaxed text-lg whitespace-pre-line">
              {property.description}
            </div>
          </div>

          {/* Amenities */}
          <AmenitiesList amenities={property.amenities} />
        </div>

        {/* Right Column: Sidebar */}
        <div className="space-y-6">
          {/* Pricing & Booking Card */}
          <div className="sticky top-24 backdrop-blur-2xl bg-slate-900/80 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
            <div className="space-y-1">
              <div className="text-blue-200/50 text-sm font-medium uppercase tracking-widest">
                Monthly Rent
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-white">
                  {property.price}
                </span>
                <span className="text-blue-200/50 text-lg">/mo</span>
              </div>
            </div>

            <div className="pt-4 space-y-3">
              <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2">
                <TrendingUp className="w-5 h-5" />
                <span>Apply for Smart Lease</span>
              </button>
              <button className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-4 rounded-2xl border border-white/5 transition-all flex items-center justify-center gap-2">
                <Calendar className="w-5 h-5" />
                <span>Schedule a Tour</span>
              </button>
            </div>

            <div className="pt-6 border-t border-white/5 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 p-0.5 shadow-lg">
                  <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-white font-bold text-xl overflow-hidden">
                    {property.manager.avatar ? (
                      <Image
                        src={property.manager.avatar}
                        alt={property.manager.name}
                        width={56}
                        height={56}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      property.manager.name.charAt(0)
                    )}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white text-lg">
                      {property.manager.name}
                    </span>
                    {property.manager.verified && (
                      <Shield className="w-4 h-4 text-blue-400" />
                    )}
                  </div>
                  <div className="text-blue-200/50 text-sm">
                    Response time: {property.manager.responseTime}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button className="flex-1 flex items-center justify-center gap-2 bg-slate-800/50 hover:bg-slate-700/50 text-white p-3 rounded-xl border border-white/10 transition-all">
                  <MessageCircle className="w-5 h-5" />
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 bg-slate-800/50 hover:bg-slate-700/50 text-white p-3 rounded-xl border border-white/10 transition-all">
                  <Phone className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="pt-2 text-center">
              <p className="text-xs text-blue-200/30">
                Property ID: CHI-{property.id.toString().padStart(6, '0')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
