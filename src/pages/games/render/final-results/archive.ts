import type { GameRoom } from "../../../../api/games";
import { escapeHtml } from "../../../../utils/avatar";
import {
  formatDurationMs,
  formatResultTableDistance,
  formatStoredAnswer,
  getQuestionPositionLabel,
  getRoundResultRows,
} from "../../round/model";
import { getPlayerFullName } from "../../room/profile/players";
import { renderResultsPlayerCell } from "./player-cell";
import type { RenderFinalGameStageOptions } from "./types";

/** Рендерит архив ответов игроков по одному завершенному вопросу. */
function renderFinalQuestionResults(
  room: GameRoom,
  question: GameRoom["questions"][number],
  options: Pick<RenderFinalGameStageOptions, "getPlayerAvatarUrl" | "renderProfileLink">,
): string {
  const entries = getRoundResultRows(room, question);

  return `
    <div class="games-results-table games-results-table--archive" aria-label="Ответы игроков">
      <div class="games-results-table__head" aria-hidden="true">
        <span>#</span>
        <span>Игрок</span>
        <span>Ответ</span>
        <span>Ошибка</span>
        <span>Время</span>
      </div>
      ${entries
        .map(({ player, answer, place }, index) => {
          const playerLabel = getPlayerFullName(player);
          return `
            <article class="games-results-table__row${index === 0 ? " games-results-table__row--winner" : ""}" style="--games-result-index: ${index}">
              <span class="games-results-table__rank">${place}</span>
              ${renderResultsPlayerCell(player, playerLabel, options)}
              <span>${escapeHtml(formatStoredAnswer(answer?.answer ?? null))}</span>
              <span>${escapeHtml(formatResultTableDistance(answer))}</span>
              <time>${escapeHtml(formatDurationMs(answer?.responseTimeMs))}</time>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

/** Рендерит архив завершённых вопросов с ответами игроков. */
export function renderFinalQuestionsArchive(
  options: RenderFinalGameStageOptions,
  completed: GameRoom["questions"],
): string {
  const { room, renderQuestionActionsMenuButton } = options;

  return `
    <section class="games-final-archive" aria-label="История вопросов и ответов">
      <header class="games-final-archive__header">
        <h3>Вопросы и ответы</h3>
      </header>
      <div class="games-final-answers">
      ${completed
        .map((question, index) => {
          return `
          <article class="games-final-question" style="--games-result-index: ${index}">
            <header>
              <strong>${escapeHtml(`${getQuestionPositionLabel(room, question.position)}.`)}</strong>
              ${renderQuestionActionsMenuButton(room, question)}
            </header>
            <p>${escapeHtml(question.text)}</p>
            <p class="games-final-question__correct">
              Правильный ответ: <strong>${escapeHtml(formatStoredAnswer(question.correctAnswer))}</strong>
            </p>
            ${renderFinalQuestionResults(room, question, options)}
          </article>
        `;
        })
        .join("")}
      </div>
    </section>
  `;
}
