import { renderButton } from "../button/button.js";
import { renderAuthForm } from "../auth-form/auth-form.js";
import { renderAuthModal } from "./auth-modal.js";

function getModalRoot() {
  let modalRoot = document.getElementById("modal-root");

  if (!modalRoot) {
    modalRoot = document.createElement("div");
    modalRoot.id = "modal-root";
    document.body.appendChild(modalRoot);
  }

  return modalRoot;
}

export function openAuthModal(mode = "login") {
  const modalRoot = getModalRoot();
  modalRoot.innerHTML = renderAuthModal({ mode });
  document.body.classList.add("modal-open");
}

export function closeAuthModal() {
  const modalRoot = getModalRoot();
  modalRoot.innerHTML = "";
  document.body.classList.remove("modal-open");
}

function switchAuthModalMode(mode) {
  const modal = document.querySelector("[data-auth-modal]");
  if (!modal) return;

  const content = modal.querySelector(".auth-modal__content");
  if (!content) return;

  content.innerHTML = `
    ${renderButton({
      text: "×",
      variant: "surface",
      tag: "button",
      type: "button",
      className: "auth-modal__close",
      attributes: 'aria-label="Закрыть" data-auth-modal-close',
    })}

    ${renderAuthForm({ mode, context: "modal" })}
  `;
}

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
    }
  });

  root.__authModalBound = true;
}
