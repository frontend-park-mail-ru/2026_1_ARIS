/**
 * Входная точка страницы техподдержки.
 *
 * Нужна в iframe-режиме виджета и инициализирует страницу после восстановления сессии.
 */
import { initSession } from "../../state/session";
import { initSupport } from "./events";

export { initSupport } from "./events";
export { renderSupportWidget } from "./render";

/**
 * Инициализирует standalone-страницу техподдержки.
 *
 * @returns {Promise<void>}
 */
export async function initSupportPage(): Promise<void> {
  await initSession();
  const root = document.getElementById("app");
  if (root) {
    await initSupport(root);
  }
}
