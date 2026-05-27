import { escapeHtml } from "../../../../utils/avatar";
import {
  getRoundAnswerShowcaseItems,
  getRoundResultPresentationRows,
  getRoundScoreRows,
} from "../../round/model";
import { getRoundTimesRevealDelayMs } from "../../round/timeline";
import { gameT } from "../../shared/i18n";
import type { RenderRoundResultStageOptions } from "./types";
import { renderRoundAnswerShowcaseItem } from "./showcase/cards";

/**
 * Рендерит cinematic-шкалу ответов и правильного значения.
 */
export function renderRoundAnswerShowcase(options: RenderRoundResultStageOptions): string {
  const { room, question, renderPlayerCell } = options;
  const entries = getRoundResultPresentationRows(room, question);
  const showcaseItems = getRoundAnswerShowcaseItems(entries, question);
  const scorePlaceByProfile = new Map(
    getRoundScoreRows(entries).map((row) => [row.player.profileId, row.scorePlace]),
  );
  const timeRevealDelayMs = getRoundTimesRevealDelayMs(room, question);
  return `
    <div class="games-round-result-cinema" data-games-round-result-cinema>
      <h2 class="games-stage-card__question">${escapeHtml(question.text)}</h2>
      <section class="games-answer-axis" aria-label="${escapeHtml(gameT("results.answerAxisAria"))}" data-games-answer-axis>
        <div class="games-answer-axis__list">
          ${showcaseItems
            .map((item, index) =>
              renderRoundAnswerShowcaseItem(
                item,
                index,
                scorePlaceByProfile,
                timeRevealDelayMs,
                renderPlayerCell,
              ),
            )
            .join("")}
        </div>
      </section>
    </div>
  `;
}
