import type { GamesDomRefreshOptions } from "./types";

/**
 * Обновляет общий overlay страницы игр.
 */
export function refreshGamesOverlayDom(options: GamesDomRefreshOptions): void {
  const { root } = options;
  if (!root) return;
  const overlay = root.querySelector<HTMLElement>("[data-games-overlay]");
  if (!overlay) return;

  overlay.innerHTML = options.renderOverlay();
  options.schedulePopoverOffsets(root);
}

/**
 * Обновляет overlay жалобы на вопрос или пересобирает общий overlay.
 */
export function refreshQuestionReportOverlayDom(options: GamesDomRefreshOptions): void {
  const { root } = options;
  if (!root) return;
  const reportOverlay = root.querySelector<HTMLElement>("[data-games-report-overlay]");
  if (!reportOverlay) {
    refreshGamesOverlayDom(options);
    return;
  }

  reportOverlay.innerHTML = options.renderQuestionReportOverlay();
}
