import { describe, expect, it } from "vitest";
import type { GamesDomRefreshOptions } from "./dom-refresh";
import { createDeferredDomRefreshOptions } from "./deferred-dom-refresh-options";

describe("deferred dom refresh options", () => {
  it("бросает ошибку до инициализации reader", () => {
    const deferred = createDeferredDomRefreshOptions();

    expect(() => deferred.getDomRefreshOptions()).toThrow(
      "DOM refresh options reader is not initialized.",
    );
  });

  it("возвращает options из установленного reader", () => {
    const deferred = createDeferredDomRefreshOptions();
    const options = { root: null } as GamesDomRefreshOptions;

    deferred.setDomRefreshOptionsReader(() => options);

    expect(deferred.getDomRefreshOptions()).toBe(options);
  });
});
