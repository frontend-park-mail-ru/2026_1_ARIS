import type { GameRoom, GameRoomMessage } from "../../../../api/games";
import type { GamesPageState } from "../../state/store";

type SetGamesState = (patch: Partial<GamesPageState>) => void;
type PendingRankedToast = { roomId: string; isRanked: boolean } | null;

export type RoomReadinessActionOptions = {
  room: GameRoom | null;
  getCurrentRoom: () => GameRoom | null;
  currentProfileId: string;
  currentMessages: GameRoomMessage[];
  hydrateRoom: (room: GameRoom) => Promise<GameRoom>;
  getSystemMessages: (previousRoom: GameRoom, nextRoom: GameRoom) => GameRoomMessage[];
  mergeMessages: (existing: GameRoomMessage[], incoming: GameRoomMessage[]) => GameRoomMessage[];
  rememberRoomAccess: (room: GameRoom) => void;
  setGamesState: SetGamesState;
};

export type ToggleRoomRankedOptions = RoomReadinessActionOptions & {
  setPendingRankedToast: (toast: PendingRankedToast) => void;
  showToast: (message: string) => void;
  getRankedToastMessage: (isRanked: boolean) => string;
};
