/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GameRoom } from "../../../api/games";
import { getQuestionResultSignature } from "../round/model";
import {
  refreshGamesDom,
  refreshQuestionReportOverlayDom,
  refreshRoomChatDom,
  shouldRerenderGamesShell,
  type GamesDomRefreshOptions,
} from "./dom-refresh";

/** Создаёт комнату для тестов DOM refresh. */
function createRoom(
  status: GameRoom["status"] = "active",
  patch: Partial<GameRoom> = {},
): GameRoom {
  return { id: "room-1", status, ...patch } as GameRoom;
}

/** Создаёт зависимости DOM refresh для тестов. */
function createOptions(overrides: Partial<GamesDomRefreshOptions> = {}): GamesDomRefreshOptions {
  const root = document.createElement("div");
  root.innerHTML = `
    <div class="app-page">
      <section data-games-content></section>
      <div data-games-overlay></div>
      <aside data-games-room-players-rail></aside>
      <aside data-games-external-chat></aside>
    </div>
  `;

  return {
    root,
    room: createRoom(),
    renderContent: () => "<main>Content</main>",
    renderPageShell: () =>
      '<div class="app-page"><section data-games-content>Shell</section></div>',
    renderOverlay: () => "<div>Overlay</div>",
    renderQuestionReportOverlay: () => "<form>Report</form>",
    renderPlayersRail: () => "<nav>Players</nav>",
    renderRoomChat: () => "<aside>Chat</aside>",
    startCountdown: vi.fn(),
    focusAnswerInput: vi.fn(),
    syncRoomSubscription: vi.fn(),
    syncRoomsAutoRefresh: vi.fn(),
    syncRoomStateRefresh: vi.fn(),
    syncRoomChatRuntime: vi.fn(),
    schedulePopoverOffsets: vi.fn(),
    scrollRoomChatToBottom: vi.fn(),
    ...overrides,
  };
}

describe("games dom refresh runtime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("обновляет content, overlay, rail и chat без пересборки shell", () => {
    const options = createOptions({ room: createRoom("waiting") });

    refreshGamesDom(options);

    expect(options.root?.querySelector("[data-games-content]")?.innerHTML).toContain("Content");
    expect(options.root?.querySelector("[data-games-overlay]")?.innerHTML).toContain("Overlay");
    expect(options.root?.querySelector("[data-games-room-players-rail]")?.innerHTML).toContain(
      "Players",
    );
    expect(options.root?.querySelector("[data-games-external-chat]")?.innerHTML).toContain("Chat");
    expect(options.syncRoomSubscription).not.toHaveBeenCalled();
    expect(options.syncRoomChatRuntime).toHaveBeenCalledOnce();
  });

  it("не пересоздает центральный вопрос при refresh того же активного вопроса", () => {
    const options = createOptions({
      room: createRoom("active", {
        currentQuestion: { id: "q1" } as GameRoom["currentQuestion"],
      }),
      renderContent: () => "<main>New content</main>",
    });
    options
      .root!.querySelector(".app-page")!
      .insertAdjacentHTML("afterbegin", '<main class="app-layout app-layout--game-room"></main>');
    const content = options.root!.querySelector<HTMLElement>("[data-games-content]")!;
    content.innerHTML = `
      <section data-games-active-question-id="q1">
        <input data-games-answer-input value="123">
      </section>
    `;

    refreshGamesDom(options);

    expect(content.innerHTML).toContain('value="123"');
    expect(content.innerHTML).not.toContain("New content");
    expect(options.root?.querySelector("[data-games-room-players-rail]")?.innerHTML).not.toContain(
      "Players",
    );
    expect(options.syncRoomChatRuntime).not.toHaveBeenCalled();
  });

  it("не перезапускает карточки результата того же раунда при обновлении таймера", () => {
    const completedQuestion = {
      id: "q1",
      status: "completed",
      position: 1,
      text: "Question",
      correctAnswer: 42,
      answers: [],
      winnerProfileId: "",
      startedAt: "",
      deadlineAt: "",
      completedAt: "2026-05-25T00:00:10.000Z",
    } satisfies GameRoom["questions"][number];
    const signature = getQuestionResultSignature(completedQuestion);
    const renderContent = vi.fn(
      () => `
        <section data-games-round-result-stage data-games-round-result-question-id="q1" data-games-round-result-signature="${signature}">
          <div data-games-round-result-dynamic>
            <div data-games-timer-deadline="2026-05-25T00:00:15.000Z" data-games-timer-delay-until="1779667210000" data-games-timer-start="2026-05-25T00:00:10.000Z" data-games-timer-total-ms="5000">New timer</div>
          </div>
          <div data-games-round-result-cinema>New cards</div>
        </section>
      `,
    );
    const options = createOptions({
      room: createRoom("active", {
        roundPauseSec: 5,
        nextQuestionAt: "2026-05-25T00:00:15.000Z",
        currentQuestion: null,
        questions: [completedQuestion],
      }),
      renderContent,
    });
    options
      .root!.querySelector(".app-page")!
      .insertAdjacentHTML("afterbegin", '<main class="app-layout app-layout--game-room"></main>');
    const content = options.root!.querySelector<HTMLElement>("[data-games-content]")!;
    content.innerHTML = `
      <section data-games-round-result-stage data-games-round-result-question-id="q1" data-games-round-result-signature="${signature}">
        <div data-games-round-result-dynamic>
          <div data-games-timer-deadline="2026-05-25T00:00:15.000Z" data-games-timer-delay-until="1779667210000" data-games-timer-start="2026-05-25T00:00:10.000Z" data-games-timer-total-ms="5000">Old timer</div>
        </div>
        <div data-games-round-result-cinema>Old cards</div>
      </section>
    `;

    refreshGamesDom(options);

    expect(content.innerHTML).toContain("Old timer");
    expect(content.innerHTML).toContain("Old cards");
    expect(content.innerHTML).not.toContain("New timer");
    expect(content.innerHTML).not.toContain("New cards");
    expect(renderContent).not.toHaveBeenCalled();
    expect(options.startCountdown).not.toHaveBeenCalled();
    expect(options.syncRoomChatRuntime).not.toHaveBeenCalled();
  });

  it("обновляет только динамику результата раунда при смене дедлайна", () => {
    const completedQuestion = {
      id: "q1",
      status: "completed",
      position: 1,
      text: "Question",
      correctAnswer: 42,
      answers: [],
      winnerProfileId: "",
      startedAt: "",
      deadlineAt: "",
      completedAt: "2026-05-25T00:00:10.000Z",
    } satisfies GameRoom["questions"][number];
    const signature = getQuestionResultSignature(completedQuestion);
    const renderContent = vi.fn(
      () => `
        <section data-games-round-result-stage data-games-round-result-question-id="q1" data-games-round-result-signature="${signature}">
          <div data-games-round-result-dynamic>
            <div data-games-timer-deadline="2026-05-25T00:00:20.000Z" data-games-timer-delay-until="1779667210000" data-games-timer-start="2026-05-25T00:00:10.000Z" data-games-timer-total-ms="10000">New timer</div>
          </div>
          <div data-games-round-result-cinema>New cards</div>
        </section>
      `,
    );
    const options = createOptions({
      room: createRoom("active", {
        roundPauseSec: 10,
        nextQuestionAt: "2026-05-25T00:00:20.000Z",
        currentQuestion: null,
        questions: [completedQuestion],
      }),
      renderContent,
    });
    options
      .root!.querySelector(".app-page")!
      .insertAdjacentHTML("afterbegin", '<main class="app-layout app-layout--game-room"></main>');
    const content = options.root!.querySelector<HTMLElement>("[data-games-content]")!;
    content.innerHTML = `
      <section data-games-round-result-stage data-games-round-result-question-id="q1" data-games-round-result-signature="${signature}">
        <div data-games-round-result-dynamic>
          <div data-games-timer-deadline="2026-05-25T00:00:15.000Z" data-games-timer-delay-until="1779667210000" data-games-timer-start="2026-05-25T00:00:10.000Z" data-games-timer-total-ms="5000">Old timer</div>
        </div>
        <div data-games-round-result-cinema>Old cards</div>
      </section>
    `;

    refreshGamesDom(options);

    expect(content.innerHTML).toContain("New timer");
    expect(content.innerHTML).toContain("Old cards");
    expect(content.innerHTML).not.toContain("New cards");
    expect(renderContent).toHaveBeenCalledOnce();
    expect(options.startCountdown).toHaveBeenCalledOnce();
    expect(options.syncRoomChatRuntime).not.toHaveBeenCalled();
  });

  it("не сохраняет финальный результат после окна раскрытия", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-25T00:00:25.000Z"));
    const completedQuestion = {
      id: "q1",
      status: "completed",
      position: 1,
      text: "Question",
      correctAnswer: 42,
      answers: [],
      winnerProfileId: "",
      startedAt: "",
      deadlineAt: "",
      completedAt: "2026-05-25T00:00:10.000Z",
    } satisfies GameRoom["questions"][number];
    const signature = getQuestionResultSignature(completedQuestion);
    const options = createOptions({
      room: createRoom("finished", {
        currentQuestion: null,
        questions: [completedQuestion],
      }),
      renderContent: () => "<main>Final results</main>",
    });
    options
      .root!.querySelector(".app-page")!
      .insertAdjacentHTML("afterbegin", '<main class="app-layout app-layout--game-room"></main>');
    const content = options.root!.querySelector<HTMLElement>("[data-games-content]")!;
    content.innerHTML = `
      <section data-games-round-result-stage data-games-round-result-question-id="q1" data-games-round-result-signature="${signature}">
        <div data-games-round-result-dynamic>Old timer</div>
        <div data-games-round-result-cinema>Old cards</div>
      </section>
    `;

    refreshGamesDom(options);

    expect(content.innerHTML).toContain("Final results");
    expect(content.innerHTML).not.toContain("Old cards");
    expect(options.syncRoomChatRuntime).toHaveBeenCalledOnce();
  });

  it("понимает, когда нужно пересобрать game-room layout", () => {
    const root = document.createElement("div");
    root.innerHTML = '<main class="app-layout app-layout--content-wide"></main>';

    expect(shouldRerenderGamesShell(root, createRoom("active"))).toBe(true);
    expect(shouldRerenderGamesShell(root, createRoom("waiting"))).toBe(false);
    expect(shouldRerenderGamesShell(root, createRoom("waiting", { isPublicLobby: true }))).toBe(
      false,
    );
  });

  it("обновляет overlay жалобы или общий overlay fallback", () => {
    const options = createOptions();
    options.root!.querySelector("[data-games-overlay]")!.innerHTML =
      "<div data-games-report-overlay></div>";

    refreshQuestionReportOverlayDom(options);
    expect(options.root?.querySelector("[data-games-report-overlay]")?.innerHTML).toContain(
      "Report",
    );

    options.root!.querySelector("[data-games-overlay]")!.innerHTML = "";
    refreshQuestionReportOverlayDom(options);
    expect(options.root?.querySelector("[data-games-overlay]")?.innerHTML).toContain("Overlay");
  });

  it("обновляет внешний чат и управляет прокруткой", () => {
    const options = createOptions();

    refreshRoomChatDom(options, { forceScrollToBottom: true });

    expect(options.root?.querySelector("[data-games-external-chat]")?.innerHTML).toContain("Chat");
    expect(options.scrollRoomChatToBottom).toHaveBeenCalledWith(
      options.root?.querySelector("[data-games-external-chat]"),
      { ensureAfterRender: true },
    );
  });
});
