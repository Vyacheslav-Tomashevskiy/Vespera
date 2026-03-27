'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '../keys';
import type { Permission, Role } from '@/types';

type AssignRolePayload = {
  userId: string;
  role: string;
};

type UpdateRolePermissionsPayload = {
  roleId: string;
  permissionIds: string[];
};

export function useAdminRoles() {
  return useQuery({
    queryKey: queryKeys.roles.list(),
    queryFn: async () => {
      const { data } = await apiClient.get<Role[]>(
        '/api/v1/security/rbac/roles',
      );
      return data;
    },
  });
}

export function useAdminPermissions() {
  return useQuery({
    queryKey: queryKeys.roles.permissions(),
    queryFn: async () => {
      const { data } = await apiClient.get<Permission[]>(
        '/api/v1/security/rbac/permissions',
      );
      return data;
    },
  });
}

export function useAssignUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: AssignRolePayload) => {
      await apiClient.patch(`/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
    },
  });
}

export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      roleId,
      permissionIds,
    }: UpdateRolePermissionsPayload) => {
      await apiClient.patch(`/api/v1/security/rbac/roles/${roleId}`, {
        permissionIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
    },
  });
}
