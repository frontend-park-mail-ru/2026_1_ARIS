import type { GameRoom } from "../../../../api/games";
import type { GamesPageState } from "../../state/store";

export type GamesEventsRoot = (Document | HTMLElement) & {
  __gamesBound?: boolean;
};

type RoomChatStatePatch = Pick<
  Partial<GamesPageState>,
  | "roomChatMessages"
  | "roomChatLoading"
  | "roomChatSending"
  | "roomChatError"
  | "roomChatDraft"
  | "roomChatShowSystemMessages"
>;

export type BindGamesPageEventsOptions = {
  getState: () => Readonly<GamesPageState>;
  reportedQuestionKeys: Set<string>;
  reportingQuestionKeys: Set<string>;
  patchGamesState: (patch: Partial<GamesPageState>) => void;
  setGamesState: (patch: Partial<GamesPageState>) => void;
  setGamesOverlayState: (patch: Partial<GamesPageState>) => void;
  setQuestionReportOverlayState: (patch: Partial<GamesPageState>) => void;
  setRoomChatState: (
    patch: RoomChatStatePatch,
    options?: { scrollToBottom?: boolean; forceScrollToBottom?: boolean },
  ) => void;
  renderRoomsList: () => string;
  scheduleGamesPopoverViewportOffsets: (root: Document | HTMLElement) => void;
  getErrorMessage: (error: unknown, fallback: string) => string;
  showAppToast: (message: string) => void;
  selectLobbyMode: (mode: GamesPageState["lobbyMode"]) => Promise<void>;
  loadWaitingRooms: (options?: { preserveMessage?: boolean; silent?: boolean }) => Promise<void>;
  loadLeaderboard: () => Promise<void>;
  handleBackToRooms: () => Promise<void>;
  handleReturnToRoom: (roomId: string) => Promise<void>;
  getVoluntaryLeaveMessage: () => string;
  getVoluntaryLeaveReturnLabel: () => string;
  isRoomCreatedByCurrentUser: (room: GameRoom) => boolean;
  shouldBlockFullRoomJoin: (room: GameRoom) => boolean;
  handleJoinOwnListedRoom: (room: GameRoom) => Promise<void>;
  showRoomFullMessage: () => void;
  handleDisbandRoom: () => Promise<void>;
  handleStartRoom: () => Promise<void>;
  handleExitGameToMenu: () => Promise<void>;
  handleKickPlayer: (profileId: string) => Promise<void>;
  handleAssignAdmin: (profileId: string) => Promise<void>;
  closeGamesMenus: () => Partial<GamesPageState>;
  handleReportQuestion: (questionKey: string) => Promise<void>;
  syncQuestionReportButtons: (questionKey: string) => void;
  getCurrentPlayer: (room: GameRoom | null) => GameRoom["players"][number] | null | undefined;
  handlePauseRoom: () => Promise<void>;
  handleForceResumeRoom: () => Promise<void>;
  handleRoomRankedToggle: (isRanked: boolean) => Promise<void>;
  handleReadyToggle: (isReady: boolean) => Promise<void>;
  handleReplayToggle: (isReady: boolean) => Promise<void>;
  getRoomTitleValue: (room: GameRoom | null) => string;
  handleCopyInviteCode: (code: string) => Promise<void>;
  handleCopyRoomTitle: (title: string) => Promise<void>;
  handleCopyQuestionAnswer: (questionKey: string) => Promise<void>;
  handleShowPassword: () => Promise<void>;
  handleRemovePassword: () => Promise<void>;
  navigateToConfirmedProfile: () => void;
  openProfileNavigationConfirm: (link: HTMLAnchorElement) => void;
  handleSubmitRoomChat: (form: HTMLFormElement) => Promise<void>;
  handleCreateRoom: (form: HTMLFormElement) => Promise<void>;
  handleJoinRoom: (form: HTMLFormElement) => Promise<void>;
  handleJoinListedRoom: (form: HTMLFormElement) => Promise<void>;
  handleRenameRoomTitle: (form: HTMLFormElement) => Promise<void>;
  handlePasswordForm: (form: HTMLFormElement) => Promise<void>;
  handleSubmitAnswer: (form: HTMLFormElement) => Promise<void>;
};
