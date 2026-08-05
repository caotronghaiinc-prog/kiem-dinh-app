"use client";

import type { ReactNode } from "react";
import { useCurrentUserProfile } from "@/hooks/use-current-user-profile";
import type { UserRole } from "@/lib/types/profile";

interface RoleGateProps {
  allowedRoles: UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

/** Ẩn/hiện UI theo role, vd: <RoleGate allowedRoles={['admin']}>Xóa</RoleGate> */
export function RoleGate({ allowedRoles, children, fallback = null }: RoleGateProps) {
  const { profile, loading } = useCurrentUserProfile();

  if (loading) return null;
  if (!profile || !allowedRoles.includes(profile.role)) return <>{fallback}</>;

  return <>{children}</>;
}
