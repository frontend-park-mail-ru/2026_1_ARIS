import type { GameRoom } from "../../../api/games";
import { gameT } from "../shared/i18n";
import type { GamesPageState } from "../state/store";

export type HandleGamesRoomActionsClickOptions = {
  room: GameRoom | null;
  currentPlayerReady: boolean;
  handlePauseRoom: () => Promise<void>;
  handleForceResumeRoom: () => Promise<void>;
  handleRoomRankedToggle: (isRanked: boolean) => Promise<void>;
  handleReadyToggle: (isReady: boolean) => Promise<void>;
  handleReplayToggle: (isReady: boolean) => Promise<void>;
  setGamesState: (patch: Partial<GamesPageState>) => void;
  getErrorMessage: (error: unknown, fallback: string) => string;
};

/**
 * Возвращает input внутри segmented control.
 */
function getSegmentedInput(toggle: HTMLElement): HTMLInputElement | null {
  return toggle instanceof HTMLInputElement
    ? toggle
    : toggle.querySelector<HTMLInputElement>(".games-ready-segmented__input");
}

/**
 * Сохраняет ошибку room-action в footer.
 */
function setRoomActionError(
  options: HandleGamesRoomActionsClickOptions,
  error: unknown,
  fallback: string,
): void {
  options.setGamesState({
    loading: false,
    message: "",
    error: options.getErrorMessage(error, fallback),
    errorTarget: "footer",
  });
}

/**
 * Обрабатывает ranked toggle комнаты.
 */
function handleRankedToggleClick(
  event: Event,
  rankedToggle: HTMLElement,
  options: HandleGamesRoomActionsClickOptions,
): boolean {
  event.preventDefault();
  const input = getSegmentedInput(rankedToggle);
  if (input?.disabled) return true;
  const desiredRanked =
    (rankedToggle.getAttribute("data-games-room-ranked-toggle") ?? input?.value) === "true";
  if (desiredRanked === options.room?.isRanked) return true;

  void options.handleRoomRankedToggle(desiredRanked).catch((error: unknown) => {
    setRoomActionError(options, error, gameT("room.changeModeError"));
  });
  return true;
}

/**
 * Обрабатывает ready toggle текущего игрока.
 */
function handleReadyToggleClick(
  event: Event,
  readyToggle: HTMLElement,
  options: HandleGamesRoomActionsClickOptions,
): boolean {
  event.preventDefault();
  const input = readyToggle.querySelector<HTMLInputElement>(".games-ready-segmented__input");
  if (input?.disabled) return true;
  const isReady = readyToggle.getAttribute("data-games-ready-toggle") === "true";
  if (isReady === options.currentPlayerReady) return true;

  void options.handleReadyToggle(isReady).catch((error: unknown) => {
    setRoomActionError(options, error, gameT("room.readyError"));
  });
  return true;
}

/**
 * Обрабатывает replay toggle текущего игрока.
 */
function handleReplayToggleClick(
  event: Event,
  replayToggle: HTMLButtonElement,
  options: HandleGamesRoomActionsClickOptions,
): boolean {
  event.preventDefault();
  if (replayToggle.disabled) return true;
  const isReady = replayToggle.getAttribute("data-games-replay-toggle") === "true";
  if (isReady === options.currentPlayerReady) return true;

  void options.handleReplayToggle(isReady).catch((error: unknown) => {
    setRoomActionError(options, error, gameT("room.replayError"));
  });
  return true;
}

/**
 * Обрабатывает click-события игровых действий комнаты.
 */
export function handleGamesRoomActionsClick(
  event: Event,
  target: Element,
  options: HandleGamesRoomActionsClickOptions,
): boolean {
  if (target.closest("[data-games-pause-room]")) {
    event.preventDefault();
    void options.handlePauseRoom().catch((error: unknown) => {
      setRoomActionError(options, error, gameT("room.pauseError"));
    });
    return true;
  }

  if (target.closest("[data-games-force-resume]")) {
    event.preventDefault();
    void options.handleForceResumeRoom().catch((error: unknown) => {
      setRoomActionError(options, error, gameT("room.resumeError"));
    });
    return true;
  }

  const rankedToggle = target.closest("[data-games-room-ranked-toggle]");
  if (rankedToggle instanceof HTMLElement) {
    return handleRankedToggleClick(event, rankedToggle, options);
  }

  const readyToggle = target.closest("[data-games-ready-toggle]");
  if (readyToggle instanceof HTMLElement) {
    return handleReadyToggleClick(event, readyToggle, options);
  }

  const replayToggle = target.closest("[data-games-replay-toggle]");
  if (replayToggle instanceof HTMLButtonElement) {
    return handleReplayToggleClick(event, replayToggle, options);
  }

  return false;
}
