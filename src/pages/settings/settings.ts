/**
 * Страница настроек пользователя.
 */
import { renderHeader } from "../../components/header/header";
import { renderSidebar } from "../../components/sidebar/sidebar";
import { renderWidgetbar } from "../../components/widgetbar/widgetbar";
import {
  applyLanguage,
  getLanguageMode,
  saveLanguageToServer,
  type LanguageMode,
} from "../../state/language";
import { t } from "../../state/i18n";
import { getSessionUser } from "../../state/session";
import { applyTheme, getThemeMode, saveThemeToServer, type ThemeMode } from "../../state/theme";
import { syncUserSettingsWithServer } from "../../state/user-settings";

type SettingsRoot = (Document | HTMLElement) & {
  __settingsBound?: boolean;
};

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function isLanguageMode(value: unknown): value is LanguageMode {
  return value === "RU" || value === "EN";
}

function renderLanguageOption(
  language: LanguageMode,
  label: string,
  currentLanguage: LanguageMode,
): string {
  return `
    <label class="settings-segmented__option">
      <input
        type="radio"
        class="settings-segmented__input"
        name="settings-language"
        value="${language}"
        data-language-option
        ${currentLanguage === language ? "checked" : ""}
        aria-label="${label}"
      />
      <span class="settings-segmented__text">${label}</span>
    </label>
  `;
}

function renderSettingsPanel(loadError = ""): string {
  const isDark = getThemeMode() === "dark";
  const currentLanguage = getLanguageMode();

  return `
    <section class="settings-page" data-settings-page>
      <section class="settings-panel content-card">
        <header class="settings-panel__header">
          <h1 class="settings-panel__title">${t("settings.title")}</h1>
        </header>

        <section class="settings-section" aria-labelledby="settings-appearance-title">
          <div class="settings-section__body">
            <h2 class="settings-section__title" id="settings-appearance-title">${t(
              "settings.appearance",
            )}</h2>
            <span class="settings-section__label">${t("settings.darkTheme")}</span>
          </div>

          <label class="settings-switch">
            <input
              type="checkbox"
              class="settings-switch__input"
              data-theme-toggle
              ${isDark ? "checked" : ""}
              aria-label="${t("settings.darkTheme")}"
            />
            <span class="settings-switch__track" aria-hidden="true">
              <span class="settings-switch__thumb"></span>
            </span>
          </label>
        </section>

        <section class="settings-section" aria-labelledby="settings-language-title">
          <div class="settings-section__body">
            <h2 class="settings-section__title" id="settings-language-title">${t(
              "settings.language",
            )}</h2>
            <span class="settings-section__label">${t("settings.interfaceLanguage")}</span>
          </div>

          <fieldset class="settings-segmented" aria-labelledby="settings-language-title">
            ${renderLanguageOption("RU", t("settings.russian"), currentLanguage)}
            ${renderLanguageOption("EN", t("settings.english"), currentLanguage)}
          </fieldset>
        </section>

        <p
          class="settings-panel__message${loadError ? "" : " settings-panel__message--hidden"}"
          data-settings-message
        >
          ${loadError || ""}
        </p>
      </section>
    </section>
  `;
}

function setSettingsSaving(root: Document | HTMLElement, saving: boolean): void {
  root
    .querySelectorAll<HTMLInputElement>("[data-theme-toggle], [data-language-option]")
    .forEach((input) => {
      input.disabled = saving;
    });
}

function setSettingsMessage(root: Document | HTMLElement, message: string): void {
  const messageEl = root.querySelector<HTMLElement>("[data-settings-message]");
  if (!messageEl) return;

  messageEl.textContent = message;
  messageEl.classList.toggle("settings-panel__message--hidden", !message);
}

function syncToggleState(root: Document | HTMLElement): void {
  const isDark = getThemeMode() === "dark";
  root.querySelectorAll<HTMLInputElement>("[data-theme-toggle]").forEach((input) => {
    input.checked = isDark;
  });
}

function syncLanguageState(root: Document | HTMLElement): void {
  const language = getLanguageMode();
  root.querySelectorAll<HTMLInputElement>("[data-language-option]").forEach((input) => {
    input.checked = input.value === language;
  });
}

export async function renderSettings(
  _params?: Record<string, string>,
  signal?: AbortSignal,
): Promise<string> {
  const currentUser = getSessionUser();

  if (!currentUser) {
    return (await import("../feed/feed")).renderFeed(undefined, signal);
  }

  let loadError = "";

  try {
    await syncUserSettingsWithServer(signal);
  } catch (error) {
    if (isAbortError(error)) throw error;
    loadError = t("settings.loadError");
  }

  return `
    <div class="app-page">
      ${renderHeader()}
      <main class="app-layout">
        <aside class="app-layout__left">
          ${renderSidebar({ isAuthorised: true })}
        </aside>
        <section class="app-layout__center">
          ${renderSettingsPanel(loadError)}
        </section>
        <aside class="app-layout__right app-layout__right--optional">
          ${await renderWidgetbar({ isAuthorised: true })}
        </aside>
      </main>
    </div>
  `;
}

export function initSettings(root: Document | HTMLElement = document): void {
  const bindableRoot = root as SettingsRoot;
  if (bindableRoot.__settingsBound) return;

  root.addEventListener("change", (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    if (target.matches("[data-theme-toggle]")) {
      const previousTheme = getThemeMode();
      const nextTheme: ThemeMode = target.checked ? "dark" : "light";
      if (previousTheme === nextTheme) return;

      setSettingsMessage(root, "");
      setSettingsSaving(root, true);
      applyTheme(nextTheme);
      syncToggleState(root);

      void saveThemeToServer(nextTheme)
        .then(() => {
          syncToggleState(root);
        })
        .catch((error) => {
          if (isAbortError(error)) return;

          applyTheme(previousTheme);
          syncToggleState(root);
          setSettingsMessage(root, t("settings.saveThemeError"));
        })
        .finally(() => {
          setSettingsSaving(root, false);
        });

      return;
    }

    if (!target.matches("[data-language-option]")) return;

    const nextLanguage = target.value;
    if (!isLanguageMode(nextLanguage)) return;

    const previousLanguage = getLanguageMode();
    if (previousLanguage === nextLanguage) return;

    setSettingsMessage(root, "");
    setSettingsSaving(root, true);
    applyLanguage(nextLanguage);
    syncLanguageState(root);

    void saveLanguageToServer(nextLanguage)
      .then(() => {
        syncLanguageState(root);
        window.location.reload();
      })
      .catch((error) => {
        if (isAbortError(error)) return;

        applyLanguage(previousLanguage);
        syncLanguageState(root);
        setSettingsMessage(root, t("settings.saveLanguageError"));
      })
      .finally(() => {
        setSettingsSaving(root, false);
      });
  });

  bindableRoot.__settingsBound = true;
}
