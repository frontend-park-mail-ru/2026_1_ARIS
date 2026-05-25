import { renderConfirmDialog } from "./confirm/base";

/** Рендерит подтверждение роспуска комнаты. */
export function renderDisbandConfirmModal(options: { open: boolean; loading: boolean }): string {
  if (!options.open) return "";
  return renderConfirmDialog({
    modalAttribute: "data-games-disband-modal",
    closeAttribute: "data-games-disband-close",
    confirmAttribute: "data-games-disband-confirm",
    ariaLabel: "Распустить комнату",
    title: "Распустить комнату?",
    text: "Вы действительно хотите распустить комнату?",
    confirmLabel: "Распустить",
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
    ariaLabel: "Начать игру",
    title: "Начать игру?",
    text: "Вы действительно хотите начать игру?",
    confirmLabel: "Начать",
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
    ariaLabel: "Покинуть игру",
    title: "Покинуть игру?",
    text: "Вы действительно хотите покинуть игру?",
    confirmLabel: "Покинуть",
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
    ariaLabel: "Пожаловаться на вопрос",
    title: "Пожаловаться на вопрос",
    text: "Вы можете отправить жалобу на вопрос, если считаете, что он некорректный. Администраторы рассмотрят ее в ближайшее время.",
    confirmLabel: options.isReporting ? "Отправляем..." : "Пожаловаться",
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
    ariaLabel: "Удалить из комнаты",
    title: "Удалить из комнаты?",
    text: "Вы действительно хотите удалить этого пользователя из комнаты?",
    confirmLabel: "Удалить",
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
    ariaLabel: "Назначить администратором",
    title: "Назначить администратором?",
    text: "Вы действительно хотите назначить этого участника администратором комнаты?",
    confirmLabel: "Назначить",
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
