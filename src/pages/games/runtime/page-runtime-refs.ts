/**
 * Отложенные ссылки runtime-действий страницы игр.
 *
 * Socket/chat runtime создаются раньше части actions, поэтому этот слой хранит
 * стабильные wrappers и позднее получает реальные handlers.
 */
import type { GameRoom, GameRoomMessage } from "../../../api/games";
import type { LoadWaitingRoomsActionOptions } from "../actions/lobby-data";
import type { GamesPageActionHandlers } from "../actions/page-action-handlers";

type HandleRoomUnavailable = (options?: { recover?: boolean }) => Promise<void>;
type LoadWaitingRooms = (options?: LoadWaitingRoomsActionOptions) => Promise<void>;
type RefreshCurrentRoomSilently = () => Promise<void>;
type HandleRoomSocketState = (room: GameRoom) => Promise<void>;
type HandleRoomSocketMessage = (message: GameRoomMessage) => void;

export type GamesPageRuntimeRefs = ReturnType<typeof createGamesPageRuntimeRefs>;

/**
 * Подключает созданные actions к отложенным runtime refs.
 */
export function connectGamesPageRuntimeRefs(
  refs: GamesPageRuntimeRefs,
  handlers: Pick<
    GamesPageActionHandlers,
    | "loadWaitingRooms"
    | "handleRoomUnavailable"
    | "handleRoomSocketState"
    | "handleRoomSocketMessage"
    | "refreshCurrentRoomSilently"
  >,
): void {
  refs.setLoadWaitingRooms(handlers.loadWaitingRooms);
  refs.setHandleRoomUnavailable(handlers.handleRoomUnavailable);
  refs.setHandleRoomSocketState(handlers.handleRoomSocketState);
  refs.setHandleRoomSocketMessage(handlers.handleRoomSocketMessage);
  refs.setRefreshCurrentRoomSilently(handlers.refreshCurrentRoomSilently);
}

/**
 * Создаёт контейнер отложенных runtime handlers страницы игр.
 */
export function createGamesPageRuntimeRefs() {
  let handleRoomUnavailable: HandleRoomUnavailable | null = null;
  let loadWaitingRooms: LoadWaitingRooms | null = null;
  let refreshCurrentRoomSilently: RefreshCurrentRoomSilently | null = null;
  let handleRoomSocketState: HandleRoomSocketState | null = null;
  let handleRoomSocketMessage: HandleRoomSocketMessage | null = null;

  /**
   * Возвращает handler или бросает ошибку, если он ещё не подключён.
   */
  function requireHandler<T>(handler: T | null, name: string): T {
    if (!handler) {
      throw new Error(`${name} handler is not initialized.`);
    }
    return handler;
  }

  /**
   * Обрабатывает недоступность комнаты без восстановления доступа.
   */
  function handleUnavailableWithoutRecovery(): void {
    void requireHandler(handleRoomUnavailable, "handleRoomUnavailable")({ recover: false });
  }

  /**
   * Тихо обновляет список комнат ожидания.
   */
  function loadWaitingRoomsSilently(): void {
    void requireHandler(
      loadWaitingRooms,
      "loadWaitingRooms",
    )({
      preserveMessage: true,
      silent: true,
    });
  }

  /**
   * Тихо обновляет текущую комнату.
   */
  function refreshCurrentRoomSilentlyRef(): void {
    void requireHandler(refreshCurrentRoomSilently, "refreshCurrentRoomSilently")();
  }

  /**
   * Передаёт socket snapshot комнаты в подключённый handler.
   */
  function handleRoomSocketStateRef(room: GameRoom): void {
    void requireHandler(handleRoomSocketState, "handleRoomSocketState")(room);
  }

  /**
   * Передаёт socket-сообщение комнаты в подключённый handler.
   */
  function handleRoomSocketMessageRef(message: GameRoomMessage): void {
    requireHandler(handleRoomSocketMessage, "handleRoomSocketMessage")(message);
  }

  return {
    handleUnavailableWithoutRecovery,
    loadWaitingRoomsSilently,
    refreshCurrentRoomSilentlyRef,
    handleRoomSocketStateRef,
    handleRoomSocketMessageRef,
    setHandleRoomUnavailable: (handler: HandleRoomUnavailable) => {
      handleRoomUnavailable = handler;
    },
    setLoadWaitingRooms: (handler: LoadWaitingRooms) => {
      loadWaitingRooms = handler;
    },
    setRefreshCurrentRoomSilently: (handler: RefreshCurrentRoomSilently) => {
      refreshCurrentRoomSilently = handler;
    },
    setHandleRoomSocketState: (handler: HandleRoomSocketState) => {
      handleRoomSocketState = handler;
    },
    setHandleRoomSocketMessage: (handler: HandleRoomSocketMessage) => {
      handleRoomSocketMessage = handler;
    },
  };
}
