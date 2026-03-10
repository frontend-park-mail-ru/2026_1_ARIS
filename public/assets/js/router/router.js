import { initPostcardExpand } from "../components/postcard/postcard.js";
import { initAuthForm } from "../components/auth-form/auth-form-controller.js";
import { initAuthModal } from "../components/auth-modal/auth-modal-controller.js";
import { initEyeToggle } from "../components/eye-toggle/eye-toggle-controller.js";

function normalisePath(p) {
  const noTrailing = (p || "/").replace(/\/+$/g, "");
  return noTrailing === "" ? "/" : noTrailing;
}

export function createRouter(root, routes) {
  function render() {
    const path = normalisePath(window.location.pathname);
    const route = routes.find((r) => normalisePath(r.path) === path);

    if (!route) {
      document.title = "ARISNET — 404";
      root.innerHTML = "<h1>404</h1><p>Page not found</p>";
      return;
    }

    document.title = route.title;
    root.innerHTML = route.render();
    initAuthForm(document);
    initPostcardExpand(root);
    initAuthModal(document);
    initEyeToggle(document);
  }

  function navigate(to) {
    if (normalisePath(window.location.pathname) !== normalisePath(to)) {
      window.history.pushState({}, "", to);
    }

    window.scrollTo(0, 0);
    render();
  }

  document.addEventListener("click", (e) => {
    const a = e.target instanceof Element ? e.target.closest("a[data-link]") : null;
    if (!a) return;

    const href = a.getAttribute("href");
    if (!href) return;

    e.preventDefault();
    navigate(href);
  });

  window.addEventListener("popstate", render);

  return { render, navigate };
}
