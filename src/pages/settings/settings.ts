/**
 * Страница настроек пользователя.
 */
import { renderHeader } from "../../components/header/header";
import { renderSidebar } from "../../components/sidebar/sidebar";
import { renderWidgetbar } from "../../components/widgetbar/widgetbar";
import { getSessionUser } from "../../state/session";
import {
  applyTheme,
  getThemeMode,
  saveThemeToServer,
  syncThemeWithServer,
  type ThemeMode,
} from "../../state/theme";

type SettingsRoot = (Document | HTMLElement) & {
  __settingsBound?: boolean;
};

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function renderSettingsPanel(loadError = ""): string {
  const isDark = getThemeMode() === "dark";

  return `
    <section class="settings-page" data-settings-page>
      <section class="settings-panel content-card">
        <header class="settings-panel__header">
          <h1 class="settings-panel__title">Настройки</h1>
        </header>

        <section class="settings-section" aria-labelledby="settings-appearance-title">
          <div class="settings-section__body">
            <h2 class="settings-section__title" id="settings-appearance-title">Оформление</h2>
            <span class="settings-section__label">Тёмная тема</span>
          </div>

          <label class="settings-switch">
            <input
              type="checkbox"
              class="settings-switch__input"
              data-theme-toggle
              ${isDark ? "checked" : ""}
              aria-label="Тёмная тема"
            />
            <span class="settings-switch__track" aria-hidden="true">
              <span class="settings-switch__thumb"></span>
            </span>
          </label>
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
  root.querySelectorAll<HTMLInputElement>("[data-theme-toggle]").forEach((input) => {
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
    await syncThemeWithServer(signal);
  } catch (error) {
    if (isAbortError(error)) throw error;
    loadError = "Не удалось загрузить настройки.";
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
    if (!(target instanceof HTMLInputElement) || !target.matches("[data-theme-toggle]")) return;

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
        setSettingsMessage(root, "Не удалось сохранить тему.");
      })
      .finally(() => {
        setSettingsSaving(root, false);
      });
  });

  bindableRoot.__settingsBound = true;
}
