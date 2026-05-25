import type { GameRoom } from "../../../../api/games";

export type GamesDomRefreshRoot = Document | HTMLElement | null;

export type GamesDomRefreshOptions = {
  root: GamesDomRefreshRoot;
  room: GameRoom | null;
  renderContent: () => string;
  renderPageShell: () => string;
  renderOverlay: () => string;
  renderQuestionReportOverlay: () => string;
  renderPlayersRail: (room: GameRoom) => string;
  renderRoomChat: (room: GameRoom) => string;
  startCountdown: (root: Document | HTMLElement) => void;
  focusAnswerInput: (root: Document | HTMLElement) => void;
  syncRoomSubscription: () => void;
  syncRoomsAutoRefresh: () => void;
  syncRoomStateRefresh: () => void;
  syncRoomChatRuntime: () => void;
  schedulePopoverOffsets: (root: Document | HTMLElement) => void;
  scrollRoomChatToBottom: (
    root: Document | HTMLElement,
    options?: { ensureAfterRender?: boolean },
  ) => void;
};
