import type { GamesLobbyMode } from "../../state/store";

export type RenderNumericCreateInputOptions = {
  name: string;
  value: string;
  min: number;
  max: number;
  maxMessage: string;
  minMessage: string;
  invalidMessage?: string;
};

export type RenderCreateRoomFormOptions = {
  loading: boolean;
  error: string;
};

export type RenderJoinByCodeFormOptions = {
  inviteCodeValue: string;
  inviteCodeError: string;
  passwordValue: string;
  passwordError: string;
  loading: boolean;
};

export type RenderCreateRoomPanelOptions = {
  lobbyMode: GamesLobbyMode;
  content: string;
};
