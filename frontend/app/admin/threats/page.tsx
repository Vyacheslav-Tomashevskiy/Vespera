'use client';

import React from 'react';
import { ThreatDashboard } from '@/components/admin/ThreatDashboard';
import { useAuth } from '@/store/authStore';
import { useRouter } from 'next/navigation';

export default function AdminThreatsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Guard for admin access
  const hasAccess = user?.role === 'admin' || user?.role === 'auditor';

  React.useEffect(() => {
    if (!loading && !hasAccess) {
      router.replace('/admin');
    }
  }, [loading, hasAccess, router]);

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      <ThreatDashboard />
    </main>
  );
}
