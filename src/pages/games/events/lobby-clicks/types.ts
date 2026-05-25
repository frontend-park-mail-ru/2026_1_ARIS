import type { GamesLobbyMode, GamesPageState } from "../../state/store";

export type HandleGamesLobbyClickOptions = {
  roomsAutoRefreshEnabled: boolean;
  messageReturnRoomLabel: string;
  selectLobbyMode: (mode: GamesLobbyMode) => Promise<void>;
  loadWaitingRooms: (options?: { preserveMessage?: boolean; silent?: boolean }) => Promise<void>;
  loadLeaderboard: () => Promise<void>;
  handleBackToRooms: () => Promise<void>;
  handleReturnToRoom: (roomId: string) => Promise<void>;
  setGamesState: (patch: Partial<GamesPageState>) => void;
  showAppToast: (message: string) => void;
  getErrorMessage: (error: unknown, fallback: string) => string;
  getVoluntaryLeaveMessage: () => string;
  getVoluntaryLeaveReturnLabel: () => string;
};
