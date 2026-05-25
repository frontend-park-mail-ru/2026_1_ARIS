import type { GamesPageState } from "../../state/store";

export type ConfirmModalState = Pick<
  GamesPageState,
  "kickConfirmProfileId" | "adminConfirmProfileId"
>;

export type HandleGamesConfirmModalsClickOptions = {
  state: ConfirmModalState;
  handleDisbandRoom: () => Promise<void>;
  handleStartRoom: () => Promise<void>;
  handleExitGameToMenu: () => Promise<void>;
  handleKickPlayer: (profileId: string) => Promise<void>;
  handleAssignAdmin: (profileId: string) => Promise<void>;
  setGamesState: (patch: Partial<GamesPageState>) => void;
  setGamesOverlayState: (patch: Partial<GamesPageState>) => void;
  getErrorMessage: (error: unknown, fallback: string) => string;
};
