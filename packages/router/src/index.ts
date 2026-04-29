export type RouteParams = Record<string, string>;

export type Route = {
  path: string;
  title: string;
  render: (params?: RouteParams, signal?: AbortSignal) => string | Promise<string>;
};

type MatchResult = {
  matched: boolean;
  params: RouteParams;
};

type RouterHooks = {
  beforeRender?: () => void;
  getSkeleton?: (path: string) => string | null;
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

async function preloadImages(html: string): Promise<void> {
  try {
    const tpl = document.createElement("template");
    tpl.innerHTML = html;
    const srcs: string[] = [];
    tpl.content.querySelectorAll<HTMLImageElement>("img[src]").forEach((img) => {
      const src = img.getAttribute("src");
      // Skip static assets — already cached by the service worker.
      if (!src || src.startsWith("/assets/")) return;
      srcs.push(src);
    });
    if (!srcs.length) return;
    // Keep Image references alive in Promise closures so they aren't GC'd
    // before the network request completes and the HTTP cache is populated.
    await Promise.all(
      srcs.map(
        (src) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = img.onerror = () => resolve();
            img.src = src;
          }),
      ),
    );
  } catch {
    // ignore
  }
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
  startViewTransition?: (cb: () => void) => {
    finished: Promise<void>;
    ready?: Promise<void>;
    updateCallbackDone?: Promise<void>;
  };
};

export function createRouter(
  root: HTMLElement,
  routes: Route[],
  hooks: RouterHooks = {},
): AppRouter {
  let navController = new AbortController();
  let navId = 0;
  let isViewTransitionRunning = false;

  async function applyWithViewTransition(update: () => void): Promise<void> {
    const vtDoc = document as VTDocument;

    if (!vtDoc.startViewTransition || isViewTransitionRunning) {
      update();
      return;
    }

    isViewTransitionRunning = true;

    try {
      const transition = vtDoc.startViewTransition(update);
      void transition.ready?.catch(() => undefined);
      void transition.updateCallbackDone?.catch(() => undefined);
      await transition.finished.catch(() => undefined);
    } catch {
      update();
    } finally {
      isViewTransitionRunning = false;
    }
  }

  async function render(resetScroll = false): Promise<void> {
    hooks.beforeRender?.();
    navController.abort();
    navController = new AbortController();
    const currentNavId = ++navId;
    const { signal } = navController;

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

    // Show skeleton synchronously while async render runs. Do not wrap skeleton
    // in View Transitions: the old page snapshot can visually leak into loading
    // states and briefly show unrelated empty states from the previous route.
    const skeleton = hooks.getSkeleton?.(path);
    const skeletonShownAt = skeleton ? Date.now() : 0;
    if (skeleton) {
      root.innerHTML = skeleton;
      if (resetScroll) window.scrollTo(0, 0);
    }

    let html: string;
    try {
      html = await matchedRoute.render(matchedParams, signal);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      throw err;
    }

    if (navId !== currentNavId) return;

    if (skeleton) {
      const elapsed = Date.now() - skeletonShownAt;
      // Kick off image fetches and wait until they're cached OR the hard
      // deadline is reached. Images are held in Promise closures so they
      // can't be GC'd before the HTTP cache is populated.
      const IMAGE_MAX_WAIT_MS = 3000;
      const MIN_SKELETON_MS = 900;
      const imagesDone = preloadImages(html);
      const deadline = new Promise<void>((resolve) =>
        setTimeout(resolve, Math.max(0, IMAGE_MAX_WAIT_MS - elapsed)),
      );
      const minVisible = new Promise<void>((resolve) =>
        setTimeout(resolve, Math.max(0, MIN_SKELETON_MS - elapsed)),
      );
      // Show content only after images are ready (or timeout) AND the
      // skeleton has been visible for at least MIN_SKELETON_MS.
      await Promise.all([Promise.race([imagesDone, deadline]), minVisible]);
      if (navId !== currentNavId) return;
    }

    await applyWithViewTransition(() => {
      if (resetScroll && !skeleton) window.scrollTo(0, 0);
      root.innerHTML = html;
    });

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
