import type { GameRoom } from "../../../../api/games";
import { escapeHtml } from "../../../../utils/avatar";
import { getQuestionPositionLabel } from "../../round/model";
import { gameT } from "../../shared/i18n";
import type {
  CurrentQuestion,
  RenderActiveRoundStageOptions,
  RenderInlineGameError,
} from "./types";

/**
 * Формирует текст принятого ответа для текущего вопроса.
 */
export function getSubmittedAnswerLabel(
  question: CurrentQuestion,
  submittedQuestionId: string,
  submittedAnswerValue: string,
): string {
  if (submittedQuestionId !== question.id || !submittedAnswerValue) {
    return gameT("gameplay.answerAccepted");
  }
  return gameT("gameplay.answerAcceptedValue", { answer: submittedAnswerValue });
}

/**
 * Рендерит форму ответа или подтверждение уже отправленного ответа.
 */
function renderCurrentAnswerForm(
  question: CurrentQuestion,
  options: Pick<RenderActiveRoundStageOptions, "submittedQuestionId" | "submittedAnswerValue"> & {
    renderInlineError: RenderInlineGameError;
  },
): string {
  if (question.hasAnswered) {
    return `
      <form class="games-answer-form games-answer-form--play games-answer-form--accepted" data-games-answer-form>
        <div class="games-answer-accepted">${escapeHtml(getSubmittedAnswerLabel(question, options.submittedQuestionId, options.submittedAnswerValue))}</div>
      </form>
    `;
  }

  return `
    <form class="games-answer-form games-answer-form--play" data-games-answer-form>
      <label class="games-field games-field--answer">
        <span class="games-answer-form__label">${escapeHtml(gameT("gameplay.answerLabel"))}</span>
        <input
          type="number"
          name="answer"
          data-games-answer-input
          inputmode="decimal"
          step="any"
          placeholder="${escapeHtml(gameT("gameplay.answerPlaceholder"))}"
          autofocus
          required
        >
      </label>
      ${options.renderInlineError("answer")}
      <button type="submit" class="games-button games-button--primary">
        ${escapeHtml(gameT("gameplay.answerSubmit"))}
      </button>
    </form>
  `;
}

/**
 * Рендерит таймер текущего вопроса с полосой прогресса.
 */
function renderQuestionCountdown(room: GameRoom, question: CurrentQuestion): string {
  return `
    <div
      class="games-question-timer-strip games-question-countdown"
      data-games-question-timer-strip
      data-games-timer-deadline="${escapeHtml(question.deadlineAt)}"
      data-games-timer-start="${escapeHtml(question.startedAt)}"
    >
      <div class="games-question-countdown__line">
        <span>${escapeHtml(getQuestionPositionLabel(room, question.position))}.</span>
        <span>${escapeHtml(gameT("gameplay.timeLeft"))}: <strong class="games-question-countdown__value" data-games-timer-value>--</strong> ${escapeHtml(gameT("gameplay.secondsShort"))}.</span>
      </div>
      <span class="games-question-countdown__bar" aria-hidden="true">
        <span class="games-question-countdown__bar-fill" data-games-timer-progress></span>
      </span>
    </div>
  `;
}

/**
 * Рендерит активный вопрос или ожидание следующего вопроса в игровом раунде.
 */
export function renderActiveRoundStage(options: RenderActiveRoundStageOptions): string {
  const { room } = options;
  const question = room.currentQuestion;
  if (!question) {
    return `
      <section class="games-game-stage games-game-stage--waiting">
        <div class="games-stage-card">
          <span class="games-stage-card__eyebrow">${escapeHtml(gameT("gameplay.round"))}</span>
          <h2 class="games-stage-card__title">${escapeHtml(gameT("gameplay.nextQuestionLoading"))}</h2>
        </div>
      </section>
    `;
  }

  return `
    <section class="games-game-stage games-game-stage--question" aria-label="${escapeHtml(gameT("gameplay.currentQuestionAria"))}">
      <div class="games-stage-card games-stage-card--question">
        ${renderQuestionCountdown(room, question)}
        <div class="games-question-hero" data-games-question-hero>
          <h2 class="games-stage-card__question">${escapeHtml(question.text)}</h2>
          ${renderCurrentAnswerForm(question, options)}
        </div>
      </div>
    </section>
  `;
}
