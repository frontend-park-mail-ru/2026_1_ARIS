import { afterEach, describe, expect, it, vi } from "vitest";
import { languageStore } from "../../state/language";
import { trackedFetch } from "../../state/network-status";
import { captureAppException } from "../../utils/sentry";
import {
  ApiError,
  apiPost,
  apiRequest,
  buildApiUrl,
  createApiError,
  parseJson,
  parseResponseBody,
} from "./client";

vi.mock("../../state/network-status", () => ({
  trackedFetch: vi.fn(),
}));

vi.mock("../../utils/sentry", () => ({
  captureAppException: vi.fn(),
}));

function jsonResponse(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json", ...(init.headers as Record<string, string>) },
  });
}

describe("api core client", () => {
  afterEach(() => {
    vi.clearAllMocks();
    languageStore.reset({ language: "RU" });
  });

  it("parseJson возвращает fallback для пустого тела", async () => {
    await expect(parseJson(new Response(""), { ok: true })).resolves.toEqual({ ok: true });
  });

  it("parseJson превращает невалидный JSON в error payload", async () => {
    await expect(parseJson(new Response("backend down"), {})).resolves.toEqual({
      error: "backend down",
    });
  });

  it("createApiError берёт сообщение из error-поля", () => {
    const error = createApiError("fallback", 400, { error: "bad request" });

    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe("bad request");
    expect(error.status).toBe(400);
    expect(error.data).toEqual({ error: "bad request" });
  });

  it("buildApiUrl добавляет query-параметры и пропускает пустые значения", () => {
    expect(
      buildApiUrl("/api/demo?exists=1", {
        q: "test",
        page: 2,
        empty: "",
        skipped: undefined,
        tag: ["one", "two"],
      }),
    ).toBe("/api/demo?exists=1&q=test&page=2&tag=one&tag=two");
  });

  it("parseResponseBody разбирает не-JSON форматы", async () => {
    await expect(parseResponseBody(new Response("hello"), "text", "")).resolves.toBe("hello");

    const buffer = await parseResponseBody<ArrayBuffer>(
      new Response(new Uint8Array([1, 2, 3])),
      "arrayBuffer",
      new ArrayBuffer(0),
    );

    expect(Array.from(new Uint8Array(buffer))).toEqual([1, 2, 3]);
  });

  it("apiRequest сериализует object body в JSON", async () => {
    vi.mocked(trackedFetch).mockResolvedValue(jsonResponse({ id: 1 }));

    await expect(
      apiRequest("/api/demo", { method: "POST", body: { title: "Hello" } }),
    ).resolves.toEqual({
      id: 1,
    });

    expect(trackedFetch).toHaveBeenCalledWith("/api/demo", {
      method: "POST",
      credentials: "include",
      body: JSON.stringify({ title: "Hello" }),
      headers: { "Accept-Language": "ru", "Content-Type": "application/json" },
    });
  });

  it("apiRequest не перезаписывает BodyInit и переданные headers", async () => {
    vi.mocked(trackedFetch).mockResolvedValue(jsonResponse({ ok: true }));
    const body = new URLSearchParams({ q: "test" });

    await apiRequest("/api/search", {
      method: "POST",
      body,
      headers: { "X-Test": "1" },
    });

    expect(trackedFetch).toHaveBeenCalledWith("/api/search", {
      method: "POST",
      credentials: "include",
      body,
      headers: { "Accept-Language": "ru", "X-Test": "1" },
    });
  });

  it("apiRequest передаёт query, responseType и keepalive", async () => {
    vi.mocked(trackedFetch).mockResolvedValue(new Response("ok"));

    await expect(
      apiRequest("/api/ping", {
        method: "POST",
        query: { source: "test" },
        responseType: "text",
        keepalive: true,
      }),
    ).resolves.toBe("ok");

    expect(trackedFetch).toHaveBeenCalledWith("/api/ping?source=test", {
      method: "POST",
      credentials: "include",
      keepalive: true,
      headers: { "Accept-Language": "ru" },
    });
  });

  it("apiPost использует единый клиент", async () => {
    vi.mocked(trackedFetch).mockResolvedValue(jsonResponse({ id: 7 }));

    await expect(apiPost("/api/demo", { title: "Hello" })).resolves.toEqual({ id: 7 });

    expect(trackedFetch).toHaveBeenCalledWith("/api/demo", {
      method: "POST",
      credentials: "include",
      body: JSON.stringify({ title: "Hello" }),
      headers: { "Accept-Language": "ru", "Content-Type": "application/json" },
    });
  });

  it("дедуплицирует одновременные GET-запросы без AbortSignal", async () => {
    vi.mocked(trackedFetch).mockResolvedValue(jsonResponse({ ok: true }));

    const first = apiRequest("/api/shared");
    const second = apiRequest("/api/shared");

    await expect(Promise.all([first, second])).resolves.toEqual([{ ok: true }, { ok: true }]);
    expect(trackedFetch).toHaveBeenCalledTimes(1);
  });

  it("не смешивает дедупликацию GET-запросов с разными языками интерфейса", async () => {
    vi.mocked(trackedFetch)
      .mockResolvedValueOnce(jsonResponse({ language: "ru" }))
      .mockResolvedValueOnce(jsonResponse({ language: "en" }));

    const first = apiRequest("/api/shared");
    languageStore.reset({ language: "EN" });
    const second = apiRequest("/api/shared");

    await expect(Promise.all([first, second])).resolves.toEqual([
      { language: "ru" },
      { language: "en" },
    ]);
    expect(trackedFetch).toHaveBeenCalledTimes(2);
    expect(trackedFetch).toHaveBeenNthCalledWith(
      1,
      "/api/shared",
      expect.objectContaining({ headers: { "Accept-Language": "ru" } }),
    );
    expect(trackedFetch).toHaveBeenNthCalledWith(
      2,
      "/api/shared",
      expect.objectContaining({ headers: { "Accept-Language": "en" } }),
    );
  });

  it("не дедуплицирует запросы с AbortSignal", async () => {
    vi.mocked(trackedFetch)
      .mockResolvedValueOnce(jsonResponse({ ok: true }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    const signal = new AbortController().signal;

    await Promise.all([
      apiRequest("/api/signal", { signal }),
      apiRequest("/api/signal", { signal }),
    ]);

    expect(trackedFetch).toHaveBeenCalledTimes(2);
  });

  it("бросает ApiError и репортит 5xx", async () => {
    vi.mocked(trackedFetch).mockResolvedValue(
      jsonResponse({ error: "server exploded" }, { status: 503 }),
    );

    await expect(apiRequest("/api/fail")).rejects.toMatchObject({
      message: "server exploded",
      status: 503,
    });
    expect(captureAppException).toHaveBeenCalledTimes(1);
  });
});
