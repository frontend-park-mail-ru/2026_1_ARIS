type AvatarOptions = {
  width?: number;
  height?: number;
  loading?: "eager" | "lazy";
};

const EMPTY_AVATAR_VALUES = new Set(["", "null", "undefined", "none"]);
const brokenAvatarSrcSet = new Set<string>();
const loadedAvatarSrcSet = new Set<string>();

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function getAvatarInitials(name: string): string {
  const cleaned = name.replace(/^@+/, "").trim().split(/\s+/).filter(Boolean);

  if (!cleaned.length) {
    return "AR";
  }

  if (cleaned.length === 1) {
    return (cleaned[0] ?? "AR").slice(0, 2).toUpperCase();
  }

  return `${cleaned[0]?.[0] ?? ""}${cleaned[1]?.[0] ?? ""}`.toUpperCase();
}

function normaliseAvatarSrc(avatarLink?: string | null): string {
  const link = String(avatarLink ?? "").trim();
  const normalized = link.toLowerCase();

  if (
    EMPTY_AVATAR_VALUES.has(normalized) ||
    normalized.includes("/assets/img/default-avatar.png")
  ) {
    return "";
  }

  if (link.startsWith("data:") || link.startsWith("blob:")) {
    return link;
  }

  if (link.startsWith("/image-proxy?url=") || /^https?:\/\//i.test(link)) {
    return link;
  }

  return `/image-proxy?url=${encodeURIComponent(link)}`;
}

export function markAvatarSrcBroken(src?: string | null): void {
  const avatarSrc = normaliseAvatarSrc(src);
  if (avatarSrc) {
    brokenAvatarSrcSet.add(avatarSrc);
  }
}

export function resolveAvatarSrc(avatarLink?: string | null): string {
  const avatarSrc = normaliseAvatarSrc(avatarLink);
  return avatarSrc && !brokenAvatarSrcSet.has(avatarSrc) ? avatarSrc : "";
}

function preloadAvatarSrc(src: string, timeoutMs: number): Promise<void> {
  if (!src || brokenAvatarSrcSet.has(src) || loadedAvatarSrcSet.has(src)) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const image = new Image();
    let resolved = false;

    const resolveOnce = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };

    image.onload = () => {
      // Image confirmed valid — move it out of broken if timeout placed it there.
      brokenAvatarSrcSet.delete(src);
      loadedAvatarSrcSet.add(src);
      resolveOnce();
    };
    image.onerror = () => {
      brokenAvatarSrcSet.add(src);
      resolveOnce();
    };
    image.decoding = "async";
    image.src = src;

    if (image.complete) {
      if (image.naturalWidth > 0) {
        loadedAvatarSrcSet.add(src);
      } else {
        brokenAvatarSrcSet.add(src);
      }
      resolveOnce();
      return;
    }

    // On timeout, stop blocking skeleton replacement but keep the URL eligible
    // for rendering as <img>. Only a real image error should trigger initials.
    window.setTimeout(() => {
      resolveOnce();
    }, timeoutMs);
  });
}

export async function prepareAvatarLinks(
  avatarLinks: Array<string | null | undefined>,
  timeoutMs = 900,
): Promise<void> {
  const srcs = Array.from(new Set(avatarLinks.map(normaliseAvatarSrc).filter(Boolean)));
  await Promise.all(srcs.map((src) => preloadAvatarSrc(src, timeoutMs)));
}

export function renderAvatarMarkup(
  className: string,
  label: string,
  avatarLink?: string | null,
  options: AvatarOptions = {},
): string {
  const safeLabel = escapeHtml(label.trim() || "Пользователь");
  const avatarSrc = resolveAvatarSrc(avatarLink);

  if (!avatarSrc) {
    return `<span class="${className} avatar-fallback" role="img" aria-label="${safeLabel}">${escapeHtml(
      getAvatarInitials(label),
    )}</span>`;
  }

  const sizeAttrs = [
    options.width ? `width="${options.width}"` : "",
    options.height ? `height="${options.height}"` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const loading = options.loading ?? "lazy";

  return `<img class="${className}" ${sizeAttrs} loading="${loading}" decoding="async" src="${escapeHtml(
    avatarSrc,
  )}" alt="${safeLabel}" data-avatar-name="${safeLabel}">`;
}
