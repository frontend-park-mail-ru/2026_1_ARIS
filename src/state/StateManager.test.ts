import { describe, expect, it, vi } from "vitest";
import { StateManager } from "./StateManager";

describe("StateManager", () => {
  it("возвращает замороженный снимок состояния", () => {
    const store = new StateManager({ count: 1 });
    const snapshot = store.get();

    expect(snapshot).toEqual({ count: 1 });
    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  it("обновляет состояние через patch и уведомляет подписчиков", () => {
    const store = new StateManager({ count: 1, label: "old" });
    const listener = vi.fn();

    store.subscribe(listener);
    store.patch({ count: 2 });

    expect(store.get()).toEqual({ count: 2, label: "old" });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ count: 2, label: "old" });
  });

  it("перестаёт уведомлять после unsubscribe", () => {
    const store = new StateManager({ count: 1 });
    const listener = vi.fn();

    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.set({ count: 5 });

    expect(listener).not.toHaveBeenCalled();
  });

  it("сбрасывает состояние к переданному значению", () => {
    const store = new StateManager({ count: 1 });

    store.patch({ count: 3 });
    store.reset({ count: 0 });

    expect(store.get()).toEqual({ count: 0 });
  });
});
