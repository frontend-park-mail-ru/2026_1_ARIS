import { gameT } from "../../shared/i18n";
import { renderConfirmDialog } from "./confirm/base";

/** Рендерит подтверждение роспуска комнаты. */
export function renderDisbandConfirmModal(options: { open: boolean; loading: boolean }): string {
  if (!options.open) return "";
  return renderConfirmDialog({
    modalAttribute: "data-games-disband-modal",
    closeAttribute: "data-games-disband-close",
    confirmAttribute: "data-games-disband-confirm",
    ariaLabel: gameT("modal.disbandTitle"),
    title: gameT("modal.disbandTitle"),
    text: gameT("modal.disbandText"),
    confirmLabel: gameT("modal.disbandConfirm"),
    confirmClass: "danger",
    loading: options.loading,
  });
}

/** Рендерит подтверждение старта игры. */
export function renderStartConfirmModal(options: { open: boolean; loading: boolean }): string {
  if (!options.open) return "";
  return renderConfirmDialog({
    modalAttribute: "data-games-start-modal",
    closeAttribute: "data-games-start-close",
    confirmAttribute: "data-games-start-confirm",
    ariaLabel: gameT("modal.startTitle"),
    title: gameT("modal.startTitle"),
    text: gameT("modal.startText"),
    confirmLabel: gameT("modal.startConfirm"),
    loading: options.loading,
  });
}

/** Рендерит подтверждение выхода из игры. */
export function renderLeaveConfirmModal(options: { open: boolean; loading: boolean }): string {
  if (!options.open) return "";
  return renderConfirmDialog({
    modalAttribute: "data-games-leave-modal",
    closeAttribute: "data-games-leave-close",
    confirmAttribute: "data-games-leave-confirm",
    ariaLabel: gameT("modal.leaveTitle"),
    title: gameT("modal.leaveTitle"),
    text: gameT("modal.leaveText"),
    confirmLabel: gameT("modal.leaveConfirm"),
    confirmClass: "danger",
    loading: options.loading,
  });
}

/** Рендерит подтверждение жалобы на вопрос. */
export function renderQuestionReportConfirmModal(options: {
  questionKey: string;
  isReporting: boolean;
}): string {
  if (!options.questionKey) return "";
  return renderConfirmDialog({
    modalAttribute: "data-games-report-modal",
    closeAttribute: "data-games-report-close",
    confirmAttribute: "data-games-report-confirm",
    ariaLabel: gameT("modal.reportTitle"),
    title: gameT("modal.reportTitle"),
    text: gameT("modal.reportText"),
    confirmLabel: options.isReporting ? gameT("menu.reporting") : gameT("menu.report"),
    confirmClass: "danger",
    loading: options.isReporting,
    dialogClassName: "games-confirm-modal__dialog--report",
    closeClassName: "games-confirm-modal__close",
  });
}

/** Рендерит подтверждение удаления игрока из комнаты. */
export function renderKickConfirmModal(options: {
  profileId: string;
  playerMarkup: string;
  loading: boolean;
}): string {
  if (!options.profileId) return "";
  return renderConfirmDialog({
    modalAttribute: "data-games-kick-modal",
    closeAttribute: "data-games-kick-close",
    confirmAttribute: "data-games-kick-confirm",
    ariaLabel: gameT("modal.kickTitle"),
    title: gameT("modal.kickTitle"),
    text: gameT("modal.kickText"),
    confirmLabel: gameT("modal.kickConfirm"),
    confirmClass: "danger",
    loading: options.loading,
    beforeText: renderPlayerConfirmPreview(options.playerMarkup),
  });
}

/** Рендерит подтверждение назначения администратора комнаты. */
export function renderAdminConfirmModal(options: {
  profileId: string;
  playerMarkup: string;
  loading: boolean;
}): string {
  if (!options.profileId) return "";
  return renderConfirmDialog({
    modalAttribute: "data-games-admin-modal",
    closeAttribute: "data-games-admin-close",
    confirmAttribute: "data-games-admin-confirm",
    ariaLabel: gameT("modal.adminTitle"),
    title: gameT("modal.adminTitle"),
    text: gameT("modal.adminText"),
    confirmLabel: gameT("modal.adminConfirm"),
    loading: options.loading,
    closeClassName: "games-confirm-modal__close",
    beforeText: renderPlayerConfirmPreview(options.playerMarkup),
  });
}

/**
 * Рендерит компактный preview игрока внутри confirm-модалки.
 */
function renderPlayerConfirmPreview(playerMarkup: string): string {
  if (!playerMarkup) return "";
  return `
    <div class="games-join-modal-author">
      ${playerMarkup}
    </div>
  `;
}
