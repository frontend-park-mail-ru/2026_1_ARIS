/**
 * Разметка и вспомогательные функции компоновщика постов профиля.
 */
import { postComposerState } from "./state";
import { escapeHtml } from "./helpers";
import { renderModalCloseButton } from "../../components/modal-close/modal-close";
import { t } from "../../state/i18n";
import { getMediaFileName, isVideoMedia } from "../../utils/media";

export function renderPostComposerModal(): string {
  return `
    <div class="profile-post-modal" data-profile-post-modal hidden>
      <section
        class="profile-post-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-label="${t("profile.postEditorLabel")}"
      >
        <header class="profile-post-modal__header">
          <h2 class="profile-post-modal__title" data-profile-post-title>${t("profile.newPostTitle")}</h2>
          ${renderModalCloseButton({
            className: "profile-post-modal__close",
            attributes: "data-profile-post-close",
          })}
        </header>

        <textarea
          class="profile-post-modal__textarea"
          data-profile-post-text
          rows="8"
          maxlength="5000"
          placeholder="${t("profile.postPlaceholder")}"
        ></textarea>

        <input
          type="file"
          accept="image/*,video/*"
          multiple
          hidden
          data-profile-post-image-input
        >
        <input type="file" multiple hidden data-profile-post-file-input>

        <div class="profile-post-modal__toolbar">
          <button
            type="button"
            class="button button--neutral profile-post-modal__button profile-post-modal__button--secondary"
            data-profile-post-pick-image
          >
            ${t("profile.addMedia")}
          </button>
          <button
            type="button"
            class="button button--neutral profile-post-modal__button profile-post-modal__button--secondary"
            data-profile-post-pick-file
          >
            ${t("profile.addFiles")}
          </button>
        </div>

        <div class="profile-post-modal__previews" data-profile-post-previews hidden></div>
        <div class="profile-post-modal__files" data-profile-post-file-previews hidden></div>

        <p class="profile-post-modal__error" data-profile-post-error hidden></p>

        <div class="profile-post-modal__actions">
          <button
            type="button"
            class="button button--primary profile-post-modal__button profile-post-modal__button--primary"
            data-profile-post-save
          >
            ${t("profile.publishPost")}
          </button>
          <button
            type="button"
            class="button button--neutral profile-post-modal__button"
            data-profile-post-close
          >
            ${t("friends.cancel")}
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
        aria-label="${t("profile.deletePostTitle")}"
      >
        <header class="profile-post-delete-modal__header">
          <h2 class="profile-post-delete-modal__title">${t("profile.deletePostTitle")}</h2>
          ${renderModalCloseButton({
            className: "profile-post-delete-modal__close",
            attributes: "data-profile-post-delete-close",
          })}
        </header>

        <p class="profile-post-delete-modal__text">
          ${t("profile.deletePostConfirm")}
        </p>

        <div class="profile-post-delete-modal__actions">
          <button
            type="button"
            class="button button--primary profile-post-delete-modal__button profile-post-delete-modal__button--primary"
            data-profile-post-delete-confirm
          >
            ${t("profile.deletePost")}
          </button>
          <button
            type="button"
            class="button button--neutral profile-post-delete-modal__button"
            data-profile-post-delete-close
          >
            ${t("friends.cancel")}
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
  const fileInput = modal.querySelector<HTMLInputElement>("[data-profile-post-file-input]");
  const previewWrap = modal.querySelector<HTMLElement>("[data-profile-post-previews]");
  const filePreviewWrap = modal.querySelector<HTMLElement>("[data-profile-post-file-previews]");
  const pickButton = modal.querySelector<HTMLButtonElement>("[data-profile-post-pick-image]");
  const pickFileButton = modal.querySelector<HTMLButtonElement>("[data-profile-post-pick-file]");

  modal.hidden = !postComposerState.open;
  modal.classList.toggle("is-open", postComposerState.open);

  if (titleNode) {
    titleNode.textContent =
      postComposerState.mode === "edit" ? t("profile.editPost") : t("profile.newPostTitle");
  }

  if (textarea) {
    textarea.value = postComposerState.text;
    textarea.disabled = postComposerState.isSaving;
  }

  if (saveButton) {
    saveButton.disabled =
      postComposerState.isSaving ||
      (!postComposerState.text.trim() &&
        postComposerState.mediaItems.length === 0 &&
        postComposerState.fileItems.length === 0) ||
      postComposerState.text.length > 5000;

    saveButton.textContent =
      postComposerState.mode === "edit"
        ? postComposerState.isSaving
          ? t("profile.savingPost")
          : t("profile.publishPost")
        : postComposerState.isSaving
          ? t("profile.publishingPost")
          : t("profile.publishPost");
  }

  if (pickButton) {
    pickButton.disabled = postComposerState.isSaving || postComposerState.mediaItems.length >= 5;
    pickButton.textContent =
      postComposerState.mediaItems.length >= 5 ? t("profile.mediaLimit") : t("profile.addMedia");
  }

  if (pickFileButton) {
    pickFileButton.disabled =
      postComposerState.isSaving || postComposerState.fileItems.length >= 10;
    pickFileButton.textContent =
      postComposerState.fileItems.length >= 10 ? t("profile.filesLimit") : t("profile.addFiles");
  }

  if (imageInput && !postComposerState.open) {
    imageInput.value = "";
  }
  if (fileInput && !postComposerState.open) {
    fileInput.value = "";
  }

  if (errorNode) {
    errorNode.hidden = !postComposerState.errorMessage;
    errorNode.textContent = postComposerState.errorMessage;
  }

  if (previewWrap) {
    const mediaCount = postComposerState.mediaItems.length;
    const previewCountModifiers = [
      "",
      "profile-post-modal__previews--single",
      "profile-post-modal__previews--double",
      "profile-post-modal__previews--triple",
      "profile-post-modal__previews--quad",
      "profile-post-modal__previews--five",
    ];
    previewWrap.className = [
      "profile-post-modal__previews",
      previewCountModifiers[Math.min(mediaCount, 5)] ?? "",
    ]
      .filter(Boolean)
      .join(" ");

    previewWrap.innerHTML = postComposerState.mediaItems
      .map(
        (item, index) => `
          <div class="profile-post-modal__preview">
            ${
              isVideoMedia(item.mediaURL, item.mimeType)
                ? `<video src="${escapeHtml(item.mediaURL)}" muted playsinline preload="metadata"></video>`
                : `<img src="${escapeHtml(item.mediaURL)}" alt="${t("profile.imageAlt")} ${index + 1}">`
            }
            <button
              type="button"
              class="profile-post-modal__preview-remove"
              data-profile-post-remove-image="${index}"
              aria-label="${t("profile.imageRemove")}"
            >
              ×
            </button>
          </div>
        `,
      )
      .join("");

    previewWrap.hidden = postComposerState.mediaItems.length === 0;
  }

  if (filePreviewWrap) {
    filePreviewWrap.innerHTML = postComposerState.fileItems
      .map(
        (item, index) => `
          <div class="profile-post-modal__file-preview">
            <img class="profile-post-modal__file-icon" src="/assets/img/icons/file.svg" alt="" aria-hidden="true">
            <span class="profile-post-modal__file-name">${escapeHtml(item.fileName || getMediaFileName(item.mediaURL, t("chats.file")))}</span>
            <button
              type="button"
              class="profile-post-modal__file-remove"
              data-profile-post-remove-file="${index}"
              aria-label="${t("profile.fileRemove")}"
            >
              ×
            </button>
          </div>
        `,
      )
      .join("");

    filePreviewWrap.hidden = postComposerState.fileItems.length === 0;
  }
}
