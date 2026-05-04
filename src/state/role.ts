/**
 * Производные проверки роли текущего пользователя.
 *
 * Содержит компактные helper-функции для UI и роутов,
 * чтобы логика ролей не дублировалась по страницам.
 */
import type { UserRole } from "../api/auth";
import { getSessionUser } from "./session";

/**
 * Возвращает роль текущего пользователя.
 *
 * Для гостя используется роль `user`, чтобы проверки прав
 * не требовали постоянной работы с `null`.
 *
 * @returns {UserRole} Текущая роль пользователя.
 */
export function getSessionRole(): UserRole {
  return getSessionUser()?.role ?? "user";
}

/**
 * Проверяет, является ли пользователь администратором.
 *
 * @returns {boolean}
 */
export function isAdmin(): boolean {
  return getSessionRole() === "admin";
}

/**
 * Проверяет, относится ли пользователь к support-линии.
 *
 * @returns {boolean}
 */
export function isSupportAgent(): boolean {
  const role = getSessionRole();
  return role === "support_l1" || role === "support_l2" || role === "admin";
}

/**
 * Проверяет, есть ли у пользователя права второй линии поддержки.
 *
 * @returns {boolean}
 */
export function isL2Agent(): boolean {
  const role = getSessionRole();
  return role === "support_l2" || role === "admin";
}

/**
 * Проверяет, можно ли показывать административный раздел.
 *
 * @returns {boolean}
 */
export function canViewAdminPanel(): boolean {
  return isSupportAgent();
}
