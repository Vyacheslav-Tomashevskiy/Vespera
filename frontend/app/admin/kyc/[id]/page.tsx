'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  Download,
  FileText,
  ShieldCheck,
  ShieldX,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useApproveKycVerification,
  useKycVerificationDetail,
  useRejectKycVerification,
} from '@/lib/query/hooks/use-kyc-verifications';

const rejectionReasonOptions = [
  'Blurry or unreadable document',
  'Expired identification document',
  'Name mismatch',
  'Address mismatch',
  'Missing supporting document',
  'Additional compliance review required',
];

const checklistItems = [
  {
    key: 'identity',
    label: 'Government ID matches submitted identity details',
  },
  { key: 'dob', label: 'Date of birth is present and appears valid' },
  { key: 'country', label: 'Country and residence details are complete' },
  {
    key: 'documents',
    label: 'All required documents are attached and legible',
  },
];

export default function KycVerificationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const verificationId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const detailQuery = useKycVerificationDetail(verificationId);
  const approveMutation = useApproveKycVerification();
  const rejectMutation = useRejectKycVerification();

  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    null,
  );
  const [zoom, setZoom] = useState(1);
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>(
    {},
  );
  const [rejectReason, setRejectReason] = useState(rejectionReasonOptions[0]);
  const [customReason, setCustomReason] = useState('');

  const verification = detailQuery.data;
  const documents = verification?.documents ?? [];
  const selectedDocument =
    documents.find((item) => item.id === selectedDocumentId) ?? documents[0];
  const fullName = useMemo(() => {
    const firstName = String(verification?.kycData?.first_name ?? '').trim();
    const lastName = String(verification?.kycData?.last_name ?? '').trim();
    return (
      verification?.user?.name ||
      [firstName, lastName].filter(Boolean).join(' ') ||
      'Unknown applicant'
    );
  }, [verification]);

  const checklistComplete = checklistItems.every(
    (item) => checklistState[item.key],
  );

  const historyItems = useMemo(() => {
    if (!verification) return [];

    return [
      {
        label: 'Verification submitted',
        detail: new Date(verification.createdAt).toLocaleString(),
      },
      {
        label: 'Current status',
        detail: verification.status,
      },
      verification.reason
        ? {
            label: 'Latest reviewer note',
            detail: verification.reason,
          }
        : null,
      verification.providerReference
        ? {
            label: 'Provider reference',
            detail: verification.providerReference,
          }
        : null,
      {
        label: 'Last updated',
        detail: new Date(verification.updatedAt).toLocaleString(),
      },
    ].filter(Boolean) as Array<{ label: string; detail: string }>;
  }, [verification]);

  const handleApprove = async () => {
    if (!verificationId) return;
    if (!checklistComplete) {
      toast.error('Complete the verification checklist before approving');
      return;
    }

    try {
      await approveMutation.mutateAsync({ verificationId });
      toast.success('KYC verification approved');
      void detailQuery.refetch();
    } catch {
      toast.error('Failed to approve KYC verification');
    }
  };

  const handleReject = async () => {
    if (!verificationId) return;

    const reason =
      customReason.trim() || rejectReason || 'KYC submission requires changes';

    try {
      await rejectMutation.mutateAsync({ verificationId, reason });
      toast.success('KYC verification rejected');
      void detailQuery.refetch();
    } catch {
      toast.error('Failed to reject KYC verification');
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/admin/kyc"
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to KYC queue
        </Link>
        <button
          type="button"
          onClick={() => router.push('/admin/kyc/rejected')}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
        >
          Rejected queue
        </button>
      </div>

      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-blue-300">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              KYC Verification Detail
            </h1>
            <p className="text-sm text-blue-200/60">
              Review documents, confirm checklist items, and complete the
              approval workflow for this applicant.
            </p>
          </div>
        </div>
      </header>

      {detailQuery.isLoading ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-blue-200/70">
          Loading verification detail...
        </div>
      ) : !verification ? (
        <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-8 text-rose-100">
          This KYC verification could not be loaded.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-blue-200/45">
                    Applicant
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    {fullName}
                  </h2>
                  <p className="mt-1 text-sm text-blue-200/65">
                    {verification.user?.email ?? 'No email provided'}
                  </p>
                </div>
                <span className="inline-flex rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-100">
                  {verification.status}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InfoCard label="User ID" value={verification.userId} />
                <InfoCard
                  label="Submitted"
                  value={new Date(verification.createdAt).toLocaleString()}
                />
                <InfoCard
                  label="Date of birth"
                  value={String(verification.kycData?.dob ?? 'Not supplied')}
                />
                <InfoCard
                  label="Country"
                  value={String(
                    verification.kycData?.country ?? 'Not supplied',
                  )}
                />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <h2 className="text-lg font-semibold text-white">
                Verification history
              </h2>
              <div className="mt-4 space-y-3">
                {historyItems.map((item) => (
                  <div
                    key={`${item.label}-${item.detail}`}
                    className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"
                  >
                    <p className="text-xs uppercase tracking-[0.16em] text-blue-200/45">
                      {item.label}
                    </p>
                    <p className="mt-2 text-sm text-white">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Document viewer
                  </h2>
                  <p className="text-sm text-blue-200/55">
                    Preview submitted documents, zoom in, or open them in a new
                    tab for deeper inspection.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setZoom((prev) => Math.max(0.8, prev - 0.2))}
                    className="rounded-xl border border-white/10 bg-white/5 p-2 text-white transition hover:bg-white/10"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom((prev) => Math.min(2, prev + 0.2))}
                    className="rounded-xl border border-white/10 bg-white/5 p-2 text-white transition hover:bg-white/10"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {documents.length === 0 ? (
                  <span className="text-sm text-blue-200/60">
                    No documents attached
                  </span>
                ) : (
                  documents.map((document) => (
                    <button
                      key={document.id}
                      type="button"
                      onClick={() => setSelectedDocumentId(document.id)}
                      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                        selectedDocument?.id === document.id
                          ? 'border-blue-400/30 bg-blue-500/10 text-blue-100'
                          : 'border-white/10 bg-white/5 text-white hover:bg-white/10'
                      }`}
                    >
                      <FileText className="h-4 w-4" />
                      {document.filename || document.type || 'Document'}
                    </button>
                  ))
                )}
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-4">
                {selectedDocument ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {selectedDocument.filename ||
                            selectedDocument.type ||
                            'Document Preview'}
                        </p>
                        <p className="text-xs text-blue-200/50">
                          Zoom {Math.round(zoom * 100)}%
                        </p>
                      </div>
                      <a
                        href={selectedDocument.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10"
                      >
                        <Download className="h-4 w-4" />
                        Open / Download
                      </a>
                    </div>

                    {/\.(png|jpe?g|gif|webp)$/i.test(selectedDocument.url) ? (
                      <div className="overflow-auto rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div
                          className="relative mx-auto h-[28rem] min-w-[18rem]"
                          style={{ width: `${zoom * 100}%` }}
                        >
                          <Image
                            src={selectedDocument.url}
                            alt={selectedDocument.filename || 'KYC document'}
                            fill
                            unoptimized
                            className="object-contain"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                        <iframe
                          title={selectedDocument.filename || 'KYC document'}
                          src={selectedDocument.url}
                          className="h-[32rem] w-full"
                          style={{
                            transform: `scale(${zoom})`,
                            transformOrigin: 'top center',
                          }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-blue-200/60">
                    Select a document to begin reviewing.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <h2 className="text-lg font-semibold text-white">
                  Verification checklist
                </h2>
                <div className="mt-4 space-y-3">
                  {checklistItems.map((item) => (
                    <label
                      key={item.key}
                      className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/50 p-4"
                    >
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 accent-blue-500"
                        checked={Boolean(checklistState[item.key])}
                        onChange={(event) =>
                          setChecklistState((prev) => ({
                            ...prev,
                            [item.key]: event.target.checked,
                          }))
                        }
                      />
                      <span className="text-sm text-white">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <h2 className="text-lg font-semibold text-white">
                  Approval workflow
                </h2>
                <p className="mt-2 text-sm text-blue-200/55">
                  Approve once the checklist is complete, or reject with a
                  documented reason to keep the review trail clear.
                </p>

                <div className="mt-4 space-y-3">
                  <select
                    value={rejectReason}
                    onChange={(event) => setRejectReason(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none"
                  >
                    {rejectionReasonOptions.map((option) => (
                      <option
                        key={option}
                        value={option}
                        className="bg-slate-950"
                      >
                        {option}
                      </option>
                    ))}
                  </select>
                  <textarea
                    value={customReason}
                    onChange={(event) => setCustomReason(event.target.value)}
                    placeholder="Optional reviewer note or rejection details..."
                    className="h-28 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none"
                  />
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    disabled={approveMutation.isPending}
                    onClick={() => void handleApprove()}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    Approve verification
                  </button>
                  <button
                    type="button"
                    disabled={rejectMutation.isPending}
                    onClick={() => void handleReject()}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ShieldX className="h-4 w-4" />
                    Reject verification
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-blue-200/45">
        {label}
      </p>
      <p className="mt-2 text-sm text-white">{value}</p>
    </div>
  );
}
