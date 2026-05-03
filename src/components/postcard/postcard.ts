/**
 * Компонент карточки поста в ленте.
 *
 * Отвечает за:
 * - отображение автора, текста и вложений;
 * - рендер счётчиков лайков, репостов и комментариев;
 * - управление раскрытием длинного текста;
 * - приоритизацию главного изображения для LCP.
 *
 * Не отвечает за:
 * - загрузку данных ленты;
 * - синхронизацию состояния лайков с сервером;
 * - маршрутизацию страниц.
 */
import { getSessionUser } from "../../state/session";
import { resolveProfilePath } from "../../pages/profile/profile-data";
import { renderAvatarMarkup } from "../../utils/avatar";
import { resolveMediaUrl } from "../../utils/media";

/**
 * Модель поста для карточки ленты.
 */
export type PostcardPost = {
  /** Идентификатор поста. */
  id?: string;
  /** Логин или короткое имя автора. */
  author?: string;
  /** Идентификатор профиля автора. */
  authorId?: string;
  /** Имя автора. */
  firstName?: string;
  /** Фамилия автора. */
  lastName?: string;
  /** Ссылка на аватар автора. */
  avatar: string;
  /** Основной текст публикации. */
  text: string;
  /** Короткая подпись времени для карточки. */
  time: string;
  /** Полная дата публикации в ISO-формате. */
  timeRaw?: string;
  /** Количество лайков. */
  likes: number;
  /** Поставил ли текущий пользователь лайк. */
  isLiked?: boolean;
  /** Количество комментариев. */
  comments: number;
  /** Количество репостов. */
  reposts: number;
  /** Список изображений поста в порядке отображения. */
  images?: string[];
};

type PostcardStatOptions = {
  icon: string;
  count: number;
  action: string;
  isLiked?: boolean;
};

type PostcardMediaOptions = {
  prioritizeFirstImage?: boolean;
};

type RenderPostcardOptions = {
  prioritizeMedia?: boolean;
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

function getPostcardStatAccessibleName(action: string, count: number): string {
  const nounByAction: Record<string, string> = {
    like: "лайков",
    repost: "репостов",
    comment: "комментариев",
  };

  return `${formatStatCount(count)} ${nounByAction[action] ?? action}`.trim();
}

function renderPostcardAvatar(post: PostcardPost, authorName: string): string {
  return renderAvatarMarkup("postcard__avatar", authorName, post.avatar, { width: 44, height: 44 });
}

function resolveMediaSrc(mediaLink?: string): string {
  return resolveMediaUrl(mediaLink);
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

function shouldRenderExpandButtonInitially(text: string): boolean {
  const raw = String(text ?? "");
  const normalized = raw.replace(/\s+/g, " ").trim();
  const explicitLines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean).length;

  return explicitLines >= 3 || normalized.length >= 140;
}

/**
 * Рендерит кнопку или ссылку статистики под карточкой поста.
 *
 * Использует разную разметку для гостя и авторизованного пользователя,
 * потому что гостя нужно привести к авторизации, а не выполнять действие сразу.
 *
 * @param {PostcardStatOptions} options
 * @returns {string} HTML элемента статистики.
 * @example
 * renderPostcardStat({
 *   icon: "/assets/img/icons/heart.svg",
 *   count: 12,
 *   action: "like",
 * });
 */
function renderPostcardStat({ icon, count, action, isLiked }: PostcardStatOptions): string {
  const isAuthorised = getSessionUser() !== null;
  const accessibleName = getPostcardStatAccessibleName(action, count);
  const liked = action === "like" && Boolean(isLiked);

  if (isAuthorised) {
    return `
      <button
        type="button"
        class="postcard__stat postcard__stat-button${liked ? " postcard__stat-button--liked" : ""}"
        data-action="${action}"
        data-liked="${liked}"
        aria-label="${accessibleName}"
        aria-pressed="${liked}"
      >
        <span class="postcard__stat-icon" aria-hidden="true">
          <img src="${icon}" alt="">
        </span>
        <span class="postcard__stat-count">${formatStatCount(count)}</span>
      </button>
    `;
  }

  return `
    <a href="/login" data-open-auth-modal="login" class="postcard__stat postcard__stat-link" aria-label="${accessibleName}">
      <span class="postcard__stat-icon" aria-hidden="true">
        <img src="${icon}" alt="">
      </span>
      <span class="postcard__stat-count">${formatStatCount(count)}</span>
    </a>
  `;
}

function renderPostcardMediaImage(src: string, prioritize = false): string {
  return `<img class="postcard__media-item" loading="${prioritize ? "eager" : "lazy"}"${prioritize ? ' fetchpriority="high"' : ""} decoding="async" src="${resolveMediaSrc(src)}" alt="">`;
}

/**
 * Рендерит сетку изображений поста.
 *
 * Выбирает раскладку по количеству картинок и может приоритизировать
 * первое изображение, если карточка попадает в начальную видимую область.
 *
 * @param {string[]} images
 * @returns {string} HTML медиаблока.
 * @example
 * renderPostcardMedia(["/img/1.jpg", "/img/2.jpg"], {
 *   prioritizeFirstImage: true,
 * });
 */
function renderPostcardMedia(images: string[] = [], options: PostcardMediaOptions = {}): string {
  if (images.length === 0) {
    return "";
  }

  const prioritizeFirstImage = Boolean(options.prioritizeFirstImage);

  if (images.length === 1) {
    return `
      <div class="postcard__media">
        <div class="postcard__media-grid postcard__media-grid--single">
          ${renderPostcardMediaImage(images[0] ?? "", prioritizeFirstImage)}
        </div>
      </div>
    `;
  }

  if (images.length === 2) {
    return `
      <div class="postcard__media">
        <div class="postcard__media-grid postcard__media-grid--double">
          ${renderPostcardMediaImage(images[0] ?? "", prioritizeFirstImage)}
          ${renderPostcardMediaImage(images[1] ?? "")}
        </div>
      </div>
    `;
  }

  if (images.length === 3) {
    return `
      <div class="postcard__media">
        <div class="postcard__media-grid postcard__media-grid--triple">
          ${renderPostcardMediaImage(images[0] ?? "", prioritizeFirstImage).replace('class="postcard__media-item"', 'class="postcard__media-item postcard__media-item--featured"')}
          ${renderPostcardMediaImage(images[1] ?? "")}
          ${renderPostcardMediaImage(images[2] ?? "")}
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
            .map((image, index) =>
              renderPostcardMediaImage(image, prioritizeFirstImage && index === 0),
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
          ${renderPostcardMediaImage(images[0] ?? "", prioritizeFirstImage)}
          ${renderPostcardMediaImage(images[1] ?? "")}
        </div>

        <div class="postcard__media-row postcard__media-row--bottom">
          ${renderPostcardMediaImage(images[2] ?? "")}
          ${renderPostcardMediaImage(images[3] ?? "")}
          ${renderPostcardMediaImage(images[4] ?? "")}
        </div>
      </div>
    `;
  }

  return `
    <div class="postcard__media postcard__media--five-plus">
      <div class="postcard__media-row postcard__media-row--top">
        ${renderPostcardMediaImage(images[0] ?? "", prioritizeFirstImage)}
        ${renderPostcardMediaImage(images[1] ?? "")}
        ${renderPostcardMediaImage(images[2] ?? "")}
      </div>

      <div class="postcard__media-row postcard__media-row--bottom">
        ${renderPostcardMediaImage(images[3] ?? "")}
        ${renderPostcardMediaImage(images[4] ?? "")}
        <div class="postcard__media-overlay">
          ${renderPostcardMediaImage(images[5] ?? "")}
          <span class="postcard__media-overlay-count">+${images.length - 5}</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Рендерит внутренний HTML карточки поста.
 *
 * Эта функция нужна как единый источник разметки и для обычного рендера,
 * и для веб-компонента `ArisPostcard`, чтобы логика отображения не расходилась
 * между разными способами использования карточки.
 *
 * @param {PostcardPost} post Данные публикации.
 * @param {RenderPostcardOptions} [options={}] Дополнительные параметры рендера.
 * @returns {string} HTML содержимого карточки.
 * @example
 * const html = renderPostcardInner(post, { prioritizeMedia: true });
 */
export function renderPostcardInner(
  post: PostcardPost,
  options: RenderPostcardOptions = {},
): string {
  const sessionUser = getSessionUser();
  const shouldShowExpandInitially = shouldRenderExpandButtonInitially(post.text);
  const statsMarkup = `
    <div class="postcard__stats">
      ${renderPostcardStat({
        icon: "/assets/img/icons/heart.svg",
        count: post.likes,
        action: "like",
        isLiked: post.isLiked,
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
  `;
  const displayName =
    `${post.firstName || ""} ${post.lastName || ""}`.trim() || post.author || "Пользователь";
  const profilePath = resolveProfilePath({
    id: post.authorId,
    username: post.author,
    firstName: post.firstName,
    lastName: post.lastName,
  });

  return `
    <article class="postcard content-card" data-post-id="${escapeHtml(String(post.id ?? ""))}">
      <header class="postcard__header">
        ${renderPostcardAvatar(post, displayName)}
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
        <button type="button" class="postcard__expand${shouldShowExpandInitially ? "" : " postcard__expand--hidden"}">читать полностью</button>
      </div>

      ${renderPostcardMedia(
        post.images || [],
        options.prioritizeMedia ? { prioritizeFirstImage: true } : {},
      )}

      <footer class="postcard__footer">
        ${statsMarkup}

        <p class="postcard__time" ${post.timeRaw ? `data-tooltip="${escapeHtml(formatPostExactTime(post.timeRaw))}"` : ""}>${post.time}</p>
      </footer>
    </article>
  `;
}

/**
 * Рендерит карточку поста как веб-компонент `<aris-postcard>`.
 *
 * Такой вариант изолирует стили внутри `Shadow DOM` и позволяет безопасно
 * встраивать карточку в разные части интерфейса без утечек CSS.
 *
 * @param {PostcardPost} post Данные публикации.
 * @param {RenderPostcardOptions} [options={}] Дополнительные параметры рендера.
 * @returns {string} HTML-строка карточки.
 * @example
 * const html = renderPostcard(post);
 */
export function renderPostcard(post: PostcardPost, options: RenderPostcardOptions = {}): string {
  return renderPostcardInner(post, options);
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
 * Инициализирует кнопку «читать полностью» внутри `Shadow Root` конкретной карточки.
 *
 * Нужна, чтобы логика раскрытия длинного текста жила рядом с карточкой
 * и не требовала отдельного глобального обработчика для каждого экземпляра.
 *
 * @param {ShadowRoot} shadow `Shadow Root` конкретной карточки.
 * @returns {void}
 * @example
 * initPostcardExpandInShadow(this.shadowRoot);
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
