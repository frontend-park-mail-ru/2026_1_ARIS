import { initPostcardExpand } from "../components/postcard/postcard";
import { initAuthForm } from "../components/auth-form/auth-form-controller";
import { initAuthModal } from "../components/auth-modal/auth-modal-controller";
import { initEyeToggle } from "../components/eye-toggle/eye-toggle-controller";
import { initInputMasks } from "../components/input/input-mask-controller";

type RouteParams = Record<string, string>;

type Route = {
  path: string;
  title: string;
  render: (params?: RouteParams) => string | Promise<string>;
};

type MatchResult = {
  matched: boolean;
  params: RouteParams;
};

type AppRouter = {
  render: () => Promise<void>;
  navigate: (to: string) => Promise<void>;
};

/**
 * Normalises a route path by removing trailing slashes.
 *
 * @param {string} p
 * @returns {string}
 */
function normalisePath(p: string): string {
  const noTrailing = (p || "/").replace(/\/+$/g, "");
  return noTrailing === "" ? "/" : noTrailing;
}

/**
 * Matches current path against route pattern and extracts params.
 *
 * @param {string} routePath
 * @param {string} currentPath
 * @returns {MatchResult}
 */
function matchRoute(routePath: string, currentPath: string): MatchResult {
  const routeParts = normalisePath(routePath).split("/").filter(Boolean);
  const currentParts = normalisePath(currentPath).split("/").filter(Boolean);

  if (routeParts.length !== currentParts.length) {
    return { matched: false, params: {} };
  }

  const params: RouteParams = {};

  for (let i = 0; i < routeParts.length; i += 1) {
    const routePart = routeParts[i];
    const currentPart = currentParts[i];

    if (routePart === undefined || currentPart === undefined) {
      return { matched: false, params: {} };
    }

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
 *
 * @param {HTMLElement} root
 * @param {Route[]} routes
 * @returns {AppRouter}
 */
export function createRouter(root: HTMLElement, routes: Route[]): AppRouter {
  /**
   * Renders the current route.
   *
   * @returns {Promise<void>}
   */
  async function render(): Promise<void> {
    const path = normalisePath(window.location.pathname);

    let matchedRoute: Route | null = null;
    let matchedParams: RouteParams = {};

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
   *
   * @param {string} to
   * @returns {Promise<void>}
   */
  async function navigate(to: string): Promise<void> {
    if (normalisePath(window.location.pathname) !== normalisePath(to)) {
      window.history.pushState({}, "", to);
    }

    window.scrollTo(0, 0);
    await render();
  }

  document.addEventListener("click", (event: Event) => {
    const target = event.target;
    const link = target instanceof Element ? target.closest("a[data-link]") : null;
    if (!(link instanceof HTMLAnchorElement)) return;

    const href = link.getAttribute("href");
    if (!href) return;

    event.preventDefault();
    void navigate(href);
  });

  window.addEventListener("popstate", () => {
    void render();
  });

  return { render, navigate };
}