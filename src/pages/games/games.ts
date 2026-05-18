/**
 * Страница игрового микросервиса.
 *
 * Сейчас содержит одну игру: числовую дуэль в комнате на двух игроков.
 */
import { renderHeader } from "../../components/header/header";
import { renderSidebar } from "../../components/sidebar/sidebar";
import {
  createGameRoom,
  getGameHistory,
  getGameRoom,
  joinGameRoom,
  startGameRoom,
  submitGameAnswer,
  subscribeToGameRoom,
  type GameHistoryItem,
  type GameRoom,
  type GameRoomSocketSubscription,
} from "../../api/games";
import { getSessionUser } from "../../state/session";
import { escapeHtml } from "../../utils/avatar";

type GamesRoot = (Document | HTMLElement) & {
  __gamesBound?: boolean;
};

type GamesPageState = {
  room: GameRoom | null;
  history: GameHistoryItem[];
  roomId: string;
  message: string;
  error: string;
  socketOpen: boolean;
  loading: boolean;
};

let gamesState: GamesPageState = createEmptyState();
let gamesRoot: Document | HTMLElement | null = null;
let roomSubscription: GameRoomSocketSubscription | null = null;
let subscribedRoomId = "";
let countdownTimerId: number | null = null;
let finishRefreshRoomId = "";

function createEmptyState(): GamesPageState {
  return {
    room: null,
    history: [],
    roomId: "",
    message: "",
    error: "",
    socketOpen: false,
    loading: false,
  };
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error) || !error.message) {
    return fallback;
  }

  const message = error.message.trim();
  const looksLikeHtml = /<\s*html[\s>]/i.test(message) || /<\s*body[\s>]/i.test(message);

  if (looksLikeHtml) {
    return "Игровой сервис пока недоступен. Сервер вернул HTML-страницу ошибки вместо JSON.";
  }

  return message.length > 220 ? `${message.slice(0, 220)}...` : message;
}

function getRequestedRoomId(params?: Record<string, string>): string {
  return String(params?.roomId ?? "").trim();
}

function getCurrentProfileId(): string {
  return String(getSessionUser()?.id ?? "");
}

function getPlayerName(room: GameRoom | null, profileId: string): string {
  if (!profileId) return "Игрок";
  return room?.players.find((player) => player.profileId === profileId)?.name ?? "Игрок";
}

function getOpponentName(room: GameRoom | null): string {
  const currentProfileId = getCurrentProfileId();
  return (
    room?.players.find((player) => player.profileId !== currentProfileId)?.name ??
    "Ожидаем соперника"
  );
}

function getOpponent(room: GameRoom | null) {
  const currentProfileId = getCurrentProfileId();
  return room?.players.find((player) => player.profileId !== currentProfileId) ?? null;
}

function getCurrentPlayer(room: GameRoom | null) {
  const currentProfileId = getCurrentProfileId();
  return room?.players.find((player) => player.profileId === currentProfileId) ?? null;
}

function formatDate(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatResult(result: GameHistoryItem["result"]): string {
  if (result === "win") return "Победа";
  if (result === "loss") return "Поражение";
  if (result === "draw") return "Ничья";
  return "Игра";
}

function formatStatus(room: GameRoom | null): string {
  if (!room) return "Лобби";
  if (room.status === "waiting") return "Ожидание";
  if (room.status === "active") return "Игра идёт";
  return "Завершена";
}

function getRoomWinnerLabel(room: GameRoom): string {
  if (room.status !== "finished") return "";
  if (!room.winnerProfileId) return "Ничья";
  const winnerName = getPlayerName(room, room.winnerProfileId);
  return `Победил ${winnerName}`;
}

function getInputValue(form: HTMLFormElement, name: string): string {
  const field = form.elements.namedItem(name);
  return field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement
    ? field.value.trim()
    : "";
}

function parsePositiveInt(value: string, fallback: number): number {
  const numberValue = Number.parseInt(value, 10);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : fallback;
}

function parseAnswer(value: string): number | null {
  const normalized = value.replace(",", ".");
  const answer = Number(normalized);
  return Number.isFinite(answer) ? answer : null;
}

function navigateToRoom(roomId: string): void {
  window.history.pushState({}, "", `/games/${encodeURIComponent(roomId)}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function renderCreateRoomPanel(): string {
  return `
    <section class="games-panel content-card">
      <header class="games-panel__header">
        <div>
          <h1 class="games-panel__title">Числовая дуэль</h1>
          <p class="games-panel__subtitle">Создай комнату, пригласи друга и отвечай числом ближе к истине.</p>
        </div>
        <span class="games-status games-status--idle">Лобби</span>
      </header>

      <div class="games-actions-grid">
        <form class="games-form" data-games-create-room>
          <h2 class="games-section-title">Новая комната</h2>
          <label class="games-field">
            <span>Вопросов в раунде</span>
            <input type="number" name="questionCount" min="1" max="20" value="5" required>
          </label>
          <label class="games-field">
            <span>Время на ответ, сек.</span>
            <input type="number" name="answerTimeoutSec" min="3" max="120" value="10" required>
          </label>
          <button type="submit" class="games-button games-button--primary">Создать</button>
        </form>

        <form class="games-form" data-games-join-room>
          <h2 class="games-section-title">Войти по коду</h2>
          <label class="games-field">
            <span>Код приглашения</span>
            <input type="text" name="inviteCode" maxlength="24" placeholder="ABC123" required>
          </label>
          <button type="submit" class="games-button games-button--secondary">Подключиться</button>
        </form>
      </div>
    </section>
  `;
}

function getQuestionProgressLabel(room: GameRoom): string {
  const currentIndex = Math.min(room.questions.length + 1, Math.max(room.questionCount, 1));
  return `Вопрос ${currentIndex} из ${room.questionCount}`;
}

function renderPlayerList(room: GameRoom): string {
  const currentProfileId = getCurrentProfileId();

  return `
    <div class="games-scoreboard" aria-label="Игроки и текущий счёт">
      ${room.players
        .map(
          (player) => `
            <article class="games-player${player.profileId === currentProfileId ? " games-player--me" : ""}${player.hasAnswered ? " games-player--answered" : ""}">
              <div class="games-player__body">
                <span class="games-player__name">${escapeHtml(player.profileId === currentProfileId ? "Вы" : player.name)}</span>
                <span class="games-player__state">${player.hasAnswered ? "Ответ отправлен" : room.status === "active" ? "Думает над ответом" : "В комнате"}</span>
              </div>
              <strong class="games-player__score">${player.score}</strong>
            </article>
          `,
        )
        .join("")}
      ${
        room.players.length < 2
          ? `
            <article class="games-player games-player--empty">
              <span class="games-player__name">Свободное место</span>
              <strong class="games-player__score">?</strong>
              <span class="games-player__state">Ждём друга</span>
            </article>
          `
          : ""
      }
    </div>
  `;
}

function renderAnswerProgress(room: GameRoom): string {
  if (room.status !== "active") return "";

  const currentQuestion = room.currentQuestion;
  const currentPlayer = getCurrentPlayer(room);
  const opponent = getOpponent(room);
  const myAnswered = currentQuestion?.hasAnswered || currentPlayer?.hasAnswered;
  const opponentAnswered = opponent?.hasAnswered ?? false;

  return `
    <div class="games-answer-progress" aria-label="Статусы ответов">
      <span class="${myAnswered ? "games-answer-progress__item games-answer-progress__item--done" : "games-answer-progress__item"}">
        ${myAnswered ? "Ваш ответ принят" : "Введите ответ до конца таймера"}
      </span>
      <span class="${opponentAnswered ? "games-answer-progress__item games-answer-progress__item--done" : "games-answer-progress__item"}">
        ${opponent ? `${escapeHtml(opponent.name)} ${opponentAnswered ? "уже ответил" : "ещё думает"}` : "Ждём соперника"}
      </span>
    </div>
  `;
}

function renderCurrentQuestion(room: GameRoom): string {
  if (room.status === "waiting") {
    const canStart = room.players.length >= 2;
    return `
      <section class="games-question">
        <h2 class="games-question__title">Комната готовится</h2>
        <p class="games-question__text">Отправьте другу код приглашения. Когда второй игрок войдёт, можно запускать раунд.</p>
        <button type="button" class="games-button games-button--primary" data-games-start-room ${canStart ? "" : "disabled"}>
          ${canStart ? "Начать игру" : "Ждём второго игрока"}
        </button>
      </section>
    `;
  }

  if (room.status === "finished") {
    return `
      <section class="games-question games-question--finished">
        <h2 class="games-question__title">Раунд завершён</h2>
        <p class="games-question__text">${escapeHtml(getRoomWinnerLabel(room))}</p>
        ${renderAnswerProgress(room)}
        <a href="/games" class="games-button games-button--secondary" data-link>Вернуться в лобби</a>
      </section>
    `;
  }

  if (!room.currentQuestion) {
    return `
      <section class="games-question">
        <h2 class="games-question__title">Следующий вопрос</h2>
        <p class="games-question__text">Сервер готовит продолжение раунда.</p>
      </section>
    `;
  }

  return `
    <section class="games-question games-question--active" data-games-deadline="${escapeHtml(room.currentQuestion.deadlineAt)}">
      <div class="games-question__topline">
        <span class="games-question__label">${escapeHtml(getQuestionProgressLabel(room))}</span>
        <span class="games-countdown" data-games-countdown>--:--</span>
      </div>
      <h2 class="games-question__title">${escapeHtml(room.currentQuestion.text)}</h2>
      ${renderAnswerProgress(room)}
      <form class="games-answer-form" data-games-answer-form>
        <label class="games-field games-field--answer">
          <span>Ваш ответ${room.currentQuestion.answerUnit ? `, ${escapeHtml(room.currentQuestion.answerUnit)}` : ""}</span>
          <input
            type="number"
            name="answer"
            inputmode="decimal"
            step="any"
            placeholder="Введите число"
            ${room.currentQuestion.hasAnswered ? "disabled" : ""}
            required
          >
        </label>
        <button type="submit" class="games-button games-button--primary" ${room.currentQuestion.hasAnswered ? "disabled" : ""}>
          ${room.currentQuestion.hasAnswered ? "Ответ принят" : "Ответить"}
        </button>
      </form>
    </section>
  `;
}

function renderRoundHistory(room: GameRoom): string {
  if (!room.questions.length) {
    return `<p class="games-empty">История вопросов появится после первых ответов.</p>`;
  }

  return `
    <div class="games-rounds">
      ${room.questions
        .map((question, index) => {
          const winnerName = question.winnerProfileId
            ? getPlayerName(room, question.winnerProfileId)
            : "Ничья";

          return `
            <article class="games-round">
              <div class="games-round__header">
                <strong>Вопрос ${index + 1}</strong>
                <span>${escapeHtml(winnerName)}</span>
              </div>
              <p>${escapeHtml(question.text)}</p>
              ${
                question.correctAnswer !== null
                  ? `<span class="games-round__answer">Правильно: ${question.correctAnswer}${question.answerUnit ? ` ${escapeHtml(question.answerUnit)}` : ""}</span>`
                  : ""
              }
              <div class="games-round__players">
                ${question.answers
                  .map(
                    (answer) => `
                      <span>
                        ${escapeHtml(getPlayerName(room, answer.profileId))}: ${
                          answer.answer === null ? "нет ответа" : answer.answer
                        }
                      </span>
                    `,
                  )
                  .join("")}
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderRoomPanel(room: GameRoom): string {
  if (room.status === "active") {
    return `
      <section class="games-panel games-panel--play content-card" data-games-room-id="${escapeHtml(room.id)}">
        <header class="games-play-header">
          <span class="games-play-header__title">Числовая дуэль</span>
          <span class="games-status games-status--active">${gamesState.socketOpen ? "live" : "подключение"}</span>
        </header>
        ${renderPlayerList(room)}
        ${renderCurrentQuestion(room)}
      </section>
    `;
  }

  return `
    <section class="games-panel content-card" data-games-room-id="${escapeHtml(room.id)}">
      <header class="games-panel__header">
        <div>
          <h1 class="games-panel__title">${room.status === "finished" ? "Итоги игры" : "Комната создана"}</h1>
          <p class="games-panel__subtitle">${room.status === "finished" ? escapeHtml(getRoomWinnerLabel(room)) : `Соперник: ${escapeHtml(getOpponentName(room))}`}</p>
        </div>
        <span class="games-status games-status--${room.status}">
          ${formatStatus(room)}${gamesState.socketOpen ? " · live" : ""}
        </span>
      </header>

      ${
        room.status === "waiting"
          ? `
            <div class="games-invite">
              <span>Код приглашения</span>
              <strong>${escapeHtml(room.inviteCode || "—")}</strong>
            </div>
          `
          : ""
      }

      ${renderPlayerList(room)}
      ${renderCurrentQuestion(room)}

      ${
        room.status === "finished"
          ? `
            <section class="games-history-card">
              <h2 class="games-section-title">Ход раунда</h2>
              ${renderRoundHistory(room)}
            </section>
          `
          : ""
      }
    </section>
  `;
}

function renderHistoryPanel(history: GameHistoryItem[]): string {
  return `
    <section class="games-side-panel content-card">
      <h2 class="games-section-title">История игр</h2>
      ${
        history.length
          ? `
            <div class="games-list">
              ${history
                .slice(0, 6)
                .map(
                  (item) => `
                    <a href="/games/${encodeURIComponent(item.roomId || item.id)}" class="games-list-item" data-link>
                      <span>${escapeHtml(formatResult(item.result))} · ${escapeHtml(item.opponentName)}</span>
                      <strong>${escapeHtml(item.score || "0:0")}</strong>
                      ${formatDate(item.createdAt) ? `<small>${escapeHtml(formatDate(item.createdAt))}</small>` : ""}
                    </a>
                  `,
                )
                .join("")}
            </div>
          `
          : `<p class="games-empty">После сыгранных раундов здесь появятся результаты.</p>`
      }
    </section>
  `;
}

function renderGamesContent(): string {
  const mainPanel = gamesState.room ? renderRoomPanel(gamesState.room) : renderCreateRoomPanel();
  const shouldShowLobbyHistory = !gamesState.room;

  return `
    <div class="games-layout">
      ${
        gamesState.message || gamesState.error
          ? `
            <p class="games-message${gamesState.error ? " games-message--error" : ""}">
              ${escapeHtml(gamesState.error || gamesState.message)}
            </p>
          `
          : ""
      }
      <div class="games-main">${mainPanel}</div>
      ${shouldShowLobbyHistory ? `<div class="games-secondary">${renderHistoryPanel(gamesState.history)}</div>` : ""}
    </div>
  `;
}

function renderGamesShell(): string {
  return `
    <section class="games-page" data-games-page data-room-id="${escapeHtml(gamesState.roomId)}">
      <div data-games-content>
        ${renderGamesContent()}
      </div>
    </section>
  `;
}

function stopCountdown(): void {
  if (countdownTimerId !== null) {
    window.clearInterval(countdownTimerId);
    countdownTimerId = null;
  }
}

function updateCountdown(root: Document | HTMLElement): void {
  const countdownEl = root.querySelector<HTMLElement>("[data-games-countdown]");
  const questionEl = root.querySelector<HTMLElement>("[data-games-deadline]");
  if (!countdownEl || !questionEl) return;

  const deadline = new Date(questionEl.dataset.gamesDeadline ?? "");
  const diffMs = deadline.getTime() - Date.now();

  if (Number.isNaN(deadline.getTime())) {
    countdownEl.textContent = "--:--";
    return;
  }

  const totalSeconds = Math.max(0, Math.ceil(diffMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  countdownEl.textContent = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  countdownEl.classList.toggle("games-countdown--danger", totalSeconds <= 3);
}

function startCountdown(root: Document | HTMLElement): void {
  stopCountdown();
  updateCountdown(root);
  if (!root.querySelector("[data-games-countdown]")) return;

  countdownTimerId = window.setInterval(() => {
    if (!gamesRoot) return;
    updateCountdown(gamesRoot);
  }, 250);
}

function refreshGamesDom(): void {
  if (!gamesRoot) return;
  const content = gamesRoot.querySelector<HTMLElement>("[data-games-content]");
  if (!content) return;

  content.innerHTML = renderGamesContent();
  startCountdown(gamesRoot);
}

function setGamesState(patch: Partial<GamesPageState>): void {
  gamesState = { ...gamesState, ...patch };
  refreshGamesDom();
}

async function refreshHistory(): Promise<void> {
  const history = await getGameHistory();
  setGamesState({ history });
}

function syncRoomSubscription(): void {
  const roomId = gamesState.room?.id || gamesState.roomId;

  if (!roomId || subscribedRoomId === roomId) return;

  roomSubscription?.close();
  roomSubscription = subscribeToGameRoom(roomId, {
    onRoom: (room) => {
      const becameFinished =
        room.status === "finished" && finishRefreshRoomId !== `${room.id}:${room.questions.length}`;
      gamesState = {
        ...gamesState,
        room,
        roomId: room.id,
        socketOpen: roomSubscription?.isOpen() ?? false,
        error: "",
      };
      refreshGamesDom();

      if (becameFinished) {
        finishRefreshRoomId = `${room.id}:${room.questions.length}`;
        void refreshHistory().catch(() => undefined);
      }
    },
    onOpen: () => setGamesState({ socketOpen: true }),
    onClose: () => setGamesState({ socketOpen: false }),
    onError: () => setGamesState({ socketOpen: false }),
  });
  subscribedRoomId = roomId;
}

function teardownGamesRuntime(): void {
  stopCountdown();
  roomSubscription?.close();
  roomSubscription = null;
  subscribedRoomId = "";
  finishRefreshRoomId = "";
}

async function handleCreateRoom(form: HTMLFormElement): Promise<void> {
  setGamesState({ loading: true, message: "Создаём комнату...", error: "" });
  const questionCount = parsePositiveInt(getInputValue(form, "questionCount"), 5);
  const answerTimeoutSec = parsePositiveInt(getInputValue(form, "answerTimeoutSec"), 10);
  const room = await createGameRoom({ questionCount, answerTimeoutSec, gameType: "number_duel" });
  navigateToRoom(room.id);
}

async function handleJoinRoom(form: HTMLFormElement): Promise<void> {
  const inviteCode = getInputValue(form, "inviteCode").toUpperCase();
  if (!inviteCode) return;

  setGamesState({ loading: true, message: "Подключаемся к комнате...", error: "" });
  const room = await joinGameRoom(inviteCode);
  navigateToRoom(room.id);
}

async function handleSubmitAnswer(form: HTMLFormElement): Promise<void> {
  if (!gamesState.room) return;
  const answer = parseAnswer(getInputValue(form, "answer"));
  if (answer === null) {
    setGamesState({ error: "Введите числовой ответ.", message: "" });
    return;
  }

  const sentBySocket = roomSubscription?.sendAnswer(answer) ?? false;
  if (!sentBySocket) {
    const room = await submitGameAnswer(gamesState.room.id, answer);
    if (room) {
      setGamesState({
        room,
        error: "",
        message: "Ответ отправлен.",
      });
    }
  } else {
    setGamesState({ error: "", message: "Ответ отправлен." });
  }
}

async function handleStartRoom(): Promise<void> {
  if (!gamesState.room) return;
  const room = await startGameRoom(gamesState.room.id);
  setGamesState({ room, error: "", message: "Игра началась." });
}

function bindGamesEvents(root: GamesRoot): void {
  if (root.__gamesBound) return;

  root.addEventListener("submit", (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLFormElement)) return;

    const action = target.matches("[data-games-create-room]")
      ? () => handleCreateRoom(target)
      : target.matches("[data-games-join-room]")
        ? () => handleJoinRoom(target)
        : target.matches("[data-games-answer-form]")
          ? () => handleSubmitAnswer(target)
          : null;

    if (!action) return;
    event.preventDefault();
    void action().catch((error: unknown) => {
      setGamesState({
        loading: false,
        message: "",
        error: getErrorMessage(error, "Не удалось выполнить действие."),
      });
    });
  });

  root.addEventListener("click", (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (target.closest("[data-games-start-room]")) {
      event.preventDefault();
      void handleStartRoom().catch((error: unknown) => {
        setGamesState({ message: "", error: getErrorMessage(error, "Не удалось начать игру.") });
      });
      return;
    }
  });

  root.__gamesBound = true;
}

async function loadInitialState(roomId: string, signal?: AbortSignal): Promise<GamesPageState> {
  const state = createEmptyState();
  state.roomId = roomId;

  const [historyResult, roomResult] = await Promise.allSettled([
    getGameHistory(signal),
    roomId ? getGameRoom(roomId, signal) : Promise.resolve(null),
  ]);

  if (historyResult.status === "fulfilled") state.history = historyResult.value;
  if (roomResult.status === "fulfilled") {
    state.room = roomResult.value;
  }

  const rejected = [historyResult, roomResult].find(
    (result) => result.status === "rejected" && !isAbortError(result.reason),
  );
  const aborted = [historyResult, roomResult].find(
    (result) => result.status === "rejected" && isAbortError(result.reason),
  );

  if (aborted?.status === "rejected") {
    throw aborted.reason;
  }

  if (rejected?.status === "rejected") {
    state.error = getErrorMessage(rejected.reason, "Не удалось загрузить игровые данные.");
  }

  return state;
}

export async function renderGames(
  params?: Record<string, string>,
  signal?: AbortSignal,
): Promise<string> {
  const currentUser = getSessionUser();

  if (!currentUser) {
    return (await import("../feed/feed")).renderFeed(undefined, signal);
  }

  gamesState = await loadInitialState(getRequestedRoomId(params), signal);

  return `
    <div class="app-page app-page--content-wide">
      ${renderHeader()}
      <main class="app-layout app-layout--content-wide">
        <aside class="app-layout__left">
          ${renderSidebar({ isAuthorised: true })}
        </aside>
        <section class="app-layout__center">
          ${renderGamesShell()}
        </section>
      </main>
    </div>
  `;
}

export function initGames(root: Document | HTMLElement = document): void {
  gamesRoot = root;
  bindGamesEvents(root as GamesRoot);
  startCountdown(root);
  syncRoomSubscription();
}

window.addEventListener("apprender", () => {
  if (!document.querySelector("[data-games-page]")) {
    teardownGamesRuntime();
  }
});
