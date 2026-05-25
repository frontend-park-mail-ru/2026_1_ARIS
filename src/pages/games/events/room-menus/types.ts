import type { GameRoom } from "../../../../api/games";
import type { GamesPageState } from "../../state/store";

export type RoomMenusState = Pick<
  GamesPageState,
  "room" | "playerMenuProfileId" | "questionMenuKey" | "titleMenuOpen" | "passwordMenuOpen"
>;

export type FloatingMenuAnchorPatch = Pick<
  GamesPageState,
  "floatingMenuAnchorX" | "floatingMenuAnchorY"
>;

export type HandleGamesRoomMenusClickOptions = {
  state: RoomMenusState;
  reportedQuestionKeys: ReadonlySet<string>;
  reportingQuestionKeys: ReadonlySet<string>;
  getFloatingMenuAnchor: (toggle: HTMLElement) => FloatingMenuAnchorPatch;
  closeGamesMenus: () => Partial<GamesPageState>;
  getRoomTitleValue: (room: GameRoom | null) => string;
  handleCopyQuestionAnswer: (questionKey: string) => Promise<void>;
  handleCopyRoomTitle: (title: string) => Promise<void>;
  handleShowPassword: () => Promise<void>;
  handleRemovePassword: () => Promise<void>;
  setGamesState: (patch: Partial<GamesPageState>) => void;
  setGamesOverlayState: (patch: Partial<GamesPageState>) => void;
  showAppToast: (message: string) => void;
  getErrorMessage: (error: unknown, fallback: string) => string;
};
