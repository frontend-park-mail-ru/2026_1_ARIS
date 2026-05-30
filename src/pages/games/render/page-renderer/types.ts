import type { GamePlayer, GameRoom, GameRoomMessage } from "../../../../api/games";
import type { GamesPageState } from "../../state/store";
import type { createQuestionReportUi } from "../../room/question-report";

export type QuestionReportUi = Pick<
  ReturnType<typeof createQuestionReportUi>,
  "getState" | "syncButtons"
>;

export type GamesPageRendererOptions = {
  getState: () => GamesPageState;
  isCatalogRoute: () => boolean;
  isAuthorised?: (() => boolean) | undefined;
  reportedQuestionKeys: Set<string>;
  reportingQuestionKeys: Set<string>;
  questionReportUi: QuestionReportUi;
  getCurrentProfileId: () => string;
  getCurrentPlayer: (room: GameRoom | null) => GamePlayer | null | undefined;
  getPlayerAvatarUrl: (player: GamePlayer) => string;
  getPlayerFullName: (player: GamePlayer) => string;
  getRoomTitleValue: (room: GameRoom | null) => string;
  getRoomPasswordDisplayValue: (room: GameRoom) => string;
  getRoomChatAuthorName: (room: GameRoom, message: GameRoomMessage) => string;
  getRoomChatAuthorFirstName: (room: GameRoom, message: GameRoomMessage) => string;
  getRoomChatAuthorAvatar: (room: GameRoom, message: GameRoomMessage) => string;
  getRoomChatPlayer: (room: GameRoom, message: GameRoomMessage) => GamePlayer | null | undefined;
  shouldBlockFullRoomJoin: (room: GameRoom) => boolean;
  isCurrentRoomCreator: (room: GameRoom) => boolean;
};
