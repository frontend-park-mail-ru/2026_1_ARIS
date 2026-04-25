import { getSessionUser } from "../../state/session";
import { resolveProfilePath } from "../../pages/profile/profile-data";

export type PostcardPost = {
  id?: string;
  author?: string;
  authorId?: string;
  firstName?: string;
  lastName?: string;
  avatar: string;
  text: string;
  time: string;
  timeRaw?: string;
  likes: number;
  comments: number;
  reposts: number;
  images?: string[];
};

type PostcardStatOptions = {
  icon: string;
  count: number;
  action: string;
};

type PostcardRoot = (Document | HTMLElement) & {
  __postcardExpandBound?: boolean;
};

function formatStatCount(count: number): string {
  if (count >= 1000000) {
    return `${Math.floor(count / 1000000)}м`;
  }

  if (count >= 1000) {
    return `${Math.floor(count / 1000)}к`;
  }

  return String(count);
}

function resolveAvatarSrc(avatarLink?: string): string {
  if (!avatarLink) {
    return "/assets/img/default-avatar.png";
  }

  if (avatarLink.startsWith("/image-proxy?url=") || /^https?:\/\//i.test(avatarLink)) {
    return avatarLink;
  }

  return `/image-proxy?url=${encodeURIComponent(avatarLink)}`;
}

function resolveMediaSrc(mediaLink?: string): string {
  if (!mediaLink) {
    return "";
  }

  if (mediaLink.startsWith("/image-proxy?url=") || /^https?:\/\//i.test(mediaLink)) {
    return mediaLink;
  }

  return `/image-proxy?url=${encodeURIComponent(mediaLink)}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatPostExactTime(iso?: string): string {
  if (!iso) {
    return "";
  }

  const createdAt = new Date(iso);
  if (Number.isNaN(createdAt.getTime())) {
    return "";
  }

  const datePart = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(createdAt);

  const timePart = new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(createdAt);

  return `${datePart}\n${timePart}`;
}

/**
 * Рендерит элемент футера карточки поста.
 *
 * @param {PostcardStatOptions} options
 * @returns {string}
 */
function renderPostcardStat({ icon, count, action }: PostcardStatOptions): string {
  const isAuthorised = getSessionUser() !== null;

  if (isAuthorised) {
    return `
      <button
        type="button"
        class="postcard__stat postcard__stat-button"
        data-action="${action}"
        aria-label="${action}"
      >
        <span class="postcard__stat-icon" aria-hidden="true">
          <img src="${icon}" alt="">
        </span>
        <span class="postcard__stat-count">${formatStatCount(count)}</span>
      </button>
    `;
  }

  return `
    <a href="/login" data-open-auth-modal="login" class="postcard__stat postcard__stat-link" aria-label="${action}">
      <span class="postcard__stat-icon" aria-hidden="true">
        <img src="${icon}" alt="">
      </span>
      <span class="postcard__stat-count">${formatStatCount(count)}</span>
    </a>
  `;
}

/**
 * Рендерит медиаблок карточки поста.
 *
 * @param {string[]} images
 * @returns {string}
 */
function renderPostcardMedia(images: string[] = []): string {
  if (images.length === 0) {
    return "";
  }

  if (images.length === 1) {
    return `
      <div class="postcard__media">
        <div class="postcard__media-grid postcard__media-grid--single">
          <img class="postcard__media-item" loading="lazy" decoding="async" src="${resolveMediaSrc(images[0] ?? "")}" alt="">
        </div>
      </div>
    `;
  }

  if (images.length === 2) {
    return `
      <div class="postcard__media">
        <div class="postcard__media-grid postcard__media-grid--double">
          <img class="postcard__media-item" loading="lazy" decoding="async" src="${resolveMediaSrc(images[0] ?? "")}" alt="">
          <img class="postcard__media-item" loading="lazy" decoding="async" src="${resolveMediaSrc(images[1] ?? "")}" alt="">
        </div>
      </div>
    `;
  }

  if (images.length === 3) {
    return `
      <div class="postcard__media">
        <div class="postcard__media-grid postcard__media-grid--triple">
          <img class="postcard__media-item postcard__media-item--featured" loading="lazy" decoding="async" src="${resolveMediaSrc(images[0] ?? "")}" alt="">
          <img class="postcard__media-item" loading="lazy" decoding="async" src="${resolveMediaSrc(images[1] ?? "")}" alt="">
          <img class="postcard__media-item" loading="lazy" decoding="async" src="${resolveMediaSrc(images[2] ?? "")}" alt="">
        </div>
      </div>
    `;
  }

  if (images.length === 4) {
    return `
      <div class="postcard__media">
        <div class="postcard__media-grid postcard__media-grid--quad">
          ${images
            .slice(0, 4)
            .map(
              (image) =>
                `<img class="postcard__media-item" loading="lazy" decoding="async" src="${resolveMediaSrc(image)}" alt="">`,
            )
            .join("")}
        </div>
      </div>
    `;
  }

  if (images.length === 5) {
    return `
      <div class="postcard__media postcard__media--five">
        <div class="postcard__media-row postcard__media-row--top">
          <img class="postcard__media-item" loading="lazy" decoding="async" src="${resolveMediaSrc(images[0] ?? "")}" alt="">
          <img class="postcard__media-item" loading="lazy" decoding="async" src="${resolveMediaSrc(images[1] ?? "")}" alt="">
        </div>

        <div class="postcard__media-row postcard__media-row--bottom">
          <img class="postcard__media-item" loading="lazy" decoding="async" src="${resolveMediaSrc(images[2] ?? "")}" alt="">
          <img class="postcard__media-item" loading="lazy" decoding="async" src="${resolveMediaSrc(images[3] ?? "")}" alt="">
          <img class="postcard__media-item" loading="lazy" decoding="async" src="${resolveMediaSrc(images[4] ?? "")}" alt="">
        </div>
      </div>
    `;
  }

  return `
    <div class="postcard__media postcard__media--five-plus">
      <div class="postcard__media-row postcard__media-row--top">
        <img class="postcard__media-item" loading="lazy" decoding="async" src="${resolveMediaSrc(images[0] ?? "")}" alt="">
        <img class="postcard__media-item" loading="lazy" decoding="async" src="${resolveMediaSrc(images[1] ?? "")}" alt="">
        <img class="postcard__media-item" loading="lazy" decoding="async" src="${resolveMediaSrc(images[2] ?? "")}" alt="">
      </div>

      <div class="postcard__media-row postcard__media-row--bottom">
        <img class="postcard__media-item" loading="lazy" decoding="async" src="${resolveMediaSrc(images[3] ?? "")}" alt="">
        <img class="postcard__media-item" loading="lazy" decoding="async" src="${resolveMediaSrc(images[4] ?? "")}" alt="">
        <div class="postcard__media-overlay">
          <img class="postcard__media-item" loading="lazy" decoding="async" src="${resolveMediaSrc(images[5] ?? "")}" alt="">
          <span class="postcard__media-overlay-count">+${images.length - 5}</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Рендерит внутренний HTML карточки поста (используется внутри Shadow DOM и напрямую).
 * Экспортируется для использования в ArisPostcard Web Component.
 */
export function renderPostcardInner(post: PostcardPost): string {
  const sessionUser = getSessionUser();
  const statsMarkup = sessionUser
    ? `
    <div class="postcard__stats">
      ${renderPostcardStat({
        icon: "/assets/img/icons/heart.svg",
        count: post.likes,
        action: "like",
      })}
      ${renderPostcardStat({
        icon: "/assets/img/icons/repost.svg",
        count: post.reposts,
        action: "repost",
      })}
      ${renderPostcardStat({
        icon: "/assets/img/icons/comment.svg",
        count: post.comments,
        action: "comment",
      })}
    </div>
  `
    : "";
  const displayName =
    `${post.firstName || ""} ${post.lastName || ""}`.trim() || post.author || "Пользователь";
  const profilePath = resolveProfilePath({
    id: post.authorId,
    username: post.author,
    firstName: post.firstName,
    lastName: post.lastName,
  });

  return `
    <article class="postcard">
      <header class="postcard__header">
        <img
          class="postcard__avatar"
          src="${resolveAvatarSrc(post.avatar)}"
          alt="${displayName}"
          width="44" height="44"
          decoding="async"
          loading="lazy"
        >
        <a
          href="${sessionUser ? profilePath : "/login"}"
          ${sessionUser ? "data-link" : 'data-open-auth-modal="login"'}
          class="postcard__author"
        >
          ${displayName}
        </a>
      </header>

      <div class="postcard__text-container">
        <p class="postcard__text postcard__text--collapsed">${post.text}</p>
        <button type="button" class="postcard__expand postcard__expand--hidden">читать полностью</button>
      </div>

      ${renderPostcardMedia(post.images || [])}

      <footer class="postcard__footer">
        ${statsMarkup}

        <p class="postcard__time" ${post.timeRaw ? `title="${escapeHtml(formatPostExactTime(post.timeRaw))}"` : ""}>${post.time}</p>
      </footer>
    </article>
  `;
}

/**
 * Рендерит карточку поста как <aris-postcard> Web Component с Shadow DOM.
 * Данные передаются через атрибут data-post (JSON).
 */
export function renderPostcard(post: PostcardPost): string {
  const encoded = escapeHtml(JSON.stringify(post));
  const key = post.id ? ` data-key="${escapeHtml(post.id)}"` : "";
  return `<aris-postcard${key} data-post="${encoded}"></aris-postcard>`;
}

/**
 * Инициализирует поведение раскрытия текста карточки поста.
 *
 * @param {Document|HTMLElement} [root=document]
 * @returns {void}
 */
export function initPostcardExpand(root: Document | HTMLElement = document): void {
  requestAnimationFrame(() => {
    const containers = root.querySelectorAll(".postcard__text-container");

    containers.forEach((container) => {
      const text = container.querySelector(".postcard__text");
      const button = container.querySelector(".postcard__expand");

      if (!(text instanceof HTMLElement) || !(button instanceof HTMLElement)) return;

      const isOverflowing = text.scrollHeight > text.clientHeight + 1;

      button.classList.toggle("postcard__expand--hidden", !isOverflowing);
    });
  });

  const bindableRoot = root as PostcardRoot;
  if (bindableRoot.__postcardExpandBound) return;

  root.addEventListener("click", (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const button = target.closest(".postcard__expand");
    if (!button) return;

    const container = button.closest(".postcard__text-container");
    if (!(container instanceof HTMLElement)) return;

    const text = container.querySelector(".postcard__text");
    if (!(text instanceof HTMLElement)) return;

    text.classList.remove("postcard__text--collapsed");
    button.remove();
  });

  bindableRoot.__postcardExpandBound = true;
}

/**
 * Инициализирует кнопку "читать полностью" внутри Shadow Root конкретной карточки.
 * Используется в ArisPostcard.connectedCallback().
 */
export function initPostcardExpandInShadow(shadow: ShadowRoot): void {
  requestAnimationFrame(() => {
    const text = shadow.querySelector<HTMLElement>(".postcard__text");
    const button = shadow.querySelector<HTMLElement>(".postcard__expand");
    if (!text || !button) return;
    button.classList.toggle(
      "postcard__expand--hidden",
      !(text.scrollHeight > text.clientHeight + 1),
    );
  });

  shadow.addEventListener("click", (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const button = target.closest(".postcard__expand");
    if (!button) return;

    const container = button.closest(".postcard__text-container");
    if (!(container instanceof HTMLElement)) return;

    const text = container.querySelector<HTMLElement>(".postcard__text");
    if (!text) return;

    text.classList.remove("postcard__text--collapsed");
    button.remove();
  });
}
