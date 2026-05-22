export const VOICE_WAVEFORM_BARS = 48;

const voiceWaveformCache = new Map<string, number[]>();

export function getVoiceWaveformFetchUrl(src: string): string {
  if (!src) return "";
  if (src.startsWith("blob:") || src.startsWith("data:")) return src;

  try {
    const parsed = new URL(src, window.location.origin);
    if (
      parsed.origin === "http://localhost:8080" &&
      (parsed.pathname.startsWith("/media/") || parsed.pathname === "/media")
    ) {
      return `${parsed.pathname}${parsed.search}`;
    }
    return parsed.href;
  } catch {
    return src;
  }
}

export function getVoiceWaveformKeys(src: string): string[] {
  const value = src.trim();
  const fetchUrl = getVoiceWaveformFetchUrl(value);
  return Array.from(new Set([value, fetchUrl].filter(Boolean)));
}

export function rememberVoiceWaveform(keys: Array<string | undefined>, heights: number[]): void {
  keys
    .flatMap((key) => getVoiceWaveformKeys(String(key ?? "")))
    .forEach((key) => {
      voiceWaveformCache.set(key, heights);
    });
}

export function getCachedVoiceWaveform(src: string | undefined): number[] | undefined {
  const keys = getVoiceWaveformKeys(String(src ?? ""));
  for (const key of keys) {
    const cached = voiceWaveformCache.get(key);
    if (cached?.length) return cached;
  }
  return undefined;
}
