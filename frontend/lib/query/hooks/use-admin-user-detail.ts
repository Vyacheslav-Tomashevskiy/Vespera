'use client';

import { useQuery } from '@tanstack/react-query';
import {
  fetchAdminUserDetailExtras,
  fetchAdminUserWithFallback,
} from '@/lib/admin-user-detail';
import type { AdminUserDetailExtras } from '@/lib/admin-user-detail';
import type { User } from '@/types';

export const adminUserDetailBundleKey = (userId: string) =>
  ['admin-user-detail-bundle', userId] as const;

export function useAdminUserDetailBundle(userId: string | null) {
  return useQuery({
    queryKey: adminUserDetailBundleKey(userId ?? ''),
    queryFn: async (): Promise<{
      user: User;
      extras: AdminUserDetailExtras;
    }> => {
      const user = await fetchAdminUserWithFallback(userId!);
      const extras = await fetchAdminUserDetailExtras(userId!, user);
      return { user, extras };
    },
    enabled: Boolean(userId),
  });
}
