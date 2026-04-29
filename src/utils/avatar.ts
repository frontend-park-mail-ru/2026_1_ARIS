/**
 * Утилиты для аватаров.
 *
 * Отвечают за:
 * - безопасный рендер разметки аватара
 * - нормализацию ссылок на изображения
 * - fallback на инициалы
 * - мягкую предзагрузку изображений
 */
export type AvatarOptions = {
  /** Ширина изображения в пикселях. */
  width?: number;
  /** Высота изображения в пикселях. */
  height?: number;
  /** Режим загрузки изображения. */
  loading?: "eager" | "lazy";
  /** Приоритет сетевой загрузки. */
  fetchPriority?: "high" | "low" | "auto";
};

const EMPTY_AVATAR_VALUES = new Set(["", "null", "undefined", "none"]);
const brokenAvatarSrcSet = new Set<string>();
const loadedAvatarSrcSet = new Set<string>();

/**
 * Экранирует строку для безопасной вставки в HTML.
 *
 * @param {string} value Исходное значение.
 * @returns {string} Экранированная строка.
 *
 * @example
 * escapeHtml("<admin>");
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Строит инициалы пользователя для fallback-аватара.
 *
 * @param {string} name Отображаемое имя пользователя.
 * @returns {string} Две буквы для кружка-аватара.
 *
 * @example
 * getAvatarInitials("Сергей Шульгиненко");
 */
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

/**
 * Помечает адрес аватара как нерабочий.
 *
 * Нужен, чтобы не гонять повторные запросы к уже сломанному изображению
 * и быстрее показывать fallback с инициалами.
 *
 * @param {string | null | undefined} src Исходная ссылка на аватар.
 * @returns {void}
 */
export function markAvatarSrcBroken(src?: string | null): void {
  const avatarSrc = normaliseAvatarSrc(src);
  if (avatarSrc) {
    brokenAvatarSrcSet.add(avatarSrc);
  }
}

/**
 * Возвращает пригодный для рендера адрес аватара.
 *
 * @param {string | null | undefined} avatarLink Ссылка из данных пользователя.
 * @returns {string} Рабочая ссылка или пустая строка для fallback-рендера.
 */
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
      // Если изображение успешно загрузилось, убираем его из списка битых адресов.
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

    // По таймауту перестаём ждать предзагрузку, но не считаем адрес битым.
    // Инициалы показываем только после реальной ошибки загрузки.
    window.setTimeout(() => {
      resolveOnce();
    }, timeoutMs);
  });
}

/**
 * Предзагружает набор аватаров перед рендером.
 *
 * Используется там, где важно избежать мигания fallback-инициалов
 * в момент первой отрисовки списка.
 *
 * @param {Array<string | null | undefined>} avatarLinks Ссылки на аватары.
 * @param {number} [timeoutMs=900] Максимальное время ожидания одной картинки.
 * @returns {Promise<void>}
 *
 * @example
 * await prepareAvatarLinks([user.avatarLink, friend.avatarLink]);
 */
export async function prepareAvatarLinks(
  avatarLinks: Array<string | null | undefined>,
  timeoutMs = 900,
): Promise<void> {
  const srcs = Array.from(new Set(avatarLinks.map(normaliseAvatarSrc).filter(Boolean)));
  await Promise.all(srcs.map((src) => preloadAvatarSrc(src, timeoutMs)));
}

/**
 * Возвращает HTML-разметку аватара с fallback на инициалы.
 *
 * @param {string} className CSS-класс корневого элемента аватара.
 * @param {string} label Подпись для `alt` и `aria-label`.
 * @param {string | null | undefined} [avatarLink] Ссылка на аватар пользователя.
 * @param {AvatarOptions} [options={}] Дополнительные параметры изображения.
 * @returns {string} Готовая HTML-строка.
 *
 * @example
 * renderAvatarMarkup("header__avatar", "Иван Иванов", user.avatarLink);
 */
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
    options.fetchPriority ? `fetchpriority="${options.fetchPriority}"` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const loading = options.loading ?? "lazy";

  return `<img class="${className}" ${sizeAttrs} loading="${loading}" decoding="async" src="${escapeHtml(
    avatarSrc,
  )}" alt="${safeLabel}" data-avatar-name="${safeLabel}">`;
}
