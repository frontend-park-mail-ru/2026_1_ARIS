import type { GameRoom } from "../../../api/games";
import {
  renderAdminConfirmModal,
  renderDisbandConfirmModal,
  renderJoinPasswordModal,
  renderKickConfirmModal,
  renderLeaveConfirmModal,
  renderPasswordModal,
  renderProfileNavigationConfirmModal,
  renderQuestionReportConfirmModal,
  renderRenameTitleModal,
  renderStartConfirmModal,
} from "./modal";
import type { GamesPageState } from "../state/store";

export type RenderGamesOverlayOptions = {
  state: GamesPageState;
  reportingQuestionKeys: ReadonlySet<string>;
  getRoomTitleValue: (room: GameRoom) => string;
  renderPlayerProfileLink: (player: GameRoom["players"][number]) => string;
  renderRoomAuthor: (room: GameRoom) => string;
  renderFloatingMenu: () => string;
};

/**
 * Рендерит confirm-модалку жалобы на вопрос.
 */
export function renderQuestionReportOverlay(options: RenderGamesOverlayOptions): string {
  const questionKey = options.state.reportConfirmQuestionKey;
  if (!questionKey || !options.state.room) return "";
  return renderQuestionReportConfirmModal({
    questionKey,
    isReporting: options.reportingQuestionKeys.has(questionKey),
  });
}

/**
 * Рендерит все overlay-модалки страницы игр.
 */
export function renderGamesOverlay(options: RenderGamesOverlayOptions): string {
  const { state } = options;
  return `
    ${renderDisbandConfirmModal({
      open: state.disbandConfirmOpen,
      loading: state.loading,
    })}
    ${renderStartConfirmModal({
      open: state.startConfirmOpen,
      loading: state.loading,
    })}
    ${renderLeaveConfirmModal({
      open: state.leaveConfirmOpen,
      loading: state.loading,
    })}
    <div data-games-report-overlay>${renderQuestionReportOverlay(options)}</div>
    ${renderProfileNavigationConfirmModal(state.profileNavigationConfirm)}
    ${renderPlayerActionConfirmModal(options, state.kickConfirmProfileId, "kick")}
    ${renderPlayerActionConfirmModal(options, state.adminConfirmProfileId, "admin")}
    ${renderRenameTitleModal({
      open: state.renameTitleModalOpen && Boolean(state.room),
      roomTitle: state.room ? options.getRoomTitleValue(state.room) : "",
      loading: state.loading,
      error: state.errorTarget === "form" ? state.error : "",
    })}
    ${renderPasswordModal({
      mode: state.passwordModalMode,
      loading: state.loading,
      error: state.errorTarget === "password" ? state.error : "",
    })}
    ${renderJoinPasswordOverlay(options)}
    ${options.renderFloatingMenu()}
  `;
}

/**
 * Рендерит confirm-модалку действия над игроком.
 */
function renderPlayerActionConfirmModal(
  options: RenderGamesOverlayOptions,
  profileId: string,
  mode: "kick" | "admin",
): string {
  const player = options.state.room?.players.find((item) => item.profileId === profileId) ?? null;
  const playerMarkup = player ? options.renderPlayerProfileLink(player) : "";
  const payload = {
    profileId,
    playerMarkup,
    loading: options.state.loading,
  };
  return mode === "kick" ? renderKickConfirmModal(payload) : renderAdminConfirmModal(payload);
}

/**
 * Рендерит модалку входа в комнату с паролем.
 */
function renderJoinPasswordOverlay(options: RenderGamesOverlayOptions): string {
  const { state } = options;
  const room = state.rooms.find((item) => item.id === state.joinPasswordRoomId);
  const roomTitle = room ? options.getRoomTitleValue(room) : "Комната защищена паролем";
  const roomId = room?.id || state.joinPasswordRoomId;
  const errorText = state.joinPasswordError || (state.errorTarget === "form" ? state.error : "");
  return renderJoinPasswordModal({
    roomId,
    roomTitle,
    inviteCode: room?.inviteCode ?? "",
    authorMarkup: room ? options.renderRoomAuthor(room) : "",
    passwordValue: state.joinPasswordValue,
    passwordVisible: state.joinPasswordVisible,
    error: errorText,
    loading: state.loading,
  });
}
