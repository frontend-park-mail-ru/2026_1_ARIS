import type { UserRole } from "../api/auth";
import { getSessionUser } from "./session";

export function getSessionRole(): UserRole {
  return getSessionUser()?.role ?? "user";
}

export function isAdmin(): boolean {
  return getSessionRole() === "admin";
}

export function isSupportAgent(): boolean {
  const role = getSessionRole();
  return role === "support_l1" || role === "support_l2" || role === "admin";
}

export function isL2Agent(): boolean {
  const role = getSessionRole();
  return role === "support_l2" || role === "admin";
}

export function canViewAdminPanel(): boolean {
  return isSupportAgent();
}
