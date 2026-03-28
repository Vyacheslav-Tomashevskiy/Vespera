'use client';

import React, { useState, useEffect } from 'react';
import { PropertyData } from '@/store/wizard-store';
import { Presentation, Edit2, CheckCircle, Search, DollarSign, List, Home, Shield, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useWizardStore } from '@/store/wizard-store';

interface StepProps {
  data: PropertyData;
  onChange: (data: Partial<PropertyData>) => void;
  errors: Record<string, string>;
}

export const Step8Preview: React.FC<StepProps> = ({ data, onChange, errors }) => {
  const { draftId, setCurrentStep } = useWizardStore();
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiScore, setAiScore] = useState<any>(null);

  useEffect(() => {
    const fetchScore = async () => {
      if (!draftId) return;
      setIsAiLoading(true);
      try {
        const res = await axios.get(`/api/property-listings/wizard/${draftId}/ai/completeness-score`);
        if (res.data.available) {
          setAiScore(res.data);
        }
      } catch (err) {
        console.error('AI Score failed:', err);
      } finally {
        setIsAiLoading(false);
      }
    };
    fetchScore();
  }, [draftId]);

  const SectionHeader = ({ title, step, icon }: { title: string, step: number, icon: React.ReactNode }) => (
    <div className="flex items-center justify-between py-4 border-b border-neutral-100 dark:border-neutral-800">
      <h3 className="text-lg font-bold flex items-center text-neutral-800 dark:text-neutral-200 uppercase tracking-tight">
        <span className="mr-3 p-2 bg-brand-blue/10 text-brand-blue rounded-lg">{icon}</span> {title}
      </h3>
      <button 
        onClick={() => setCurrentStep(step)}
        className="flex items-center text-xs font-bold text-neutral-400 hover:text-brand-blue transition-colors group"
      >
        <Edit2 size={12} className="mr-1 group-hover:scale-110 transition-transform" /> Edit
      </button>
    </div>
  );

  return (
    <div className="space-y-10 animate-slide-in">
      <div className="flex items-center justify-between mb-8">
        <label className="text-xl font-bold flex items-center text-neutral-900 dark:text-neutral-100 uppercase tracking-tighter">
          <Presentation className="mr-3 text-brand-blue" />
          Final Review
        </label>
      </div>

      {/* AI Score */}
      <div className="bg-brand-blue/5 border-2 border-brand-blue/10 rounded-3xl p-8 mb-10 overflow-hidden relative group">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-48 h-48 bg-brand-blue/10 rounded-full blur-3xl" />
        <div className="relative flex flex-col md:flex-row items-center gap-10">
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-neutral-100 dark:text-neutral-800" />
              <circle 
                cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="10" fill="transparent" 
                strokeDasharray={364.4}
                strokeDashoffset={364.4 - (364.4 * (aiScore?.score || 0)) / 100}
                className={`transition-all duration-1000 ${ (aiScore?.score || 0) < 70 ? 'text-brand-orange' : 'text-green-500'}`} 
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center tabular-nums">
              <span className="text-3xl font-black text-neutral-900 dark:text-neutral-100">
                {isAiLoading ? '...' : aiScore?.score || 0}
              </span>
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-tighter">Score</span>
            </div>
          </div>

          <div className="flex-1 space-y-3">
            <h4 className="text-lg font-bold text-brand-blue flex items-center uppercase tracking-tight">
              <Sparkles size={18} className="mr-2" /> AI Listing Quality Analysis
            </h4>
            <div className="flex flex-wrap gap-2 pt-2">
              {isAiLoading ? (
                <div className="flex items-center space-x-2 text-neutral-400 animate-pulse">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-xs font-bold uppercase">Analyzing Listing Content...</span>
                </div>
              ) : aiScore?.improvements ? (
                aiScore.improvements.map((imp: string, i: number) => (
                  <span key={i} className="bg-white dark:bg-neutral-800 border-2 border-neutral-100 dark:border-neutral-700 text-[10px] font-bold py-2 px-4 rounded-full text-neutral-600 dark:text-neutral-400 shadow-sm animate-slide-in">
                    + {imp}
                  </span>
                ))
              ) : (
                <span className="text-xs text-neutral-400">Great job! Your listing is looking solid.</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-12">
        {/* Step 1 & 2 Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 group">
          <div className="space-y-6">
            <SectionHeader title="Property Details" step={1} icon={<Home size={18} />} />
            <div className="grid grid-cols-2 gap-6 pt-2">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Type</span>
                <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200 capitalize">{data.propertyType || '-'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Address</span>
                <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200">{data.address || '-'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Specs</span>
                <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200">{data.bedrooms} Bed, {data.bathrooms} Bath</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Area</span>
                <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200">{data.squareFootage} Sq. Ft.</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <SectionHeader title="Lease & Rent" step={2} icon={<DollarSign size={18} />} />
            <div className="grid grid-cols-2 gap-6 pt-2">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Monthly Rent</span>
                <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200">${data.monthlyRent || '0'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Security Deposit</span>
                <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200">${data.securityDeposit || '0'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Term</span>
                <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200 capitalize">{data.leaseTerm || '-'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Move-in</span>
                <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200 capitalize">{data.moveInDate || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Description Section */}
        <div className="space-y-6">
          <SectionHeader title="Property Description" step={6} icon={<Presentation size={18} />} />
          <div className="p-8 bg-neutral-50 dark:bg-neutral-800/50 rounded-3xl border border-neutral-100 dark:border-neutral-700 shadow-sm">
            <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 font-medium whitespace-pre-wrap">
              {data.propertyDescription || 'No description provided.'}
            </p>
          </div>
        </div>

        {/* Photos Section */}
        <div className="space-y-6">
          <SectionHeader title="Gallery Preview" step={5} icon={<Search size={18} />} />
          <div className="flex overflow-x-auto pb-4 gap-4 snap-x pr-4 custom-scrollbar">
            {(data.photos || []).length > 0 ? (
              data.photos?.map((photo, i) => (
                <div key={i} className="flex-none w-48 aspect-[4/3] bg-neutral-100 rounded-2xl overflow-hidden border border-neutral-100 dark:border-neutral-700 shadow-sm snap-start">
                  <img src={photo.url} alt={`Preview ${i}`} className="w-full h-full object-cover" />
                </div>
              ))
            ) : (
              <div className="w-full py-12 flex flex-col items-center justify-center bg-red-50 dark:bg-red-900/10 rounded-3xl border-2 border-dashed border-red-200 dark:border-red-900/20 text-red-500">
                <AlertCircle size={32} className="mb-2" />
                <span className="text-xs font-bold uppercase">No Photos Uploaded</span>
              </div>
            )}
          </div>
        </div>

        {/* Remaining Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-6">
          <div className="space-y-4">
            <SectionHeader title="Amenities" step={3} icon={<List size={18} />} />
            <div className="flex flex-wrap gap-2 pt-2">
              {data.amenities?.map((a) => (
                <span key={a} className="flex items-center text-[10px] font-bold px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-900/10 text-green-600 border border-green-100 dark:border-green-900/20">
                  <CheckCircle size={10} className="mr-1.5" /> {a}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <SectionHeader title="House Rules" step={4} icon={<Shield size={18} />} />
            <div className="flex flex-wrap gap-2 pt-2">
              {Object.entries(data.houseRules || {}).filter(([_, val]) => val).map(([key, _]) => (
                <span key={key} className="flex items-center text-[10px] font-bold px-3 py-1.5 rounded-full bg-brand-blue/5 text-brand-blue border border-brand-blue/10 capitalize">
                  + {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
