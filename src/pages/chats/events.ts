/**
 * Обработчики событий страницы чатов.
 *
 * Содержит пользовательские сценарии и реакцию интерфейса на действия пользователя.
 */
import { sendChatMessage, uploadChatVoice } from "../../api/chat";
import { getSessionUser } from "../../state/session";
import { t } from "../../state/i18n";
import { chatsState } from "./state";
import { persistChatsData } from "./storage";
import {
  clearUnreadIncoming,
  ensureMessagesLoaded,
  addPendingOutgoing,
  removePendingOutgoing,
  queueOutgoingForRetry,
  dedupeMessagesById,
  retryChatMessage,
  mapMessageToViewMessage,
} from "./messages";
import {
  refreshChatsPage,
  refreshScrollControls,
  rememberSelectedChatScroll,
  syncSelectedChatPinnedToBottom,
  isSelectedChatPinnedToBottomRef,
  keepSelectedChatPinnedToBottom,
  scrollChatToBottom,
} from "./render";
import {
  sortMessagesByCreatedAt,
  formatMessageTime,
  isOfflineNetworkError,
  getCurrentUserProfilePath,
  syncSelectedChatToUrl,
} from "./helpers";
import { sortThreadsByUpdatedAt, updateThreadPreview } from "./threads";
import {
  VOICE_WAVEFORM_BARS,
  getCachedVoiceWaveform,
  getVoiceWaveformFetchUrl,
  getVoiceWaveformKeys,
  rememberVoiceWaveform,
} from "./voice-waveform";
import type {
  ChatViewMessage,
  ChatViewThread,
  ChatVoiceDraftState,
  ChatVoiceRecordingState,
} from "./types";

const VOICE_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/wav",
] as const;
const VOICE_MAX_DURATION_MS = 10 * 60 * 1000;
const voiceWaveformRequests = new Set<string>();
const voicePlaybackAnimationByAudio = new WeakMap<HTMLAudioElement, number>();

type VoiceSeekState = {
  audio: HTMLAudioElement;
  button: HTMLButtonElement;
  pointerId: number;
};

type VoiceWaveformInfo = {
  heights: number[];
  durationMs: number;
};

function formatVoicePlaybackTime(valueSeconds: number): string {
  if (!Number.isFinite(valueSeconds) || valueSeconds <= 0) {
    return "0:00";
  }

  const totalSeconds = Math.floor(valueSeconds);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatVoicePlaybackRange(currentSeconds: number, durationSeconds: number): string {
  return `${formatVoicePlaybackTime(currentSeconds)} / ${formatVoicePlaybackTime(durationSeconds)}`;
}

function getVoicePlayer(node: Element | null): HTMLElement | null {
  const player = node?.closest("[data-chat-voice-player]");
  return player instanceof HTMLElement ? player : null;
}

function getVoiceAudio(player: HTMLElement): HTMLAudioElement | null {
  const audio = player.querySelector("[data-chat-voice-audio]");
  return audio instanceof HTMLAudioElement ? audio : null;
}

function updateVoicePlayerUi(audio: HTMLAudioElement): void {
  const player = getVoicePlayer(audio);
  if (!player) return;

  const fallbackDurationMs = Number(player.dataset.voiceDurationMs ?? 0);
  const fallbackDuration =
    Number.isFinite(fallbackDurationMs) && fallbackDurationMs > 0 ? fallbackDurationMs / 1000 : 0;
  const duration =
    Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : fallbackDuration;
  const currentTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
  const progress = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
  const time = player.querySelector("[data-chat-voice-time]");

  player.style.setProperty("--voice-progress", `${progress}%`);
  updateVoiceWaveformProgress(player, progress);
  player.classList.toggle("chat-voice--playing", !audio.paused && !audio.ended);

  if (time) {
    time.textContent = formatVoicePlaybackRange(currentTime, duration);
  }
}

function updateVoiceWaveformProgress(player: HTMLElement, progress: number): void {
  const bars = Array.from(player.querySelectorAll<HTMLElement>(".chat-voice__bar"));
  if (!bars.length) return;

  bars.forEach((bar, index) => {
    const barStart = (index / bars.length) * 100;
    const barEnd = ((index + 1) / bars.length) * 100;
    const fill = Math.min(100, Math.max(0, ((progress - barStart) / (barEnd - barStart)) * 100));
    bar.style.setProperty("--voice-bar-progress", `${fill}%`);
  });
}

function stopVoicePlaybackAnimation(audio: HTMLAudioElement): void {
  const animationId = voicePlaybackAnimationByAudio.get(audio);
  if (animationId !== undefined) {
    cancelAnimationFrame(animationId);
    voicePlaybackAnimationByAudio.delete(audio);
  }
}

function startVoicePlaybackAnimation(audio: HTMLAudioElement): void {
  stopVoicePlaybackAnimation(audio);

  const tick = (): void => {
    updateVoicePlayerUi(audio);
    if (!audio.paused && !audio.ended) {
      voicePlaybackAnimationByAudio.set(audio, requestAnimationFrame(tick));
    } else {
      voicePlaybackAnimationByAudio.delete(audio);
    }
  };

  voicePlaybackAnimationByAudio.set(audio, requestAnimationFrame(tick));
}

function applyVoiceWaveform(player: HTMLElement, heights: number[]): void {
  const bars = Array.from(player.querySelectorAll<HTMLElement>(".chat-voice__bar"));
  bars.forEach((bar, index) => {
    const height = heights[index] ?? 8;
    bar.style.height = `${height}px`;
  });
  player.classList.add("chat-voice--waveform-ready");
}

function seekVoiceAudioFromClientX(
  button: HTMLButtonElement,
  audio: HTMLAudioElement,
  clientX: number,
): boolean {
  if (!Number.isFinite(audio.duration) || audio.duration <= 0) return false;

  const rect = button.getBoundingClientRect();
  if (rect.width <= 0) return false;

  const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  audio.currentTime = audio.duration * ratio;
  updateVoicePlayerUi(audio);
  return true;
}

function playVoiceAudioFromSeek(root: Document | HTMLElement, audio: HTMLAudioElement): void {
  pauseOtherVoicePlayers(root, audio);
  void audio
    .play()
    .then(() => {
      updateVoicePlayerUi(audio);
      startVoicePlaybackAnimation(audio);
    })
    .catch(() => {
      updateVoicePlayerUi(audio);
    });
}

function isVoicePointerEvent(event: Event): event is PointerEvent {
  return "pointerId" in event && "clientX" in event;
}

function getAudioContextConstructor(): typeof AudioContext | undefined {
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  );
}

function attachWaveformToVoice(
  voice: ChatViewMessage["voice"],
  heights: number[] | null | undefined,
): ChatViewMessage["voice"] {
  if (!voice) return undefined;
  if (!heights?.length) return voice;
  return { ...voice, waveform: heights };
}

function syncVoiceWaveformToMessages(keys: Array<string | undefined>, heights: number[]): void {
  const keySet = new Set(keys.flatMap((key) => getVoiceWaveformKeys(String(key ?? ""))));
  if (!keySet.size) return;

  let didUpdate = false;
  chatsState.threads.forEach((thread) => {
    thread.messages = thread.messages?.map((message) => {
      const voice = message.voice;
      const voiceUrl = voice?.url;
      if (!voiceUrl) return message;
      const matches = getVoiceWaveformKeys(voiceUrl).some((key) => keySet.has(key));
      if (!matches || voice.waveform?.length) return message;
      didUpdate = true;
      return {
        ...message,
        voice: { ...voice, waveform: heights },
      };
    });
  });

  if (didUpdate) {
    persistChatsData(chatsState.threads);
  }
}

function syncVoiceDurationToMessages(keys: Array<string | undefined>, durationMs: number): void {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return;

  const keySet = new Set(keys.flatMap((key) => getVoiceWaveformKeys(String(key ?? ""))));
  if (!keySet.size) return;

  let didUpdate = false;
  chatsState.threads.forEach((thread) => {
    thread.messages = thread.messages?.map((message) => {
      const voice = message.voice;
      const voiceUrl = voice?.url;
      if (!voiceUrl || voice.durationMs) return message;
      const matches = getVoiceWaveformKeys(voiceUrl).some((key) => keySet.has(key));
      if (!matches) return message;
      didUpdate = true;
      return {
        ...message,
        voice: { ...voice, durationMs },
      };
    });
  });

  if (didUpdate) {
    persistChatsData(chatsState.threads);
  }
}

function applyVoiceDuration(player: HTMLElement, durationMs: number): void {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return;

  player.dataset.voiceDurationMs = String(Math.round(durationMs));
  const audio = getVoiceAudio(player);
  if (audio) updateVoicePlayerUi(audio);
}

function buildWaveformHeights(buffer: AudioBuffer, barsCount: number): number[] {
  const samplesPerBar = Math.max(1, Math.floor(buffer.length / barsCount));
  const values = Array.from({ length: barsCount }, (_unused, index) => {
    const start = index * samplesPerBar;
    const end = Math.min(buffer.length, start + samplesPerBar);
    let peak = 0;
    let sum = 0;
    let samples = 0;

    for (let channelIndex = 0; channelIndex < buffer.numberOfChannels; channelIndex += 1) {
      const channelData = buffer.getChannelData(channelIndex);
      for (let i = start; i < end; i += 1) {
        const sample = Math.abs(channelData[i] ?? 0);
        peak = Math.max(peak, sample);
        sum += sample ** 2;
        samples += 1;
      }
    }

    const rms = Math.sqrt(sum / Math.max(1, samples));
    return peak * 0.78 + rms * 0.22;
  });
  const sortedValues = [...values].sort((left, right) => left - right);
  const referenceIndex = Math.min(sortedValues.length - 1, Math.floor(sortedValues.length * 0.88));
  const referenceValue = Math.max(
    sortedValues[referenceIndex] ?? 0,
    Math.max(...values) * 0.6,
    0.01,
  );

  return values.map((value) => {
    const normalized = Math.min(1, value / referenceValue);
    return Math.max(8, Math.round(8 + normalized ** 0.42 * 34));
  });
}

async function decodeVoiceWaveform(data: ArrayBuffer): Promise<VoiceWaveformInfo | null> {
  const AudioContextCtor = getAudioContextConstructor();
  if (!AudioContextCtor) return null;

  const context = new AudioContextCtor();
  try {
    const buffer = await context.decodeAudioData(data.slice(0));
    return {
      heights: buildWaveformHeights(buffer, VOICE_WAVEFORM_BARS),
      durationMs: buffer.duration * 1000,
    };
  } finally {
    await context.close().catch(() => {});
  }
}

async function buildVoiceWaveformFromBlob(blob: Blob): Promise<number[] | null> {
  try {
    return (await decodeVoiceWaveform(await blob.arrayBuffer()))?.heights ?? null;
  } catch (error) {
    console.info("[chats] source=media scope=voice-waveform local-fallback", error);
    return null;
  }
}

async function loadVoiceWaveform(audio: HTMLAudioElement): Promise<void> {
  const player = getVoicePlayer(audio);
  const src = audio.currentSrc || audio.src;
  if (!player || !src) return;

  const fetchUrl = getVoiceWaveformFetchUrl(src);
  const cached = getCachedVoiceWaveform(src) ?? getCachedVoiceWaveform(fetchUrl);
  if (cached) {
    applyVoiceWaveform(player, cached);
    syncVoiceWaveformToMessages([src, fetchUrl], cached);
    return;
  }

  if (!fetchUrl || voiceWaveformRequests.has(fetchUrl)) return;

  voiceWaveformRequests.add(fetchUrl);
  try {
    const response = await fetch(fetchUrl, { credentials: "include" });
    const waveformInfo = await decodeVoiceWaveform(await response.arrayBuffer());
    if (waveformInfo) {
      rememberVoiceWaveform([src, fetchUrl], waveformInfo.heights);
      applyVoiceWaveform(player, waveformInfo.heights);
      applyVoiceDuration(player, waveformInfo.durationMs);
      syncVoiceWaveformToMessages([src, fetchUrl], waveformInfo.heights);
      syncVoiceDurationToMessages([src, fetchUrl], waveformInfo.durationMs);
    }
  } catch (error) {
    console.info("[chats] source=media scope=voice-waveform fallback", error);
  } finally {
    voiceWaveformRequests.delete(fetchUrl);
  }
}

function pauseOtherVoicePlayers(root: ParentNode, currentAudio: HTMLAudioElement): void {
  root.querySelectorAll<HTMLAudioElement>("[data-chat-voice-audio]").forEach((audio) => {
    if (audio !== currentAudio && !audio.paused) {
      audio.pause();
      stopVoicePlaybackAnimation(audio);
      updateVoicePlayerUi(audio);
    }
  });
}

function hydrateVoicePlayers(root: ParentNode): void {
  root.querySelectorAll<HTMLAudioElement>("[data-chat-voice-audio]").forEach((audio) => {
    const durationMs =
      Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration * 1000 : 0;
    syncVoiceDurationToMessages([audio.currentSrc || audio.src], durationMs);
    updateVoicePlayerUi(audio);
    void loadVoiceWaveform(audio);
  });
}

function getMediaRecorderConstructor(): typeof MediaRecorder | undefined {
  return typeof window.MediaRecorder === "function" ? window.MediaRecorder : undefined;
}

function getSupportedVoiceMimeType(): string {
  const Recorder = getMediaRecorderConstructor();
  if (!Recorder) return "";
  return VOICE_MIME_CANDIDATES.find((mimeType) => Recorder.isTypeSupported(mimeType)) ?? "";
}

function isVoiceRecordingSupported(): boolean {
  return Boolean(
    typeof navigator.mediaDevices?.getUserMedia === "function" && getMediaRecorderConstructor(),
  );
}

function stopVoiceTracks(recording: ChatVoiceRecordingState): void {
  recording.stream.getTracks().forEach((track) => track.stop());
}

function clearVoiceRecording(): ChatVoiceRecordingState | undefined {
  const recording = chatsState.voiceRecording;
  if (!recording) return undefined;
  window.clearInterval(recording.timerId);
  chatsState.voiceRecording = undefined;
  return recording;
}

function clearVoiceDraft(): ChatVoiceDraftState | undefined {
  const draft = chatsState.voiceDraft;
  if (!draft) return undefined;
  URL.revokeObjectURL(draft.localUrl);
  chatsState.voiceDraft = undefined;
  return draft;
}

function getVoiceDurationMs(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio();

    const cleanup = (): void => {
      URL.revokeObjectURL(url);
      audio.removeAttribute("src");
      audio.load();
    };

    audio.preload = "metadata";
    audio.addEventListener(
      "loadedmetadata",
      () => {
        const durationMs =
          Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration * 1000 : 0;
        cleanup();
        resolve(durationMs);
      },
      { once: true },
    );
    audio.addEventListener(
      "error",
      () => {
        cleanup();
        resolve(0);
      },
      { once: true },
    );
    audio.src = url;
  });
}

function getVoiceFilename(mimeType: string): string {
  if (mimeType.includes("mp4")) return "voice-message.m4a";
  if (mimeType.includes("ogg")) return "voice-message.ogg";
  if (mimeType.includes("wav")) return "voice-message.wav";
  return "voice-message.webm";
}

function resolveVoiceBlobType(recording: ChatVoiceRecordingState): string {
  return recording.mimeType || recording.chunks[0]?.type || "audio/webm";
}

async function startVoiceRecording(
  root: Document | HTMLElement,
  thread: ChatViewThread,
): Promise<void> {
  if (thread.source !== "api") {
    chatsState.actionErrorMessage = t("chats.voiceApiOnly");
    refreshChatsPage(root);
    return;
  }

  if (!isVoiceRecordingSupported()) {
    root.querySelector<HTMLInputElement>("[data-chat-voice-file]")?.click();
    return;
  }

  if (chatsState.voiceRecording) {
    await cancelVoiceRecording(root);
  }
  clearVoiceDraft();

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = getSupportedVoiceMimeType();
    const Recorder = getMediaRecorderConstructor();
    if (!Recorder) throw new Error("MediaRecorder is unavailable");

    const recorder = new Recorder(stream, mimeType ? { mimeType } : undefined);
    const startedAt = Date.now();
    const recording: ChatVoiceRecordingState = {
      chatId: thread.id,
      recorder,
      stream,
      chunks: [],
      mimeType,
      startedAt,
      elapsedMs: 0,
      timerId: window.setInterval(() => {
        const activeRecording = chatsState.voiceRecording;
        if (!activeRecording || activeRecording.chatId !== thread.id) return;
        const elapsedMs = Date.now() - activeRecording.startedAt;
        activeRecording.elapsedMs = Math.min(elapsedMs, VOICE_MAX_DURATION_MS);
        if (elapsedMs >= VOICE_MAX_DURATION_MS) {
          void saveVoiceRecordingDraft(root);
          return;
        }
        refreshChatsPage(root);
      }, 100),
    };

    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) recording.chunks.push(event.data);
    });

    recorder.start(1000);
    chatsState.voiceRecording = recording;
    chatsState.actionErrorMessage = "";
    refreshChatsPage(root);
  } catch (error) {
    console.error("[chats] source=media scope=voice-record error", error);
    chatsState.actionErrorMessage = t("chats.voicePermissionError");
    refreshChatsPage(root);
  }
}

async function stopRecorder(recording: ChatVoiceRecordingState): Promise<Blob> {
  return new Promise((resolve) => {
    recording.recorder.addEventListener(
      "stop",
      () => {
        stopVoiceTracks(recording);
        resolve(new Blob(recording.chunks, { type: resolveVoiceBlobType(recording) }));
      },
      { once: true },
    );

    if (recording.recorder.state === "inactive") {
      stopVoiceTracks(recording);
      resolve(new Blob(recording.chunks, { type: resolveVoiceBlobType(recording) }));
      return;
    }

    recording.recorder.stop();
  });
}

async function cancelVoiceRecording(root: Document | HTMLElement): Promise<void> {
  const recording = clearVoiceRecording();
  if (!recording) return;
  if (recording.recorder.state !== "inactive") {
    recording.recorder.stop();
  }
  stopVoiceTracks(recording);
  refreshChatsPage(root);
}

function appendOptimisticVoiceMessage(
  thread: ChatViewThread,
  blob: Blob,
  localUrl: string,
  durationMs: number,
  waveform?: number[] | null,
): ChatViewMessage {
  const currentUser = getSessionUser();
  const optimisticMessage: ChatViewMessage = {
    id: `local-voice-${Date.now()}`,
    text: "",
    authorName: `${currentUser?.firstName ?? "Вы"} ${currentUser?.lastName ?? ""}`.trim(),
    isOwn: true,
    deliveryState: "sending",
    createdAt: new Date().toISOString(),
    avatarLink: currentUser?.avatarLink,
    profilePath: getCurrentUserProfilePath(),
    voice: {
      url: localUrl,
      mimeType: blob.type || "audio/webm",
      durationMs,
      waveform: waveform ?? undefined,
      blob,
    },
  };

  if (!thread.messages) thread.messages = [];
  thread.messages = sortMessagesByCreatedAt([...thread.messages, optimisticMessage]);
  addPendingOutgoing(thread.id, optimisticMessage);
  thread.preview = t("chats.voiceMessage");
  thread.previewIsOwn = true;
  thread.timeLabel = formatMessageTime(optimisticMessage.createdAt);
  thread.updatedAt = optimisticMessage.createdAt;
  sortThreadsByUpdatedAt();
  clearUnreadIncoming(thread.id);
  keepSelectedChatPinnedToBottom();
  queueOutgoingForRetry(thread.id, optimisticMessage);
  persistChatsData(chatsState.threads);

  return optimisticMessage;
}

async function sendVoiceBlob(
  root: Document | HTMLElement,
  thread: ChatViewThread,
  blob: Blob,
  durationMs: number,
): Promise<void> {
  if (thread.source !== "api") {
    chatsState.actionErrorMessage = t("chats.voiceApiOnly");
    refreshChatsPage(root);
    return;
  }

  if (!blob.size) {
    chatsState.actionErrorMessage = t("chats.voiceEmpty");
    refreshChatsPage(root);
    return;
  }

  const resolvedDurationMs = durationMs > 0 ? durationMs : await getVoiceDurationMs(blob);
  const waveformHeights = await buildVoiceWaveformFromBlob(blob);
  const localUrl = URL.createObjectURL(blob);
  if (waveformHeights) {
    rememberVoiceWaveform([localUrl], waveformHeights);
    syncVoiceWaveformToMessages([localUrl], waveformHeights);
  }

  const optimisticMessage = appendOptimisticVoiceMessage(
    thread,
    blob,
    localUrl,
    resolvedDurationMs,
    waveformHeights,
  );
  chatsState.actionErrorMessage = "";
  refreshChatsPage(root);

  try {
    const uploaded = await uploadChatVoice(blob, getVoiceFilename(blob.type));
    if (optimisticMessage.voice) {
      optimisticMessage.voice.mediaID = uploaded.mediaID;
    }
    const sentMessage = await sendChatMessage(thread.id, {
      media: [{ mediaID: uploaded.mediaID }],
    });
    const sentViewMessage = mapMessageToViewMessage(sentMessage, thread);
    const nextVoiceUrl = sentViewMessage.voice?.url ?? uploaded.mediaURL;
    if (waveformHeights) {
      rememberVoiceWaveform([uploaded.mediaURL, nextVoiceUrl], waveformHeights);
      syncVoiceWaveformToMessages([uploaded.mediaURL, nextVoiceUrl], waveformHeights);
    }

    thread.messages = sortMessagesByCreatedAt(
      dedupeMessagesById(
        (thread.messages ?? []).map((m) =>
          m.id === optimisticMessage.id
            ? {
                ...sentViewMessage,
                deliveryState: undefined,
                voice: attachWaveformToVoice(
                  sentViewMessage.voice
                    ? {
                        ...sentViewMessage.voice,
                        durationMs:
                          sentViewMessage.voice.durationMs ??
                          m.voice?.durationMs ??
                          resolvedDurationMs,
                      }
                    : {
                        mediaID: uploaded.mediaID,
                        url: uploaded.mediaURL,
                        mimeType: blob.type || "audio/webm",
                        durationMs: resolvedDurationMs,
                      },
                  m.voice?.waveform ?? waveformHeights,
                ),
              }
            : m,
        ),
      ),
    );
    removePendingOutgoing(thread.id, optimisticMessage.id);
    updateThreadPreview(thread);
    sortThreadsByUpdatedAt();
    persistChatsData(chatsState.threads);
    URL.revokeObjectURL(localUrl);
    refreshChatsPage(root);
  } catch (error) {
    console.error("[chats] source=api scope=voice-send error", error);
    thread.messages = (thread.messages ?? []).map((m) =>
      m.id === optimisticMessage.id ? { ...m, deliveryState: "failed" as const } : m,
    );
    queueOutgoingForRetry(thread.id, { ...optimisticMessage, deliveryState: "failed" });
    chatsState.actionErrorMessage = isOfflineNetworkError(error)
      ? "Нет соединения с интернетом."
      : error instanceof Error
        ? error.message
        : t("chats.voiceSendError");
    keepSelectedChatPinnedToBottom();
    updateThreadPreview(thread);
    sortThreadsByUpdatedAt();
    persistChatsData(chatsState.threads);
    refreshChatsPage(root);
  }
}

async function finishVoiceRecording(root: Document | HTMLElement): Promise<void> {
  const recording = clearVoiceRecording();
  if (!recording) return;
  const thread = chatsState.threads.find((t) => t.id === recording.chatId);
  const durationMs = Math.min(
    VOICE_MAX_DURATION_MS,
    Math.max(recording.elapsedMs, Date.now() - recording.startedAt),
  );
  const blob = await stopRecorder(recording);
  refreshChatsPage(root);
  if (thread) {
    await sendVoiceBlob(root, thread, blob, durationMs);
  }
}

async function saveVoiceRecordingDraft(root: Document | HTMLElement): Promise<void> {
  const recording = clearVoiceRecording();
  if (!recording) return;

  const durationMs = Math.min(
    VOICE_MAX_DURATION_MS,
    Math.max(recording.elapsedMs, Date.now() - recording.startedAt),
  );
  const blob = await stopRecorder(recording);
  if (!blob.size) {
    chatsState.actionErrorMessage = t("chats.voiceEmpty");
    refreshChatsPage(root);
    return;
  }

  clearVoiceDraft();
  chatsState.voiceDraft = {
    chatId: recording.chatId,
    blob,
    localUrl: URL.createObjectURL(blob),
    mimeType: blob.type || resolveVoiceBlobType(recording),
    durationMs,
  };
  chatsState.actionErrorMessage = "";
  refreshChatsPage(root);
}

async function sendVoiceFile(root: Document | HTMLElement, file: File): Promise<void> {
  const thread = chatsState.threads.find((t) => t.id === chatsState.selectedChatId);
  if (!thread || !file) return;
  await sendVoiceBlob(root, thread, file, 0);
}

async function sendVoiceDraft(root: Document | HTMLElement): Promise<void> {
  const draft = chatsState.voiceDraft;
  if (!draft) return;
  const thread = chatsState.threads.find((t) => t.id === draft.chatId);
  if (!thread) return;

  chatsState.voiceDraft = undefined;
  URL.revokeObjectURL(draft.localUrl);
  await sendVoiceBlob(root, thread, draft.blob, draft.durationMs);
}

function cancelVoiceDraft(root: Document | HTMLElement): void {
  clearVoiceDraft();
  refreshChatsPage(root);
}

export function bindChatsEvents(root: Document | HTMLElement): void {
  let activeVoiceSeek: VoiceSeekState | null = null;

  root.addEventListener("input", (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    if (target.matches("[data-chat-search]")) {
      chatsState.query = target.value;
      refreshChatsPage(root);
      return;
    }

    if (target.matches(".chat-compose__field") && chatsState.selectedChatId) {
      chatsState.composeDraftByChatId.set(chatsState.selectedChatId, target.value);
    }
  });

  root.addEventListener("change", (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || !target.matches("[data-chat-voice-file]")) return;

    const file = target.files?.[0];
    target.value = "";
    if (!file) return;

    void sendVoiceFile(root, file);
  });

  root.addEventListener("pointerdown", (event: Event) => {
    if (!isVoicePointerEvent(event)) return;

    const target = event.target;
    if (!(target instanceof Element)) return;

    const voiceSeekButton = target.closest("[data-chat-voice-seek]");
    if (!(voiceSeekButton instanceof HTMLButtonElement)) return;

    const player = getVoicePlayer(voiceSeekButton);
    const audio = player ? getVoiceAudio(player) : null;
    if (!audio) return;

    event.preventDefault();
    activeVoiceSeek = {
      audio,
      button: voiceSeekButton,
      pointerId: event.pointerId,
    };
    voiceSeekButton.setPointerCapture(event.pointerId);

    const shouldKeepPlaying = !audio.paused && !audio.ended;
    if (seekVoiceAudioFromClientX(voiceSeekButton, audio, event.clientX) && shouldKeepPlaying) {
      playVoiceAudioFromSeek(root, audio);
    }
  });

  root.addEventListener("pointermove", (event: Event) => {
    if (!isVoicePointerEvent(event)) return;
    if (!activeVoiceSeek || activeVoiceSeek.pointerId !== event.pointerId) return;

    event.preventDefault();
    seekVoiceAudioFromClientX(activeVoiceSeek.button, activeVoiceSeek.audio, event.clientX);
  });

  root.addEventListener("pointerup", (event: Event) => {
    if (!isVoicePointerEvent(event)) return;
    if (!activeVoiceSeek || activeVoiceSeek.pointerId !== event.pointerId) return;

    activeVoiceSeek.button.releasePointerCapture(event.pointerId);
    activeVoiceSeek = null;
  });

  root.addEventListener("pointercancel", (event: Event) => {
    if (!isVoicePointerEvent(event)) return;
    if (!activeVoiceSeek || activeVoiceSeek.pointerId !== event.pointerId) return;

    activeVoiceSeek.button.releasePointerCapture(event.pointerId);
    activeVoiceSeek = null;
  });

  root.addEventListener("click", (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const scrollBottomButton = target.closest("[data-chat-scroll-bottom]");
    if (scrollBottomButton instanceof HTMLButtonElement) {
      if (chatsState.selectedChatId) clearUnreadIncoming(chatsState.selectedChatId);
      keepSelectedChatPinnedToBottom();
      persistChatsData(chatsState.threads);
      refreshChatsPage(root);
      requestAnimationFrame(() => {
        scrollChatToBottom(root);
        rememberSelectedChatScroll(root);
      });
      return;
    }

    const mobileBackButton = target.closest("[data-chat-mobile-back]");
    if (mobileBackButton instanceof HTMLButtonElement) {
      chatsState.mobileView = "list";
      syncSelectedChatToUrl("");
      rememberSelectedChatScroll(root);
      refreshChatsPage(root);
      return;
    }

    const chatButton = target.closest("[data-chat-select]");
    if (chatButton instanceof HTMLButtonElement) {
      const chatId = chatButton.getAttribute("data-chat-select");
      if (!chatId) return;

      if (chatId === chatsState.selectedChatId) {
        chatsState.mobileView = "dialog";
        syncSelectedChatToUrl(chatId);
        refreshChatsPage(root);
        return;
      }

      chatsState.selectedChatId = chatId;
      chatsState.mobileView = "dialog";
      clearUnreadIncoming(chatId);
      keepSelectedChatPinnedToBottom();
      persistChatsData(chatsState.threads);
      syncSelectedChatToUrl(chatId);
      refreshChatsPage(root);
      void ensureMessagesLoaded(chatId).then(() => refreshChatsPage(root));
      return;
    }

    const voiceRecordButton = target.closest("[data-chat-voice-record]");
    if (voiceRecordButton instanceof HTMLButtonElement) {
      const selectedThread = chatsState.threads.find((t) => t.id === chatsState.selectedChatId);
      if (!selectedThread) return;
      void startVoiceRecording(root, selectedThread);
      return;
    }

    const voiceCancelButton = target.closest("[data-chat-voice-cancel]");
    if (voiceCancelButton instanceof HTMLButtonElement) {
      void cancelVoiceRecording(root);
      return;
    }

    const voiceSendButton = target.closest("[data-chat-voice-send]");
    if (voiceSendButton instanceof HTMLButtonElement) {
      void finishVoiceRecording(root);
      return;
    }

    const voiceDraftCancelButton = target.closest("[data-chat-voice-draft-cancel]");
    if (voiceDraftCancelButton instanceof HTMLButtonElement) {
      cancelVoiceDraft(root);
      return;
    }

    const voiceDraftSendButton = target.closest("[data-chat-voice-draft-send]");
    if (voiceDraftSendButton instanceof HTMLButtonElement) {
      void sendVoiceDraft(root);
      return;
    }

    const voiceToggleButton = target.closest("[data-chat-voice-toggle]");
    if (voiceToggleButton instanceof HTMLButtonElement) {
      const player = getVoicePlayer(voiceToggleButton);
      const audio = player ? getVoiceAudio(player) : null;
      if (!audio) return;

      if (audio.paused) {
        pauseOtherVoicePlayers(root, audio);
        void audio.play().then(() => {
          updateVoicePlayerUi(audio);
          startVoicePlaybackAnimation(audio);
        });
      } else {
        audio.pause();
        stopVoicePlaybackAnimation(audio);
        updateVoicePlayerUi(audio);
      }
      return;
    }

    const voiceSeekButton = target.closest("[data-chat-voice-seek]");
    if (voiceSeekButton instanceof HTMLButtonElement) {
      const player = getVoicePlayer(voiceSeekButton);
      const audio = player ? getVoiceAudio(player) : null;
      if (!audio) return;

      const pointerEvent = event instanceof MouseEvent ? event : null;
      const shouldKeepPlaying = !audio.paused && !audio.ended;
      if (
        pointerEvent?.detail &&
        seekVoiceAudioFromClientX(voiceSeekButton, audio, pointerEvent.clientX) &&
        shouldKeepPlaying
      ) {
        playVoiceAudioFromSeek(root, audio);
      }
      return;
    }

    const retryButton = target.closest("[data-chat-retry-message]");
    if (retryButton instanceof HTMLButtonElement && chatsState.selectedChatId) {
      const localMessageId = retryButton.getAttribute("data-chat-retry-message");
      if (!localMessageId) return;
      void retryChatMessage(chatsState.selectedChatId, localMessageId);
      return;
    }
  });

  root.addEventListener(
    "scroll",
    (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !target.classList.contains("chat-messages")) return;

      const wasPinnedToBottom = isSelectedChatPinnedToBottomRef();
      syncSelectedChatPinnedToBottom(root);
      rememberSelectedChatScroll(root);

      if (wasPinnedToBottom !== isSelectedChatPinnedToBottomRef()) {
        refreshScrollControls(root);
        return;
      }

      if (chatsState.selectedChatId && isSelectedChatPinnedToBottomRef()) {
        if (chatsState.unreadIncomingIdsByChatId.get(chatsState.selectedChatId)?.size) {
          clearUnreadIncoming(chatsState.selectedChatId);
          refreshChatsPage(root);
        }
      }
    },
    true,
  );

  root.addEventListener(
    "loadedmetadata",
    (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLAudioElement && target.matches("[data-chat-voice-audio]")) {
        const durationMs =
          Number.isFinite(target.duration) && target.duration > 0 ? target.duration * 1000 : 0;
        const player = getVoicePlayer(target);
        if (player) applyVoiceDuration(player, durationMs);
        syncVoiceDurationToMessages([target.currentSrc || target.src], durationMs);
        updateVoicePlayerUi(target);
        void loadVoiceWaveform(target);
      }
    },
    true,
  );

  root.addEventListener(
    "timeupdate",
    (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLAudioElement && target.matches("[data-chat-voice-audio]")) {
        updateVoicePlayerUi(target);
      }
    },
    true,
  );

  root.addEventListener(
    "play",
    (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLAudioElement && target.matches("[data-chat-voice-audio]")) {
        pauseOtherVoicePlayers(root, target);
        updateVoicePlayerUi(target);
        startVoicePlaybackAnimation(target);
      }
    },
    true,
  );

  root.addEventListener(
    "pause",
    (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLAudioElement && target.matches("[data-chat-voice-audio]")) {
        stopVoicePlaybackAnimation(target);
        updateVoicePlayerUi(target);
      }
    },
    true,
  );

  root.addEventListener(
    "ended",
    (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLAudioElement && target.matches("[data-chat-voice-audio]")) {
        stopVoicePlaybackAnimation(target);
        target.currentTime = 0;
        updateVoicePlayerUi(target);
      }
    },
    true,
  );

  root.addEventListener("submit", (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLFormElement) || !target.matches("[data-chat-compose-form]")) return;

    event.preventDefault();

    const selectedThread = chatsState.threads.find((t) => t.id === chatsState.selectedChatId);
    if (!selectedThread) return;

    const formData = new FormData(target);
    const text = String(formData.get("message") ?? "").trim();
    if (!text) return;

    chatsState.actionErrorMessage = "";

    const currentUser = getSessionUser();
    const optimisticMessage = {
      id: `local-${Date.now()}`,
      text,
      authorName: `${currentUser?.firstName ?? "Вы"} ${currentUser?.lastName ?? ""}`.trim(),
      isOwn: true,
      deliveryState: "sending" as const,
      createdAt: new Date().toISOString(),
      avatarLink: currentUser?.avatarLink,
      profilePath: getCurrentUserProfilePath(),
    };

    if (!selectedThread.messages) selectedThread.messages = [];
    selectedThread.messages = sortMessagesByCreatedAt([
      ...selectedThread.messages,
      optimisticMessage,
    ]);
    addPendingOutgoing(selectedThread.id, optimisticMessage);
    selectedThread.preview = text;
    selectedThread.previewIsOwn = true;
    selectedThread.timeLabel = formatMessageTime(optimisticMessage.createdAt);
    selectedThread.updatedAt = optimisticMessage.createdAt;
    sortThreadsByUpdatedAt();
    clearUnreadIncoming(selectedThread.id);
    keepSelectedChatPinnedToBottom();
    queueOutgoingForRetry(selectedThread.id, optimisticMessage);
    persistChatsData(chatsState.threads);
    chatsState.composeDraftByChatId.set(selectedThread.id, "");
    target.reset();
    refreshChatsPage(root);
    requestAnimationFrame(() => {
      root.querySelector<HTMLInputElement>(".chat-compose__field")?.focus();
    });

    if (selectedThread.source !== "api") return;

    void sendChatMessage(selectedThread.id, { text })
      .then((message) => {
        console.info("[chats] source=api scope=send", {
          chatId: selectedThread.id,
          messageId: message.id,
        });

        selectedThread.messages = sortMessagesByCreatedAt(
          dedupeMessagesById(
            (selectedThread.messages ?? []).map((m) =>
              m.id === optimisticMessage.id
                ? {
                    ...m,
                    id: message.id,
                    deliveryState: undefined,
                    createdAt: message.createdAt,
                    profilePath: getCurrentUserProfilePath(),
                  }
                : m,
            ),
          ),
        );
        removePendingOutgoing(selectedThread.id, optimisticMessage.id);
        updateThreadPreview(selectedThread);
        sortThreadsByUpdatedAt();
        persistChatsData(chatsState.threads);
        refreshChatsPage(root);
        requestAnimationFrame(() => {
          root.querySelector<HTMLInputElement>(".chat-compose__field")?.focus();
        });
      })
      .catch((error: unknown) => {
        console.error("[chats] source=api scope=send error", error);
        selectedThread.messages = (selectedThread.messages ?? []).map((m) =>
          m.id === optimisticMessage.id ? { ...m, deliveryState: "failed" as const } : m,
        );
        queueOutgoingForRetry(selectedThread.id, { ...optimisticMessage, deliveryState: "failed" });
        keepSelectedChatPinnedToBottom();
        updateThreadPreview(selectedThread);
        sortThreadsByUpdatedAt();
        persistChatsData(chatsState.threads);
        refreshChatsPage(root);
        if (isOfflineNetworkError(error)) {
          console.info("[chats] source=api scope=send deferred-offline", {
            chatId: selectedThread.id,
            localId: optimisticMessage.id,
          });
        }
        requestAnimationFrame(() => {
          root.querySelector<HTMLInputElement>(".chat-compose__field")?.focus();
        });
      });
  });

  hydrateVoicePlayers(root);
}
