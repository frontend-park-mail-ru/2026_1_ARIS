import type { DisplayProfile, EditableProfileFields, ProfileFieldErrorMap } from "./types";
import { escapeHtml } from "./helpers";

export function renderEditorFieldError(name: keyof EditableProfileFields): string {
  return `
    <p class="profile-editor__field-error profile-editor__field-error--hidden" data-profile-field-error="${name}">
      ${" "}
    </p>
  `;
}

export function clearProfileFieldErrors(form: HTMLFormElement): void {
  const errorNodes = form.querySelectorAll<HTMLElement>("[data-profile-field-error]");
  const fields = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    ".profile-editor__input, .profile-editor__textarea",
  );

  errorNodes.forEach((node) => {
    node.textContent = " ";
    node.classList.add("profile-editor__field-error--hidden");
  });

  fields.forEach((field) => {
    field.classList.remove("profile-editor__control--error");
  });
}

export function renderProfileFieldErrors(
  form: HTMLFormElement,
  errors: ProfileFieldErrorMap,
): void {
  clearProfileFieldErrors(form);

  (Object.entries(errors) as Array<[keyof EditableProfileFields, string]>).forEach(
    ([name, message]) => {
      if (!message) {
        return;
      }

      const errorNode = form.querySelector<HTMLElement>(`[data-profile-field-error="${name}"]`);
      const field = form.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        `[name="${name}"]`,
      );

      if (errorNode) {
        errorNode.textContent = message;
        errorNode.classList.remove("profile-editor__field-error--hidden");
      }

      if (field) {
        field.classList.add("profile-editor__control--error");
      }
    },
  );
}

export function focusFirstProfileErrorField(
  form: HTMLFormElement,
  errors: ProfileFieldErrorMap,
): void {
  const firstErrorFieldName = (
    Object.entries(errors) as Array<[keyof EditableProfileFields, string]>
  ).find(([, message]) => Boolean(message))?.[0];

  if (!firstErrorFieldName) {
    return;
  }

  const field = form.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    `[name="${firstErrorFieldName}"]`,
  );

  if (!field) {
    return;
  }

  field.focus({ preventScroll: true });
  field.scrollIntoView({
    behavior: "smooth",
    block: "center",
    inline: "nearest",
  });
}

export function renderEditorTextField(
  name: keyof EditableProfileFields,
  label: string,
  value: string,
  options: {
    type?: string;
    inputMode?: string;
    placeholder?: string;
  } = {},
): string {
  return `
    <label class="profile-editor__field">
      <span>${escapeHtml(label)}</span>
      <input
        class="profile-editor__input"
        type="${options.type ?? "text"}"
        name="${name}"
        value="${escapeHtml(value)}"
        inputmode="${escapeHtml(options.inputMode ?? options.type ?? "text")}"
        placeholder="${escapeHtml(options.placeholder ?? "")}"
      >
      ${renderEditorFieldError(name)}
    </label>
  `;
}

export function renderEditorTextarea(
  name: keyof EditableProfileFields,
  label: string,
  value: string,
  placeholder = "",
): string {
  return `
    <label class="profile-editor__field profile-editor__field--wide">
      <span>${escapeHtml(label)}</span>
      <textarea
        class="profile-editor__textarea"
        name="${name}"
        rows="4"
        placeholder="${escapeHtml(placeholder)}"
      >${escapeHtml(value)}</textarea>
      ${renderEditorFieldError(name)}
    </label>
  `;
}

export function renderProfileEditor(profile: DisplayProfile): string {
  if (!profile.isOwnProfile) {
    return "";
  }

  return `
    <section class="profile-editor content-card" data-profile-editor hidden>
      <form class="profile-editor__form" data-profile-edit-form novalidate>
        <div class="profile-editor__intro">
          <h2>Редактирование профиля</h2>
          <p>Отправим только изменённые поля. Остальное останется как есть.</p>
        </div>

        <div class="profile-editor__grid">
          ${renderEditorTextField("firstName", "Имя", profile.editable.firstName)}
          ${renderEditorTextField("lastName", "Фамилия", profile.editable.lastName)}
          ${renderEditorTextField("email", "Email", profile.editable.email, {
            type: "text",
            inputMode: "email",
            placeholder: "mail@example.com",
          })}
          ${renderEditorTextField("phone", "Телефон", profile.editable.phone, {
            type: "tel",
          })}
          ${renderEditorTextField("town", "Текущий город", profile.editable.town)}
          ${renderEditorTextField("nativeTown", "Родной город", profile.editable.nativeTown)}
          ${renderEditorTextField("birthdayDate", "Дата рождения", profile.editable.birthdayDate, {
            type: "date",
          })}

          <label class="profile-editor__field">
            <span>Пол</span>
            <select class="profile-editor__input" name="gender">
              <option value="male" ${profile.editable.gender === "male" ? "selected" : ""}>Мужской</option>
              <option value="female" ${profile.editable.gender === "female" ? "selected" : ""}>Женский</option>
            </select>
            ${renderEditorFieldError("gender")}
          </label>

          ${renderEditorTextField("institution", "Учебное заведение", profile.editable.institution)}
          ${renderEditorTextField("group", "Группа / курс", profile.editable.group)}
          ${renderEditorTextField("company", "Компания", profile.editable.company)}
          ${renderEditorTextField("jobTitle", "Роль / должность", profile.editable.jobTitle)}
          ${renderEditorTextarea("bio", "О себе", profile.editable.bio, "Коротко о себе")}
          ${renderEditorTextarea(
            "interests",
            "Интересы",
            profile.editable.interests,
            "Что тебе действительно интересно",
          )}
          ${renderEditorTextarea(
            "favMusic",
            "Любимая музыка",
            profile.editable.favMusic,
            "Артисты, жанры, плейлисты",
          )}
        </div>

        <p class="profile-editor__message" data-profile-form-message hidden></p>

        <div class="profile-editor__actions">
          <button type="submit" class="profile-editor__button profile-editor__button--primary">
            Сохранить изменения
          </button>
          <button
            type="button"
            class="profile-editor__button"
            data-profile-edit-cancel
          >
            Отмена
          </button>
        </div>
      </form>
    </section>
  `;
}
