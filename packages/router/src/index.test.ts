/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRouter, type Route } from "./index";

function createRoot(): HTMLElement {
  const root = document.createElement("main");
  document.body.append(root);
  return root;
}

describe("workspace router", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    document.title = "";
    window.history.replaceState({}, "", "/");
    vi.useRealTimers();
  });

  it("рендерит совпавший маршрут и передаёт params", async () => {
    const root = createRoot();
    const beforeRender = vi.fn();
    const afterRender = vi.fn();
    const routes: Route[] = [
      {
        path: "/users/:id",
        title: "User",
        render: (params) => `<h1>user ${params?.id}</h1>`,
      },
    ];
    window.history.replaceState({}, "", "/users/42");

    const router = createRouter(root, routes, { beforeRender, afterRender });
    await router.render();

    expect(beforeRender).toHaveBeenCalledTimes(1);
    expect(afterRender).toHaveBeenCalledWith(root);
    expect(document.title).toBe("User");
    expect(root.innerHTML).toBe("<h1>user 42</h1>");
  });

  it("поддерживает статический префикс параметра", async () => {
    const root = createRoot();
    window.history.replaceState({}, "", "/id7");

    const router = createRouter(root, [
      { path: "/id:id", title: "Profile", render: (params) => `<p>${params?.id}</p>` },
    ]);
    await router.render();

    expect(root.innerHTML).toBe("<p>7</p>");
  });

  it("показывает 404 для неизвестного маршрута", async () => {
    const root = createRoot();
    window.history.replaceState({}, "", "/missing");

    const router = createRouter(root, [
      { path: "/", title: "Home", render: () => "<h1>Home</h1>" },
    ]);
    await router.render();

    expect(document.title).toBe("ARISNET — 404");
    expect(root.innerHTML).toBe("<h1>404</h1><p>Page not found</p>");
  });

  it("navigate обновляет history, DOM и scroll", async () => {
    const root = createRoot();
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);

    const router = createRouter(root, [
      { path: "/", title: "Home", render: () => "<h1>Home</h1>" },
      { path: "/about", title: "About", render: () => "<h1>About</h1>" },
    ]);

    await router.navigate("/about");

    expect(window.location.pathname).toBe("/about");
    expect(document.title).toBe("About");
    expect(root.innerHTML).toBe("<h1>About</h1>");
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });
});
