import { markAvatarSrcBroken } from "./avatar";

const AVATAR_SELECTOR = 'img[class*="avatar"]';
const DEFAULT_AVATAR_PATTERN = /\/assets\/img\/default-avatar\.png(?:$|\?)/i;
const AVATAR_FALLBACK_IGNORE_SELECTOR = "[data-avatar-fallback='ignore']";

let avatarFallbackObserver: MutationObserver | null = null;

function getAvatarInitials(name: string): string {
  const cleaned = name.replace(/^@+/, "").trim().split(/\s+/).filter(Boolean);

  if (!cleaned.length) {
    return "AR";
  }

  if (cleaned.length === 1) {
    return (cleaned[0] ?? "AR").slice(0, 2).toUpperCase();
  }

  const firstInitial = cleaned[0]?.[0] ?? "";
  const secondInitial = cleaned[1]?.[0] ?? "";

  return `${firstInitial}${secondInitial}`.toUpperCase();
}

function isDefaultAvatarSrc(src: string | null): boolean {
  return Boolean(src && DEFAULT_AVATAR_PATTERN.test(src));
}

function getAvatarLabel(image: HTMLImageElement): string {
  return image.dataset.avatarName?.trim() || image.getAttribute("alt")?.trim() || "Пользователь";
}

function getAvatarPlaceholderSize(image: HTMLImageElement): number {
  const rect = image.getBoundingClientRect();
  const computed = window.getComputedStyle(image);
  const width = rect.width || parseFloat(computed.width) || image.width || 40;
  const height = rect.height || parseFloat(computed.height) || image.height || 40;

  return Math.max(12, Math.round(Math.min(width, height) * 0.38));
}

function replaceWithInitials(image: HTMLImageElement): void {
  if (image.dataset.avatarFallbackApplied === "true") {
    return;
  }

  const label = getAvatarLabel(image);
  markAvatarSrcBroken(image.currentSrc || image.src);
  const placeholder = document.createElement("div");

  placeholder.className = `${image.className} avatar-fallback`;
  placeholder.textContent = getAvatarInitials(label);
  placeholder.setAttribute("role", "img");
  placeholder.setAttribute("aria-label", label);
  placeholder.style.fontSize = `${getAvatarPlaceholderSize(image)}px`;

  if (image.getAttribute("style")) {
    placeholder.setAttribute(
      "style",
      `${image.getAttribute("style")}; font-size: ${placeholder.style.fontSize};`,
    );
  }

  image.dataset.avatarFallbackApplied = "true";
  image.replaceWith(placeholder);
}

function bindAvatarFallback(image: HTMLImageElement): void {
  if (image.dataset.avatarFallbackBound === "true") {
    if (
      isDefaultAvatarSrc(image.currentSrc || image.src) ||
      (image.complete && image.naturalWidth === 0)
    ) {
      replaceWithInitials(image);
    }
    return;
  }

  image.dataset.avatarFallbackBound = "true";
  image.addEventListener("error", () => replaceWithInitials(image), { once: true });

  if (
    isDefaultAvatarSrc(image.currentSrc || image.src) ||
    (image.complete && image.naturalWidth === 0)
  ) {
    replaceWithInitials(image);
  }
}

function processAvatarFallbacks(root: ParentNode): void {
  root.querySelectorAll<HTMLImageElement>(AVATAR_SELECTOR).forEach((image) => {
    if (image.closest(AVATAR_FALLBACK_IGNORE_SELECTOR)) {
      return;
    }

    bindAvatarFallback(image);
  });
}

export function initAvatarFallback(root: ParentNode = document): void {
  processAvatarFallbacks(root);

  if (avatarFallbackObserver || !(document.body instanceof HTMLElement)) {
    return;
  }

  avatarFallbackObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) {
          return;
        }

        if (node.matches(AVATAR_SELECTOR)) {
          if (node.closest(AVATAR_FALLBACK_IGNORE_SELECTOR)) {
            return;
          }

          bindAvatarFallback(node as HTMLImageElement);
          return;
        }

        processAvatarFallbacks(node);
      });
    });
  });

  avatarFallbackObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
}
