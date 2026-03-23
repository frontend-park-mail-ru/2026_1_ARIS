import { renderAuthModal } from "./auth-modal";
import { registerDraft } from "../../state/register-draft";

type AuthMode = "login" | "register";

type BindableRoot = (Document | HTMLElement) & {
  __authModalBound?: boolean;
};

let isPointerDownOutsidePanel = false;

/**
 * Traps focus inside the auth modal when navigating with the Tab key.
 *
 * @param {KeyboardEvent} event
 * @returns {void}
 */
function trapFocusInModal(event: KeyboardEvent): void {
  if (event.key !== "Tab") return;

  const modal = document.querySelector("[data-auth-modal]");
  if (!(modal instanceof HTMLElement)) return;

  const focusableElements = modal.querySelectorAll<HTMLElement>(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  );

  if (!focusableElements.length) return;

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  const activeElement = document.activeElement;

  if (!firstElement || !lastElement) return;

  if (event.shiftKey) {
    if (activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    }
    return;
  }

  if (activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
}

/**
 * Returns the modal root element, creating it if necessary.
 *
 * @returns {HTMLElement}
 */
function getModalRoot(): HTMLElement {
  let modalRoot = document.getElementById("modal-root");

  if (!modalRoot) {
    modalRoot = document.createElement("div");
    modalRoot.id = "modal-root";
    document.body.appendChild(modalRoot);
  }

  return modalRoot;
}

/**
 * Focuses the first available focusable element inside the modal.
 *
 * @param {HTMLElement} modalRoot
 * @returns {void}
 */
function focusFirstModalElement(modalRoot: HTMLElement): void {
  const modal = modalRoot.querySelector("[data-auth-modal]");
  if (!(modal instanceof HTMLElement)) return;

  const firstFocusable = modal.querySelector(
    'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
  );

  if (firstFocusable instanceof HTMLElement) {
    firstFocusable.focus();
  }
}

/**
 * Opens the auth modal in the specified mode.
 *
 * @param {"login"|"register"} [mode="login"]
 * @returns {void}
 */
export function openAuthModal(mode: AuthMode = "login"): void {
  const modalRoot = getModalRoot();

  modalRoot.innerHTML = renderAuthModal({
    mode,
    registerDraft,
  });

  document.body.classList.add("modal-open");
  focusFirstModalElement(modalRoot);
}

/**
 * Closes the auth modal.
 *
 * @returns {void}
 */
export function closeAuthModal(): void {
  const modalRoot = getModalRoot();
  modalRoot.innerHTML = "";
  document.body.classList.remove("modal-open");
}

/**
 * Switches the auth modal content to the specified mode.
 *
 * @param {"login"|"register"} mode
 * @returns {void}
 */
function switchAuthModalMode(mode: AuthMode): void {
  const modalRoot = getModalRoot();

  modalRoot.innerHTML = renderAuthModal({
    mode,
    registerDraft,
  });

  focusFirstModalElement(modalRoot);
}

/**
 * Initializes auth modal event handlers.
 *
 * @param {Document|HTMLElement} [root=document]
 * @returns {void}
 */
export function initAuthModal(root: Document | HTMLElement = document): void {
  const bindableRoot = root as BindableRoot;
  if (bindableRoot.__authModalBound) return;

  root.addEventListener("mousedown", (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const modal = target.closest("[data-auth-modal]");
    const panel = target.closest(".auth-modal__panel");

    isPointerDownOutsidePanel = Boolean(modal && !panel);
  });

  root.addEventListener("click", (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const openButton = target.closest("[data-open-auth-modal]");
    if (openButton) {
      event.preventDefault();
      const mode = openButton.getAttribute("data-open-auth-modal");
      openAuthModal(mode === "register" ? "register" : "login");
      return;
    }

    const switchButton = target.closest("[data-switch-auth-mode]");
    if (switchButton) {
      event.preventDefault();
      const mode = switchButton.getAttribute("data-switch-auth-mode");

      if (mode === "login" || mode === "register") {
        switchAuthModalMode(mode);
      }
      return;
    }

    const modal = target.closest("[data-auth-modal]");
    const panel = target.closest(".auth-modal__panel");

    if (modal && !panel && isPointerDownOutsidePanel) {
      event.preventDefault();
      closeAuthModal();
      isPointerDownOutsidePanel = false;
      return;
    }

    isPointerDownOutsidePanel = false;

    const closeButton = target.closest("[data-auth-modal-close]");
    if (closeButton) {
      event.preventDefault();
      closeAuthModal();
    }
  });

  document.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      closeAuthModal();
      return;
    }

    trapFocusInModal(event);
  });

  bindableRoot.__authModalBound = true;
}
