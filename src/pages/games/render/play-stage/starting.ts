import type { GameRoom } from "../../../../api/games";
import { escapeHtml } from "../../../../utils/avatar";

/**
 * Рендерит экран countdown перед первым вопросом.
 */
export function renderGameStartingStage(room: GameRoom): string {
  const deadlineAt = room.nextQuestionAt || new Date(Date.now() + 10_000).toISOString();

  return `
    <section class="games-game-stage games-game-stage--starting" aria-label="Игра скоро начнется">
      <div class="games-stage-card games-stage-card--starting">
        <span class="games-stage-card__eyebrow">Игра начинается</span>
        <h2 class="games-stage-card__title">Первый вопрос через</h2>
        <div
          class="games-start-countdown"
          data-games-timer-deadline="${escapeHtml(deadlineAt)}"
          data-games-timer-total-ms="10000"
        >
          <strong class="games-start-countdown__value" data-games-timer-value>10</strong>
          <span class="games-start-countdown__unit">сек</span>
          <span class="games-start-countdown__bar" aria-hidden="true">
            <span class="games-start-countdown__bar-fill" data-games-timer-progress></span>
          </span>
        </div>
        <p class="games-stage-card__text">Приготовьтесь. Вопрос появится у всех игроков одновременно.</p>
      </div>
    </section>
  `;
}
