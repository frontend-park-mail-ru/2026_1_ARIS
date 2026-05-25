import type { GamePlayer, GameRoom } from "../../../../api/games";
import type { GamesErrorTarget, GamesPageState } from "../../state/store";

type GameStagePresenterState = Pick<
  GamesPageState,
  "loading" | "submittedQuestionId" | "submittedAnswerValue"
>;

type GameStagePresenterAdapter = {
  getCurrentPlayer: (room: GameRoom | null) => GamePlayer | null | undefined;
  getCurrentRoomPlayer: (room: GameRoom) => GamePlayer | null | undefined;
  getPausedByPlayer: (room: GameRoom) => GamePlayer | null | undefined;
  canCurrentPlayerPause: (room: GameRoom) => boolean;
  canCurrentPlayerForceResume: (room: GameRoom) => boolean;
  getPlayerAvatarUrl: (player: GamePlayer) => string;
  renderInlineError: (target: GamesErrorTarget) => string;
  renderQuestionActionsMenuButton: (
    room: GameRoom,
    question: NonNullable<GameRoom["currentQuestion"]> | GameRoom["questions"][number],
  ) => string;
};

export type RenderGamePlayPresenterOptions = GameStagePresenterAdapter & {
  state: GameStagePresenterState;
  room: GameRoom;
};
