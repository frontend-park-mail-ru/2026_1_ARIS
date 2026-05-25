import { renderModalCloseButton } from "../../../../../components/modal-close/modal-close";

export type RenderConfirmDialogOptions = {
  modalAttribute: string;
  closeAttribute: string;
  confirmAttribute: string;
  ariaLabel: string;
  title: string;
  text: string;
  confirmLabel: string;
  confirmClass?: "primary" | "danger";
  loading?: boolean;
  dialogClassName?: string;
  closeClassName?: string;
  beforeText?: string;
};

/**
 * Рендерит общий shell confirm-модалки комнаты.
 */
export function renderConfirmDialog(options: RenderConfirmDialogOptions): string {
  const confirmClass = options.confirmClass ?? "primary";
  const dialogClassName = ["games-confirm-modal__dialog", options.dialogClassName ?? ""]
    .filter(Boolean)
    .join(" ");
  const closeButton = renderModalCloseButton({
    ...(options.closeClassName ? { className: options.closeClassName } : {}),
    attributes: options.closeAttribute,
  });

  return `
    <div class="games-confirm-modal" ${options.modalAttribute}>
      <section class="${dialogClassName}" role="dialog" aria-modal="true" aria-label="${options.ariaLabel}">
        <div class="games-confirm-modal__header">
          <h2 class="games-confirm-modal__title">${options.title}</h2>
          ${closeButton}
        </div>
        ${options.beforeText ?? ""}
        <p class="games-confirm-modal__text">${options.text}</p>
        <div class="games-confirm-modal__actions">
          <button type="button" class="games-button games-button--${confirmClass}" ${options.confirmAttribute} ${options.loading ? "disabled" : ""}>
            ${options.confirmLabel}
          </button>
          <button type="button" class="games-button games-button--secondary" ${options.closeAttribute}>
            Отмена
          </button>
        </div>
      </section>
    </div>
  `;
}
