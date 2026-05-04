/**
 * Шапка приложения.
 *
 * Отвечает за:
 * - рендер гостевого и авторизованного состояния
 * - отображение имени и аватара текущего пользователя
 * - меню профиля и выход из аккаунта
 *
 * Не отвечает за загрузку данных пользователя: header работает поверх `session`.
 */
import { clearSessionUser, getSessionUser } from "../../state/session";
import { renderButton } from "../button/button";
import { logoutUser } from "../../api/auth";
import { renderAvatarMarkup, escapeHtml } from "../../utils/avatar";
import { formatPersonName } from "../../utils/display-name";
import { t } from "../../state/i18n";

type SpeechRecognitionAlternativeLike = {
  transcript?: unknown;
};

type SpeechRecognitionResultLike = {
  readonly [index: number]: SpeechRecognitionAlternativeLike | undefined;
  readonly length?: number;
  readonly isFinal?: unknown;
};

type SpeechRecognitionResultListLike = {
  readonly [index: number]: SpeechRecognitionResultLike | undefined;
  readonly length?: number;
};

type SpeechRecognitionErrorCode =
  | "aborted"
  | "audio-capture"
  | "bad-grammar"
  | "language-not-supported"
  | "network"
  | "no-speech"
  | "not-allowed"
  | "service-not-allowed";

type SpeechRecognitionEventHandler = (event: Event) => void;

export type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: SpeechRecognitionEventHandler | null;
  onresult: SpeechRecognitionEventHandler | null;
  onerror: SpeechRecognitionEventHandler | null;
  onend: SpeechRecognitionEventHandler | null;
  start(): void;
  stop(): void;
  abort(): void;
};

export type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechRecognitionHost = {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
  navigator?: Pick<Navigator, "language" | "languages">;
};

type ActiveVoiceSearch = {
  button: HTMLButtonElement;
  input: HTMLInputElement;
  navigateOnEnd: boolean;
  recognition: SpeechRecognitionLike;
  transcript: string;
};

export type SpeechRecognitionResultSnapshot = {
  transcript: string;
  isFinal: boolean;
};

let activeVoiceSearch: ActiveVoiceSearch | null = null;

/**
 * Минимальный срез данных пользователя, который нужен header.
 */
type SessionUser = {
  id: string;
  firstName: string;
  lastName: string;
  avatarLink?: string;
} | null;

function isRecord(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === "object" && value !== null;
}

function getSpeechRecognitionHost(): SpeechRecognitionHost {
  if (typeof window === "undefined") return {};
  return window as Window & SpeechRecognitionHost;
}

export function getSpeechRecognitionConstructor(
  host: SpeechRecognitionHost = getSpeechRecognitionHost(),
): SpeechRecognitionConstructor | null {
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null;
}

function isVoiceSearchSupported(): boolean {
  return getSpeechRecognitionConstructor() !== null;
}

export function readSpeechRecognitionResult(event: Event): SpeechRecognitionResultSnapshot {
  const results = (event as Event & { results?: unknown }).results;
  if (!isRecord(results)) return { transcript: "", isFinal: false };

  const length = typeof results.length === "number" ? results.length : 0;

  for (let index = length - 1; index >= 0; index -= 1) {
    const result = results[index] as SpeechRecognitionResultListLike[number] | undefined;
    if (!isRecord(result)) continue;

    const alternative = result[0];
    if (!isRecord(alternative)) continue;

    const transcript = alternative.transcript;
    if (typeof transcript === "string" && transcript.trim()) {
      return { transcript, isFinal: result.isFinal === true };
    }
  }

  return { transcript: "", isFinal: false };
}

export function readSpeechTranscript(event: Event): string {
  return readSpeechRecognitionResult(event).transcript;
}

export function getSpeechRecognitionLanguage(
  host: SpeechRecognitionHost = getSpeechRecognitionHost(),
): string {
  const languages = [
    ...(Array.isArray(host.navigator?.languages) ? host.navigator.languages : []),
    host.navigator?.language,
  ].filter(
    (language): language is string => typeof language === "string" && language.trim().length > 0,
  );

  const preferredLanguage =
    languages.find((language) => /^ru\b/i.test(language)) ??
    languages.find((language) => /^en\b/i.test(language));

  if (!preferredLanguage) return "ru-RU";

  return /^ru\b/i.test(preferredLanguage) ? "ru-RU" : "en-US";
}

function getSpeechRecognitionErrorMessage(event: Event): string {
  const error = (event as Event & { error?: SpeechRecognitionErrorCode }).error;

  if (error === "not-allowed" || error === "service-not-allowed") {
    return t("header.voiceSearchDenied");
  }

  if (error === "no-speech") {
    return t("header.voiceSearchNoSpeech");
  }

  return t("header.voiceSearchError");
}

function updateVoiceSearchStatus(button: HTMLButtonElement, message: string): void {
  const searchBox = button.closest("[data-header-search-box]");
  const status = searchBox?.querySelector<HTMLElement>("[data-header-voice-status]");
  if (status) {
    status.textContent = message;
  }
}

function setVoiceSearchButtonListening(button: HTMLButtonElement, isListening: boolean): void {
  button.classList.toggle("is-listening", isListening);
  button.setAttribute("aria-pressed", String(isListening));
  button.setAttribute(
    "aria-label",
    isListening ? t("header.voiceSearchStop") : t("header.voiceSearchStart"),
  );
  button.setAttribute(
    "title",
    isListening ? t("header.voiceSearchStop") : t("header.voiceSearchStart"),
  );
}

function navigateToSearch(query: string): void {
  const q = query.trim();
  if (!q) return;

  window.history.pushState({}, "", `/search?q=${encodeURIComponent(q)}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function dispatchInputEvent(input: HTMLInputElement): void {
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function stopActiveVoiceSearch(navigateOnEnd = true): void {
  const state = activeVoiceSearch;
  if (!state) return;

  state.navigateOnEnd = navigateOnEnd;

  try {
    state.recognition.stop();
  } catch {
    state.recognition.abort();
  }
}

function resetActiveVoiceSearch(recognition: SpeechRecognitionLike): void {
  const state = activeVoiceSearch;
  if (!state || state.recognition !== recognition) return;

  setVoiceSearchButtonListening(state.button, false);
  const transcript = state.transcript.trim();
  const shouldNavigate = state.navigateOnEnd;
  activeVoiceSearch = null;

  if (shouldNavigate && transcript) {
    navigateToSearch(transcript);
  }
}

function startVoiceSearch(button: HTMLButtonElement, input: HTMLInputElement): void {
  if (activeVoiceSearch) {
    const isSameButton = activeVoiceSearch.button === button;
    stopActiveVoiceSearch();
    if (isSameButton) return;
  }

  const Recognition = getSpeechRecognitionConstructor();
  if (!Recognition) {
    updateVoiceSearchStatus(button, t("header.voiceSearchUnsupported"));
    return;
  }

  const recognition = new Recognition();
  const state: ActiveVoiceSearch = {
    button,
    input,
    navigateOnEnd: true,
    recognition,
    transcript: "",
  };

  activeVoiceSearch = state;

  recognition.lang = getSpeechRecognitionLanguage();
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.onstart = () => {
    setVoiceSearchButtonListening(button, true);
    updateVoiceSearchStatus(button, t("header.voiceSearchListening"));
  };
  recognition.onresult = (event: Event) => {
    const result = readSpeechRecognitionResult(event);
    const transcript = result.transcript.trim();
    if (!transcript || activeVoiceSearch?.recognition !== recognition) return;

    activeVoiceSearch.transcript = transcript;
    input.value = transcript;
    dispatchInputEvent(input);

    if (result.isFinal) {
      stopActiveVoiceSearch();
    }
  };
  recognition.onerror = (event: Event) => {
    updateVoiceSearchStatus(button, getSpeechRecognitionErrorMessage(event));
  };
  recognition.onend = () => {
    resetActiveVoiceSearch(recognition);
  };

  setVoiceSearchButtonListening(button, true);
  updateVoiceSearchStatus(button, t("header.voiceSearchListening"));

  try {
    recognition.start();
  } catch {
    updateVoiceSearchStatus(button, t("header.voiceSearchError"));
    setVoiceSearchButtonListening(button, false);
    activeVoiceSearch = null;
  }
}

function renderVoiceSearchButton(): string {
  if (!isVoiceSearchSupported()) return "";

  return `
    <button
      type="button"
      class="header__voice-search"
      data-header-voice-search
      aria-label="${t("header.voiceSearchStart")}"
      aria-pressed="false"
      title="${t("header.voiceSearchStart")}"
    >
      <img src="/assets/img/icons/mic.svg" alt="">
    </button>
    <span class="header__voice-status" data-header-voice-status role="status" aria-live="polite"></span>
  `;
}

/**
 * Рендерит аватар в размерах, согласованных с дизайном header.
 *
 * @param {string} className CSS-класс элемента аватара.
 * @param {string} label Имя пользователя для `alt`.
 * @param {string} [avatarLink] Ссылка на изображение профиля.
 * @returns {string} HTML-разметка аватара.
 */
function renderHeaderAvatar(className: string, label: string, avatarLink?: string): string {
  return renderAvatarMarkup(className, label, avatarLink, {
    width: 56,
    height: 56,
    loading: "eager",
  });
}

/**
 * Рендерит хедер для гостя.
 *
 * @returns {string} HTML-разметка гостевой шапки.
 */
function renderGuestHeader(): string {
  return `
    <div class="header__inner header__inner--guest">
      <a href="/feed" data-link class="header__logo-link">
        <img class="header__logo" src="/assets/img/logo-v3.png" width="300" height="114" alt="ARIS">
      </a>

      <div class="header__guest-actions">
        ${renderButton({
          text: t("header.register"),
          variant: "primary",
          tag: "button",
          type: "button",
          className: "button--large",
          attributes: 'data-open-auth-modal="register"',
        })}

        ${renderButton({
          text: t("header.login"),
          variant: "secondary",
          tag: "button",
          type: "button",
          className: "button--small",
          attributes: 'data-open-auth-modal="login"',
        })}
      </div>

      <a href="/login" data-open-auth-modal="login" class="header__user">
        <span class="header__username">${t("header.yourPage")}</span>
        ${renderHeaderAvatar("header__avatar", t("header.guestProfile"))}
      </a>
    </div>
  `;
}

/**
 * Рендерит хедер для авторизованного пользователя.
 *
 * @returns {string} HTML-разметка авторизованной шапки.
 */
function getHeaderSearchValue(): string {
  if (typeof window === "undefined") return "";
  if (window.location.pathname !== "/search") return "";
  return new URLSearchParams(window.location.search).get("q") ?? "";
}

function renderAuthorisedHeader(): string {
  const user = getSessionUser() as SessionUser;

  const fullName = user ? formatPersonName(user.firstName, user.lastName) : "";
  const searchValue = getHeaderSearchValue();

  return `
    <div class="header__inner header__inner--authorised">
      <a href="/feed" data-link class="header__logo-link">
        <img class="header__logo" src="/assets/img/logo-v3.png" width="300" height="114" alt="ARIS">
      </a>

      <form class="header__search-box search-field" data-header-search-box role="search" aria-label="${t("header.search")}">
        <span class="header__search-icon search-field__icon" aria-hidden="true">
          <img src="/assets/img/icons/search.svg" alt="">
        </span>

        <input
          class="header__search-input search-field__input"
          type="text"
          placeholder="${t("header.search")}"
          data-header-search
          aria-label="${t("header.search")}"
          value="${escapeHtml(searchValue)}"
        >

        ${renderVoiceSearchButton()}
      </form>

      <div class="header__user">
        <span class="header__username">${fullName}</span>

        <div class="header__avatar-wrap" data-header-user-menu>
          <button
            type="button"
            class="header__avatar-button"
            data-header-user-menu-toggle
            aria-label="${t("header.openProfileMenu")}"
            aria-expanded="false"
          >
            ${renderHeaderAvatar("header__avatar", fullName || t("header.profile"), user?.avatarLink)}
          </button>

          <div class="header__user-menu" role="menu">
            <button type="button" class="header__user-menu-item" data-support-open role="menuitem">
              ${t("header.help")}
            </button>
            <button type="button" class="header__user-menu-item" data-logout role="menuitem">
              ${t("header.logout")}
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Рендерит хедер страницы в зависимости от состояния авторизации пользователя.
 *
 * @returns {string} HTML-разметка шапки.
 *
 * @example
 * root.innerHTML = renderHeader();
 */
export function renderHeader(): string {
  const isAuthorised = getSessionUser() !== null;

  return `
    <header class="header">
      ${isAuthorised ? renderAuthorisedHeader() : renderGuestHeader()}
    </header>
  `;
}

/**
 * Инициализирует интерактивное поведение header.
 *
 * @param {Document | HTMLElement} [root=document] Корень, внутри которого живёт header.
 * @returns {void}
 *
 * @example
 * initHeader(document);
 */
export function initHeader(root: Document | HTMLElement = document): void {
  const rootEl = root as Document & { __headerBound?: boolean };

  if (rootEl.__headerBound) return;

  root.addEventListener("submit", (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLFormElement) || !target.matches("[data-header-search-box]")) {
      return;
    }

    event.preventDefault();
    stopActiveVoiceSearch(false);

    const input = target.querySelector<HTMLInputElement>("[data-header-search]");
    if (!input) return;
    navigateToSearch(input.value);
  });

  root.addEventListener("click", async (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const voiceSearchButton = target.closest("[data-header-voice-search]");
    if (voiceSearchButton instanceof HTMLButtonElement) {
      const searchBox = voiceSearchButton.closest("[data-header-search-box]");
      const searchInput = searchBox?.querySelector<HTMLInputElement>("[data-header-search]");
      if (searchInput) {
        startVoiceSearch(voiceSearchButton, searchInput);
      }
      return;
    }

    const menuToggle = target.closest("[data-header-user-menu-toggle]");
    if (menuToggle instanceof HTMLButtonElement) {
      const menuRoot = menuToggle.closest("[data-header-user-menu]");
      const shouldOpen = !menuRoot?.classList.contains("is-open");

      root.querySelectorAll<HTMLElement>("[data-header-user-menu].is-open").forEach((node) => {
        node.classList.remove("is-open");
        node
          .querySelector<HTMLButtonElement>("[data-header-user-menu-toggle]")
          ?.setAttribute("aria-expanded", "false");
      });

      if (menuRoot instanceof HTMLElement) {
        menuRoot.classList.toggle("is-open", shouldOpen);
        menuToggle.setAttribute("aria-expanded", String(shouldOpen));
      }
      return;
    }

    const supportButton = target.closest("[data-support-open]");
    if (supportButton instanceof HTMLButtonElement) {
      root.querySelectorAll<HTMLElement>("[data-header-user-menu].is-open").forEach((node) => {
        node.classList.remove("is-open");
        node
          .querySelector<HTMLButtonElement>("[data-header-user-menu-toggle]")
          ?.setAttribute("aria-expanded", "false");
      });
      window.dispatchEvent(new CustomEvent("support-widget-open"));
      return;
    }

    const btn = target.closest("[data-logout]");
    if (!btn) {
      root.querySelectorAll<HTMLElement>("[data-header-user-menu].is-open").forEach((node) => {
        node.classList.remove("is-open");
        node
          .querySelector<HTMLButtonElement>("[data-header-user-menu-toggle]")
          ?.setAttribute("aria-expanded", "false");
      });
      return;
    }

    try {
      await logoutUser();
      clearSessionUser();
      window.location.href = "/";
    } catch (error) {
      console.error("Ошибка выхода из аккаунта:", error);
    }
  });

  rootEl.__headerBound = true;
}
