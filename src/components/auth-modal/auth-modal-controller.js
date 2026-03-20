import { renderButton } from "../button/button.js";
import { renderAuthForm } from "../auth-form/auth-form.js";
import { renderAuthModal } from "./auth-modal.js";

/**
 * Traps focus inside the auth modal when navigating with the Tab key.
 * @param {KeyboardEvent} event
 * @returns {void}
 */
function trapFocusInModal(event) {
  if (event.key !== "Tab") return;

  const modal = document.querySelector("[data-auth-modal]");
  if (!modal) return;

  const focusableElements = modal.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  );

  if (!focusableElements.length) return;

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  const activeElement = document.activeElement;

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
 * @returns {HTMLElement}
 */
function getModalRoot() {
  let modalRoot = document.getElementById("modal-root");

  if (!modalRoot) {
    modalRoot = document.createElement("div");
    modalRoot.id = "modal-root";
    document.body.appendChild(modalRoot);
  }

  return modalRoot;
}

/**
 * Opens the auth modal in the specified mode.
 * @param {"login"|"register"} [mode="login"]
 * @returns {void}
 */
export function openAuthModal(mode = "login") {
  const modalRoot = getModalRoot();
  modalRoot.innerHTML = renderAuthModal({ mode });
  document.body.classList.add("modal-open");

  const modal = modalRoot.querySelector("[data-auth-modal]");
  const firstFocusable = modal?.querySelector(
    'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
  );

  if (firstFocusable instanceof HTMLElement) {
    firstFocusable.focus();
  }
}

/**
 * Closes the auth modal.
 * @returns {void}
 */
export function closeAuthModal() {
  const modalRoot = getModalRoot();
  modalRoot.innerHTML = "";
  document.body.classList.remove("modal-open");
}

/**
 * Switches the auth modal content to the specified mode.
 * @param {"login"|"register"} mode
 * @returns {void}
 */
function switchAuthModalMode(mode) {
  const modal = document.querySelector("[data-auth-modal]");
  if (!modal) return;

  const content = modal.querySelector(".auth-modal__content");
  if (!content) return;

  content.innerHTML = `
    <div class="auth-modal__panel">
      ${renderButton({
        text: "×",
        variant: "surface",
        tag: "button",
        type: "button",
        className: "auth-modal__close",
        attributes: 'aria-label="Закрыть" data-auth-modal-close',
      })}

      ${renderAuthForm({ mode, context: "modal" })}
    </div>
  `;
}

/**
 * Initializes auth modal event handlers.
 * @param {Document|HTMLElement} [root=document]
 * @returns {void}
 */
export function initAuthModal(root = document) {
  if (root.__authModalBound) return;

  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const openButton = target.closest("[data-open-auth-modal]");
    if (openButton) {
      event.preventDefault();
      const mode = openButton.getAttribute("data-open-auth-modal") || "login";
      openAuthModal(mode);
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

    const closeButton = target.closest("[data-auth-modal-close]");
    if (closeButton) {
      event.preventDefault();
      closeAuthModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAuthModal();
      return;
    }

    trapFocusInModal(event);
  });

  root.__authModalBound = true;
}
