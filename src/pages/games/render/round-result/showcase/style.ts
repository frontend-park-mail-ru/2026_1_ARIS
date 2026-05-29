import type { RoundAnswerShowcaseItem } from "../../../round/model";
import { getRoundResultCardDelayMs } from "../../../round/timeline";

/**
 * Формирует inline-style для карточки ответа в раскрытии раунда.
 */
export function renderRoundResultStyle(
  item: Pick<RoundAnswerShowcaseItem, "answerSide" | "answerOffset" | "revealIndex">,
  index: number,
): string {
  const delayMs = getRoundResultCardDelayMs(item.revealIndex);
  const pulseDelayMs = delayMs + 920;
  return [
    `--games-result-index: ${index}`,
    `--games-result-delay: ${delayMs}ms`,
    `--games-exact-pulse-delay: ${pulseDelayMs}ms`,
    `--games-answer-side: ${item.answerSide}`,
    `--games-answer-offset: ${item.answerOffset.toFixed(3)}`,
  ].join("; ");
}
