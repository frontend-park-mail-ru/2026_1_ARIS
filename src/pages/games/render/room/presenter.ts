/**
 * Presenter панели игровой комнаты.
 *
 * Собирает состояние панели комнаты из room/state/adapters и передаёт в
 * чистый render-модуль готовые строки дочерних блоков.
 */
import type { GamePlayer, GameRoom } from "../../../../api/games";
import type { GamesErrorTarget, GamesPageState } from "../../state/store";
import type { GameCatalogItem } from "../../shared/registry";
import { shouldShowFinalRoundResultBeforeSummary } from "../../round/reveal";
import { gameT } from "../../shared/i18n";
import {
  areRoomPlayersReady,
  getCurrentRoomPlayer,
  isCurrentRoomCreator,
} from "../../room/selectors";
import { renderRoomPanel } from "./panel";
import {
  renderLobbyCreator,
  renderPlayerList,
  renderRankedBadge,
  renderRoomRankedToggle,
} from "./players";
import { renderParticipantsStatus, renderReadyPlayersStatus } from "./status";

type RoomPanelPresenterState = Pick<
  GamesPageState,
  | "loading"
  | "titleMenuOpen"
  | "passwordMenuOpen"
  | "participantsStatusHintOpen"
  | "readyStatusHintOpen"
  | "playerMenuProfileId"
>;

export type RenderRoomPanelPresenterOptions = {
  state: RoomPanelPresenterState;
  room: GameRoom;
  game: GameCatalogItem;
  currentProfileId: string;
  getPlayerAvatarUrl: (player: GamePlayer) => string;
  getRoomTitleValue: (room: GameRoom) => string;
  getRoomPasswordDisplayValue: (room: GameRoom) => string;
  renderPauseAction: (room: GameRoom) => string;
  renderGamePlay: (room: GameRoom) => string;
  renderInlineError: (target: GamesErrorTarget) => string;
};

/**
 * Проверяет, является ли текущий пользователь администратором комнаты.
 */
function getCurrentUserCreatorPredicate(options: RenderRoomPanelPresenterOptions) {
  return (room: GameRoom) => isCurrentRoomCreator(room, options.currentProfileId);
}

/**
 * Возвращает подсказки для кнопки старта комнаты.
 */
function getStartTooltipLines(options: RenderRoomPanelPresenterOptions): string[] {
  const { room, state } = options;
  const currentUserIsCreator = getCurrentUserCreatorPredicate(options)(room);
  const allPlayersReady = areRoomPlayersReady(room);
  const hasEnoughPlayers = room.players.length >= 2;

  if (room.status !== "waiting" || state.loading) return [];
  if (!currentUserIsCreator) return ["Только администратор комнаты может начать игру"];

  return [
    !hasEnoughPlayers ? "В комнате должно быть как минимум 2 игрока." : "",
    !allPlayersReady ? "Все игроки должны быть готовы к игре." : "",
  ].filter(Boolean);
}

/**
 * Рендерит панель комнаты со всеми дочерними блоками.
 */
export function renderRoomPanelPresenter(options: RenderRoomPanelPresenterOptions): string {
  const { room, state } = options;
  const currentUserIsCreator = getCurrentUserCreatorPredicate(options);
  const canDisbandRoom = room.status === "waiting" && currentUserIsCreator(room);
  const canLeaveRoom = room.status === "waiting" && !currentUserIsCreator(room);
  const allPlayersReady = areRoomPlayersReady(room);
  const canManageStart = room.status === "waiting" && currentUserIsCreator(room);
  const canManageRanked = room.status === "waiting" && currentUserIsCreator(room);
  const hasEnoughPlayers = room.players.length >= 2;
  const canStartRoom =
    room.status === "waiting" && hasEnoughPlayers && allPlayersReady && canManageStart;
  const headingTitle =
    room.status === "finished"
      ? shouldShowFinalRoundResultBeforeSummary(room)
        ? options.game.title
        : gameT("room.resultsTitle", { game: options.game.title })
      : gameT("room.lobbyTitle", { game: options.game.title });

  return renderRoomPanel({
    room,
    game: options.game,
    headingTitle,
    loading: state.loading,
    roomTitle: options.getRoomTitleValue(room),
    roomPasswordDisplay: options.getRoomPasswordDisplayValue(room),
    titleMenuOpen: state.titleMenuOpen,
    passwordMenuOpen: state.passwordMenuOpen,
    canManageRanked,
    canDisbandRoom,
    canLeaveRoom,
    canStartRoom,
    startTooltipLines: getStartTooltipLines(options),
    currentPlayer: getCurrentRoomPlayer(room),
    rankedBadge: renderRankedBadge(room),
    rankedToggle: renderRoomRankedToggle(room, canManageRanked && !state.loading),
    lobbyCreator: renderLobbyCreator(room, options.getPlayerAvatarUrl),
    participantsStatus: renderParticipantsStatus({
      room,
      hintOpen: state.participantsStatusHintOpen,
    }),
    readyStatus: renderReadyPlayersStatus({
      room,
      hintOpen: state.readyStatusHintOpen,
    }),
    pauseAction: options.renderPauseAction(room),
    gamePlay: options.renderGamePlay(room),
    playerList: renderPlayerList({
      room,
      playerMenuProfileId: state.playerMenuProfileId,
      isCurrentRoomCreator: currentUserIsCreator,
      getPlayerAvatarUrl: options.getPlayerAvatarUrl,
    }),
    passwordError: options.renderInlineError("password"),
    footerError: options.renderInlineError("footer"),
  });
}
