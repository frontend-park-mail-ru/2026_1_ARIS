/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryStorage } from "../test-utils/storage";
import { canViewAdminPanel, getSessionRole, isAdmin, isL2Agent, isSupportAgent } from "./role";
import { clearSessionUser, sessionStore, setSessionUser } from "./session";

describe("role helpers", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryStorage());
    sessionStore.reset({ user: null, feedMode: "by-time" });
  });

  afterEach(() => {
    clearSessionUser();
    vi.unstubAllGlobals();
    sessionStore.reset({ user: null, feedMode: "by-time" });
  });

  it("считает гостя обычным пользователем", () => {
    expect(getSessionRole()).toBe("user");
    expect(isAdmin()).toBe(false);
    expect(isSupportAgent()).toBe(false);
    expect(isL2Agent()).toBe(false);
    expect(canViewAdminPanel()).toBe(false);
  });

  it("распознаёт роли поддержки и администратора", () => {
    setSessionUser({ id: "1", firstName: "L1", lastName: "Agent", role: "support_l1" });
    expect(isSupportAgent()).toBe(true);
    expect(isL2Agent()).toBe(false);

    setSessionUser({ id: "2", firstName: "L2", lastName: "Agent", role: "support_l2" });
    expect(isSupportAgent()).toBe(true);
    expect(isL2Agent()).toBe(true);

    setSessionUser({ id: "3", firstName: "Admin", lastName: "Root", role: "admin" });
    expect(getSessionRole()).toBe("admin");
    expect(isAdmin()).toBe(true);
    expect(isSupportAgent()).toBe(true);
    expect(isL2Agent()).toBe(true);
    expect(canViewAdminPanel()).toBe(true);
  });
});
