import { initPostcardExpand } from "../components/postcard/postcard.js";
import { initAuthForm } from "../components/auth-form/auth-form-controller.js";
import { initAuthModal } from "../components/auth-modal/auth-modal-controller.js";
import { initEyeToggle } from "../components/eye-toggle/eye-toggle-controller.js";
import { initInputMasks } from "../components/input/input-mask-controller.js";

/**
 * Normalises a route path by removing trailing slashes.
 * @param {string} p
 * @returns {string}
 */
function normalisePath(p) {
  const noTrailing = (p || "/").replace(/\/+$/g, "");
  return noTrailing === "" ? "/" : noTrailing;
}

/**
 * Matches current path against route pattern and extracts params.
 * @param {string} routePath
 * @param {string} currentPath
 * @returns {{matched: boolean, params: Object}}
 */
function matchRoute(routePath, currentPath) {
  const routeParts = normalisePath(routePath).split("/");
  const currentParts = normalisePath(currentPath).split("/");

  if (routeParts.length !== currentParts.length) {
    return { matched: false, params: {} };
  }

  const params = {};

  for (let i = 0; i < routeParts.length; i += 1) {
    const routePart = routeParts[i];
    const currentPart = currentParts[i];

    if (routePart.startsWith(":")) {
      params[routePart.slice(1)] = currentPart;
      continue;
    }

    if (routePart !== currentPart) {
      return { matched: false, params: {} };
    }
  }

  return { matched: true, params };
}

/**
 * Creates the application router.
 * @param {HTMLElement} root
 * @param {Array<Object>} routes
 * @returns {{render: function(): Promise<void>, navigate: function(string): Promise<void>}}
 */
export function createRouter(root, routes) {
  /**
   * Renders the current route.
   * @returns {Promise<void>}
   */
  async function render() {
    const path = normalisePath(window.location.pathname);

    let matchedRoute = null;
    let matchedParams = {};

    for (const route of routes) {
      const { matched, params } = matchRoute(route.path, path);

      if (matched) {
        matchedRoute = route;
        matchedParams = params;
        break;
      }
    }

    if (!matchedRoute) {
      document.title = "ARISNET — 404";
      root.innerHTML = "<h1>404</h1><p>Page not found</p>";
      return;
    }

    document.title = matchedRoute.title;
    root.innerHTML = await matchedRoute.render(matchedParams);

    initAuthForm(document);
    initPostcardExpand(root);
    initAuthModal(document);
    initEyeToggle(document);
    initInputMasks(document);
  }

  /**
   * Navigates to the specified route.
   * @param {string} to
   * @returns {Promise<void>}
   */
  async function navigate(to) {
    if (normalisePath(window.location.pathname) !== normalisePath(to)) {
      window.history.pushState({}, "", to);
    }

    window.scrollTo(0, 0);
    await render();
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
