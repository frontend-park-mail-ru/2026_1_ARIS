/**
 * Composition render-слоя страницы игр.
 *
 * Собирает question-report UI adapter и основной renderer страницы, чтобы
 * entrypoint не держал детали render-зависимостей.
 */
import type { GamePlayer, GameRoom, GameRoomMessage } from "../../../api/games";
import { getPlayerFullName } from "../room/profile/players";
import { createQuestionReportUi } from "../room/question-report";
import type { GamesPageState } from "../state/store";
import { createGamesPageRenderer } from "./page-renderer";

export type GamesPageRenderingOptions = {
  getRoot: () => Document | HTMLElement | null;
  getState: () => GamesPageState;
  isCatalogRoute: () => boolean;
  reportedQuestionKeys: Set<string>;
  reportingQuestionKeys: Set<string>;
  getCurrentProfileId: () => string;
  getCurrentPlayer: (room: GameRoom | null) => GamePlayer | null | undefined;
  getPlayerAvatarUrl: (player: GamePlayer) => string;
  getRoomTitleValue: (room: GameRoom | null) => string;
  getRoomPasswordDisplayValue: (room: GameRoom) => string;
  getRoomChatAuthorName: (room: GameRoom, message: GameRoomMessage) => string;
  getRoomChatAuthorFirstName: (room: GameRoom, message: GameRoomMessage) => string;
  getRoomChatAuthorAvatar: (room: GameRoom, message: GameRoomMessage) => string;
  getRoomChatPlayer: (room: GameRoom, message: GameRoomMessage) => GamePlayer | null | undefined;
  shouldBlockFullRoomJoin: (room: GameRoom) => boolean;
  isCurrentRoomCreator: (room: GameRoom) => boolean;
};

/**
 * Создаёт render-фасад страницы игр.
 */
export function createGamesPageRendering(options: GamesPageRenderingOptions) {
  const questionReportUi = createQuestionReportUi({
    getRoot: options.getRoot,
    reportingKeys: options.reportingQuestionKeys,
    reportedKeys: options.reportedQuestionKeys,
    getOpenQuestionKey: () => options.getState().questionMenuKey,
  });

  return createGamesPageRenderer({
    getState: options.getState,
    isCatalogRoute: options.isCatalogRoute,
    reportedQuestionKeys: options.reportedQuestionKeys,
    reportingQuestionKeys: options.reportingQuestionKeys,
    questionReportUi,
    getCurrentProfileId: options.getCurrentProfileId,
    getCurrentPlayer: options.getCurrentPlayer,
    getPlayerAvatarUrl: options.getPlayerAvatarUrl,
    getPlayerFullName,
    getRoomTitleValue: options.getRoomTitleValue,
    getRoomPasswordDisplayValue: options.getRoomPasswordDisplayValue,
    getRoomChatAuthorName: options.getRoomChatAuthorName,
    getRoomChatAuthorFirstName: options.getRoomChatAuthorFirstName,
    getRoomChatAuthorAvatar: options.getRoomChatAuthorAvatar,
    getRoomChatPlayer: options.getRoomChatPlayer,
    shouldBlockFullRoomJoin: options.shouldBlockFullRoomJoin,
    isCurrentRoomCreator: options.isCurrentRoomCreator,
  });
}
