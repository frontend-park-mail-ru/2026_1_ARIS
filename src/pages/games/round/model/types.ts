import type { GameRoom } from "../../../../api/games";

export type GameQuestion = GameRoom["questions"][number];
export type GameAnswer = GameQuestion["answers"][number];
export type GamePlayer = GameRoom["players"][number];

export type RoundResultEntry = {
  player: GamePlayer;
  answer: GameAnswer | null;
};

export type RoundResultRow = RoundResultEntry & { place: number };
export type RoundResultPresentationRow = RoundResultRow & {
  answerSide: -1 | 0 | 1;
  answerOffset: number;
  isMissingAnswer: boolean;
  roundPoints: number;
  answerDelta: number | null;
  showTime: boolean;
};
export type RoundScoreRow = RoundResultPresentationRow & { scorePlace: number };
export type RoundAnswerShowcaseItem = {
  type: "player";
  row: RoundResultPresentationRow;
  answerValue: number | null;
  answerSide: -1 | 0 | 1;
  answerOffset: number;
  revealIndex: number;
  orderIndex: number;
};
