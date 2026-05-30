import type { GameRoom } from "../../../../api/games";
import type { GamesErrorTarget } from "../../state/store";

export type CurrentQuestion = NonNullable<GameRoom["currentQuestion"]>;
export type GamePlayer = GameRoom["players"][number];

export type RenderInlineGameError = (target: GamesErrorTarget) => string;

export type RenderPauseActionOptions = {
  room: GameRoom;
  loading: boolean;
  canPause: boolean;
  currentPlayer: GamePlayer | null;
  isStartCountdown: boolean;
};

export type RenderPauseStageOptions = {
  room: GameRoom;
  loading: boolean;
  pausedByPlayer: GamePlayer | null;
  canForceResume: boolean;
  currentPlayer: GamePlayer | null;
};

export type RenderActiveRoundStageOptions = {
  room: GameRoom;
  currentPlayer: GamePlayer | null;
  submittedQuestionId: string;
  submittedAnswerValue: string;
  renderInlineError: RenderInlineGameError;
};
