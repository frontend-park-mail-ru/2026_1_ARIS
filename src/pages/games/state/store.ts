/**
 * Состояние страницы игр.
 *
 * Хранит runtime-состояние `/games` в едином `StateManager` и отдаёт наружу
 * только readonly-снимок для чтения.
 */
import { StateManager } from "../../../state/StateManager";
import { createInitialGamesState } from "./initial";
import type { GamesPageState } from "./types";

export { createInitialGamesState } from "./initial";
export type {
  GameProfileNavigationConfirm,
  GamesErrorTarget,
  GamesLobbyMode,
  GamesPageState,
  GamesPasswordModalMode,
  ReportableGameQuestion,
} from "./types";

/** Реактивное хранилище состояния страницы игр. */
export const gamesStore = new StateManager<GamesPageState>(createInitialGamesState());

/** Readonly-снимок состояния, который обновляется при каждом изменении store. */
export let gamesState: Readonly<GamesPageState> = gamesStore.get();

gamesStore.subscribe((state) => {
  gamesState = state;
});

/**
 * Возвращает актуальный readonly-снимок состояния.
 */
export function getGamesState(): Readonly<GamesPageState> {
  return gamesStore.get();
}

/**
 * Объединяет patch с текущим состоянием.
 */
export function patchGamesState(patch: Partial<GamesPageState>): void {
  gamesStore.patch(patch);
}

/**
 * Полностью заменяет состояние страницы игр.
 */
export function replaceGamesState(nextState: GamesPageState): void {
  gamesStore.set(nextState);
}

/**
 * Сбрасывает состояние страницы игр к начальному снимку.
 */
export function resetGamesState(): void {
  gamesStore.reset(createInitialGamesState());
}
