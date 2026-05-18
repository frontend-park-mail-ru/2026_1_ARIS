const TOAST_SELECTOR = "[data-app-toast]";
const TOAST_VISIBLE_MS = 5000;
const TOAST_CYPRESS_VISIBLE_MS = 15000;
const TOAST_EXIT_MS = 220;

function getToastVisibleMs(): number {
  return "Cypress" in window ? TOAST_CYPRESS_VISIBLE_MS : TOAST_VISIBLE_MS;
}

export function showAppToast(message: string): void {
  const existing = document.querySelector<HTMLElement>(TOAST_SELECTOR);
  existing?.remove();

  const toast = document.createElement("div");
  toast.className = "profile-toast";
  toast.dataset.appToast = "";
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.textContent = message;
  document.body.appendChild(toast);
  toast.getBoundingClientRect();
  toast.classList.add("profile-toast--visible");

  window.setTimeout(() => {
    toast.classList.remove("profile-toast--visible");
    window.setTimeout(() => {
      toast.remove();
    }, TOAST_EXIT_MS);
  }, getToastVisibleMs());
}
