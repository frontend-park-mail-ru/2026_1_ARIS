import type { GameRoom } from "../../../../api/games";
import { escapeHtml } from "../../../../utils/avatar";
import {
  formatDurationMs,
  formatResultTableDistance,
  formatStoredAnswer,
  getQuestionPositionLabel,
  getRoundResultRows,
  isMissingRoundAnswer,
} from "../../round/model";
import { getPlayerFullName } from "../../room/profile/players";
import { gameT } from "../../shared/i18n";
import { renderResultsPlayerCell } from "./player-cell";
import type { RenderFinalGameStageOptions } from "./types";

/** Рендерит красный крестик для пустой ячейки результата. */
function renderMissingResultCell(tag: "span" | "time" = "span"): string {
  return `<${tag} class="games-results-table__missing" aria-label="${escapeHtml(gameT("results.noAnswer"))}">×</${tag}>`;
}

/** Рендерит архив ответов игроков по одному завершенному вопросу. */
function renderFinalQuestionResults(
  room: GameRoom,
  question: GameRoom["questions"][number],
  options: Pick<RenderFinalGameStageOptions, "getPlayerAvatarUrl" | "renderProfileLink">,
): string {
  const entries = getRoundResultRows(room, question);

  return `
    <div class="games-results-table games-results-table--archive" aria-label="${escapeHtml(gameT("results.answerAxisAria"))}">
      <div class="games-results-table__head" aria-hidden="true">
        <span>#</span>
        <span>${escapeHtml(gameT("results.player"))}</span>
        <span>${escapeHtml(gameT("results.answer"))}</span>
        <span>${escapeHtml(gameT("results.error"))}</span>
        <span>${escapeHtml(gameT("results.time"))}</span>
      </div>
      ${entries
        .map(({ player, answer, place }, index) => {
          const playerLabel = getPlayerFullName(player);
          const hasAnswer = !isMissingRoundAnswer(answer);
          return `
            <article class="games-results-table__row${player.isMe ? " games-results-table__row--me" : ""}${index === 0 ? " games-results-table__row--winner" : ""}" style="--games-result-index: ${index}">
              <span class="games-results-table__rank">${place}</span>
              ${renderResultsPlayerCell(player, playerLabel, options)}
              ${
                hasAnswer
                  ? `<span>${escapeHtml(formatStoredAnswer(answer?.answer ?? null))}</span>`
                  : renderMissingResultCell()
              }
              ${
                hasAnswer
                  ? `<span>${escapeHtml(formatResultTableDistance(answer))}</span>`
                  : renderMissingResultCell()
              }
              ${
                hasAnswer && Number.isFinite(answer?.responseTimeMs)
                  ? `<time>${escapeHtml(formatDurationMs(answer?.responseTimeMs))}</time>`
                  : renderMissingResultCell("time")
              }
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
    <section class="games-final-archive" aria-label="${escapeHtml(gameT("results.questionsArchiveAria"))}">
      <header class="games-final-archive__header">
        <h3>${escapeHtml(gameT("results.questionsArchiveTitle"))}</h3>
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
              ${escapeHtml(gameT("results.correctAnswer"))}: <strong>${escapeHtml(formatStoredAnswer(question.correctAnswer))}</strong>
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
