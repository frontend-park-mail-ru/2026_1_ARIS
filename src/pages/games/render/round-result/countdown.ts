import type { GameRoom } from "../../../../api/games";
import { escapeHtml } from "../../../../utils/avatar";
import { getQuestionPositionLabel } from "../../round/model";
import { getRoundResultTimerStartMs } from "../../round/timeline";
import { roundResultCountdownMs } from "../../shared/constants";
import { gameT } from "../../shared/i18n";

/**
 * Рендерит таймер перехода от результата раунда к следующему экрану.
 */
export function renderRoundResultCountdown(
  room: GameRoom,
  question: GameRoom["questions"][number],
  options: { deadlineAt: string; label: string; startAtMs?: number; durationMs?: number },
): string {
  const startAtMs = options.startAtMs ?? getRoundResultTimerStartMs(room, question);
  const startAtIso = new Date(startAtMs).toISOString();
  const durationMs = options.durationMs ?? roundResultCountdownMs;
  return `
    <div
      class="games-question-timer-strip games-question-countdown games-round-result-countdown"
      data-games-round-next-timer
      data-games-timer-deadline="${escapeHtml(options.deadlineAt)}"
      data-games-timer-delay-until="${startAtMs}"
      data-games-timer-start="${escapeHtml(startAtIso)}"
      data-games-timer-total-ms="${durationMs}"
    >
      <div class="games-question-countdown__line">
        <span>${escapeHtml(getQuestionPositionLabel(room, question.position))}.</span>
        <span>${escapeHtml(options.label)}: <strong class="games-question-countdown__value" data-games-timer-value>--</strong> ${escapeHtml(gameT("gameplay.secondsShort"))}.</span>
      </div>
      <span class="games-question-countdown__bar" aria-hidden="true">
        <span class="games-question-countdown__bar-fill" data-games-timer-progress></span>
      </span>
    </div>
  `;
}
