import { renderModalCloseButton } from "../components/modal-close/modal-close";
import { t } from "../state/i18n";
import { escapeHtml } from "./avatar";
import { renderCommentEditFormHtml } from "./post-comment-render";

function renderCommentDeleteModalHtml(): string {
  const title = escapeHtml(t("profile.deleteCommentTitle"));
  const text = escapeHtml(t("profile.commentDeleteConfirm"));

  return `
    <div class="profile-post-delete-modal" data-comment-delete-modal>
      <section
        class="profile-post-delete-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-label="${title}"
      >
        <header class="profile-post-delete-modal__header">
          <h2 class="profile-post-delete-modal__title">${title}</h2>
          ${renderModalCloseButton({
            className: "profile-post-delete-modal__close",
            attributes: "data-comment-delete-close",
          })}
        </header>

        <p class="profile-post-delete-modal__text">${text}</p>

        <div class="profile-post-delete-modal__actions">
          <button
            type="button"
            class="button button--primary profile-post-delete-modal__button profile-post-delete-modal__button--primary"
            data-comment-delete-confirm
          >
            ${escapeHtml(t("profile.deleteComment"))}
          </button>
          <button
            type="button"
            class="button button--neutral profile-post-delete-modal__button"
            data-comment-delete-close
          >
            ${escapeHtml(t("friends.cancel"))}
          </button>
        </div>
      </section>
    </div>
  `;
}

export function confirmCommentDelete(): Promise<boolean> {
  document.querySelector<HTMLElement>("[data-comment-delete-modal-root]")?.remove();

  const root = document.createElement("div");
  root.dataset.commentDeleteModalRoot = "";
  root.innerHTML = renderCommentDeleteModalHtml();
  document.body.appendChild(root);

  const modal = root.querySelector<HTMLElement>("[data-comment-delete-modal]");
  const confirmButton = root.querySelector<HTMLButtonElement>("[data-comment-delete-confirm]");
  confirmButton?.focus();

  return new Promise((resolve) => {
    let settled = false;

    const settle = (confirmed: boolean): void => {
      if (settled) return;

      settled = true;
      document.removeEventListener("keydown", onKeyDown);
      root.remove();
      resolve(confirmed);
    };

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        settle(false);
      }
    };

    root.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      if (target.closest("[data-comment-delete-confirm]")) {
        settle(true);
        return;
      }

      if (target.closest("[data-comment-delete-close]") || target === modal) {
        settle(false);
      }
    });
    document.addEventListener("keydown", onKeyDown);
  });
}

export function closeCommentMenus(root: Document | HTMLElement = document): void {
  document.querySelectorAll<HTMLElement>("[data-comment-menu-floating]").forEach((menu) => {
    menu.remove();
  });

  document.querySelectorAll<HTMLElement>("[data-comment-menu]").forEach((menu) => {
    menu.hidden = true;
    menu.style.top = "";
    menu.style.right = "";
    menu.style.left = "";
  });

  root.querySelectorAll<HTMLButtonElement>("[data-comment-menu-toggle]").forEach((button) => {
    button.setAttribute("aria-expanded", "false");
  });
}

export function positionCommentMenu(menu: HTMLElement, toggle: HTMLButtonElement): void {
  const rect = toggle.getBoundingClientRect();
  menu.style.top = `${rect.bottom + 8}px`;
  menu.style.right = `${window.innerWidth - rect.right}px`;
  menu.style.left = "auto";
}

export function replaceOpenCommentEditForms(root: Document | HTMLElement): void {
  root.querySelectorAll<HTMLFormElement>("[data-comment-edit-form]").forEach((form) => {
    const text = form.getAttribute("data-comment-edit-original") ?? "";
    form.outerHTML = `<div class="profile-comment__bubble">${escapeHtml(text)}</div>`;
  });
}

export function openCommentEditForm(
  root: Document | HTMLElement,
  postId: string,
  commentId: string,
): void {
  const commentEl = root.querySelector<HTMLElement>(`[data-comment-id="${CSS.escape(commentId)}"]`);
  const bubble = commentEl?.querySelector<HTMLElement>(".profile-comment__bubble");
  if (!commentEl || !bubble) return;

  replaceOpenCommentEditForms(root);
  const text = bubble.textContent ?? "";
  bubble.outerHTML = renderCommentEditFormHtml(postId, commentId, text).trim();

  const input = commentEl.querySelector<HTMLTextAreaElement>(
    `[data-comment-edit-input="${CSS.escape(commentId)}"]`,
  );
  if (input) {
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }
}

export function cancelCommentEdit(root: Document | HTMLElement, commentId: string): void {
  const form = root.querySelector<HTMLFormElement>(
    `[data-comment-edit-form="${CSS.escape(commentId)}"]`,
  );
  if (!form) return;

  const text = form.getAttribute("data-comment-edit-original") ?? "";
  form.outerHTML = `<div class="profile-comment__bubble">${escapeHtml(text)}</div>`;
}

export function finishCommentEdit(
  root: Document | HTMLElement,
  commentId: string,
  text: string,
): void {
  const form = root.querySelector<HTMLFormElement>(
    `[data-comment-edit-form="${CSS.escape(commentId)}"]`,
  );
  if (!form) return;

  form.outerHTML = `<div class="profile-comment__bubble">${escapeHtml(text)}</div>`;
}

export function setCommentEditError(
  root: Document | HTMLElement,
  commentId: string,
  message: string,
): void {
  const errorEl = root.querySelector<HTMLElement>(
    `[data-comment-edit-error="${CSS.escape(commentId)}"]`,
  );
  if (!errorEl) return;

  errorEl.textContent = message;
  errorEl.hidden = false;
}

export function bindFloatingCommentMenuActions(
  menu: HTMLElement,
  root: Document | HTMLElement,
  handlers: {
    onEdit: (postId: string, commentId: string) => void;
    onDelete: (postId: string, commentId: string, removedCount: number) => void;
  },
): void {
  const editButton = menu.querySelector<HTMLButtonElement>("[data-comment-edit]");
  if (editButton) {
    editButton.onclick = () => {
      const commentId = editButton.getAttribute("data-comment-edit") ?? "";
      const postId = editButton.getAttribute("data-comment-edit-post") ?? "";
      if (!postId || !commentId) return;

      closeCommentMenus(root);
      handlers.onEdit(postId, commentId);
    };
  }

  const deleteButton = menu.querySelector<HTMLButtonElement>("[data-comment-delete]");
  if (deleteButton) {
    deleteButton.onclick = () => {
      const commentId = deleteButton.getAttribute("data-comment-delete") ?? "";
      const postId = deleteButton.getAttribute("data-comment-delete-post") ?? "";
      const removedCount = Number(deleteButton.getAttribute("data-comment-delete-count") ?? "1");
      if (!postId || !commentId) return;

      closeCommentMenus(root);
      handlers.onDelete(postId, commentId, Number.isFinite(removedCount) ? removedCount : 1);
    };
  }
}
