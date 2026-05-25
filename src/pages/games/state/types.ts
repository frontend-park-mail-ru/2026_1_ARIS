/**
 * Типы состояния страницы игр.
 *
 * Описывают общий UI-runtime для каталога, комнат и игровых оверлеев.
 */
import type { GameLeaderboard, GameRoom, GameRoomMessage } from "../../../api/games";

export type GamesLobbyMode = "menu" | "create" | "rooms" | "join" | "leaderboard";
export type GamesErrorTarget = "" | "answer" | "form" | "footer" | "password";
export type GamesPasswordModalMode = "" | "set" | "change" | "remove";

export type GameProfileNavigationConfirm = {
  profileId: string;
  href: string;
  name: string;
  avatarUrl: string;
};

export type ReportableGameQuestion =
  | GameRoom["questions"][number]
  | NonNullable<GameRoom["currentQuestion"]>;

export type GamesPageState = {
  room: GameRoom | null;
  roomChatMessages: GameRoomMessage[];
  roomChatLoading: boolean;
  roomChatSending: boolean;
  roomChatError: string;
  roomChatDraft: string;
  roomChatShowSystemMessages: boolean;
  lobbyMode: GamesLobbyMode;
  rooms: GameRoom[];
  roomsError: string;
  roomsSearchQuery: string;
  leaderboard: GameLeaderboard | null;
  leaderboardLoading: boolean;
  leaderboardError: string;
  joinPasswordRoomId: string;
  joinInviteCodeValue: string;
  joinPasswordValue: string;
  joinPasswordVisible: boolean;
  joinInviteCodeError: string;
  joinPasswordError: string;
  disbandConfirmOpen: boolean;
  startConfirmOpen: boolean;
  leaveConfirmOpen: boolean;
  reportConfirmQuestionKey: string;
  questionMenuKey: string;
  profileNavigationConfirm: GameProfileNavigationConfirm | null;
  kickConfirmProfileId: string;
  adminConfirmProfileId: string;
  playerMenuProfileId: string;
  titleMenuOpen: boolean;
  passwordMenuOpen: boolean;
  passwordVisible: boolean;
  renameTitleModalOpen: boolean;
  passwordModalMode: GamesPasswordModalMode;
  floatingMenuAnchorX: number;
  floatingMenuAnchorY: number;
  participantsStatusHintOpen: boolean;
  readyStatusHintOpen: boolean;
  roomId: string;
  message: string;
  messageReturnRoomId: string;
  messageReturnInviteCode: string;
  messageReturnPassword: string;
  messageReturnRoomLabel: string;
  messageRefreshRooms: boolean;
  error: string;
  errorTarget: GamesErrorTarget;
  submittedQuestionId: string;
  submittedAnswerValue: string;
  socketOpen: boolean;
  loading: boolean;
  roomsLoading: boolean;
  roomsAutoRefreshEnabled: boolean;
};
