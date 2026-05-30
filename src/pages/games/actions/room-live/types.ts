import type { GameRoom, GameRoomMessage } from "../../../../api/games";
import type { GamesPageState } from "../../state/store";

export type PendingRankedToast = {
  roomId: string;
  isRanked: boolean;
};

export type ApplyRoomSocketStateDeps = {
  getCurrentRoom: () => GameRoom | null;
  getCurrentProfileId: () => string;
  getSubmittedQuestionId: () => string;
  getSubmittedAnswerValue: () => string;
  getCurrentMessages: () => GameRoomMessage[];
  hydrateRoom: (room: GameRoom) => Promise<GameRoom>;
  getSocketOpen: () => boolean;
  getSystemMessages: (previousRoom: GameRoom | null, nextRoom: GameRoom) => GameRoomMessage[];
  mergeMessages: (existing: GameRoomMessage[], incoming: GameRoomMessage[]) => GameRoomMessage[];
  rememberRoomAccess: (room: GameRoom) => void;
  clearPendingVoluntaryLeave: (roomId?: string) => void;
  patchGamesState: (patch: Partial<GamesPageState>) => void;
  refreshGamesDom: () => void;
  syncCurrentAnswerFormDom: () => void;
  syncPlayersRailAnswerDom: (room: GameRoom | null) => void;
  getPendingRankedToast: () => PendingRankedToast | null;
  setPendingRankedToast: (toast: PendingRankedToast | null) => void;
  showToast: (message: string) => void;
  getRankedToastMessage: (isRanked: boolean) => string;
};

export type RefreshCurrentRoomSilentlyDeps = {
  getCurrentRoom: () => GameRoom | null;
  getLoading: () => boolean;
  getSocketOpen: () => boolean;
  getCurrentProfileId: () => string;
  getCurrentMessages: () => GameRoomMessage[];
  fetchRoom: (roomId: string) => Promise<GameRoom>;
  hydrateRoom: (room: GameRoom) => Promise<GameRoom>;
  getSystemMessages: (previousRoom: GameRoom | null, nextRoom: GameRoom) => GameRoomMessage[];
  mergeMessages: (existing: GameRoomMessage[], incoming: GameRoomMessage[]) => GameRoomMessage[];
  rememberRoomAccess: (room: GameRoom) => void;
  clearRoomAccessRecovery: (roomId?: string) => void;
  canRecoverRoomAccess: (roomId: string) => boolean;
  recoverRoomAccess: (roomId: string) => Promise<GameRoom | null>;
  setGamesState: (patch: Partial<GamesPageState>) => void;
  handleRoomUnavailable: (options: { recover?: boolean }) => Promise<void>;
};

export type RefreshCurrentRoomActionDeps = {
  getCurrentRoom: () => GameRoom | null;
  getCurrentMessages: () => GameRoomMessage[];
  fetchRoom: (roomId: string) => Promise<GameRoom>;
  hydrateRoom: (room: GameRoom) => Promise<GameRoom>;
  getSystemMessages: (previousRoom: GameRoom, nextRoom: GameRoom) => GameRoomMessage[];
  mergeMessages: (existing: GameRoomMessage[], incoming: GameRoomMessage[]) => GameRoomMessage[];
  rememberRoomAccess: (room: GameRoom) => void;
  setGamesState: (patch: Partial<GamesPageState>) => void;
};
