import type { GamesPasswordModalMode } from "../../../state/store";

export type RenderPasswordModalOptions = {
  mode: GamesPasswordModalMode;
  loading: boolean;
  error: string;
};

export type RenderRenameTitleModalOptions = {
  open: boolean;
  roomTitle: string;
  loading: boolean;
  error: string;
};

export type RenderJoinPasswordModalOptions = {
  roomId: string;
  roomTitle: string;
  inviteCode: string;
  authorMarkup: string;
  passwordValue: string;
  passwordVisible: boolean;
  error: string;
  loading: boolean;
};
