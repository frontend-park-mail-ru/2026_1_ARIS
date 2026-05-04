import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryStorage } from "../test-utils/storage";
import { rememberPostLikeState, resolvePostLikeState } from "./post-like-state";

describe("post-like-state", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("возвращает serverValue без чтения локального override", () => {
    rememberPostLikeState("42", false);

    expect(resolvePostLikeState("42", true)).toBe(true);
    expect(resolvePostLikeState("42", false)).toBe(false);
  });

  it("запоминает локальное состояние лайка по нормализованному id", () => {
    rememberPostLikeState(" 42 ", true);

    expect(resolvePostLikeState(42)).toBe(true);

    rememberPostLikeState(42, false);

    expect(resolvePostLikeState("42")).toBe(false);
  });

  it("игнорирует пустой id и повреждённый localStorage payload", () => {
    localStorage.setItem("arisfront:post-like-state", "{broken");

    rememberPostLikeState("", true);

    expect(resolvePostLikeState("")).toBe(false);
    expect(resolvePostLikeState("unknown")).toBe(false);
  });

  it("отбрасывает не boolean значения из localStorage", () => {
    localStorage.setItem(
      "arisfront:post-like-state",
      JSON.stringify({ "1": true, "2": "true", "3": false }),
    );

    expect(resolvePostLikeState("1")).toBe(true);
    expect(resolvePostLikeState("2")).toBe(false);
    expect(resolvePostLikeState("3")).toBe(false);
  });
});
