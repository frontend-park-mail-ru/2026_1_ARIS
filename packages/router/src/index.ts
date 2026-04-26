export type RouteParams = Record<string, string>;

export type Route = {
  path: string;
  title: string;
  render: (params?: RouteParams) => string | Promise<string>;
};

type MatchResult = {
  matched: boolean;
  params: RouteParams;
};

type RouterHooks = {
  afterRender?: (root: HTMLElement) => void | Promise<void>;
};

export type AppRouter = {
  render: () => Promise<void>;
  navigate: (to: string) => Promise<void>;
};

function normalisePath(pathname: string): string {
  const noTrailing = (pathname || "/").replace(/\/+$/g, "");
  return noTrailing === "" ? "/" : noTrailing;
}

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

    const paramStartIndex = routePart.indexOf(":");
    if (paramStartIndex > 0) {
      const staticPrefix = routePart.slice(0, paramStartIndex);
      const paramName = routePart.slice(paramStartIndex + 1);

      if (!currentPart.startsWith(staticPrefix)) {
        return { matched: false, params: {} };
      }

      params[paramName] = currentPart.slice(staticPrefix.length);
      continue;
    }

    if (routePart !== currentPart) {
      return { matched: false, params: {} };
    }
  }

  return { matched: true, params };
}

type VTDocument = Document & {
  startViewTransition?: (cb: () => void) => { finished: Promise<void> };
};

export function createRouter(
  root: HTMLElement,
  routes: Route[],
  hooks: RouterHooks = {},
): AppRouter {
  async function render(resetScroll = false): Promise<void> {
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
    const html = await matchedRoute.render(matchedParams);

    const applyHtml = () => {
      if (resetScroll) window.scrollTo(0, 0);
      root.innerHTML = html;
    };

    const vtDoc = document as VTDocument;
    if (vtDoc.startViewTransition) {
      try {
        await vtDoc.startViewTransition(applyHtml).finished.catch(() => undefined);
      } catch {
        applyHtml();
      }
    } else {
      applyHtml();
    }

    await hooks.afterRender?.(root);
    window.dispatchEvent(new CustomEvent("apprender"));
  }

  async function navigate(to: string): Promise<void> {
    if (normalisePath(window.location.pathname) !== normalisePath(to)) {
      window.history.pushState({}, "", to);
    }

    await render(true);
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
