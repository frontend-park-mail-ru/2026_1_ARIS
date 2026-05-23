/**
 * Страница настроек пользователя.
 */
import { ApiError, changePassword } from "../../api/auth";
import { renderButton } from "../../components/button/button";
import { renderHeader } from "../../components/header/header";
import { renderInput } from "../../components/input/input";
import { renderModalCloseButton } from "../../components/modal-close/modal-close";
import { renderSidebar } from "../../components/sidebar/sidebar";
import { renderWidgetbar } from "../../components/widgetbar/widgetbar";
import {
  applyLanguage,
  getLanguageMode,
  saveLanguageToServer,
  type LanguageMode,
} from "../../state/language";
import { t } from "../../state/i18n";
import { clearSessionUser, getSessionUser } from "../../state/session";
import { applyTheme, getThemeMode, saveThemeToServer, type ThemeMode } from "../../state/theme";
import { syncUserSettingsWithServer } from "../../state/user-settings";
import { showAppToast } from "../../utils/toast";

type SettingsRoot = (Document | HTMLElement) & {
  __settingsBound?: boolean;
};

type PasswordDialog = HTMLDialogElement & {
  __settingsPasswordDialogBound?: boolean;
};

type PasswordChangeValues = {
  oldPassword: string;
  newPassword1: string;
  newPassword2: string;
};

type PasswordChangeErrors = Partial<Record<keyof PasswordChangeValues | "form", string>>;
type PasswordChangeField = keyof PasswordChangeValues;

const PASSWORD_FIELD_NAMES: PasswordChangeField[] = ["oldPassword", "newPassword1", "newPassword2"];

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function isLanguageMode(value: unknown): value is LanguageMode {
  return value === "RU" || value === "EN";
}

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark";
}

function renderSegmentedOption(
  name: string,
  value: string,
  label: string,
  currentValue: string,
  dataAttribute: string,
): string {
  return `
    <label class="settings-segmented__option">
      <input
        type="radio"
        class="settings-segmented__input"
        name="${name}"
        value="${value}"
        ${dataAttribute}
        ${currentValue === value ? "checked" : ""}
        aria-label="${label}"
      />
      <span class="settings-segmented__text">${label}</span>
    </label>
  `;
}

function renderPasswordField(
  name: keyof PasswordChangeValues,
  label: string,
  placeholder: string,
): string {
  return `
    <div class="settings-password__field">
      <span class="settings-password__label">${label}</span>
      ${renderInput({
        type: "password",
        name,
        placeholder,
        withToggle: true,
        attributes: `autocomplete="${name === "oldPassword" ? "current-password" : "new-password"}" data-password-input="${name}" aria-label="${label}"`,
      })}
      <span class="settings-password__error" data-password-error="${name}"></span>
    </div>
  `;
}

function renderPasswordSection(): string {
  return `
    <section class="settings-section settings-section--password" aria-labelledby="settings-password-title">
      <div class="settings-section__body">
        <h2 class="settings-section__title" id="settings-password-title">${t(
          "settings.passwordTitle",
        )}</h2>
        <span class="settings-section__label">${t("settings.passwordHint")}</span>
      </div>

      ${renderButton({
        text: t("settings.changePassword"),
        variant: "secondary",
        className: "settings-section__action",
        attributes: "data-password-modal-open",
      })}
    </section>
  `;
}

function renderPasswordModal(): string {
  return `
    <dialog class="settings-password-modal" data-password-modal aria-labelledby="settings-password-modal-title">
      <section class="settings-password-modal__panel">
        ${renderModalCloseButton({
          className: "settings-password-modal__close",
          attributes: "data-password-modal-close",
        })}
        <header class="settings-password-modal__header">
          <h2 class="settings-password-modal__title" id="settings-password-modal-title">${t(
            "settings.passwordTitle",
          )}</h2>
          <p class="settings-password-modal__subtitle">${t("settings.passwordHint")}</p>
        </header>

      <form class="settings-password" data-password-form novalidate>
        ${renderPasswordField(
          "oldPassword",
          t("settings.oldPassword"),
          t("settings.oldPasswordPlaceholder"),
        )}
        ${renderPasswordField(
          "newPassword1",
          t("settings.newPassword"),
          t("settings.newPasswordPlaceholder"),
        )}
        ${renderPasswordField(
          "newPassword2",
          t("settings.repeatNewPassword"),
          t("settings.repeatNewPasswordPlaceholder"),
        )}
        <p class="settings-password__message" data-password-message></p>
        ${renderButton({
          text: t("settings.changePassword"),
          type: "submit",
          className: "settings-password__submit",
          attributes: "data-password-submit",
        })}
      </form>
      </section>
    </dialog>
  `;
}

function renderSettingsPanel(loadError = ""): string {
  const currentTheme = getThemeMode();
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
          </div>

          <fieldset class="settings-segmented" aria-labelledby="settings-appearance-title">
            ${renderSegmentedOption(
              "settings-theme",
              "light",
              t("settings.lightTheme"),
              currentTheme,
              "data-theme-option",
            )}
            ${renderSegmentedOption(
              "settings-theme",
              "dark",
              t("settings.darkTheme"),
              currentTheme,
              "data-theme-option",
            )}
          </fieldset>
        </section>

        <section class="settings-section" aria-labelledby="settings-language-title">
          <div class="settings-section__body">
            <h2 class="settings-section__title" id="settings-language-title">${t(
              "settings.language",
            )}</h2>
            <span class="settings-section__label">${t("settings.interfaceLanguage")}</span>
          </div>

          <fieldset class="settings-segmented" aria-labelledby="settings-language-title">
            ${renderSegmentedOption(
              "settings-language",
              "RU",
              t("settings.russian"),
              currentLanguage,
              "data-language-option",
            )}
            ${renderSegmentedOption(
              "settings-language",
              "EN",
              t("settings.english"),
              currentLanguage,
              "data-language-option",
            )}
          </fieldset>
        </section>

        ${renderPasswordSection()}

        <p
          class="settings-panel__message${loadError ? "" : " settings-panel__message--hidden"}"
          data-settings-message
        >
          ${loadError || ""}
        </p>
      </section>
      ${renderPasswordModal()}
    </section>
  `;
}

function setSettingsSaving(root: Document | HTMLElement, saving: boolean): void {
  root
    .querySelectorAll<HTMLInputElement>("[data-theme-option], [data-language-option]")
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

function syncThemeState(root: Document | HTMLElement): void {
  const theme = getThemeMode();
  root.querySelectorAll<HTMLInputElement>("[data-theme-option]").forEach((input) => {
    input.checked = input.value === theme;
  });
}

function syncLanguageState(root: Document | HTMLElement): void {
  const language = getLanguageMode();
  root.querySelectorAll<HTMLInputElement>("[data-language-option]").forEach((input) => {
    input.checked = input.value === language;
  });
}

function getPasswordValues(form: HTMLFormElement): PasswordChangeValues {
  const data = new FormData(form);
  return {
    oldPassword: String(data.get("oldPassword") ?? ""),
    newPassword1: String(data.get("newPassword1") ?? ""),
    newPassword2: String(data.get("newPassword2") ?? ""),
  };
}

export function validatePasswordChange(
  values: PasswordChangeValues,
  isSubmitAttempted = false,
): PasswordChangeErrors {
  const errors: PasswordChangeErrors = {};

  if (!values.oldPassword) {
    errors.oldPassword = isSubmitAttempted ? t("settings.passwordRequired") : "";
  }
  if (!values.newPassword1) {
    errors.newPassword1 = isSubmitAttempted ? t("settings.passwordRequired") : "";
  } else if (values.newPassword1.length < 7) {
    errors.newPassword1 = t("settings.passwordTooShort");
  } else if (values.newPassword1.length > 20) {
    errors.newPassword1 = t("settings.passwordTooLong");
  }
  if (!values.newPassword2) {
    errors.newPassword2 = isSubmitAttempted ? t("settings.passwordRequired") : "";
  } else if (values.newPassword1 !== values.newPassword2) {
    errors.newPassword2 = t("settings.passwordsMismatch");
  }
  if (values.oldPassword && values.newPassword1 && values.oldPassword === values.newPassword1) {
    errors.newPassword1 = t("settings.passwordReuse");
  }

  return errors;
}

function getPasswordTouchedFields(form: HTMLFormElement): PasswordChangeField[] {
  const fields = (form.dataset.touchedFields ?? "")
    .split(",")
    .filter((fieldName): fieldName is PasswordChangeField =>
      PASSWORD_FIELD_NAMES.includes(fieldName as PasswordChangeField),
    );

  return Array.from(new Set(fields));
}

function setPasswordTouchedField(form: HTMLFormElement, fieldName: string): void {
  if (!PASSWORD_FIELD_NAMES.includes(fieldName as PasswordChangeField)) return;

  const fields = new Set(getPasswordTouchedFields(form));
  fields.add(fieldName as PasswordChangeField);
  form.dataset.touchedFields = Array.from(fields).join(",");
}

function setPasswordSubmitting(root: Document | HTMLElement, submitting: boolean): void {
  root.querySelectorAll<HTMLInputElement>("[data-password-input]").forEach((input) => {
    input.disabled = submitting;
  });
  root.querySelectorAll<HTMLButtonElement>("[data-password-submit]").forEach((button) => {
    button.disabled = submitting;
    button.textContent = submitting
      ? t("settings.changePasswordSaving")
      : t("settings.changePassword");
  });
}

function setPasswordErrors(
  root: Document | HTMLElement,
  errors: PasswordChangeErrors,
  visibleFields: PasswordChangeField[] = PASSWORD_FIELD_NAMES,
): void {
  PASSWORD_FIELD_NAMES.forEach((fieldName) => {
    const message = visibleFields.includes(fieldName) ? (errors[fieldName] ?? "") : "";
    const errorEl = root.querySelector<HTMLElement>(`[data-password-error="${fieldName}"]`);
    const input = root.querySelector<HTMLInputElement>(`[data-password-input="${fieldName}"]`);
    const wrapper = input?.closest(".input");
    if (errorEl) {
      errorEl.textContent = message;
    }
    input?.setAttribute("aria-invalid", message ? "true" : "false");
    wrapper?.classList.toggle("input--error", Boolean(message));
    wrapper?.classList.toggle("input--default", !message);
  });

  const messageEl = root.querySelector<HTMLElement>("[data-password-message]");
  if (messageEl) {
    messageEl.textContent = errors.form ?? "";
  }
}

function renderPasswordLiveErrors(root: Document | HTMLElement, form: HTMLFormElement): void {
  const isSubmitAttempted = form.dataset.submitAttempted === "true";
  const errors = validatePasswordChange(getPasswordValues(form), isSubmitAttempted);
  const visibleFields = isSubmitAttempted ? PASSWORD_FIELD_NAMES : getPasswordTouchedFields(form);
  setPasswordErrors(root, errors, visibleFields);
}

function passwordErrorFromApi(error: unknown): PasswordChangeErrors {
  if (!(error instanceof ApiError)) {
    return { form: t("settings.passwordChangeError") };
  }
  if (error.status === 401) {
    return { oldPassword: t("settings.oldPasswordIncorrect") };
  }

  switch (error.message) {
    case "passwords do not match":
      return { newPassword2: t("settings.passwordsMismatch") };
    case "new password must differ from old password":
      return { newPassword1: t("settings.passwordReuse") };
    case "password must be 7-20 characters":
      return { newPassword1: t("settings.passwordLength") };
    default:
      return { form: t("settings.passwordChangeError") };
  }
}

function navigateToLogin(): void {
  window.history.pushState({}, "", "/login");
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function getPasswordDialog(root: Document | HTMLElement): HTMLDialogElement | null {
  const dialog = root.querySelector<HTMLDialogElement>("[data-password-modal]");
  return dialog instanceof HTMLDialogElement ? dialog : null;
}

function openPasswordDialog(root: Document | HTMLElement): void {
  const dialog = getPasswordDialog(root);
  if (!dialog || dialog.open) return;

  dialog.showModal();
  document.body.classList.add("modal-open");
}

function closePasswordDialog(root: Document | HTMLElement): void {
  getPasswordDialog(root)?.close();
}

function attachPasswordDialogListeners(root: Document | HTMLElement): void {
  const dialog = getPasswordDialog(root) as PasswordDialog | null;
  if (!dialog || dialog.__settingsPasswordDialogBound) return;

  let backdropPressStarted = false;

  dialog.addEventListener("pointerdown", (event) => {
    backdropPressStarted = event.target === dialog;
  });

  dialog.addEventListener("click", (event) => {
    if (backdropPressStarted && event.target === dialog) {
      dialog.close();
    }
    backdropPressStarted = false;
  });

  dialog.addEventListener("close", () => {
    backdropPressStarted = false;
    document.body.classList.remove("modal-open");
    const form = dialog.querySelector<HTMLFormElement>("[data-password-form]");
    if (form) {
      form.reset();
      delete form.dataset.submitAttempted;
      delete form.dataset.touchedFields;
    }
    setPasswordErrors(root, {});
    setPasswordSubmitting(root, false);
  });

  dialog.__settingsPasswordDialogBound = true;
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

  attachPasswordDialogListeners(root);

  if (bindableRoot.__settingsBound) return;

  root.addEventListener("input", (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || !target.matches("[data-password-input]")) return;

    const form = target.closest("[data-password-form]");
    if (!(form instanceof HTMLFormElement)) return;

    setPasswordTouchedField(form, target.name);
    renderPasswordLiveErrors(root, form);
  });

  root.addEventListener("submit", (event: Event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.matches("[data-password-form]")) return;

    event.preventDefault();

    form.dataset.submitAttempted = "true";
    PASSWORD_FIELD_NAMES.forEach((fieldName) => setPasswordTouchedField(form, fieldName));
    const values = getPasswordValues(form);
    const errors = validatePasswordChange(values, true);
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(root, errors);
      return;
    }

    setPasswordErrors(root, {});
    setPasswordSubmitting(root, true);

    void changePassword(values)
      .then(() => {
        form.reset();
        delete form.dataset.submitAttempted;
        delete form.dataset.touchedFields;
        closePasswordDialog(root);
        showAppToast(t("settings.passwordChanged"));
        clearSessionUser();
        navigateToLogin();
      })
      .catch((error) => {
        if (isAbortError(error)) return;
        setPasswordErrors(root, passwordErrorFromApi(error));
      })
      .finally(() => {
        setPasswordSubmitting(root, false);
      });
  });

  root.addEventListener("change", (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    if (target.matches("[data-theme-option]")) {
      const nextTheme = target.value;
      if (!isThemeMode(nextTheme)) return;

      const previousTheme = getThemeMode();
      if (previousTheme === nextTheme) return;

      setSettingsMessage(root, "");
      setSettingsSaving(root, true);
      applyTheme(nextTheme);
      syncThemeState(root);

      void saveThemeToServer(nextTheme)
        .then(() => {
          syncThemeState(root);
        })
        .catch((error) => {
          if (isAbortError(error)) return;

          applyTheme(previousTheme);
          syncThemeState(root);
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

  root.addEventListener("click", (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (target.closest("[data-password-modal-open]")) {
      event.preventDefault();
      openPasswordDialog(root);
      return;
    }

    if (target.closest("[data-password-modal-close]")) {
      event.preventDefault();
      closePasswordDialog(root);
    }
  });

  bindableRoot.__settingsBound = true;
}
