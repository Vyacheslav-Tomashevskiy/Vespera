'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/store/authStore';
import { RefundRequestDetail } from '@/components/admin/refunds/RefundRequestDetail';
import {
  loadAdminRefundRequestDetail,
  submitAdminRefundDecision,
  type AdminRefundHistoryEntry,
  type AdminRefundRequestDetail,
} from '@/lib/admin-refund-requests';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminRefundDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user, loading: authLoading } = useAuth();

  const [refund, setRefund] = useState<AdminRefundRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && user?.role !== 'admin') {
      router.replace('/landlords');
    }
  }, [authLoading, user?.role, router]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const d = await loadAdminRefundRequestDetail(id);
      if (!d) {
        setNotFound(true);
        setRefund(null);
      } else {
        setRefund(d);
      }
    } catch {
      setNotFound(true);
      setRefund(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (authLoading || user?.role !== 'admin') return;
    void refresh();
  }, [authLoading, user?.role, refresh]);

  const handleDecision = async (args: {
    action: 'approve' | 'reject';
    notes: string;
  }) => {
    if (!refund) return;
    setSubmitting(true);
    try {
      await submitAdminRefundDecision(refund.id, {
        action: args.action,
        notes: args.notes,
      });

      const decidedAt = new Date().toISOString();
      const entry: AdminRefundHistoryEntry = {
        id: `h-${Date.now()}`,
        action: args.action === 'approve' ? 'approved' : 'rejected',
        message: args.notes,
        actorName: user ? `${user.firstName} ${user.lastName}` : 'Admin',
        actorRole: 'admin',
        createdAt: decidedAt,
      };

      setRefund((prev) => {
        if (!prev) return prev;
        const nextStatus =
          args.action === 'approve' ? ('APPROVED' as const) : ('REJECTED' as const);
        return {
          ...prev,
          status: nextStatus,
          updatedAt: decidedAt,
          history: [...prev.history, entry],
        };
      });

      toast.success(
        args.action === 'approve'
          ? 'Refund approved — request marked for processing.'
          : 'Refund request rejected.',
      );
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Failed to record decision.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-blue-200/80">
        <Loader2 className="animate-spin" size={28} />
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-blue-200/80">
        <Loader2 className="animate-spin" size={28} />
      </div>
    );
  }

  if (notFound || !refund) {
    return (
      <div className="max-w-lg mx-auto text-center space-y-4 py-16">
        <p className="text-white text-lg font-semibold">Refund not found</p>
        <p className="text-slate-400 text-sm">
          This request may have been removed or the link is invalid.
        </p>
        <button
          type="button"
          onClick={() => router.push('/admin/refunds')}
          className="text-emerald-400 hover:text-emerald-300 font-medium"
        >
          Back to refunds
        </button>
      </div>
    );
  }

  return (
    <RefundRequestDetail
      refund={refund}
      onBack={() => router.push('/admin/refunds')}
      onSubmitDecision={handleDecision}
      isSubmitting={submitting}
    />
  );
}
