'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/authStore';
import { RefundManagement } from '@/components/admin/refunds/RefundManagement';
import { loadAdminRefundRequests } from '@/lib/admin-refund-requests';
import type { AdminRefundRequestRow } from '@/lib/admin-refund-requests';
import { Loader2 } from 'lucide-react';

export default function AdminRefundsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<AdminRefundRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user?.role !== 'admin') {
      router.replace('/landlords');
    }
  }, [authLoading, user?.role, router]);

  useEffect(() => {
    if (authLoading || user?.role !== 'admin') return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await loadAdminRefundRequests();
        if (!cancelled) setRows(data);
      } catch {
        if (!cancelled) setError('Could not load refund requests.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.role]);

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

  return <RefundManagement rows={rows} loading={loading} error={error} />;
}
