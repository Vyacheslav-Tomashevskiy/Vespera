'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/store/authStore';
import { AdminUserDetailView } from '@/components/admin/users/AdminUserDetailView';
import { Loader2 } from 'lucide-react';

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user?.role !== 'admin') {
      router.replace('/landlords');
    }
  }, [authLoading, user?.role, router]);

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

  return <AdminUserDetailView userId={userId} />;
}
