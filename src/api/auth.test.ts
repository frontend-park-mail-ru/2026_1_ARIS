import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./core/client";
import {
  ApiError,
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  validateRegisterStepOne,
} from "./auth";

vi.mock("./core/client", () => {
  class MockApiError extends Error {
    status: number;
    data: unknown;

    constructor(message: string, status: number, data: unknown) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.data = data;
    }
  }

  return {
    ApiError: MockApiError,
    apiRequest: vi.fn(),
  };
});

describe("auth api", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("loginUser отправляет credentials и нормализует пользователя", async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      id: 7,
      firstName: " Софья ",
      lastName: " Ситниченко ",
      username: "sofia",
      avatar: "/media/a.png",
      role: "support_l2",
    });

    await expect(loginUser({ login: "sofia", password: "secret" })).resolves.toEqual({
      id: "7",
      firstName: "Софья",
      lastName: "Ситниченко",
      login: "sofia",
      avatarLink: "/media/a.png",
      role: "support_l2",
    });
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/auth/login",
      { method: "POST", body: { login: "sofia", password: "secret" } },
      {},
    );
  });

  it("registerUser возвращает пустого пользователя при некорректном payload", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ id: 0 });

    await expect(
      registerUser({
        firstName: "A",
        lastName: "B",
        birthday: "01/01/2000",
        gender: 1,
        login: "ab",
        password1: "secret",
        password2: "secret",
      }),
    ).resolves.toEqual({ id: "", firstName: "", lastName: "" });
  });

  it("getCurrentUser возвращает null на ApiError и пробрасывает неизвестные ошибки", async () => {
    vi.mocked(apiRequest).mockRejectedValueOnce(new ApiError("unauthorized", 401, {}));

    await expect(getCurrentUser()).resolves.toBeNull();

    vi.mocked(apiRequest).mockRejectedValueOnce(new TypeError("network"));

    await expect(getCurrentUser()).rejects.toThrow("network");
  });

  it("logoutUser и validateRegisterStepOne вызывают нужные endpoints", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce(undefined).mockResolvedValueOnce({ ok: true });

    await logoutUser();
    await expect(
      validateRegisterStepOne({ login: "demo", password1: "secret", password2: "secret" }),
    ).resolves.toEqual({ ok: true });

    expect(apiRequest).toHaveBeenNthCalledWith(1, "/api/auth/logout", { method: "POST" });
    expect(apiRequest).toHaveBeenNthCalledWith(
      2,
      "/api/auth/register/step-one",
      {
        method: "POST",
        body: { login: "demo", password1: "secret", password2: "secret" },
      },
      {},
    );
  });
});
