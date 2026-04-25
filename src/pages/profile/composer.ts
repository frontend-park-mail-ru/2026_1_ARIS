import { postComposerState } from "./state";
import { escapeHtml } from "./helpers";

export function renderPostComposerModal(): string {
  return `
    <div class="profile-post-modal" data-profile-post-modal hidden>
      <section
        class="profile-post-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Редактор публикации"
      >
        <header class="profile-post-modal__header">
          <h2 class="profile-post-modal__title" data-profile-post-title>Новая публикация</h2>
          <button
            type="button"
            class="profile-post-modal__close"
            data-profile-post-close
            aria-label="Закрыть"
          >
            ×
          </button>
        </header>

        <textarea
          class="profile-post-modal__textarea"
          data-profile-post-text
          rows="8"
          maxlength="5000"
          placeholder="Что у вас нового?"
        ></textarea>

        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/jpg"
          multiple
          hidden
          data-profile-post-image-input
        >

        <div class="profile-post-modal__toolbar">
          <button
            type="button"
            class="profile-post-modal__button profile-post-modal__button--secondary"
            data-profile-post-pick-image
          >
            + Изображения
          </button>
        </div>

        <div class="profile-post-modal__previews" data-profile-post-previews hidden></div>

        <p class="profile-post-modal__error" data-profile-post-error hidden></p>

        <div class="profile-post-modal__actions">
          <button
            type="button"
            class="profile-post-modal__button profile-post-modal__button--primary"
            data-profile-post-save
          >
            Опубликовать
          </button>
          <button
            type="button"
            class="profile-post-modal__button"
            data-profile-post-close
          >
            Отмена
          </button>
        </div>
      </section>
    </div>
  `;
}

export function renderPostDeleteModal(): string {
  return `
    <div class="profile-post-delete-modal" data-profile-post-delete-modal hidden>
      <section
        class="profile-post-delete-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Удалить публикацию"
      >
        <header class="profile-post-delete-modal__header">
          <h2 class="profile-post-delete-modal__title">Удалить публикацию</h2>
          <button
            type="button"
            class="profile-post-delete-modal__close"
            data-profile-post-delete-close
            aria-label="Закрыть"
          >
            ×
          </button>
        </header>

        <p class="profile-post-delete-modal__text">
          Вы действительно хотите удалить этот пост?
        </p>

        <div class="profile-post-delete-modal__actions">
          <button
            type="button"
            class="profile-post-delete-modal__button profile-post-delete-modal__button--primary"
            data-profile-post-delete-confirm
          >
            Удалить пост
          </button>
          <button
            type="button"
            class="profile-post-delete-modal__button"
            data-profile-post-delete-close
          >
            Отмена
          </button>
        </div>
      </section>
    </div>
  `;
}

export function syncPostComposerUi(root: ParentNode): void {
  const modal = root.querySelector<HTMLElement>("[data-profile-post-modal]");
  const deleteModal = root.querySelector<HTMLElement>("[data-profile-post-delete-modal]");

  if (!(modal instanceof HTMLElement)) {
    if (deleteModal instanceof HTMLElement) {
      deleteModal.hidden = true;
    }
    return;
  }

  if (deleteModal instanceof HTMLElement) {
    deleteModal.hidden = !postComposerState.deleteConfirmPostId;
  }

  const textarea = modal.querySelector<HTMLTextAreaElement>("[data-profile-post-text]");
  const saveButton = modal.querySelector<HTMLButtonElement>("[data-profile-post-save]");
  const errorNode = modal.querySelector<HTMLElement>("[data-profile-post-error]");
  const titleNode = modal.querySelector<HTMLElement>("[data-profile-post-title]");
  const imageInput = modal.querySelector<HTMLInputElement>("[data-profile-post-image-input]");
  const previewWrap = modal.querySelector<HTMLElement>("[data-profile-post-previews]");
  const pickButton = modal.querySelector<HTMLButtonElement>("[data-profile-post-pick-image]");

  modal.hidden = !postComposerState.open;
  modal.classList.toggle("is-open", postComposerState.open);

  if (titleNode) {
    titleNode.textContent =
      postComposerState.mode === "edit" ? "Редактировать пост" : "Новая публикация";
  }

  if (textarea) {
    textarea.value = postComposerState.text;
    textarea.disabled = postComposerState.isSaving;
  }

  if (saveButton) {
    saveButton.disabled =
      postComposerState.isSaving ||
      (!postComposerState.text.trim() && postComposerState.mediaItems.length === 0) ||
      postComposerState.text.length > 5000;

    saveButton.textContent =
      postComposerState.mode === "edit"
        ? postComposerState.isSaving
          ? "Сохраняем..."
          : "Опубликовать"
        : postComposerState.isSaving
          ? "Публикуем..."
          : "Опубликовать";
  }

  if (pickButton) {
    pickButton.disabled = postComposerState.isSaving || postComposerState.mediaItems.length >= 5;
    pickButton.textContent =
      postComposerState.mediaItems.length >= 5 ? "Достигнут лимит 5 изображений" : "+ Изображения";
  }

  if (imageInput && !postComposerState.open) {
    imageInput.value = "";
  }

  if (errorNode) {
    errorNode.hidden = !postComposerState.errorMessage;
    errorNode.textContent = postComposerState.errorMessage;
  }

  if (previewWrap) {
    previewWrap.innerHTML = postComposerState.mediaItems
      .map(
        (item, index) => `
          <div class="profile-post-modal__preview">
            <img src="${escapeHtml(item.mediaURL)}" alt="Изображение ${index + 1}">
            <button
              type="button"
              class="profile-post-modal__preview-remove"
              data-profile-post-remove-image="${index}"
              aria-label="Удалить изображение"
            >
              [X]
            </button>
          </div>
        `,
      )
      .join("");

    previewWrap.hidden = postComposerState.mediaItems.length === 0;
  }
}
