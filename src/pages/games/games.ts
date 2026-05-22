/**
 * Страница игрового микросервиса.
 *
 * `/games` показывает каталог игр, а `/games/quiz` открывает числовую викторину.
 */
import { renderHeader } from "../../components/header/header";
import { renderSidebar } from "../../components/sidebar/sidebar";
import {
  createGameRoom,
  disbandGameRoom,
  getGameRoom,
  getGameRooms,
  joinGameRoom,
  kickGameRoomPlayer,
  leaveGameRoom,
  setGameRoomReady,
  startGameRoom,
  submitGameAnswer,
  subscribeToGameRoom,
  updateGameRoomPassword,
  type GameRoom,
  type GameRoomSocketSubscription,
} from "../../api/games";
import { ApiError } from "../../api/core/client";
import { getProfileById } from "../../api/profile";
import { getSessionUser } from "../../state/session";
import { escapeHtml, prepareAvatarLinks, renderAvatarMarkup } from "../../utils/avatar";
import { showAppToast } from "../../utils/toast";

type GamesRoot = (Document | HTMLElement) & {
  __gamesBound?: boolean;
};

type GamesPageState = {
  room: GameRoom | null;
  lobbyMode: GamesLobbyMode;
  rooms: GameRoom[];
  roomsError: string;
  roomsSearchQuery: string;
  joinPasswordRoomId: string;
  disbandConfirmOpen: boolean;
  startConfirmOpen: boolean;
  leaveConfirmOpen: boolean;
  passwordMenuOpen: boolean;
  passwordModalMode: GamesPasswordModalMode;
  roomId: string;
  message: string;
  error: string;
  errorTarget: GamesErrorTarget;
  socketOpen: boolean;
  loading: boolean;
  roomsLoading: boolean;
};

type GamesLobbyMode = "menu" | "create" | "rooms" | "join";
type GamesErrorTarget = "" | "answer" | "form" | "footer" | "password";
type GamesPasswordModalMode = "" | "set" | "change" | "remove";

let gamesState: GamesPageState = createEmptyState();
let gamesRoot: Document | HTMLElement | null = null;
let roomSubscription: GameRoomSocketSubscription | null = null;
let subscribedRoomId = "";
let countdownTimerId: number | null = null;
const gameAvatarLinkCache = new Map<string, string>();

type GameCatalogItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  playerCount: string;
};

const GAME_CATALOG: GameCatalogItem[] = [
  {
    id: "quiz",
    title: "Числовая викторина",
    description:
      "Викторина, где на каждый вопрос нужно дать ответ в виде числа - год, расстояние, количество и т. д. Побеждает тот, кто оказался ближе всех к правильному ответу, а при равенстве - тот, кто ответил быстрее.",
    href: "/games/quiz",
    playerCount: "2-8",
  },
];

function createEmptyState(): GamesPageState {
  return {
    room: null,
    lobbyMode: "menu",
    rooms: [],
    roomsError: "",
    roomsSearchQuery: "",
    joinPasswordRoomId: "",
    disbandConfirmOpen: false,
    startConfirmOpen: false,
    leaveConfirmOpen: false,
    passwordMenuOpen: false,
    passwordModalMode: "",
    roomId: "",
    message: "",
    error: "",
    errorTarget: "",
    socketOpen: false,
    loading: false,
    roomsLoading: false,
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

function getRoomsErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 404) {
    return "Текущий сервер не отдаёт список комнат. Можно создать комнату или войти по коду приглашения.";
  }

  return getErrorMessage(error, "Не удалось загрузить список комнат.");
}

function getRequestedRoomId(params?: Record<string, string>): string {
  return String(params?.roomId ?? "").trim();
}

function normalisePath(pathname: string): string {
  return pathname.replace(/\/+$/g, "") || "/";
}

function isGamesCatalogRoute(): boolean {
  return normalisePath(window.location.pathname) === "/games";
}

function closeGameCatalogHints(root: Document | HTMLElement, except?: HTMLButtonElement): void {
  root.querySelectorAll<HTMLButtonElement>("[data-games-catalog-hint]").forEach((button) => {
    if (button === except) return;
    button.classList.remove("games-catalog-card__hint-button--open");
    button.setAttribute("aria-expanded", "false");
    const hintId = button.getAttribute("aria-controls");
    if (!hintId) return;
    const hint = root.querySelector<HTMLElement>(`#${CSS.escape(hintId)}`);
    if (hint) {
      hint.hidden = true;
    }
  });
}

function getCurrentProfileId(): string {
  return String(getSessionUser()?.id ?? "");
}

function getPlayerName(room: GameRoom | null, profileId: string): string {
  if (!profileId) return "Игрок";
  return room?.players.find((player) => player.profileId === profileId)?.name ?? "Игрок";
}

function getOpponent(room: GameRoom | null) {
  const currentProfileId = getCurrentProfileId();
  return room?.players.find((player) => player.profileId !== currentProfileId) ?? null;
}

function getCurrentPlayer(room: GameRoom | null) {
  const currentProfileId = getCurrentProfileId();
  return (
    room?.players.find((player) => player.isMe) ??
    room?.players.find((player) => player.profileId === currentProfileId) ??
    null
  );
}

function isCurrentRoomCreator(room: GameRoom): boolean {
  const currentPlayer = getCurrentPlayer(room);
  return Boolean(currentPlayer?.profileId && currentPlayer.profileId === room.createdByProfileId);
}

function formatStatus(room: GameRoom | null): string {
  if (!room) return "Лобби";
  if (room.status === "waiting") return "Ожидание";
  if (room.status === "active") return "Игра идёт";
  return "Завершена";
}

function formatParticipants(room: GameRoom): string {
  return `Участников в лобби: ${room.players.length}/${getRoomMaxPlayers(room)}`;
}

function formatReadyPlayers(room: GameRoom): string {
  const readyCount = room.players.filter((player) => player.isReady).length;
  return `Готовы: ${readyCount}/${room.players.length}`;
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

function getCheckboxValue(form: HTMLFormElement, name: string): boolean {
  const field = form.elements.namedItem(name);
  return field instanceof HTMLInputElement && field.type === "checkbox" ? field.checked : false;
}

function parseBoundedInt(value: string, fallback: number, min: number, max: number): number {
  const numberValue = Number.parseInt(value, 10);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.min(max, Math.max(min, numberValue));
}

function renderNumericCreateInput({
  name,
  value,
  min,
  max,
  maxMessage,
  minMessage,
}: {
  name: string;
  value: string;
  min: number;
  max: number;
  maxMessage: string;
  minMessage: string;
}): string {
  return `
    <input
      type="text"
      name="${escapeHtml(name)}"
      inputmode="numeric"
      pattern="[0-9]*"
      autocomplete="off"
      value="${escapeHtml(value)}"
      required
      data-games-number-field
      data-games-number-min="${min}"
      data-games-number-max="${max}"
      data-games-number-min-message="${escapeHtml(minMessage)}"
      data-games-number-max-message="${escapeHtml(maxMessage)}"
      data-games-number-invalid-message="некорректный ввод"
      aria-invalid="false"
    >
    <span class="games-field__error" data-games-field-error aria-live="polite"></span>
  `;
}

function setNumericFieldError(input: HTMLInputElement, message: string): void {
  const field = input.closest(".games-field");
  const error = field?.querySelector<HTMLElement>("[data-games-field-error]");
  input.setAttribute("aria-invalid", message ? "true" : "false");
  field?.classList.toggle("games-field--invalid", Boolean(message));
  if (error) {
    error.textContent = message;
  }
}

function getNumericFieldError(input: HTMLInputElement, validateEmpty = false): string {
  const value = input.value.trim();
  if (!value) {
    return validateEmpty ? (input.dataset.gamesNumberInvalidMessage ?? "некорректный ввод") : "";
  }

  if (!/^\d+$/.test(value)) {
    return input.dataset.gamesNumberInvalidMessage ?? "некорректный ввод";
  }

  const numberValue = Number(value);
  const min = Number(input.dataset.gamesNumberMin);
  const max = Number(input.dataset.gamesNumberMax);

  if (Number.isFinite(min) && numberValue < min) {
    return input.dataset.gamesNumberMinMessage ?? `минимум ${min}`;
  }

  if (Number.isFinite(max) && numberValue > max) {
    return input.dataset.gamesNumberMaxMessage ?? `максимум ${max}`;
  }

  return "";
}

function validateNumericField(input: HTMLInputElement, validateEmpty = false): boolean {
  const message = getNumericFieldError(input, validateEmpty);
  setNumericFieldError(input, message);
  return !message;
}

function validateCreateRoomForm(form: HTMLFormElement): boolean {
  let firstInvalid: HTMLInputElement | null = null;

  const inputs = Array.from(form.querySelectorAll<HTMLInputElement>("[data-games-number-field]"));
  for (const input of inputs) {
    if (!validateNumericField(input, true) && !firstInvalid) {
      firstInvalid = input;
    }
  }

  if (firstInvalid) {
    firstInvalid.focus();
  }
  return !firstInvalid;
}

function parseAnswer(value: string): number | null {
  const normalized = value.replace(",", ".");
  const answer = Number(normalized);
  return Number.isFinite(answer) ? answer : null;
}

function navigateToRoom(roomId: string): void {
  window.history.pushState({}, "", `/games/quiz/${encodeURIComponent(roomId)}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function renderGamesCatalog(): string {
  return `
    <section class="games-catalog content-card">
      <header class="games-catalog__header">
        <div>
          <h1 class="games-catalog__title">Игры</h1>
          <p class="games-catalog__subtitle">Выберите игру и переходите в лобби.</p>
        </div>
      </header>

      <div class="games-catalog__list" aria-label="Список игр">
        ${GAME_CATALOG.map((game) => {
          const hintId = `games-catalog-hint-${game.id}`;
          return `
            <article class="games-catalog-card" data-game-id="${escapeHtml(game.id)}">
              <a href="${game.href}" class="games-catalog-card__link" data-link>
                <h2 class="games-catalog-card__title">${escapeHtml(game.title)}</h2>
                <span class="games-catalog-card__players">Игроков: ${escapeHtml(game.playerCount)}</span>
              </a>
              <button
                type="button"
                class="games-catalog-card__hint-button"
                data-games-catalog-hint
                aria-controls="${escapeHtml(hintId)}"
                aria-label="Показать описание игры"
                aria-expanded="false"
              >
                ?
              </button>
              <p id="${escapeHtml(hintId)}" class="games-catalog-card__hint" hidden>
                ${escapeHtml(game.description)}
              </p>
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderLobbyBackButton(): string {
  return `
    <button type="button" class="games-button games-button--ghost games-lobby-back" data-games-lobby-mode="menu">
      Назад
    </button>
  `;
}

function renderLobbyMenu(): string {
  const items: Array<{ mode: GamesLobbyMode; title: string; text: string }> = [
    {
      mode: "create",
      title: "Создать комнату",
      text: "Настройте участников, вопросы, таймер и способ входа.",
    },
    {
      mode: "rooms",
      title: "Посмотреть список комнат",
      text: "Выберите активную комнату, где ждут игроков.",
    },
    {
      mode: "join",
      title: "Войти по приглашению",
      text: "Введите шестисимвольный код от создателя комнаты.",
    },
  ];

  return `
    <div class="games-lobby-menu" aria-label="Действия в лобби">
      ${items
        .map(
          (item) => `
            <button type="button" class="games-lobby-option" data-games-lobby-mode="${item.mode}">
              <strong>${escapeHtml(item.title)}</strong>
              <span>${escapeHtml(item.text)}</span>
            </button>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderCreateRoomForm(): string {
  return `
    <div class="games-lobby-subview">
      <form id="games-create-room-form" class="games-form games-form--plain games-form--wide" data-games-create-room>
        <div class="games-form-grid">
          <label class="games-field">
            <span>Максимум участников</span>
            ${renderNumericCreateInput({
              name: "maxPlayers",
              value: "2",
              min: 2,
              max: 8,
              minMessage: "минимум 2 человека",
              maxMessage: "максимум 8 человек",
            })}
          </label>
          <label class="games-field">
            <span>Вопросов в раунде</span>
            ${renderNumericCreateInput({
              name: "questionCount",
              value: "5",
              min: 1,
              max: 20,
              minMessage: "минимум 1 вопрос",
              maxMessage: "максимум 20 вопросов",
            })}
          </label>
          <label class="games-field">
            <span class="games-field__label-row">
              <span>Время на ответ, сек.</span>
              <button
                type="button"
                class="games-catalog-card__hint-button games-field-hint-button"
                data-games-catalog-hint
                aria-controls="games-create-timeout-hint"
                aria-label="Показать подсказку про время ответа"
                aria-expanded="false"
              >
                ?
              </button>
            </span>
            ${renderNumericCreateInput({
              name: "answerTimeoutSec",
              value: "10",
              min: 0,
              max: 300,
              minMessage: "минимум 0 секунд",
              maxMessage: "максимум 300 секунд",
            })}
            <span id="games-create-timeout-hint" class="games-field-popover" hidden>
              0 - время неограничено
            </span>
          </label>
          <label class="games-field">
            <span>Пароль</span>
            <input type="password" name="password" maxlength="64" placeholder="Необязательно">
          </label>
        </div>

        <label class="games-check">
          <input type="checkbox" name="inviteCodeEnabled" checked>
          <span>Получить код приглашения</span>
          <button
            type="button"
            class="games-catalog-card__hint-button games-field-hint-button"
            data-games-catalog-hint
            aria-controls="games-create-invite-code-hint"
            aria-label="Показать подсказку про код приглашения"
            aria-expanded="false"
          >
            ?
          </button>
          <span id="games-create-invite-code-hint" class="games-field-popover games-field-popover--check" hidden>
            Вы получите уникальный код, введя который другие люди смогут попасть сразу в вашу комнату
          </span>
        </label>

        ${renderInlineGameError("form")}
      </form>
    </div>
  `;
}

function getRoomMaxPlayers(room: GameRoom): number {
  return Math.min(8, Math.max(2, room.maxPlayers || 2));
}

function getRoomAuthor(room: GameRoom) {
  return (
    room.creator ??
    room.players.find((player) => player.profileId === room.createdByProfileId) ??
    room.players[0] ??
    null
  );
}

function getRoomAuthorHref(profileId: string): string {
  return profileId ? `/id${encodeURIComponent(profileId)}` : "/profile";
}

function getPlayerAvatarUrl(player: GameRoom["players"][number]): string {
  if (player.isMe) {
    return getSessionUser()?.avatarLink || player.avatarUrl;
  }
  return gameAvatarLinkCache.get(player.profileId) || player.avatarUrl;
}

async function hydrateGameRoomAvatars(room: GameRoom, signal?: AbortSignal): Promise<GameRoom> {
  const creator = room.creator
    ? ((await hydrateGamePlayersAvatars([room.creator], signal))[0] ?? room.creator)
    : null;
  const players = await hydrateGamePlayersAvatars(room.players, signal);

  await prepareAvatarLinks([
    ...(creator ? [getPlayerAvatarUrl(creator)] : []),
    ...players.map((player) => getPlayerAvatarUrl(player)),
  ]);

  return { ...room, creator, players };
}

async function hydrateGamePlayersAvatars(
  items: GameRoom["players"],
  signal?: AbortSignal,
): Promise<GameRoom["players"]> {
  const players = await Promise.all(
    items.map(async (player) => {
      const sessionAvatar = player.isMe ? getSessionUser()?.avatarLink : "";
      if (sessionAvatar) {
        gameAvatarLinkCache.set(player.profileId, sessionAvatar);
        return { ...player, avatarUrl: sessionAvatar };
      }

      const cachedAvatar = gameAvatarLinkCache.get(player.profileId);
      if (cachedAvatar) {
        return { ...player, avatarUrl: cachedAvatar };
      }

      if (!player.profileId) return player;

      try {
        const profile = await getProfileById(player.profileId, signal);
        const avatarLink = String(profile.imageLink ?? "").trim();
        if (!avatarLink) return player;
        gameAvatarLinkCache.set(player.profileId, avatarLink);
        return { ...player, avatarUrl: avatarLink };
      } catch {
        return player;
      }
    }),
  );
  return players;
}

async function hydrateGameRoomsAvatars(
  rooms: GameRoom[],
  signal?: AbortSignal,
): Promise<GameRoom[]> {
  return Promise.all(rooms.map((room) => hydrateGameRoomAvatars(room, signal)));
}

function renderPlayerProfileLink(player: GameRoom["players"][number]): string {
  const playerName = player.name || player.username || "Игрок";

  return `
    <a href="${getRoomAuthorHref(player.profileId)}" class="games-player-profile" data-link>
      ${renderAvatarMarkup("games-player-profile__avatar", playerName, getPlayerAvatarUrl(player), {
        width: 40,
        height: 40,
      })}
      <span class="games-player-profile__name">${escapeHtml(playerName)}</span>
    </a>
  `;
}

function renderLobbyCreator(room: GameRoom): string {
  const creator = getRoomAuthor(room);
  if (!creator) return "";

  return `
    <div class="games-lobby-creator">
      <span class="games-lobby-creator__label">Создатель:</span>
      ${renderPlayerProfileLink(creator)}
    </div>
  `;
}

function renderRoomAuthor(room: GameRoom): string {
  const author = getRoomAuthor(room);
  const name = getRoomAuthorName(room);
  const profileId = author?.profileId || room.createdByProfileId;

  return `
    <a href="${getRoomAuthorHref(profileId)}" class="games-room-author" data-link>
      ${renderAvatarMarkup(
        "games-room-author__avatar",
        name,
        author ? getPlayerAvatarUrl(author) : "",
        {
          width: 36,
          height: 36,
        },
      )}
      <span>${escapeHtml(name)}</span>
    </a>
  `;
}

function getRoomAuthorName(room: GameRoom): string {
  const author = getRoomAuthor(room);
  return author?.name || "Создатель";
}

function isRoomCreatedByCurrentUser(room: GameRoom): boolean {
  const currentProfileId = getCurrentProfileId();
  return (
    Boolean(currentProfileId && room.createdByProfileId === currentProfileId) ||
    room.players.some((player) => player.isMe && player.profileId === room.createdByProfileId)
  );
}

function renderRoomListItem(room: GameRoom): string {
  const maxPlayers = getRoomMaxPlayers(room);
  const canJoin = room.status === "waiting" && room.players.length < maxPlayers;

  return `
    <article class="games-room-card">
      <div class="games-room-card__main">
        <div class="games-room-card__summary">
          ${renderRoomAuthor(room)}
          <div class="games-room-card__meta" aria-label="Параметры комнаты">
            <span>Участников: ${room.players.length}/${maxPlayers}</span>
            <span class="games-room-card__separator" aria-hidden="true"></span>
            <span>${room.hasPassword ? "Есть пароль" : "Без пароля"}</span>
          </div>
        </div>
      </div>

      <form class="games-room-card__join" data-games-join-listed-room>
        <input type="hidden" name="roomId" value="${escapeHtml(room.id)}">
        ${room.inviteCode ? `<input type="hidden" name="inviteCode" value="${escapeHtml(room.inviteCode)}">` : ""}
        ${
          room.hasPassword
            ? `<button type="button" class="games-button ${canJoin ? "games-button--primary" : "games-button--secondary"}" data-games-join-password-room="${escapeHtml(room.id)}" ${canJoin ? "" : "disabled"}>
                ${canJoin ? "Войти" : "Недоступна"}
              </button>`
            : `<button type="submit" class="games-button ${canJoin ? "games-button--primary" : "games-button--secondary"}" ${canJoin ? "" : "disabled"}>
                ${canJoin ? "Войти" : "Недоступна"}
              </button>`
        }
      </form>
    </article>
  `;
}

function renderRoomsList(): string {
  const query = gamesState.roomsSearchQuery.trim().toLowerCase();
  const rooms = gamesState.rooms.filter(
    (room) =>
      room.status === "waiting" &&
      room.players.length < getRoomMaxPlayers(room) &&
      (!query || getRoomAuthorName(room).toLowerCase().includes(query)),
  );

  if (gamesState.roomsLoading) {
    return `<p class="games-empty">Загружаем активные комнаты...</p>`;
  }

  if (gamesState.roomsError) {
    return `<p class="games-message games-message--error">${escapeHtml(gamesState.roomsError)}</p>`;
  }

  if (!rooms.length) {
    if (query) {
      return `<p class="games-empty">Список пуст.</p>`;
    }

    return `
      <p class="games-empty">
        Сейчас нет ни одной комнаты.
        <button type="button" class="games-empty__link" data-games-lobby-mode="create">Создать?</button>
      </p>
    `;
  }

  return `
    <div class="games-room-list">
      ${rooms.map(renderRoomListItem).join("")}
    </div>
  `;
}

function renderRoomsPanel(): string {
  return `
    <div class="games-lobby-subview">
      <label class="games-room-search search-field">
        <span class="search-field__icon" aria-hidden="true">
          <img src="/assets/img/icons/search.svg" alt="">
        </span>
        <input class="search-field__input" type="search" name="roomsSearch" value="${escapeHtml(gamesState.roomsSearchQuery)}" placeholder="Поиск" aria-label="Поиск по создателю комнаты" data-games-rooms-search>
      </label>
      <div data-games-room-list>
        ${renderRoomsList()}
      </div>
    </div>
  `;
}

function renderJoinByCodeForm(): string {
  return `
    <div class="games-lobby-subview">
      <form id="games-join-room-form" class="games-form games-form--plain games-form--invite" data-games-join-room>
        <label class="games-field">
          <span>Код приглашения</span>
          <input type="text" name="inviteCode" maxlength="6" pattern="[A-Za-z0-9]{6}" required>
        </label>
        <label class="games-field">
          <span>Пароль (опционально)</span>
          <input type="password" name="password" maxlength="64">
        </label>
        ${renderInlineGameError("form")}
      </form>
    </div>
  `;
}

function renderLobbyContent(): string {
  if (gamesState.lobbyMode === "create") return renderCreateRoomForm();
  if (gamesState.lobbyMode === "rooms") return renderRoomsPanel();
  if (gamesState.lobbyMode === "join") return renderJoinByCodeForm();
  return renderLobbyMenu();
}

function renderCreateRoomPanel(): string {
  const game = GAME_CATALOG[0];
  const isLobbyMenu = gamesState.lobbyMode === "menu";
  const title =
    gamesState.lobbyMode === "create"
      ? `${game?.title ?? "Числовая викторина"} - создать комнату`
      : gamesState.lobbyMode === "join"
        ? `${game?.title ?? "Числовая викторина"} - вход по приглашению`
        : gamesState.lobbyMode === "rooms"
          ? `${game?.title ?? "Числовая викторина"} - активные комнаты`
          : (game?.title ?? "Числовая викторина");

  return `
    <section class="games-panel content-card">
      <header class="games-panel__header">
        <div>
          <h1 class="games-panel__title">${escapeHtml(title)}</h1>
          <p class="games-panel__subtitle">${escapeHtml(game?.description ?? "")}</p>
        </div>
      </header>

      ${renderLobbyContent()}
      <div class="games-panel__footer">
        ${
          isLobbyMenu
            ? `<a href="/games" class="games-button games-button--ghost" data-link>Назад к списку игр</a>`
            : `<button type="button" class="games-button games-button--ghost" data-games-lobby-mode="menu">Назад</button>`
        }
        ${
          gamesState.lobbyMode === "create"
            ? `<button type="submit" form="games-create-room-form" class="games-button games-button--primary" ${gamesState.loading ? "disabled" : ""}>${gamesState.loading ? "Создаём..." : "Создать комнату"}</button>`
            : ""
        }
        ${
          gamesState.lobbyMode === "join"
            ? `<button type="submit" form="games-join-room-form" class="games-button games-button--primary" ${gamesState.loading ? "disabled" : ""}>${gamesState.loading ? "Подключаемся..." : "Войти"}</button>`
            : ""
        }
        ${
          gamesState.lobbyMode === "rooms"
            ? `<button type="button" class="games-button games-button--ghost" data-games-refresh-rooms ${gamesState.roomsLoading ? "disabled" : ""}>Обновить</button>`
            : ""
        }
      </div>
    </section>
  `;
}

function getQuestionProgressLabel(room: GameRoom): string {
  const currentIndex = Math.min(room.questions.length + 1, Math.max(room.questionCount, 1));
  return `Вопрос ${currentIndex} из ${room.questionCount}`;
}

function renderPlayerList(room: GameRoom): string {
  const emptySlots = Math.max(0, getRoomMaxPlayers(room) - room.players.length);
  const isCreator = isCurrentRoomCreator(room);

  return `
    <div class="games-scoreboard" aria-label="Игроки в комнате">
      ${room.players
        .map(
          (player) => `
            <article class="games-player${player.isMe ? " games-player--me" : ""}${player.hasAnswered ? " games-player--answered" : ""}${room.status === "waiting" ? (player.isReady ? " games-player--ready" : " games-player--not-ready") : ""}">
              <div class="games-player__body">
                ${renderPlayerProfileLink(player)}
              </div>
              ${
                isCreator &&
                player.profileId !== room.createdByProfileId &&
                room.status === "waiting"
                  ? `
                    <button type="button" class="games-player__kick" data-games-kick-player="${escapeHtml(player.profileId)}">
                      Кикнуть
                    </button>
                  `
                  : ""
              }
            </article>
          `,
        )
        .join("")}
      ${
        emptySlots > 0
          ? `
            <div class="games-player-empty-summary">
              Свободных мест: ${emptySlots}
            </div>
          `
          : ""
      }
    </div>
  `;
}

function areRoomPlayersReady(room: GameRoom): boolean {
  return room.players.every((player) => player.isReady);
}

function getCurrentRoomPlayer(room: GameRoom): GameRoom["players"][number] | null {
  return room.players.find((player) => player.isMe) ?? null;
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
    return "";
  }

  if (room.status === "finished") {
    return `
      <section class="games-question games-question--finished">
        <h2 class="games-question__title">Раунд завершён</h2>
        <p class="games-question__text">${escapeHtml(getRoomWinnerLabel(room))}</p>
        ${renderAnswerProgress(room)}
        <a href="/games/quiz" class="games-button games-button--secondary" data-link>Вернуться в лобби</a>
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
        ${renderInlineGameError("answer")}
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
  const canDisbandRoom = room.status === "waiting" && isCurrentRoomCreator(room);
  const canLeaveRoom = room.status === "waiting" && !isCurrentRoomCreator(room);
  const canStartRoom =
    room.status === "waiting" && room.players.length >= 2 && areRoomPlayersReady(room);
  const currentPlayer = getCurrentRoomPlayer(room);
  const game = GAME_CATALOG[0];

  if (room.status === "active") {
    return `
      <section class="games-panel games-panel--play content-card" data-games-room-id="${escapeHtml(room.id)}">
        <header class="games-play-header">
          <span class="games-play-header__title">Числовая викторина</span>
          <span class="games-status games-status--active">${gamesState.socketOpen ? "live" : "подключение"}</span>
        </header>
        ${renderPlayerList(room)}
        ${renderCurrentQuestion(room)}
      </section>
    `;
  }

  return `
    <section class="games-panel content-card" data-games-room-id="${escapeHtml(room.id)}">
      <header class="games-room-header">
        <div class="games-room-header__top">
          <h1 class="games-room-heading">
            ${room.status === "finished" ? "Числовая викторина - итоги" : "Числовая викторина - лобби"}
          </h1>
          <button
            type="button"
            class="games-catalog-card__hint-button games-room-rules-button"
            data-games-room-rules
            aria-controls="games-room-rules"
            aria-label="Показать правила игры"
            aria-expanded="false"
          >
            ?
          </button>
        </div>
        <p id="games-room-rules" class="games-catalog-card__hint games-room-rules" hidden>
          ${escapeHtml(game?.description ?? "")}
        </p>
        ${
          room.status === "waiting"
            ? `
              <div class="games-room-actions">
                <button type="button" class="games-button games-button--secondary" data-games-back-to-rooms>
                  Назад к списку комнат
                </button>
                <button type="button" class="games-invite games-invite--inline" data-games-copy-invite="${escapeHtml(room.inviteCode || "")}">
                  <span>Код приглашения:</span>
                  <strong>${escapeHtml(room.inviteCode || "—")}</strong>
                </button>
              </div>
            `
            : ""
        }
        <div class="games-room-header__bottom">
          <div>
            ${room.status === "waiting" ? renderLobbyCreator(room) : ""}
            <p class="games-panel__subtitle">${room.status === "finished" ? escapeHtml(getRoomWinnerLabel(room)) : escapeHtml(formatParticipants(room))}</p>
            ${room.status === "waiting" ? `<p class="games-panel__subtitle games-panel__subtitle--compact">${escapeHtml(formatReadyPlayers(room))}</p>` : ""}
          </div>
        </div>
      </header>

      ${renderPlayerList(room)}
      ${renderCurrentQuestion(room)}
      ${
        room.status === "waiting" && canDisbandRoom
          ? `
            <section class="games-access-panel" aria-label="Доступ к лобби">
              <div class="games-access-panel__row">
                <span>
                  <span class="games-access-panel__label">Доступ:</span>
                  ${room.hasPassword ? "по паролю" : "без пароля"}
                </span>
                <div class="games-access-menu">
                  <button
                    type="button"
                    class="games-menu-toggle"
                    data-games-password-menu-toggle
                    aria-label="Действия с доступом"
                    aria-expanded="${gamesState.passwordMenuOpen ? "true" : "false"}"
                  >
                    <span></span><span></span><span></span>
                  </button>
                  <div class="games-access-menu__popup" data-games-password-menu ${gamesState.passwordMenuOpen ? "" : "hidden"}>
                    ${
                      room.hasPassword
                        ? `
                          <button type="button" class="games-access-menu__item" data-games-password-show>Показать пароль</button>
                          <button type="button" class="games-access-menu__item" data-games-password-modal-open="change">Изменить пароль</button>
                          <button type="button" class="games-access-menu__item games-access-menu__item--danger" data-games-password-modal-open="remove">Удалить пароль</button>
                        `
                        : `
                          <button type="button" class="games-access-menu__item" data-games-password-modal-open="set">Поставить пароль</button>
                        `
                    }
                  </div>
                </div>
              </div>
              ${renderInlineGameError("password")}
            </section>
          `
          : ""
      }
      ${
        room.status === "waiting"
          ? `
            <div class="games-room-footer">
              <div class="games-room-footer__secondary">
                <button type="button" class="games-button ${currentPlayer?.isReady ? "games-button--ready" : "games-button--danger"}" data-games-ready-toggle="${currentPlayer?.isReady ? "false" : "true"}" ${gamesState.loading ? "disabled" : ""}>
                  ${currentPlayer?.isReady ? "Готов" : "Не готов"}
                </button>
                ${
                  canDisbandRoom
                    ? `
                    <button type="button" class="games-button games-button--danger" data-games-disband-open ${gamesState.loading ? "disabled" : ""}>
                      Распустить лобби
                    </button>
                  `
                    : ""
                }
                ${
                  canLeaveRoom
                    ? `
                    <button type="button" class="games-button games-button--danger" data-games-leave-open ${gamesState.loading ? "disabled" : ""}>
                      Покинуть игру
                    </button>
                  `
                    : ""
                }
              </div>
              ${renderInlineGameError("footer")}
              ${
                canDisbandRoom
                  ? `
                    <div class="games-room-footer__primary">
                      <button type="button" class="games-button games-button--primary games-button--start" data-games-start-open ${canStartRoom && !gamesState.loading ? "" : "disabled"}>
                        Начать игру
                      </button>
                    </div>
                  `
                  : ""
              }
            </div>
          `
          : ""
      }

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

function renderDisbandConfirmModal(): string {
  if (!gamesState.disbandConfirmOpen) return "";

  return `
    <div class="games-confirm-modal" data-games-disband-modal>
      <section class="games-confirm-modal__dialog" role="dialog" aria-modal="true" aria-label="Распустить лобби">
        <h2 class="games-confirm-modal__title">Распустить лобби?</h2>
        <p class="games-confirm-modal__text">Вы действительно хотите распустить лобби?</p>
        <div class="games-confirm-modal__actions">
          <button type="button" class="games-button games-button--danger" data-games-disband-confirm ${gamesState.loading ? "disabled" : ""}>
            Распустить
          </button>
          <button type="button" class="games-button games-button--secondary" data-games-disband-close>
            Отмена
          </button>
        </div>
      </section>
    </div>
  `;
}

function renderStartConfirmModal(): string {
  if (!gamesState.startConfirmOpen) return "";

  return `
    <div class="games-confirm-modal" data-games-start-modal>
      <section class="games-confirm-modal__dialog" role="dialog" aria-modal="true" aria-label="Начать игру">
        <h2 class="games-confirm-modal__title">Начать игру?</h2>
        <p class="games-confirm-modal__text">Вы действительно хотите начать игру?</p>
        <div class="games-confirm-modal__actions">
          <button type="button" class="games-button games-button--primary" data-games-start-confirm ${gamesState.loading ? "disabled" : ""}>
            Начать
          </button>
          <button type="button" class="games-button games-button--secondary" data-games-start-close>
            Отмена
          </button>
        </div>
      </section>
    </div>
  `;
}

function renderLeaveConfirmModal(): string {
  if (!gamesState.leaveConfirmOpen) return "";

  return `
    <div class="games-confirm-modal" data-games-leave-modal>
      <section class="games-confirm-modal__dialog" role="dialog" aria-modal="true" aria-label="Покинуть игру">
        <h2 class="games-confirm-modal__title">Покинуть игру?</h2>
        <p class="games-confirm-modal__text">Вы действительно хотите покинуть игру?</p>
        <div class="games-confirm-modal__actions">
          <button type="button" class="games-button games-button--danger" data-games-leave-confirm ${gamesState.loading ? "disabled" : ""}>
            Покинуть
          </button>
          <button type="button" class="games-button games-button--secondary" data-games-leave-close>
            Отмена
          </button>
        </div>
      </section>
    </div>
  `;
}

function renderPasswordModal(): string {
  const mode = gamesState.passwordModalMode;
  if (!mode) return "";

  if (mode === "remove") {
    return `
      <div class="games-confirm-modal" data-games-password-modal>
        <section class="games-confirm-modal__dialog" role="dialog" aria-modal="true" aria-label="Удалить пароль">
          <h2 class="games-confirm-modal__title">Удалить пароль?</h2>
          <p class="games-confirm-modal__text">После удаления войти в лобби можно будет без пароля.</p>
          ${renderInlineGameError("password")}
          <div class="games-confirm-modal__actions">
            <button type="button" class="games-button games-button--danger" data-games-password-remove-confirm ${gamesState.loading ? "disabled" : ""}>
              Удалить пароль
            </button>
            <button type="button" class="games-button games-button--secondary" data-games-password-modal-close>
              Отмена
            </button>
          </div>
        </section>
      </div>
    `;
  }

  const title = mode === "change" ? "Изменить пароль" : "Поставить пароль";

  return `
    <div class="games-confirm-modal" data-games-password-modal>
      <section class="games-confirm-modal__dialog" role="dialog" aria-modal="true" aria-label="${title}">
        <h2 class="games-confirm-modal__title">${title}</h2>
        <form class="games-password-modal-form" data-games-password-form>
          <label class="games-field">
            <span>Пароль</span>
            <input type="password" name="password" maxlength="64" required>
          </label>
          ${renderInlineGameError("password")}
          <div class="games-confirm-modal__actions">
            <button type="submit" class="games-button games-button--primary" ${gamesState.loading ? "disabled" : ""}>
              Сохранить
            </button>
            <button type="button" class="games-button games-button--secondary" data-games-password-modal-close>
              Отмена
            </button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function renderJoinPasswordModal(): string {
  if (!gamesState.joinPasswordRoomId) return "";
  const room = gamesState.rooms.find((item) => item.id === gamesState.joinPasswordRoomId);
  if (!room) return "";

  return `
    <div class="games-confirm-modal" data-games-join-password-modal>
      <section class="games-confirm-modal__dialog" role="dialog" aria-modal="true" aria-label="Войти по паролю">
        <h2 class="games-confirm-modal__title">Войти в комнату</h2>
        <div class="games-join-modal-author">
          ${renderRoomAuthor(room)}
        </div>
        <form class="games-password-modal-form" data-games-join-listed-room>
          <input type="hidden" name="roomId" value="${escapeHtml(room.id)}">
          ${room.inviteCode ? `<input type="hidden" name="inviteCode" value="${escapeHtml(room.inviteCode)}">` : ""}
          <label class="games-field">
            <span>Пароль</span>
            <input type="password" name="password" maxlength="64" required>
          </label>
          ${renderInlineGameError("form")}
          <div class="games-confirm-modal__actions">
            <button type="submit" class="games-button games-button--primary" ${gamesState.loading ? "disabled" : ""}>
              Войти
            </button>
            <button type="button" class="games-button games-button--secondary" data-games-join-password-close>
              Отмена
            </button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function renderGamesContent(): string {
  if (isGamesCatalogRoute()) {
    return renderGamesCatalog();
  }

  const mainPanel = gamesState.room ? renderRoomPanel(gamesState.room) : renderCreateRoomPanel();

  return `
    <div class="games-layout">
      ${
        gamesState.message
          ? `
            <p class="games-message">
              ${escapeHtml(gamesState.message)}
            </p>
          `
          : ""
      }
      <div class="games-main">${mainPanel}</div>
    </div>
    ${renderDisbandConfirmModal()}
    ${renderStartConfirmModal()}
    ${renderLeaveConfirmModal()}
    ${renderPasswordModal()}
    ${renderJoinPasswordModal()}
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

function renderInlineGameError(target: GamesErrorTarget): string {
  if (!gamesState.error || gamesState.errorTarget !== target) return "";
  return `<p class="games-inline-error">${escapeHtml(gamesState.error)}</p>`;
}

async function loadWaitingRooms(): Promise<void> {
  setGamesState({ roomsLoading: true, roomsError: "", message: "", error: "" });

  try {
    const rooms = await hydrateGameRoomsAvatars(await getGameRooms());
    setGamesState({ rooms, roomsError: "", roomsLoading: false });
  } catch (error) {
    setGamesState({
      rooms: [],
      roomsLoading: false,
      roomsError: getRoomsErrorMessage(error),
      error: "",
    });
  }
}

async function selectLobbyMode(mode: GamesLobbyMode): Promise<void> {
  setGamesState({
    lobbyMode: mode,
    message: "",
    error: "",
    loading: false,
    ...(mode === "rooms" ? {} : { roomsError: "", roomsLoading: false }),
  });

  if (mode === "rooms") {
    await loadWaitingRooms();
  }
}

function syncRoomSubscription(): void {
  const roomId = gamesState.room?.id || gamesState.roomId;

  if (!roomId) {
    roomSubscription?.close();
    roomSubscription = null;
    subscribedRoomId = "";
    return;
  }

  if (subscribedRoomId === roomId) return;

  roomSubscription?.close();
  roomSubscription = subscribeToGameRoom(roomId, {
    onRoom: (room) => {
      gamesState = {
        ...gamesState,
        room,
        roomId: room.id,
        disbandConfirmOpen: false,
        startConfirmOpen: false,
        leaveConfirmOpen: false,
        socketOpen: roomSubscription?.isOpen() ?? false,
        error: "",
      };
      refreshGamesDom();
      void hydrateGameRoomAvatars(room).then((hydratedRoom) => {
        if (gamesState.room?.id !== hydratedRoom.id) return;
        setGamesState({ room: hydratedRoom });
      });
    },
    onUnavailable: () => {
      gamesState = {
        ...gamesState,
        room: null,
        roomId: "",
        lobbyMode: "menu",
        disbandConfirmOpen: false,
        startConfirmOpen: false,
        leaveConfirmOpen: false,
        socketOpen: false,
        message: "Лобби распущено.",
        error: "",
      };
      roomSubscription?.close();
      roomSubscription = null;
      subscribedRoomId = "";
      window.history.pushState({}, "", "/games/quiz");
      refreshGamesDom();
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
}

async function handleCreateRoom(form: HTMLFormElement): Promise<void> {
  if (!validateCreateRoomForm(form)) return;

  setGamesState({ loading: true, message: "Создаём комнату...", error: "", errorTarget: "" });
  const maxPlayers = parseBoundedInt(getInputValue(form, "maxPlayers"), 2, 2, 8);
  const questionCount = parseBoundedInt(getInputValue(form, "questionCount"), 5, 1, 20);
  const answerTimeoutSec = parseBoundedInt(getInputValue(form, "answerTimeoutSec"), 10, 0, 300);
  const password = getInputValue(form, "password");
  const inviteCodeEnabled = getCheckboxValue(form, "inviteCodeEnabled");
  const room = await createGameRoom({
    maxPlayers,
    questionCount,
    answerTimeoutSec,
    gameType: "number_duel",
    inviteCodeEnabled,
    ...(password ? { password } : {}),
  });
  navigateToRoom(room.id);
}

async function handleJoinRoom(form: HTMLFormElement): Promise<void> {
  const inviteCode = getInputValue(form, "inviteCode").toUpperCase();
  const password = getInputValue(form, "password");
  if (!inviteCode) return;

  setGamesState({
    loading: true,
    message: "Подключаемся к комнате...",
    error: "",
    errorTarget: "",
  });
  const room = await joinGameRoom({ inviteCode, ...(password ? { password } : {}) });
  navigateToRoom(room.id);
}

async function handleJoinListedRoom(form: HTMLFormElement): Promise<void> {
  const roomId = getInputValue(form, "roomId");
  const inviteCode = getInputValue(form, "inviteCode").toUpperCase();
  const password = getInputValue(form, "password");
  if (!roomId && !inviteCode) return;

  setGamesState({
    loading: true,
    message: "Подключаемся к комнате...",
    error: "",
    errorTarget: "",
  });
  const room = await joinGameRoom({
    roomId,
    inviteCode,
    ...(password ? { password } : {}),
  });
  setGamesState({ joinPasswordRoomId: "", error: "", errorTarget: "" });
  navigateToRoom(room.id);
}

async function handleSubmitAnswer(form: HTMLFormElement): Promise<void> {
  if (!gamesState.room) return;
  const answer = parseAnswer(getInputValue(form, "answer"));
  if (answer === null) {
    setGamesState({ error: "Введите числовой ответ.", errorTarget: "answer", message: "" });
    return;
  }

  const sentBySocket = roomSubscription?.sendAnswer(answer) ?? false;
  if (!sentBySocket) {
    const room = await submitGameAnswer(gamesState.room.id, answer);
    if (room) {
      setGamesState({
        room,
        error: "",
        errorTarget: "",
        message: "Ответ отправлен.",
      });
    }
  } else {
    setGamesState({ error: "", errorTarget: "", message: "Ответ отправлен." });
  }
}

async function handleStartRoom(): Promise<void> {
  if (!gamesState.room) return;
  setGamesState({ loading: true, message: "Запускаем игру...", error: "", errorTarget: "" });
  const room = await startGameRoom(gamesState.room.id);
  setGamesState({
    room,
    loading: false,
    startConfirmOpen: false,
    error: "",
    errorTarget: "",
    message: "Игра началась.",
  });
}

async function handleDisbandRoom(): Promise<void> {
  const room = gamesState.room;
  if (!room || room.status !== "waiting") return;
  if (!isCurrentRoomCreator(room)) {
    setGamesState({
      message: "",
      error: "Распустить лобби может только создатель.",
      errorTarget: "footer",
    });
    return;
  }

  setGamesState({ loading: true, message: "Распускаем лобби...", error: "", errorTarget: "" });
  await disbandGameRoom(room.id);
  setGamesState({
    room: null,
    roomId: "",
    lobbyMode: "menu",
    loading: false,
    disbandConfirmOpen: false,
    startConfirmOpen: false,
    socketOpen: false,
    message: "Лобби распущено.",
    error: "",
    errorTarget: "",
  });
  roomSubscription?.close();
  roomSubscription = null;
  subscribedRoomId = "";
  window.history.pushState({}, "", "/games/quiz");
}

async function handleLeaveRoom(): Promise<void> {
  const room = gamesState.room;
  if (!room || room.status !== "waiting") return;
  if (isCurrentRoomCreator(room)) {
    setGamesState({
      message: "",
      error: "Создатель может только распустить лобби.",
      errorTarget: "footer",
    });
    return;
  }

  setGamesState({ loading: true, message: "Выходим из лобби...", error: "", errorTarget: "" });
  await leaveGameRoom(room.id);
  setGamesState({
    room: null,
    roomId: "",
    lobbyMode: "rooms",
    loading: false,
    disbandConfirmOpen: false,
    startConfirmOpen: false,
    leaveConfirmOpen: false,
    socketOpen: false,
    message: "Вы покинули лобби.",
    error: "",
    errorTarget: "",
  });
  roomSubscription?.close();
  roomSubscription = null;
  subscribedRoomId = "";
  window.history.pushState({}, "", "/games/quiz");
  await loadWaitingRooms();
}

async function refreshCurrentRoom(): Promise<void> {
  if (!gamesState.room) return;
  const room = await hydrateGameRoomAvatars(await getGameRoom(gamesState.room.id));
  setGamesState({ room, loading: false, message: "", error: "", errorTarget: "" });
}

async function handleReadyToggle(isReady: boolean): Promise<void> {
  if (!gamesState.room) return;
  setGamesState({ loading: true, message: "", error: "", errorTarget: "" });
  await setGameRoomReady(gamesState.room.id, isReady);
  showAppToast(
    isReady
      ? "Вы уведомили других игроков, что готовы к игре"
      : "Вы уведомили других игроков, что не готовы к игре",
  );
  await refreshCurrentRoom();
}

async function handleKickPlayer(profileId: string): Promise<void> {
  if (!gamesState.room || !profileId) return;
  setGamesState({ loading: true, message: "", error: "", errorTarget: "" });
  await kickGameRoomPlayer(gamesState.room.id, profileId);
  await refreshCurrentRoom();
}

async function handlePasswordForm(form: HTMLFormElement): Promise<void> {
  if (!gamesState.room) return;
  const password = getInputValue(form, "password");
  if (!password) {
    setGamesState({ message: "", error: "Введите пароль.", errorTarget: "password" });
    return;
  }
  setGamesState({ loading: true, message: "", error: "", errorTarget: "" });
  await updateGameRoomPassword(gamesState.room.id, password);
  showAppToast("Пароль лобби обновлён");
  setGamesState({ passwordModalMode: "", passwordMenuOpen: false, errorTarget: "" });
  await refreshCurrentRoom();
}

async function handleRemovePassword(): Promise<void> {
  if (!gamesState.room) return;
  setGamesState({ loading: true, message: "", error: "", errorTarget: "" });
  await updateGameRoomPassword(gamesState.room.id, "");
  showAppToast("Пароль лобби убран");
  setGamesState({ passwordModalMode: "", passwordMenuOpen: false, errorTarget: "" });
  await refreshCurrentRoom();
}

async function copyTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

async function handleCopyInviteCode(code: string): Promise<void> {
  if (!code) return;
  await copyTextToClipboard(code);
  showAppToast("Код приглашения скопирован в буфер обмена");
}

async function handleShowPassword(): Promise<void> {
  const password = gamesState.room?.password?.trim() ?? "";
  if (!password) {
    setGamesState({
      passwordMenuOpen: false,
      message: "",
      error: "Пароль не получен.",
      errorTarget: "password",
    });
    return;
  }

  await copyTextToClipboard(password);
  setGamesState({ passwordMenuOpen: false, message: "", error: "", errorTarget: "" });
  showAppToast(`Пароль: ${password}. Пароль скопирован в буфер обмена`);
}

async function handleBackToRooms(): Promise<void> {
  const room = gamesState.room;
  if (room?.status === "waiting") {
    setGamesState({ loading: true, message: "Выходим из лобби...", error: "", errorTarget: "" });
    await leaveGameRoom(room.id);
  }
  roomSubscription?.close();
  roomSubscription = null;
  subscribedRoomId = "";
  window.history.pushState({}, "", "/games/quiz");
  gamesState = {
    ...gamesState,
    room: null,
    roomId: "",
    socketOpen: false,
    lobbyMode: "rooms",
    disbandConfirmOpen: false,
    startConfirmOpen: false,
    leaveConfirmOpen: false,
    loading: false,
    message: "",
    error: "",
    errorTarget: "",
  };
  refreshGamesDom();
  await loadWaitingRooms();
}

function bindGamesEvents(root: GamesRoot): void {
  if (root.__gamesBound) return;

  root.addEventListener("beforeinput", (event: Event) => {
    const inputEvent = event as InputEvent;
    const target = inputEvent.target;
    if (!(target instanceof HTMLInputElement) || !target.matches("[data-games-number-field]")) {
      return;
    }

    if (inputEvent.data && /\D/.test(inputEvent.data)) {
      event.preventDefault();
      setNumericFieldError(target, target.dataset.gamesNumberInvalidMessage ?? "некорректный ввод");
    }
  });

  root.addEventListener("paste", (event: Event) => {
    const pasteEvent = event as ClipboardEvent;
    const target = pasteEvent.target;
    if (!(target instanceof HTMLInputElement) || !target.matches("[data-games-number-field]")) {
      return;
    }

    const text = pasteEvent.clipboardData?.getData("text") ?? "";
    if (text && /\D/.test(text)) {
      event.preventDefault();
      setNumericFieldError(target, target.dataset.gamesNumberInvalidMessage ?? "некорректный ввод");
    }
  });

  root.addEventListener("input", (event: Event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.matches("[data-games-number-field]")) {
      validateNumericField(target);
      return;
    }

    if (target instanceof HTMLInputElement && target.matches("[data-games-rooms-search]")) {
      gamesState = { ...gamesState, roomsSearchQuery: target.value };
      const list = root.querySelector<HTMLElement>("[data-games-room-list]");
      if (list) {
        list.innerHTML = renderRoomsList();
      }
    }
  });

  root.addEventListener("submit", (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLFormElement)) return;

    const action = target.matches("[data-games-create-room]")
      ? () => handleCreateRoom(target)
      : target.matches("[data-games-join-room]")
        ? () => handleJoinRoom(target)
        : target.matches("[data-games-join-listed-room]")
          ? () => handleJoinListedRoom(target)
          : target.matches("[data-games-password-form]")
            ? () => handlePasswordForm(target)
            : target.matches("[data-games-answer-form]")
              ? () => handleSubmitAnswer(target)
              : null;

    if (!action) return;
    event.preventDefault();
    const errorTarget: GamesErrorTarget = target.matches("[data-games-password-form]")
      ? "password"
      : target.matches("[data-games-answer-form]")
        ? "answer"
        : "form";
    void action().catch((error: unknown) => {
      setGamesState({
        loading: false,
        message: "",
        error: getErrorMessage(error, "Не удалось выполнить действие."),
        errorTarget,
      });
    });
  });

  root.addEventListener("click", (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const hintButton = target.closest("[data-games-catalog-hint]");
    if (hintButton instanceof HTMLButtonElement) {
      event.preventDefault();
      const willOpen = !hintButton.classList.contains("games-catalog-card__hint-button--open");
      const hintId = hintButton.getAttribute("aria-controls");
      const hint = hintId ? root.querySelector<HTMLElement>(`#${CSS.escape(hintId)}`) : null;
      closeGameCatalogHints(root, hintButton);
      hintButton.classList.toggle("games-catalog-card__hint-button--open", willOpen);
      hintButton.setAttribute("aria-expanded", String(willOpen));
      if (hint) {
        hint.hidden = !willOpen;
      }
      return;
    }

    const roomRulesButton = target.closest("[data-games-room-rules]");
    if (roomRulesButton instanceof HTMLButtonElement) {
      event.preventDefault();
      const willOpen = roomRulesButton.getAttribute("aria-expanded") !== "true";
      const rules = root.querySelector<HTMLElement>("#games-room-rules");
      roomRulesButton.setAttribute("aria-expanded", String(willOpen));
      roomRulesButton.classList.toggle("games-catalog-card__hint-button--open", willOpen);
      if (rules) {
        rules.hidden = !willOpen;
      }
      return;
    }

    closeGameCatalogHints(root);

    const lobbyModeButton = target.closest("[data-games-lobby-mode]");
    if (lobbyModeButton instanceof HTMLElement) {
      event.preventDefault();
      const mode = lobbyModeButton.getAttribute("data-games-lobby-mode");
      if (mode === "menu" || mode === "create" || mode === "rooms" || mode === "join") {
        void selectLobbyMode(mode).catch((error: unknown) => {
          setGamesState({
            roomsLoading: false,
            loading: false,
            message: "",
            error: getErrorMessage(error, "Не удалось открыть раздел лобби."),
          });
        });
      }
      return;
    }

    if (target.closest("[data-games-refresh-rooms]")) {
      event.preventDefault();
      void loadWaitingRooms();
      return;
    }

    if (target.closest("[data-games-back-to-rooms]")) {
      event.preventDefault();
      void handleBackToRooms().catch((error: unknown) => {
        setGamesState({
          roomsLoading: false,
          message: "",
          error: getErrorMessage(error, "Не удалось открыть список комнат."),
        });
      });
      return;
    }

    const copyInviteButton = target.closest("[data-games-copy-invite]");
    if (copyInviteButton instanceof HTMLElement) {
      event.preventDefault();
      const code = copyInviteButton.getAttribute("data-games-copy-invite") ?? "";
      void handleCopyInviteCode(code).catch(() => {
        setGamesState({ message: "", error: "Не удалось скопировать код приглашения." });
      });
      return;
    }

    const joinPasswordButton = target.closest("[data-games-join-password-room]");
    if (joinPasswordButton instanceof HTMLElement) {
      event.preventDefault();
      const roomId = joinPasswordButton.getAttribute("data-games-join-password-room") ?? "";
      const room = gamesState.rooms.find((item) => item.id === roomId);
      if (room && isRoomCreatedByCurrentUser(room)) {
        navigateToRoom(room.id);
        return;
      }
      setGamesState({
        joinPasswordRoomId: roomId,
        message: "",
        error: "",
        errorTarget: "",
      });
      return;
    }

    const joinPasswordModal = target.closest("[data-games-join-password-modal]");
    if (
      target.closest("[data-games-join-password-close]") ||
      (joinPasswordModal instanceof HTMLElement && joinPasswordModal === target)
    ) {
      event.preventDefault();
      setGamesState({ joinPasswordRoomId: "", message: "", error: "", errorTarget: "" });
      return;
    }

    if (target.closest("[data-games-disband-open]")) {
      event.preventDefault();
      setGamesState({
        disbandConfirmOpen: true,
        startConfirmOpen: false,
        leaveConfirmOpen: false,
        message: "",
        error: "",
      });
      return;
    }

    const readyToggle = target.closest("[data-games-ready-toggle]");
    if (readyToggle instanceof HTMLElement) {
      event.preventDefault();
      const isReady = readyToggle.getAttribute("data-games-ready-toggle") === "true";
      void handleReadyToggle(isReady).catch((error: unknown) => {
        setGamesState({
          loading: false,
          message: "",
          error: getErrorMessage(error, "Не удалось обновить готовность."),
          errorTarget: "footer",
        });
      });
      return;
    }

    const kickButton = target.closest("[data-games-kick-player]");
    if (kickButton instanceof HTMLElement) {
      event.preventDefault();
      const profileId = kickButton.getAttribute("data-games-kick-player") ?? "";
      void handleKickPlayer(profileId).catch((error: unknown) => {
        setGamesState({
          loading: false,
          message: "",
          error: getErrorMessage(error, "Не удалось убрать игрока из лобби."),
          errorTarget: "footer",
        });
      });
      return;
    }

    if (target.closest("[data-games-password-menu-toggle]")) {
      event.preventDefault();
      setGamesState({
        passwordMenuOpen: !gamesState.passwordMenuOpen,
        message: "",
        error: "",
        errorTarget: "",
      });
      return;
    }

    const passwordModalButton = target.closest("[data-games-password-modal-open]");
    if (passwordModalButton instanceof HTMLElement) {
      event.preventDefault();
      const mode = passwordModalButton.getAttribute("data-games-password-modal-open");
      if (mode === "set" || mode === "change" || mode === "remove") {
        setGamesState({
          passwordModalMode: mode,
          passwordMenuOpen: false,
          message: "",
          error: "",
          errorTarget: "",
        });
      }
      return;
    }

    if (target.closest("[data-games-password-show]")) {
      event.preventDefault();
      void handleShowPassword().catch(() => {
        setGamesState({
          passwordMenuOpen: false,
          message: "",
          error: "Не удалось скопировать пароль.",
          errorTarget: "password",
        });
      });
      return;
    }

    const passwordModal = target.closest("[data-games-password-modal]");
    if (
      target.closest("[data-games-password-modal-close]") ||
      (passwordModal instanceof HTMLElement && passwordModal === target)
    ) {
      event.preventDefault();
      setGamesState({ passwordModalMode: "", message: "", error: "", errorTarget: "" });
      return;
    }

    if (target.closest("[data-games-password-remove-confirm]")) {
      event.preventDefault();
      void handleRemovePassword().catch((error: unknown) => {
        setGamesState({
          loading: false,
          message: "",
          error: getErrorMessage(error, "Не удалось убрать пароль."),
          errorTarget: "password",
        });
      });
      return;
    }

    const disbandModal = target.closest("[data-games-disband-modal]");
    if (
      target.closest("[data-games-disband-close]") ||
      (disbandModal instanceof HTMLElement && disbandModal === target)
    ) {
      event.preventDefault();
      setGamesState({ disbandConfirmOpen: false });
      return;
    }

    if (target.closest("[data-games-disband-confirm]")) {
      event.preventDefault();
      void handleDisbandRoom().catch((error: unknown) => {
        setGamesState({
          loading: false,
          disbandConfirmOpen: false,
          message: "",
          error: getErrorMessage(error, "Не удалось распустить лобби."),
          errorTarget: "footer",
        });
      });
      return;
    }

    if (target.closest("[data-games-start-open]")) {
      event.preventDefault();
      setGamesState({
        startConfirmOpen: true,
        disbandConfirmOpen: false,
        leaveConfirmOpen: false,
        message: "",
        error: "",
      });
      return;
    }

    const startModal = target.closest("[data-games-start-modal]");
    if (
      target.closest("[data-games-start-close]") ||
      (startModal instanceof HTMLElement && startModal === target)
    ) {
      event.preventDefault();
      setGamesState({ startConfirmOpen: false });
      return;
    }

    if (target.closest("[data-games-start-confirm]")) {
      event.preventDefault();
      void handleStartRoom().catch((error: unknown) => {
        setGamesState({
          loading: false,
          startConfirmOpen: false,
          message: "",
          error: getErrorMessage(error, "Не удалось начать игру."),
          errorTarget: "footer",
        });
      });
      return;
    }

    if (target.closest("[data-games-leave-open]")) {
      event.preventDefault();
      setGamesState({
        leaveConfirmOpen: true,
        startConfirmOpen: false,
        disbandConfirmOpen: false,
        message: "",
        error: "",
      });
      return;
    }

    const leaveModal = target.closest("[data-games-leave-modal]");
    if (
      target.closest("[data-games-leave-close]") ||
      (leaveModal instanceof HTMLElement && leaveModal === target)
    ) {
      event.preventDefault();
      setGamesState({ leaveConfirmOpen: false });
      return;
    }

    if (target.closest("[data-games-leave-confirm]")) {
      event.preventDefault();
      void handleLeaveRoom().catch((error: unknown) => {
        setGamesState({
          loading: false,
          leaveConfirmOpen: false,
          message: "",
          error: getErrorMessage(error, "Не удалось покинуть игру."),
          errorTarget: "footer",
        });
      });
      return;
    }
  });

  root.__gamesBound = true;
}

async function loadInitialState(roomId: string, signal?: AbortSignal): Promise<GamesPageState> {
  const state = createEmptyState();
  state.roomId = roomId;

  if (!roomId) {
    return state;
  }

  try {
    state.room = await hydrateGameRoomAvatars(await getGameRoom(roomId, signal), signal);
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    state.error = getErrorMessage(error, "Не удалось загрузить игровую комнату.");
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

  if (isGamesCatalogRoute()) {
    gamesState = createEmptyState();
  } else {
    gamesState = await loadInitialState(getRequestedRoomId(params), signal);
  }

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
