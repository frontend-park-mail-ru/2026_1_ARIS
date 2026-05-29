import type { GameRoom } from "../../../api/games";
import { getSubmittedAnswerLabel } from "../render/play-stage";

type CurrentQuestion = NonNullable<GameRoom["currentQuestion"]>;

/** Возвращает безопасный CSS-селектор для динамического значения. */
function escapeSelector(value: string): string {
  return typeof CSS !== "undefined" && CSS.escape ? CSS.escape(value) : value.replace(/"/g, '\\"');
}

/** Прокручивает чат комнаты к последнему сообщению. */
export function scrollRoomChatToBottom(
  root: Document | HTMLElement,
  options: { ensureAfterRender?: boolean } = {},
): void {
  const messages = root.querySelector<HTMLElement>("[data-games-room-chat-messages]");
  if (!messages) return;
  const scroll = () => {
    const previousScrollBehavior = messages.style.scrollBehavior;
    messages.style.scrollBehavior = "auto";
    messages.scrollTop = messages.scrollHeight;
    messages.style.scrollBehavior = previousScrollBehavior;
  };

  scroll();

  if (!options.ensureAfterRender) return;
  window.requestAnimationFrame(scroll);
  window.setTimeout(scroll, 0);
}

/** Ставит фокус в поле ответа после рендера текущего вопроса. */
export function focusCurrentAnswerInput(root: Document | HTMLElement | null): void {
  if (!root) return;
  const input = root.querySelector<HTMLInputElement>("[data-games-answer-input]");
  if (!input || input.disabled) return;

  const focusInput = () => {
    if (!input.isConnected || input.disabled) return;
    if (input.ownerDocument.activeElement === input) return;
    input.focus({ preventScroll: true });
  };

  focusInput();
  window.requestAnimationFrame?.(focusInput);
  window.setTimeout(focusInput, 0);
}

/** Синхронизирует DOM формы ответа после локального принятия ответа. */
export function syncCurrentAnswerFormDom(
  root: Document | HTMLElement | null,
  question: CurrentQuestion | null | undefined,
  submittedQuestionId: string,
  submittedAnswerValue: string,
): void {
  if (!root || !question?.hasAnswered) return;
  const form = root.querySelector<HTMLFormElement>(
    "[data-games-question-hero] [data-games-answer-form]",
  );
  if (!form) return;

  form.classList.add("games-answer-form--accepted");
  form.querySelector(".games-field--answer")?.remove();
  form.querySelector(".games-inline-error")?.remove();
  form.querySelector('button[type="submit"]')?.remove();

  let accepted = form.querySelector<HTMLElement>(".games-answer-accepted");
  if (!accepted) {
    accepted = document.createElement("div");
    accepted.className = "games-answer-accepted";
    form.prepend(accepted);
  }
  accepted.textContent = getSubmittedAnswerLabel(
    question,
    submittedQuestionId,
    submittedAnswerValue,
  );
}

/** Обновляет DOM-состояние карточек игроков в rail без полного перерендера. */
export function syncPlayersRailAnswerDom(
  root: Document | HTMLElement | null,
  room: GameRoom | null,
): void {
  if (!root || !room) return;
  room.players.forEach((player) => {
    const card = root.querySelector<HTMLElement>(
      `[data-games-player-card="${escapeSelector(player.profileId)}"]`,
    );
    if (!card) return;
    const isAnswered = room.status === "active" && player.hasAnswered;
    card.classList.toggle("games-game-player--answered", isAnswered);
    card.setAttribute("data-games-player-answered", player.hasAnswered ? "true" : "false");
  });
}
