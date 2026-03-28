import { apiClient } from '@/lib/api-client';
import type { KycStatus, User } from '@/types';
import type { PaginatedResponse } from '@/types';

export interface AdminUserPropertyRow {
  id: string;
  title: string;
  address: string;
  role: 'owner' | 'tenant';
  status: 'active' | 'ended' | 'draft';
}

export interface AdminUserDetailExtras {
  kycStatus: KycStatus;
  kycUpdatedAt?: string;
  kycNotes?: string;
  accountStatus: 'active' | 'suspended';
  properties: AdminUserPropertyRow[];
  agreementCount: number;
}

export function buildMockUser(userId: string): User {
  return {
    id: userId,
    email: `user-${userId.slice(0, 8)}@example.com`,
    name: 'Unknown user',
    role: 'tenant',
    phone: undefined,
    avatar: undefined,
    isVerified: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function buildMockExtras(user: User): AdminUserDetailExtras {
  const kycStatus: KycStatus = user.isVerified ? 'APPROVED' : 'PENDING';
  const kycNotes =
    kycStatus === 'PENDING'
      ? 'Awaiting document review.'
      : kycStatus === 'APPROVED'
        ? 'Identity verified against government ID.'
        : undefined;

  let properties: AdminUserPropertyRow[] = [];
  let agreementCount = 0;

  if (user.role === 'landlord') {
    properties = [
      {
        id: 'prop-mock-1',
        title: 'Sunset Apartments, Unit 4B',
        address: 'Lekki Phase 1, Lagos',
        role: 'owner',
        status: 'active',
      },
      {
        id: 'prop-mock-2',
        title: 'Glover Road duplex',
        address: 'Ikoyi, Lagos',
        role: 'owner',
        status: 'active',
      },
    ];
    agreementCount = 3;
  } else if (user.role === 'tenant') {
    properties = [
      {
        id: 'prop-mock-t1',
        title: 'Sunset Apartments, Unit 4B',
        address: 'Lekki Phase 1, Lagos',
        role: 'tenant',
        status: 'active',
      },
    ];
    agreementCount = 1;
  } else if (user.role === 'agent') {
    agreementCount = 0;
  } else {
    agreementCount = 0;
  }

  return {
    kycStatus,
    kycUpdatedAt: user.updatedAt,
    kycNotes,
    accountStatus: 'active',
    properties,
    agreementCount,
  };
}

export async function fetchAdminUserWithFallback(userId: string): Promise<User> {
  try {
    const res = await apiClient.get<User | { data: User }>(
      `/admin/users/${encodeURIComponent(userId)}`,
    );
    const body = res.data;
    if (body && typeof body === 'object') {
      if ('email' in body && typeof (body as User).email === 'string') {
        return body as User;
      }
      if ('data' in body && (body as { data?: User }).data) {
        return (body as { data: User }).data;
      }
    }
  } catch {
    // fallback below
  }

  try {
    const listRes = await apiClient.get<PaginatedResponse<User>>(
      `/admin/users?limit=500`,
    );
    const users = listRes.data.data ?? [];
    const found = users.find((u) => u.id === userId);
    if (found) return found;
  } catch {
    // fallback below
  }

  return buildMockUser(userId);
}

export async function fetchAdminUserDetailExtras(
  userId: string,
  user: User,
): Promise<AdminUserDetailExtras> {
  try {
    const res = await apiClient.get<
      AdminUserDetailExtras | { data: AdminUserDetailExtras }
    >(`/admin/users/${encodeURIComponent(userId)}/detail`);
    const body = res.data;
    const payload =
      body && typeof body === 'object' && 'kycStatus' in body
        ? (body as AdminUserDetailExtras)
        : (body as { data?: AdminUserDetailExtras }).data;
    if (payload) {
      const base = buildMockExtras(user);
      return {
        ...base,
        ...payload,
        properties:
          payload.properties?.length ? payload.properties : base.properties,
      };
    }
  } catch {
    // mock
  }
  return buildMockExtras(user);
}
