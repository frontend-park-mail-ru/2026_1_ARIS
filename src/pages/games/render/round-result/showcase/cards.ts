import { escapeHtml } from "../../../../../utils/avatar";
import {
  formatAnswerDelta,
  formatDurationMs,
  formatStoredAnswer,
  getAnswerDeltaTone,
  type RoundAnswerShowcaseItem,
  type RoundResultPresentationRow,
} from "../../../round/model";
import { getGamePlayerLabel } from "../../../room/profile/players";
import { gameT } from "../../../shared/i18n";
import type { RenderPlayerCell } from "../types";
import { renderRoundResultStyle } from "./style";

/**
 * Рендерит значение ответа игрока в карточке результата.
 */
function renderRoundCardAnswer(row: RoundResultPresentationRow): string {
  if (row.isMissingAnswer) {
    return `<strong class="games-answer-axis-card__answer games-answer-axis-card__answer--missing" aria-label="${escapeHtml(gameT("results.noAnswer"))}">×</strong>`;
  }

  const answerLabel = formatStoredAnswer(row.answer?.answer ?? null);
  const isExact = row.answerDelta === 0;
  return `<strong class="games-answer-axis-card__answer${isExact ? " games-answer-axis-card__answer--exact" : ""}">${escapeHtml(answerLabel)}</strong>`;
}

/**
 * Рендерит отклонение ответа от правильного значения.
 */
function renderRoundCardDelta(row: RoundResultPresentationRow): string {
  if (row.isMissingAnswer) {
    return "";
  }

  const deltaLabel = formatAnswerDelta(row.answerDelta);
  const deltaTone = getAnswerDeltaTone(row.answerDelta);
  return `<span class="games-answer-axis-card__delta games-answer-axis-card__delta--${deltaTone}">${escapeHtml(deltaLabel)}</span>`;
}

/**
 * Рендерит связку ответа и отклонения в карточке результата.
 */
function renderRoundCardAnswerPack(row: RoundResultPresentationRow): string {
  if (row.isMissingAnswer) {
    return `
      <span class="games-answer-axis-card__answer-pack games-answer-axis-card__answer-pack--missing">
        ${renderRoundCardAnswer(row)}
        <span class="games-answer-axis-card__no-answer">${escapeHtml(gameT("results.noAnswer"))}</span>
      </span>
    `;
  }

  return `
    <span class="games-answer-axis-card__answer-pack">
      ${renderRoundCardAnswer(row)}
      ${renderRoundCardDelta(row)}
    </span>
  `;
}

/**
 * Рендерит карточку ответа игрока на шкале результата раунда.
 */
function renderRoundResultPlayerCard(
  row: RoundResultPresentationRow,
  index: number,
  roundPlace: number,
  revealIndex: number,
  timeRevealDelayMs: number,
  renderPlayerCell: RenderPlayerCell,
): string {
  const playerLabel = getGamePlayerLabel(row.player);
  const timeLabel = formatDurationMs(row.answer?.responseTimeMs);
  const cardStyle = `${renderRoundResultStyle({ ...row, revealIndex }, index)}; --games-time-reveal-delay: ${timeRevealDelayMs}ms`;

  return `
    <article
      class="games-answer-axis-card${row.player.isMe ? " games-answer-axis-card--me" : ""}${row.place === 1 ? " games-answer-axis-card--winner" : ""}${row.answerDelta === 0 ? " games-answer-axis-card--exact" : ""}${row.isMissingAnswer ? " games-answer-axis-card--missing" : ""}${row.showTime ? " games-answer-axis-card--has-time" : ""}"
      style="${cardStyle}"
      data-games-round-answer-card
      data-games-round-result-card
      data-games-round-result-place="${row.place}"
    >
      <span class="games-answer-axis-card__rank">#${roundPlace}</span>
      ${renderPlayerCell(row.player, playerLabel)}
      ${renderRoundCardAnswerPack(row)}
      ${row.showTime ? `<time class="games-answer-axis-card__time">${escapeHtml(timeLabel)}</time>` : ""}
    </article>
  `;
}

/**
 * Рендерит элемент шкалы результата раунда.
 */
export function renderRoundAnswerShowcaseItem(
  item: RoundAnswerShowcaseItem,
  index: number,
  timeRevealDelayMs: number,
  renderPlayerCell: RenderPlayerCell,
): string {
  return renderRoundResultPlayerCard(
    item.row,
    index,
    item.orderIndex,
    item.revealIndex,
    timeRevealDelayMs,
    renderPlayerCell,
  );
}
