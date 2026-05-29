import type { GameRoom } from "../../../../api/games";
import { escapeHtml } from "../../../../utils/avatar";
import { gameT } from "../../shared/i18n";

const DEFAULT_START_COUNTDOWN_MS = 10_000;

/** Возвращает длительность стартового countdown с учётом короткого серверного окна. */
function getStartCountdownTotalMs(deadlineAt: string): number {
  const deadlineMs = new Date(deadlineAt).getTime();
  if (Number.isNaN(deadlineMs)) return DEFAULT_START_COUNTDOWN_MS;

  const remainingMs = deadlineMs - Date.now();
  if (remainingMs <= 0 || remainingMs >= DEFAULT_START_COUNTDOWN_MS) {
    return DEFAULT_START_COUNTDOWN_MS;
  }

  return Math.max(1_000, Math.ceil(remainingMs / 1_000) * 1_000);
}

/**
 * Рендерит экран countdown перед первым вопросом.
 */
export function renderGameStartingStage(room: GameRoom): string {
  const deadlineAt =
    room.nextQuestionAt || new Date(Date.now() + DEFAULT_START_COUNTDOWN_MS).toISOString();
  const totalMs = getStartCountdownTotalMs(deadlineAt);
  const totalSeconds = Math.ceil(totalMs / 1_000);

  return `
    <section class="games-game-stage games-game-stage--starting" aria-label="${escapeHtml(gameT("gameplay.startingAria"))}">
      <div class="games-stage-card games-stage-card--starting">
        <span class="games-stage-card__eyebrow">${escapeHtml(gameT("gameplay.startingEyebrow"))}</span>
        <h2 class="games-stage-card__title">${escapeHtml(gameT("gameplay.firstQuestionIn"))}</h2>
        <div
          class="games-start-countdown"
          data-games-timer-deadline="${escapeHtml(deadlineAt)}"
          data-games-timer-total-ms="${totalMs}"
        >
          <strong class="games-start-countdown__value" data-games-timer-value>${totalSeconds}</strong>
          <span class="games-start-countdown__unit">${escapeHtml(gameT("gameplay.secondsShort"))}</span>
          <span class="games-start-countdown__bar" aria-hidden="true">
            <span class="games-start-countdown__bar-fill" data-games-timer-progress></span>
          </span>
        </div>
        <p class="games-stage-card__text">${escapeHtml(gameT("gameplay.startingHint"))}</p>
      </div>
    </section>
  `;
}
