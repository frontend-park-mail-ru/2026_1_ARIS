import type { GameRoom } from "../../../../api/games";

export type GameProfileLinkOptions = {
  profileId: string;
  className: string;
  label: string;
  content: string;
  avatarUrl?: string;
  ariaLabel?: string;
};

export type RenderFinalGameStageOptions = {
  room: GameRoom;
  currentPlayer: GameRoom["players"][number] | null;
  loading: boolean;
  getPlayerAvatarUrl: (player: GameRoom["players"][number]) => string;
  renderProfileLink: (options: GameProfileLinkOptions) => string;
  renderQuestionActionsMenuButton: (
    room: GameRoom,
    question: GameRoom["questions"][number],
  ) => string;
};
