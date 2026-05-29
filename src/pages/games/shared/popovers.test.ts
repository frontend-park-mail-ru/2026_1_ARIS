/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  getGamesPopoverAnchor,
  mountGameHintPortal,
  unmountGameHintPortal,
  updateGamesPopoverViewportOffset,
} from "./popovers";

describe("games popovers", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("перепривязывает portal-подсказку к новому якорю", () => {
    const firstAnchor = document.createElement("button");
    const secondAnchor = document.createElement("button");
    const hint = document.createElement("span");
    hint.className = "games-field-popover";
    document.body.append(firstAnchor, secondAnchor, hint);

    mountGameHintPortal(hint, firstAnchor);
    firstAnchor.remove();
    mountGameHintPortal(hint, secondAnchor);

    expect(getGamesPopoverAnchor(hint)).toBe(secondAnchor);
  });

  it("возвращает portal-подсказку, если исходный сосед уже удалён", () => {
    const parent = document.createElement("div");
    const anchor = document.createElement("button");
    const hint = document.createElement("span");
    const nextSibling = document.createElement("strong");
    hint.className = "games-field-popover";
    parent.append(anchor, hint, nextSibling);
    document.body.append(parent);

    mountGameHintPortal(hint, anchor);
    nextSibling.remove();

    expect(() => unmountGameHintPortal(hint)).not.toThrow();
    expect(hint.parentElement).toBe(parent);
  });

  it("не сбрасывает позицию видимой подсказки без якоря", () => {
    const hint = document.createElement("span");
    hint.className = "games-field-popover";
    hint.hidden = false;
    hint.dataset.gamesPopoverAnchorId = "missing-anchor";
    hint.style.setProperty("--games-popover-left", "120px");
    hint.style.setProperty("--games-popover-top", "48px");
    document.body.append(hint);

    updateGamesPopoverViewportOffset(hint);

    expect(hint.style.getPropertyValue("--games-popover-left")).toBe("120px");
    expect(hint.style.getPropertyValue("--games-popover-top")).toBe("48px");
  });
});
