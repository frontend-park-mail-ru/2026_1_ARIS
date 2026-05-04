/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getSpeechRecognitionConstructor,
  getSpeechRecognitionLanguage,
  initHeader,
  readSpeechRecognitionResult,
  readSpeechTranscript,
  type SpeechRecognitionLike,
} from "./header";

class MockSpeechRecognition implements SpeechRecognitionLike {
  static instances: MockSpeechRecognition[] = [];

  lang = "";
  interimResults = false;
  maxAlternatives = 0;
  onstart: ((event: Event) => void) | null = null;
  onresult: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onend: ((event: Event) => void) | null = null;
  start = vi.fn(() => this.onstart?.(new Event("start")));
  stop = vi.fn(() => this.onend?.(new Event("end")));
  abort = vi.fn();

  constructor() {
    MockSpeechRecognition.instances.push(this);
  }
}

function createSpeechResultEvent(transcript: string, isFinal = false): Event {
  return Object.assign(new Event("result"), {
    results: {
      length: 1,
      0: {
        length: 1,
        isFinal,
        0: { transcript },
      },
    },
  });
}

describe("header voice search", () => {
  afterEach(() => {
    MockSpeechRecognition.instances = [];
    document.body.innerHTML = "";
    window.history.replaceState({}, "", "/");
    vi.unstubAllGlobals();
  });

  it("находит SpeechRecognition с webkit fallback", () => {
    expect(
      getSpeechRecognitionConstructor({ webkitSpeechRecognition: MockSpeechRecognition }),
    ).toBe(MockSpeechRecognition);
  });

  it("выбирает язык распознавания из браузера, а не из языка интерфейса", () => {
    expect(
      getSpeechRecognitionLanguage({
        navigator: { language: "en-US", languages: ["ru-RU", "en-US"] },
      }),
    ).toBe("ru-RU");

    expect(getSpeechRecognitionLanguage({ navigator: { language: "en-US", languages: [] } })).toBe(
      "en-US",
    );
    expect(getSpeechRecognitionLanguage({})).toBe("ru-RU");
  });

  it("достаёт transcript из события распознавания", () => {
    expect(readSpeechTranscript(createSpeechResultEvent("Софья ARIS"))).toBe("Софья ARIS");
    expect(readSpeechTranscript(new Event("result"))).toBe("");
    expect(readSpeechRecognitionResult(createSpeechResultEvent("ARIS", true))).toEqual({
      transcript: "ARIS",
      isFinal: true,
    });
  });

  it("подставляет голосовой запрос в поле и открывает страницу поиска", () => {
    vi.stubGlobal("webkitSpeechRecognition", MockSpeechRecognition);

    const root = document.createElement("section");
    root.innerHTML = `
      <form data-header-search-box>
        <input data-header-search>
        <button type="button" data-header-voice-search aria-label="Голосовой поиск"></button>
        <span data-header-voice-status aria-live="polite"></span>
      </form>
    `;
    document.body.append(root);

    const popstateListener = vi.fn();
    window.addEventListener("popstate", popstateListener);

    initHeader(root);

    root.querySelector<HTMLButtonElement>("[data-header-voice-search]")?.click();
    const recognition = MockSpeechRecognition.instances[0];
    recognition?.onresult?.(createSpeechResultEvent("сообщества дизайн", true));

    expect(root.querySelector<HTMLInputElement>("[data-header-search]")?.value).toBe(
      "сообщества дизайн",
    );
    expect(recognition?.stop).toHaveBeenCalledTimes(1);
    expect(window.location.pathname).toBe("/search");
    expect(window.location.search).toBe(
      "?q=%D1%81%D0%BE%D0%BE%D0%B1%D1%89%D0%B5%D1%81%D1%82%D0%B2%D0%B0%20%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD",
    );
    expect(popstateListener).toHaveBeenCalledTimes(1);

    window.removeEventListener("popstate", popstateListener);
  });
});
