/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { bindChatsEvents } from "./events";

function defineVideoNumberProperty(
  video: HTMLVideoElement,
  property: "currentTime" | "duration",
  initialValue: number,
): () => number {
  let value = initialValue;
  Object.defineProperty(video, property, {
    configurable: true,
    get: () => value,
    set: (nextValue: number) => {
      value = nextValue;
    },
  });
  return () => value;
}

describe("chat video note events", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("перезапускает видеокружочек после завершения", async () => {
    const root = document.createElement("div");
    root.innerHTML = `
      <div class="video-note" data-chat-video-note data-video-note-state="unplayed">
        <svg viewBox="0 0 120 120">
          <circle data-video-note-ring stroke-dasharray="339.29" stroke-dashoffset="339.29"></circle>
        </svg>
        <video data-video-note-video muted></video>
        <span data-video-note-duration></span>
      </div>
    `;

    const note = root.querySelector<HTMLElement>("[data-chat-video-note]");
    const video = root.querySelector<HTMLVideoElement>("[data-video-note-video]");
    expect(note).not.toBeNull();
    expect(video).not.toBeNull();
    if (!note || !video) return;

    let paused = true;
    let ended = false;
    Object.defineProperty(video, "paused", { configurable: true, get: () => paused });
    Object.defineProperty(video, "ended", { configurable: true, get: () => ended });
    const getCurrentTime = defineVideoNumberProperty(video, "currentTime", 12);
    defineVideoNumberProperty(video, "duration", 12);

    const play = vi.spyOn(video, "play").mockImplementation(() => {
      paused = false;
      ended = false;
      video.dispatchEvent(new Event("play", { bubbles: true }));
      return Promise.resolve();
    });
    vi.spyOn(video, "pause").mockImplementation(() => {
      paused = true;
      video.dispatchEvent(new Event("pause", { bubbles: true }));
    });
    vi.spyOn(video, "load").mockImplementation(() => undefined);

    bindChatsEvents(root);

    note.click();
    await Promise.resolve();
    expect(play).toHaveBeenCalledTimes(1);
    expect(note.classList.contains("video-note--expanded")).toBe(true);
    expect(video.muted).toBe(false);

    paused = true;
    ended = true;
    video.currentTime = 12;
    video.dispatchEvent(new Event("ended", { bubbles: true }));
    expect(note.classList.contains("video-note--expanded")).toBe(false);
    expect(getCurrentTime()).toBe(0);
    expect(video.muted).toBe(true);

    note.click();
    await Promise.resolve();

    expect(play).toHaveBeenCalledTimes(2);
    expect(getCurrentTime()).toBe(0);
    expect(video.muted).toBe(false);
    expect(note.classList.contains("video-note--expanded")).toBe(true);
  });

  it("обновляет длительность после загрузки metadata без клика по кружочку", () => {
    const root = document.createElement("div");
    root.innerHTML = `
      <div class="video-note" data-chat-video-note data-video-note-state="unplayed">
        <svg viewBox="0 0 120 120">
          <circle data-video-note-ring stroke-dasharray="339.29" stroke-dashoffset="339.29"></circle>
        </svg>
        <video data-video-note-video muted></video>
        <span data-video-note-duration></span>
      </div>
    `;

    const video = root.querySelector<HTMLVideoElement>("[data-video-note-video]");
    const duration = root.querySelector<HTMLElement>("[data-video-note-duration]");
    expect(video).not.toBeNull();
    expect(duration).not.toBeNull();
    if (!video || !duration) return;

    let durationSeconds = 0;
    Object.defineProperty(video, "duration", {
      configurable: true,
      get: () => durationSeconds,
    });
    defineVideoNumberProperty(video, "currentTime", 0);
    const load = vi.spyOn(video, "load").mockImplementation(() => undefined);

    bindChatsEvents(root);

    expect(video.preload).toBe("metadata");
    expect(load).toHaveBeenCalledTimes(1);
    expect(duration.textContent).toBe("0:00");

    durationSeconds = 7.8;
    video.dispatchEvent(new Event("durationchange", { bubbles: true }));

    expect(duration.textContent).toBe("0:07");
  });
});
