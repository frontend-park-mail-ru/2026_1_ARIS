/**
 * Контроллер модального окна авторизации.
 */
import { renderAuthModal, renderAuthModalPanel, type AuthMode } from "./auth-modal";
import { registerDraft } from "../../state/register-draft";

type BindableRoot = (Document | HTMLElement) & {
  __authModalBound?: boolean;
};

function getModalRoot(): HTMLElement {
  let modalRoot = document.getElementById("modal-root");

  if (!modalRoot) {
    modalRoot = document.createElement("div");
    modalRoot.id = "modal-root";
    document.body.appendChild(modalRoot);
  }

  return modalRoot;
}

function getActiveDialog(): HTMLDialogElement | null {
  return document.querySelector<HTMLDialogElement>("dialog[data-auth-modal]");
}

function attachDialogListeners(dialog: HTMLDialogElement): void {
  let backdropPressStarted = false;

  // Запоминаем начало нажатия по фону, чтобы выделение текста внутри формы
  // не закрывало диалог при отпускании кнопки мыши на фоне.
  dialog.addEventListener("pointerdown", (e) => {
    backdropPressStarted = e.target === dialog;
  });

  // При клике по ::backdrop элемент <dialog> получает событие click на самом себе.
  dialog.addEventListener("click", (e) => {
    if (backdropPressStarted && e.target === dialog) {
      dialog.close();
    }

    backdropPressStarted = false;
  });

  dialog.addEventListener("close", () => {
    backdropPressStarted = false;
    document.body.classList.remove("modal-open");
    getModalRoot().innerHTML = "";
  });
}

/**
 * Открывает модальное окно авторизации в указанном режиме.
 */
export function openAuthModal(mode: AuthMode = "login"): void {
  const modalRoot = getModalRoot();
  modalRoot.innerHTML = renderAuthModal({ mode, registerDraft });

  const dialog = modalRoot.querySelector<HTMLDialogElement>("[data-auth-modal]");
  if (!(dialog instanceof HTMLDialogElement)) return;

  attachDialogListeners(dialog);
  dialog.showModal();
  document.body.classList.add("modal-open");
}

/**
 * Закрывает модальное окно авторизации.
 */
export function closeAuthModal(): void {
  getActiveDialog()?.close();
}

/**
 * Переключает содержимое открытого модального окна в указанный режим.
 */
function switchAuthModalMode(mode: AuthMode): void {
  const dialog = getActiveDialog();
  if (!dialog) return;
  dialog.innerHTML = renderAuthModalPanel(mode, registerDraft);
}

/**
 * Инициализирует обработчики событий открытия/переключения модального окна.
 */
export function initAuthModal(root: Document | HTMLElement = document): void {
  const bindableRoot = root as BindableRoot;
  if (bindableRoot.__authModalBound) return;

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
      if (mode === "login" || mode === "register") switchAuthModalMode(mode);
      return;
    }

    const closeButton = target.closest("[data-auth-modal-close]");
    if (closeButton) {
      event.preventDefault();
      closeAuthModal();
    }
  });

  bindableRoot.__authModalBound = true;
}
