import type { GameRoom } from "../../../../api/games";

export type RenderPlayerCell = (player: GameRoom["players"][number], playerLabel: string) => string;

export type RenderRoundResultStageOptions = {
  room: GameRoom;
  question: GameRoom["questions"][number];
  renderPlayerCell: RenderPlayerCell;
};
