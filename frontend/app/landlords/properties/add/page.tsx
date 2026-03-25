'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Save,
  Sparkles,
  Upload,
} from 'lucide-react';
import {
  useDeleteWizardDraft,
  usePublishWizardDraft,
  useStartPropertyListingWizard,
  useUpdateWizardStep,
  type PropertyListingWizardDraft,
} from '@/lib/query/hooks/use-properties';

type WizardPhoto = {
  id: string;
  fileName: string;
  caption: string;
  previewUrl: string;
  size: number;
};
type WizardData = Record<string, unknown>;

const steps = [
  'Basic Information',
  'Pricing & Terms',
  'Amenities',
  'House Rules',
  'Photos',
  'Description',
  'Availability',
  'Preview & Publish',
];

const emptyData: WizardData = {
  basicInfo: { propertyType: 'apartment' },
  pricing: {},
  amenities: {},
  rules: {},
  photos: [],
  description: {},
  availability: { blockedDates: [] },
};

function computeCompleteness(data: WizardData): number {
  const checks = [
    !!data.basicInfo?.address,
    !!data.basicInfo?.bedrooms,
    Number(data.pricing?.monthlyRent || 0) > 0,
    !!data.pricing?.moveInDate,
    Array.isArray(data.photos) && data.photos.length >= 3,
    String(data.description?.propertyDescription || '').trim().length >= 40,
    !!data.availability?.availableFrom,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export default function AddPropertyPage() {
  const router = useRouter();
  const [draftId, setDraftId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('property_wizard_draft_id');
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [formData, setFormData] = useState<WizardData>(emptyData);
  const [lastSavedAt, setLastSavedAt] = useState<string>('Not saved yet');
  const [error, setError] = useState<string | null>(null);

  const startWizard = useStartPropertyListingWizard();
  const publishWizard = usePublishWizardDraft(draftId || '');
  const deleteWizard = useDeleteWizardDraft();
  const updateWizard = useUpdateWizardStep(draftId || '');

  const completeness = useMemo(() => computeCompleteness(formData), [formData]);
  const canPublish = completeness >= 100;

  useEffect(() => {
    if (draftId || startWizard.isPending) return;
    startWizard.mutate(
      { data: emptyData },
      {
        onSuccess: (draft: PropertyListingWizardDraft) => {
          setDraftId(draft.id);
          setFormData(draft.data || emptyData);
          setCurrentStep(draft.currentStep || 1);
          setCompletedSteps(draft.completedSteps || []);
          localStorage.setItem('property_wizard_draft_id', draft.id);
          setLastSavedAt(new Date().toLocaleTimeString());
        },
      },
    );
  }, [draftId, startWizard]);

  useEffect(() => {
    if (!draftId) return;
    const timer = setTimeout(() => {
      updateWizard.mutate(
        {
          step: currentStep,
          data: formData,
          completedSteps,
        },
        {
          onSuccess: () => setLastSavedAt(new Date().toLocaleTimeString()),
        },
      );
    }, 800);
    return () => clearTimeout(timer);
  }, [draftId, currentStep, formData, completedSteps, updateWizard]);

  const setSection = (section: string, key: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      [section]: { ...(prev[section] || {}), [key]: value },
    }));
  };

  const next = () => {
    setCompletedSteps((prev) =>
      prev.includes(currentStep) ? prev : [...prev, currentStep],
    );
    setCurrentStep((prev) => Math.min(8, prev + 1));
  };

  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    const nextPhotos: WizardPhoto[] = Array.from(files).map((file) => ({
      id: `${Date.now()}-${file.name}`,
      fileName: file.name,
      caption: '',
      previewUrl: URL.createObjectURL(file),
      size: file.size,
    }));
    setFormData((prev) => ({
      ...prev,
      photos: [...(prev.photos || []), ...nextPhotos],
    }));
  };

  const pricingSuggestion = useMemo(() => {
    const bedrooms = Number(formData.basicInfo?.bedrooms || 1);
    const sqft = Number(formData.basicInfo?.squareFootage || 450);
    const suggested = Math.round((bedrooms * 350 + sqft * 1.2) / 10) * 10;
    return suggested;
  }, [formData.basicInfo]);

  const amenityRecommendations = useMemo(() => {
    const type = formData.basicInfo?.propertyType;
    if (type === 'room') return ['WiFi', 'Laundry', 'Heating'];
    if (type === 'house') return ['Parking', 'Air Conditioning', 'Heating'];
    return ['WiFi', 'Kitchen Appliances', 'Air Conditioning'];
  }, [formData.basicInfo?.propertyType]);

  const publish = () => {
    setError(null);
    if (!draftId) return;
    publishWizard.mutate(undefined, {
      onSuccess: async () => {
        localStorage.removeItem('property_wizard_draft_id');
        await deleteWizard.mutateAsync(draftId).catch(() => undefined);
        router.push('/landlords/properties');
      },
      onError: (e: unknown) => {
        const message =
          typeof e === 'object' &&
          e !== null &&
          'message' in e &&
          typeof (e as { message?: unknown }).message === 'string'
            ? (e as { message: string }).message
            : 'Unable to publish property. Please check required fields.';
        setError(
          message,
        );
      },
    });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/landlords/properties"
            className="rounded-lg border border-neutral-200 p-2 hover:bg-neutral-50"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">
              Property Listing Wizard
            </h1>
            <p className="text-sm text-neutral-500">
              Step {currentStep} of 8 • Auto-saved at {lastSavedAt}
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm text-blue-700">
          Completeness: <span className="font-semibold">{completeness}%</span>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="mb-4 h-2 w-full rounded-full bg-neutral-100">
          <div
            className="h-2 rounded-full bg-brand-blue transition-all"
            style={{ width: `${(currentStep / 8) * 100}%` }}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-neutral-500 md:grid-cols-4">
          {steps.map((label, idx) => (
            <button
              key={label}
              onClick={() => setCurrentStep(idx + 1)}
              className={`rounded-lg px-2 py-1 text-left ${currentStep === idx + 1 ? 'bg-blue-50 text-blue-700' : ''}`}
            >
              {idx + 1}. {label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        {currentStep === 1 && (
          <div className="grid gap-4 md:grid-cols-2">
            <input
              className="rounded-xl border p-3"
              placeholder="Property type (apartment, house, room)"
              value={formData.basicInfo?.propertyType || ''}
              onChange={(e) =>
                setSection('basicInfo', 'propertyType', e.target.value)
              }
            />
            <input
              className="rounded-xl border p-3"
              placeholder="Address"
              value={formData.basicInfo?.address || ''}
              onChange={(e) =>
                setSection('basicInfo', 'address', e.target.value)
              }
            />
            <input
              className="rounded-xl border p-3"
              placeholder="Bedrooms"
              type="number"
              value={formData.basicInfo?.bedrooms || ''}
              onChange={(e) =>
                setSection('basicInfo', 'bedrooms', Number(e.target.value))
              }
            />
            <input
              className="rounded-xl border p-3"
              placeholder="Bathrooms"
              type="number"
              value={formData.basicInfo?.bathrooms || ''}
              onChange={(e) =>
                setSection('basicInfo', 'bathrooms', Number(e.target.value))
              }
            />
            <input
              className="rounded-xl border p-3"
              placeholder="Square footage"
              type="number"
              value={formData.basicInfo?.squareFootage || ''}
              onChange={(e) =>
                setSection('basicInfo', 'squareFootage', Number(e.target.value))
              }
            />
            <input
              className="rounded-xl border p-3"
              placeholder="Year built"
              type="number"
              value={formData.basicInfo?.yearBuilt || ''}
              onChange={(e) =>
                setSection('basicInfo', 'yearBuilt', Number(e.target.value))
              }
            />
          </div>
        )}

        {currentStep === 2 && (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <input
                className="w-full rounded-xl border p-3"
                placeholder="Monthly rent"
                type="number"
                value={formData.pricing?.monthlyRent || ''}
                onChange={(e) =>
                  setSection('pricing', 'monthlyRent', Number(e.target.value))
                }
              />
              <p className="mt-2 text-xs text-blue-700">
                Suggested rent: ${pricingSuggestion.toLocaleString()}
              </p>
            </div>
            <input
              className="rounded-xl border p-3"
              placeholder="Security deposit"
              type="number"
              value={formData.pricing?.securityDeposit || ''}
              onChange={(e) =>
                setSection('pricing', 'securityDeposit', Number(e.target.value))
              }
            />
            <input
              className="rounded-xl border p-3"
              placeholder="Lease term (months)"
              type="number"
              value={formData.pricing?.leaseTermMonths || ''}
              onChange={(e) =>
                setSection('pricing', 'leaseTermMonths', Number(e.target.value))
              }
            />
            <input
              className="rounded-xl border p-3"
              type="date"
              value={formData.pricing?.moveInDate || ''}
              onChange={(e) =>
                setSection('pricing', 'moveInDate', e.target.value)
              }
            />
            <input
              className="rounded-xl border p-3 md:col-span-2"
              placeholder="Utilities included (comma-separated)"
              value={formData.pricing?.utilitiesIncluded || ''}
              onChange={(e) =>
                setSection('pricing', 'utilitiesIncluded', e.target.value)
              }
            />
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-neutral-500">
              Recommended: {amenityRecommendations.join(', ')}
            </p>
            {[
              'wifi',
              'parking',
              'kitchenAppliances',
              'laundry',
              'airConditioning',
              'heating',
              'furnished',
            ].map((k) => (
              <label key={k} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(formData.amenities?.[k])}
                  onChange={(e) => setSection('amenities', k, e.target.checked)}
                />
                <span className="capitalize">
                  {k.replace(/([A-Z])/g, ' $1')}
                </span>
              </label>
            ))}
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-3">
            {[
              'smokingAllowed',
              'petsAllowed',
              'partiesAllowed',
              'childrenAllowed',
            ].map((k) => (
              <label key={k} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(formData.rules?.[k])}
                  onChange={(e) => setSection('rules', k, e.target.checked)}
                />
                <span className="capitalize">
                  {k.replace(/([A-Z])/g, ' $1')}
                </span>
              </label>
            ))}
            <input
              className="w-full rounded-xl border p-3"
              placeholder="Quiet hours"
              value={formData.rules?.quietHours || ''}
              onChange={(e) =>
                setSection('rules', 'quietHours', e.target.value)
              }
            />
            <textarea
              className="w-full rounded-xl border p-3"
              rows={3}
              placeholder="Guest policy"
              value={formData.rules?.guestPolicy || ''}
              onChange={(e) =>
                setSection('rules', 'guestPolicy', e.target.value)
              }
            />
          </div>
        )}

        {currentStep === 5 && (
          <div className="space-y-4">
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-neutral-300 p-4 text-sm text-neutral-600">
              <Upload size={16} /> Upload photos
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => addPhotos(e.target.files)}
              />
            </label>
            <div className="grid gap-4 md:grid-cols-3">
              {(formData.photos || []).map(
                (photo: WizardPhoto, index: number) => (
                  <div key={photo.id} className="rounded-xl border p-2">
                    <Image
                      src={photo.previewUrl}
                      alt={photo.fileName}
                      width={512}
                      height={256}
                      unoptimized
                      className="h-32 w-full rounded-lg object-cover"
                    />
                    <input
                      className="mt-2 w-full rounded-lg border p-2 text-sm"
                      placeholder="Caption"
                      value={photo.caption}
                      onChange={(e) => {
                        const next = [...formData.photos];
                        next[index] = { ...photo, caption: e.target.value };
                        setFormData((prev) => ({ ...prev, photos: next }));
                      }}
                    />
                  </div>
                ),
              )}
            </div>
            <p className="text-xs text-neutral-500">
              Minimum 3 photos required. Current:{' '}
              {(formData.photos || []).length}
            </p>
          </div>
        )}

        {currentStep === 6 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-700">
              <Sparkles className="mr-1 inline-block" size={14} />
              Suggestion: Highlight natural light, nearby transit, and recent
              upgrades.
            </div>
            <textarea
              className="w-full rounded-xl border p-3"
              rows={5}
              placeholder="Property description"
              value={formData.description?.propertyDescription || ''}
              onChange={(e) =>
                setSection('description', 'propertyDescription', e.target.value)
              }
            />
            <textarea
              className="w-full rounded-xl border p-3"
              rows={3}
              placeholder="Neighborhood description"
              value={formData.description?.neighborhoodDescription || ''}
              onChange={(e) =>
                setSection(
                  'description',
                  'neighborhoodDescription',
                  e.target.value,
                )
              }
            />
            <textarea
              className="w-full rounded-xl border p-3"
              rows={2}
              placeholder="Transportation info and nearby amenities"
              value={formData.description?.transportationInfo || ''}
              onChange={(e) =>
                setSection('description', 'transportationInfo', e.target.value)
              }
            />
          </div>
        )}

        {currentStep === 7 && (
          <div className="space-y-4">
            <input
              className="rounded-xl border p-3"
              type="date"
              value={formData.availability?.availableFrom || ''}
              onChange={(e) =>
                setSection('availability', 'availableFrom', e.target.value)
              }
            />
            <textarea
              className="w-full rounded-xl border p-3"
              rows={3}
              placeholder="Blocked dates (comma-separated, YYYY-MM-DD)"
              value={formData.availability?.blockedDatesText || ''}
              onChange={(e) => {
                setSection('availability', 'blockedDatesText', e.target.value);
                setSection(
                  'availability',
                  'blockedDates',
                  e.target.value
                    .split(',')
                    .map((v) => v.trim())
                    .filter(Boolean),
                );
              }}
            />
          </div>
        )}

        {currentStep === 8 && (
          <div className="space-y-4">
            <pre className="max-h-[380px] overflow-auto rounded-xl bg-neutral-900 p-4 text-xs text-neutral-100">
              {JSON.stringify(formData, null, 2)}
            </pre>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              onClick={publish}
              disabled={!canPublish || publishWizard.isPending}
              className="rounded-xl bg-brand-blue px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {publishWizard.isPending ? 'Publishing...' : 'Publish Property'}
            </button>
            {!canPublish && (
              <p className="text-sm text-amber-600">
                Listing completeness must reach 100% before publishing.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
          disabled={currentStep === 1}
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 disabled:opacity-40"
        >
          <ChevronLeft size={16} /> Back
        </button>
        <button
          onClick={() =>
            updateWizard.mutate({
              step: currentStep,
              data: formData,
              completedSteps,
            })
          }
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-blue-700"
        >
          <Save size={16} /> Save Draft
        </button>
        <button
          onClick={next}
          disabled={currentStep === 8}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-4 py-2 text-white disabled:opacity-40"
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
