/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { bindGamesPageBootstrapEvents, createGamesPageBootstrap } from "./page-bootstrap";
import {
  initGamesPageLifecycle,
  syncGamesPageResize,
  teardownGamesPageLifecycleWhenUnmounted,
  type GamesPageLifecycleOptions,
} from "./page-lifecycle";

vi.mock("./page-lifecycle", async () => {
  const actual = await vi.importActual<typeof import("./page-lifecycle")>("./page-lifecycle");
  return {
    ...actual,
    initGamesPageLifecycle: vi.fn(),
    syncGamesPageResize: vi.fn(),
    teardownGamesPageLifecycleWhenUnmounted: vi.fn(),
  };
});

const lifecycleOptions = {} as GamesPageLifecycleOptions;

describe("games page bootstrap", () => {
  it("делегирует init/resize/unmount в lifecycle runtime", () => {
    const getLifecycleOptions = vi.fn(() => lifecycleOptions);
    const bootstrap = createGamesPageBootstrap({ getLifecycleOptions });
    const root = document.createElement("main");

    bootstrap.init(root);
    bootstrap.syncResize();
    bootstrap.teardownWhenUnmounted();

    expect(initGamesPageLifecycle).toHaveBeenCalledWith(root, lifecycleOptions);
    expect(syncGamesPageResize).toHaveBeenCalledWith(lifecycleOptions);
    expect(teardownGamesPageLifecycleWhenUnmounted).toHaveBeenCalledWith(lifecycleOptions);
    expect(getLifecycleOptions).toHaveBeenCalledTimes(3);
  });

  it("подключает window lifecycle events к bootstrap", () => {
    const bootstrap = {
      init: vi.fn(),
      syncResize: vi.fn(),
      teardownWhenUnmounted: vi.fn(),
    };

    bindGamesPageBootstrapEvents(bootstrap);
    window.dispatchEvent(new Event("resize"));
    window.dispatchEvent(new Event("apprender"));

    expect(bootstrap.syncResize).toHaveBeenCalledOnce();
    expect(bootstrap.teardownWhenUnmounted).toHaveBeenCalledOnce();
  });
});
