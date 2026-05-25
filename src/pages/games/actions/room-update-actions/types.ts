import type { GameRoom, GameRoomMessage } from "../../../../api/games";
import type { GamesPageState } from "../../state/store";
import type { PendingRankedToast } from "../room-live";

export type SetGamesState = (patch: Partial<GamesPageState>) => void;

export type RoomUpdateActionsOptions = {
  getRoom: () => GameRoom | null;
  getCurrentRoom: () => GameRoom | null;
  getCurrentProfileId: () => string;
  getCurrentMessages: () => GameRoomMessage[];
  fetchRoom: (roomId: string) => Promise<GameRoom>;
  hydrateRoom: (room: GameRoom) => Promise<GameRoom>;
  getSystemMessages: (previousRoom: GameRoom, nextRoom: GameRoom) => GameRoomMessage[];
  mergeMessages: (existing: GameRoomMessage[], incoming: GameRoomMessage[]) => GameRoomMessage[];
  rememberRoomAccess: (room: GameRoom) => void;
  setPendingRankedToast: (toast: PendingRankedToast | null) => void;
  showToast: (message: string) => void;
  getRankedToastMessage: (isRanked: boolean) => string;
  setGamesState: SetGamesState;
};

export type RefreshCurrentRoomHandler = () => Promise<void>;
