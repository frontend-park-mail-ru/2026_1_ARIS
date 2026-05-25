/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import type { GamePlayer, GameRoom } from "../../../api/games";
import {
  focusCurrentAnswerInput,
  syncCurrentAnswerFormDom,
  syncPlayersRailAnswerDom,
} from "./dom-sync";

function createPlayer(overrides: Partial<GamePlayer> = {}): GamePlayer {
  return {
    profileId: "1",
    userAccountId: "10",
    name: "Ada Lovelace",
    firstName: "Ada",
    lastName: "Lovelace",
    gender: "",
    username: "ada",
    avatarId: "",
    avatarUrl: "",
    score: 0,
    isReady: true,
    hasAnswered: false,
    pauseUsed: false,
    forceResumeRequested: false,
    isMe: true,
    ...overrides,
  };
}

function createRoom(overrides: Partial<GameRoom> = {}): GameRoom {
  const player = createPlayer({ hasAnswered: true });
  return {
    id: "room-1",
    title: "Room",
    inviteCode: "",
    gameType: "number_duel",
    status: "active",
    createdByProfileId: player.profileId,
    maxPlayers: 8,
    hasPassword: false,
    password: "",
    isRanked: false,
    inviteCodeEnabled: true,
    questionCount: 3,
    answerTimeoutSec: 30,
    currentQuestionIndex: 1,
    nextQuestionAt: "",
    pausedByProfileId: "",
    pauseStartedAt: "",
    pauseUntilAt: "",
    pauseForceVotes: 0,
    pauseForceVotesRequired: 0,
    creator: player,
    players: [player],
    currentQuestion: {
      id: "q1",
      position: 1,
      text: "Question",
      answerUnit: "",
      startedAt: "2026-05-25T00:00:00.000Z",
      deadlineAt: "2026-05-25T00:00:30.000Z",
      hasAnswered: true,
    },
    questions: [],
    ratingChanges: [],
    winnerProfileId: "",
    profileStats: null,
    ...overrides,
  };
}

describe("games dom sync", () => {
  it("заменяет форму ответа на подтверждение принятого ответа", () => {
    document.body.innerHTML = `
      <div data-games-question-hero>
        <form data-games-answer-form>
          <label class="games-field--answer"><input></label>
          <p class="games-inline-error">Ошибка</p>
          <button type="submit">Ответить</button>
        </form>
      </div>
    `;
    const room = createRoom();

    syncCurrentAnswerFormDom(document, room.currentQuestion, "q1", "42");

    expect(document.querySelector(".games-field--answer")).toBeNull();
    expect(document.querySelector('button[type="submit"]')).toBeNull();
    expect(document.querySelector(".games-answer-accepted")?.textContent).toBe(
      "Ваш ответ принят: 42",
    );
  });

  it("обновляет answered-состояние rail-карточек игроков", () => {
    document.body.innerHTML = `<article data-games-player-card="1"></article>`;

    syncPlayersRailAnswerDom(document, createRoom());

    const card = document.querySelector<HTMLElement>("[data-games-player-card]");
    expect(card?.classList.contains("games-game-player--answered")).toBe(true);
    expect(card?.dataset.gamesPlayerAnswered).toBe("true");
  });

  it("фокусирует поле ответа после рендера", () => {
    vi.useFakeTimers();
    document.body.innerHTML = `<input data-games-answer-input>`;
    const input = document.querySelector<HTMLInputElement>("[data-games-answer-input]")!;
    const focusSpy = vi.spyOn(input, "focus");

    focusCurrentAnswerInput(document);
    vi.runAllTimers();

    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    vi.useRealTimers();
  });
});
