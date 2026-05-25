/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import { createGamesPageRoot } from "./page-root";

describe("games page root", () => {
  it("хранит текущий DOM-root страницы", () => {
    const pageRoot = createGamesPageRoot();
    const root = document.createElement("main");

    expect(pageRoot.getRoot()).toBeNull();

    pageRoot.setRoot(root);

    expect(pageRoot.getRoot()).toBe(root);
  });
});
