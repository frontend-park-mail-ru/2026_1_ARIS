/**
 * Рендер страницы профиля.
 *
 * Содержит функции генерации HTML и обновления DOM для страницы.
 */
import type { DisplayProfile, ProfilePost } from "./types";
import { pendingProfilePostState } from "./state";
import { escapeHtml, getAvatarImageSrc, hasVisibleValue, renderAvatar } from "./helpers";
import { renderModalCloseButton } from "../../components/modal-close/modal-close";
import { renderAvatarMarkup } from "../../utils/avatar";

export {
  renderAvatarModal,
  renderAvatarDeleteModal,
  syncAvatarModalUi,
  loadAvatarFile,
  loadAvatarFromUrl,
  ensureAvatarEditorSource,
  setAvatarZoom,
  rotateAvatar,
  buildAvatarFile,
} from "./avatar";

export { renderPostComposerModal, renderPostDeleteModal, syncPostComposerUi } from "./composer";

export {
  renderEditorFieldError,
  clearProfileFieldErrors,
  renderProfileFieldErrors,
  focusFirstProfileErrorField,
  renderEditorTextField,
  renderEditorTextarea,
  renderProfileEditor,
} from "./editor-render";

export function renderMissingProfileCard(profile: DisplayProfile): string {
  return `
    <article class="profile-card profile-card--missing content-card">
      <header class="profile-card__hero">
        <div class="profile-card__avatar-column">
          ${renderAvatar(profile, "profile-card__avatar")}
        </div>

        <div class="profile-card__hero-copy">
          <div class="profile-card__eyebrow">Профиль</div>
          <h1>Профиль не существует</h1>
          <p>${escapeHtml(profile.status)}</p>
        </div>
      </header>
    </article>
  `;
}

type ProfileFriendActionsModel = Pick<
  DisplayProfile,
  "isOwnProfile" | "isApiBacked" | "id" | "friendRelation"
>;

function renderProfileFriendActionsContent(profile: ProfileFriendActionsModel): string {
  if (profile.isOwnProfile || !profile.isApiBacked) {
    return "";
  }

  const messageButton = `
    <button
      type="button"
      class="profile-friend-action profile-friend-action--secondary"
      data-profile-open-chat="${escapeHtml(profile.id)}"
    >
      Сообщение
    </button>
  `;

  if (profile.friendRelation === "friend") {
    return `
      <div class="profile-friend-actions">
        ${messageButton}
        <button
          type="button"
          class="profile-friend-action profile-friend-action--danger"
          data-profile-delete-friend="${escapeHtml(profile.id)}"
        >
          Удалить из друзей
        </button>
      </div>
    `;
  }

  if (profile.friendRelation === "incoming") {
    return `
      <div class="profile-friend-actions">
        ${messageButton}
        <button
          type="button"
          class="profile-friend-action profile-friend-action--primary"
          data-profile-accept-friend="${escapeHtml(profile.id)}"
        >
          Принять в друзья
        </button>
        <button
          type="button"
          class="profile-friend-action profile-friend-action--danger"
          data-profile-decline-friend="${escapeHtml(profile.id)}"
        >
          Отклонить
        </button>
      </div>
    `;
  }

  if (profile.friendRelation === "outgoing") {
    return `
      <div class="profile-friend-actions">
        ${messageButton}
        <div class="profile-friend-request-state">
          <span>Запрос отправлен.</span>
          <button
            type="button"
            class="profile-friend-request-cancel"
            data-profile-revoke-friend="${escapeHtml(profile.id)}"
          >
            Отменить
          </button>
        </div>
      </div>
    `;
  }

  return `
    <div class="profile-friend-actions">
      ${messageButton}
      <button
        type="button"
        class="profile-friend-action profile-friend-action--primary"
        data-profile-request-friend="${escapeHtml(profile.id)}"
      >
        Добавить в друзья
      </button>
    </div>
  `;
}

export function renderProfileFriendActions(profile: ProfileFriendActionsModel): string {
  const content = renderProfileFriendActionsContent(profile);
  if (!content) {
    return "";
  }

  return `
    <div
      data-profile-friend-actions-root
      data-profile-id="${escapeHtml(profile.id)}"
      data-profile-friend-relation="${escapeHtml(profile.friendRelation)}"
    >
      ${content}
    </div>
  `;
}

export function renderDeleteFriendModal(profile: DisplayProfile): string {
  if (profile.isOwnProfile || profile.friendRelation !== "friend") {
    return "";
  }

  const friendName = `${profile.firstName} ${profile.lastName}`.trim() || profile.username;
  const friendshipDate = formatFriendshipDateLocal(profile.friendshipCreatedAt);
  const friendshipCopy = friendshipDate ? `Вы в друзьях с ${friendshipDate} года` : "";

  return `
    <div class="profile-delete-modal" data-profile-delete-modal hidden>
      <section
        class="profile-delete-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Удалить из друзей"
      >
        <header class="profile-delete-modal__header">
          <h2 class="profile-delete-modal__title">Удалить из друзей</h2>
          ${renderModalCloseButton({
            className: "profile-delete-modal__close",
            attributes: "data-profile-delete-modal-close",
          })}
        </header>

        <div class="profile-delete-modal__identity">
          ${renderAvatar(profile, "profile-delete-modal__avatar")}
          <p class="profile-delete-modal__name">${escapeHtml(friendName)}</p>
        </div>

        <p class="profile-delete-modal__text">
          Вы действительно хотите удалить этого пользователя из друзей?
        </p>

        ${
          friendshipCopy
            ? `<p class="profile-delete-modal__hint">${escapeHtml(friendshipCopy)}</p>`
            : ""
        }

        <div class="profile-delete-modal__actions">
          <button
            type="button"
            class="profile-delete-modal__button profile-delete-modal__button--primary"
            data-profile-confirm-delete="${escapeHtml(profile.id)}"
          >
            Удалить из друзей
          </button>
          <button
            type="button"
            class="profile-delete-modal__button"
            data-profile-delete-modal-close
          >
            Отмена
          </button>
        </div>
      </section>
    </div>
  `;
}

// Локальный форматтер даты дружбы, чтобы не импортировать его из state и не создавать цикличную зависимость.
function formatFriendshipDateLocal(value?: string): string {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
    .format(parsed)
    .replace(/\s*г\.$/, "");
}

export function renderInfoRows(profile: DisplayProfile): string {
  const rows = [
    hasVisibleValue(profile.gender)
      ? `
        <div class="profile-info-grid__row">
          <dt>Пол</dt>
          <dd>${escapeHtml(profile.gender)}</dd>
        </div>
      `
      : "",
    hasVisibleValue(profile.birthday)
      ? `
        <div class="profile-info-grid__row">
          <dt>День рождения</dt>
          <dd>${escapeHtml(profile.birthday)}</dd>
        </div>
      `
      : "",
    hasVisibleValue(profile.phone)
      ? `
        <div class="profile-info-grid__row">
          <dt>Телефон</dt>
          <dd>${escapeHtml(profile.phone)}</dd>
        </div>
      `
      : "",
    hasVisibleValue(profile.email)
      ? `
        <div class="profile-info-grid__row">
          <dt>Email</dt>
          <dd>${escapeHtml(profile.email)}</dd>
        </div>
      `
      : "",
    hasVisibleValue(profile.city)
      ? `
        <div class="profile-info-grid__row">
          <dt>Город</dt>
          <dd>${escapeHtml(profile.city)}</dd>
        </div>
      `
      : "",
    hasVisibleValue(profile.nativeTown)
      ? `
        <div class="profile-info-grid__row">
          <dt>Родной город</dt>
          <dd>${escapeHtml(profile.nativeTown)}</dd>
        </div>
      `
      : "",
  ]
    .filter(Boolean)
    .join("");

  if (!rows) {
    return "";
  }

  return `
    <dl class="profile-info-grid">
      ${rows}
    </dl>
  `;
}

export function renderEducation(profile: DisplayProfile): string {
  const items = profile.education.filter(
    (item) => hasVisibleValue(item.place) || hasVisibleValue(item.subtitle),
  );

  if (!items.length) {
    return "";
  }

  return `
    <div class="profile-stack">
      ${items
        .map(
          (item) => `
            <article class="profile-stack__item">
              ${hasVisibleValue(item.place) ? `<h3>${escapeHtml(item.place)}</h3>` : ""}
              ${hasVisibleValue(item.subtitle) ? `<p>${escapeHtml(item.subtitle)}</p>` : ""}
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

export function renderWork(profile: DisplayProfile): string {
  const hasCompany = hasVisibleValue(profile.workCompany);
  const hasRole = hasVisibleValue(profile.workRole);

  if (!hasCompany && !hasRole) {
    return "";
  }

  return `
    <div class="profile-stack">
      <article class="profile-stack__item">
        ${hasCompany ? `<h3>${escapeHtml(profile.workCompany)}</h3>` : ""}
        ${hasRole ? `<p>${escapeHtml(profile.workRole)}</p>` : ""}
      </article>
    </div>
  `;
}

export function renderPersonal(profile: DisplayProfile): string {
  const rows = [
    hasVisibleValue(profile.interests)
      ? `
        <div class="profile-info-grid__row">
          <dt>Интересы</dt>
          <dd>${escapeHtml(profile.interests)}</dd>
        </div>
      `
      : "",
    hasVisibleValue(profile.favoriteMusic)
      ? `
        <div class="profile-info-grid__row">
          <dt>Любимая музыка</dt>
          <dd>${escapeHtml(profile.favoriteMusic)}</dd>
        </div>
      `
      : "",
  ]
    .filter(Boolean)
    .join("");

  if (!rows) {
    return "";
  }

  return `
    <dl class="profile-info-grid">
      ${rows}
    </dl>
  `;
}

export function renderFriends(profile: DisplayProfile): string {
  const friends = profile.friends;
  const previewCount = 6;
  const hasMoreFriends = friends.length > previewCount;
  const title = profile.isOwnProfile ? "Друзья" : "Друзья этого пользователя";
  const countMarkup =
    friends.length > 0
      ? `<span class="profile-friends-card__count">(${friends.length})</span>`
      : "";

  return `
    <section class="profile-friends-card">
      <div class="profile-friends-card__header">
        <h2>
          ${title}
          ${countMarkup}
        </h2>
      </div>

      ${
        friends.length
          ? `
            <div class="profile-friends-card__list">
              ${friends
                .slice(0, previewCount)
                .map(
                  (friend) => `
                    <a
                      href="/id${encodeURIComponent(friend.profileId)}"
                      data-link
                      class="profile-friend"
                    >
                      ${renderAvatarMarkup(
                        "profile-friend__avatar",
                        `${friend.firstName} ${friend.lastName}`.trim(),
                        friend.avatarLink,
                        { width: 44, height: 44 },
                      )}
                      <div class="profile-friend__content">
                        <strong>${escapeHtml(`${friend.firstName} ${friend.lastName}`)}</strong>
                      </div>
                    </a>
                  `,
                )
                .join("")}
            </div>
          `
          : `<p class="profile-empty-copy">Друзей пока нет</p>`
      }

      ${
        hasMoreFriends
          ? `
            <footer class="profile-friends-card__footer">
              <a
                href="/friends"
                data-link
                class="profile-friends-card__more"
              >
                показать всех
              </a>
            </footer>
          `
          : ""
      }
    </section>
  `;
}

function renderProfilePostImages(images: string[]): string {
  if (!images.length) {
    return "";
  }

  const count = Math.min(images.length, 5);
  const layoutModifierByCount = {
    1: "profile-post__images--single",
    2: "profile-post__images--double",
    3: "profile-post__images--triple",
    4: "profile-post__images--quad",
    5: "profile-post__images--five",
  } as const;
  const layoutModifier = layoutModifierByCount[count as keyof typeof layoutModifierByCount];

  return `
    <div class="profile-post__images ${layoutModifier}">
      ${images
        .slice(0, 5)
        .map(
          (image, index) => `
            <img
              loading="lazy"
              decoding="async"
              class="profile-post__image${count === 3 && index === 0 ? " profile-post__image--lead" : ""}"
              src="${escapeHtml(getAvatarImageSrc(image))}"
              alt="Изображение публикации"
            >
          `,
        )
        .join("")}
    </div>
  `;
}

export function renderProfilePosts(
  profile: DisplayProfile,
  posts: ProfilePost[],
  allPosts: ProfilePost[] = [],
): string {
  const isOwnProfile = profile.isOwnProfile;
  const ownPostsById = new Set(posts.map((post) => post.id));
  const baseAllPosts = isOwnProfile ? allPosts : posts;
  const mergedPosts = isOwnProfile
    ? [
        ...baseAllPosts.map((post) => ({
          ...post,
          isOwnPost: ownPostsById.has(post.id) || post.authorId === profile.id,
        })),
        ...posts
          .filter((post) => !baseAllPosts.some((candidate) => candidate.id === post.id))
          .map((post) => ({ ...post, isOwnPost: true })),
      ]
    : posts;
  const pending = pendingProfilePostState;
  const isSavingCreate = pending.mode === "create";
  const isSavingEdit = pending.mode === "edit" && !!pending.postId;
  const isSavingDelete = pending.mode === "delete" && !!pending.postId;
  const renderedPosts = [...mergedPosts];

  const skeletonPost: ProfilePost = {
    id: "",
    authorId: "",
    authorFirstName: "",
    authorLastName: "",
    authorUsername: "",
    authorAvatarLink: "",
    isOwnPost: false,
    text: "__PROFILE_SKELETON__",
    time: "",
    timeRaw: "",
    likes: 0,
    reposts: 0,
    comments: 0,
    media: [],
    images: [],
  };

  if ((isSavingEdit || isSavingDelete) && pending.postId) {
    const index = renderedPosts.findIndex((post) => post.id === pending.postId);
    if (index >= 0) {
      renderedPosts.splice(index, 1, { ...skeletonPost, id: `profile-skeleton-${pending.postId}` });
    }
  }
  const renderAuthorPath = (post: ProfilePost) =>
    post.authorId === profile.id || !post.authorId
      ? authorProfilePath
      : `/profile/${encodeURIComponent(post.authorId)}`;
  const authorProfilePath = profile.isOwnProfile
    ? "/profile"
    : `/profile/${encodeURIComponent(profile.id)}`;

  return `
    <section class="profile-posts" id="profile-posts">
      ${
        isOwnProfile
          ? `
            <button type="button" class="profile-composer content-card" data-profile-post-open>
              <span class="profile-composer__icon" aria-hidden="true">+</span>
              <span class="profile-composer__label">Создать запись</span>
            </button>
          `
          : ""
      }

      <header class="profile-posts__header content-card">
        ${
          isOwnProfile
            ? `
              <div class="profile-posts__toolbar" data-profile-post-toolbar>
                <div class="profile-posts__tabs" aria-label="Фильтр публикаций">
                  <button
                    type="button"
                    class="profile-posts__tab is-active"
                    data-profile-post-filter="all"
                    aria-pressed="true"
                  >
                    Все посты
                  </button>
                  <button
                    type="button"
                    class="profile-posts__tab"
                    data-profile-post-filter="own"
                    aria-pressed="false"
                  >
                    Мои посты
                  </button>
                </div>

                <button
                  type="button"
                  class="profile-posts__search-toggle"
                  data-profile-post-search-open
                  aria-label="Открыть поиск по публикациям"
                >
                  <img src="/assets/img/icons/search.svg" alt="">
                </button>
              </div>

              <label class="search-field profile-posts__search" data-profile-post-search-panel hidden>
                <span class="search-field__icon profile-posts__search-icon" aria-hidden="true">
                  <img src="/assets/img/icons/search.svg" alt="">
                </span>
                <input
                  type="search"
                  class="search-field__input profile-posts__search-input"
                  placeholder="Введите слово или фразу..."
                  data-profile-post-search
                >
                <button
                  type="button"
                  class="profile-posts__search-close"
                  data-profile-post-search-close
                  aria-label="Закрыть поиск по публикациям"
                >
                  ×
                </button>
              </label>
            `
            : `<h2>Публикации</h2>`
        }
      </header>

      <div class="profile-posts__list" data-profile-post-list>
        ${
          renderedPosts.length || isSavingCreate
            ? `
              ${isSavingCreate ? renderProfilePostSkeleton() : ""}
              ${renderedPosts
                .map((post, index) =>
                  post.text === "__PROFILE_SKELETON__"
                    ? renderProfilePostSkeleton()
                    : `
                    <article
                      class="profile-post content-card${index === 0 ? " profile-post--first-visible" : ""}"
                      data-profile-post-card
                      data-profile-post-id="${escapeHtml(post.id)}"
                      data-profile-post-scope="${post.isOwnPost ? "own" : "all"}"
                      data-profile-post-searchable="${escapeHtml(
                        [post.authorFirstName, post.authorLastName, post.authorUsername, post.text]
                          .filter(Boolean)
                          .join(" ")
                          .toLowerCase(),
                      )}"
                    >
                      <header class="profile-post__header">
                        <a
                          class="profile-post__author"
                          href="${renderAuthorPath(post)}"
                          data-link
                        >
                          ${renderAvatarMarkup(
                            "profile-post__avatar",
                            `${post.authorFirstName || post.authorUsername} ${
                              post.authorLastName
                            }`.trim(),
                            post.authorAvatarLink,
                            { width: 44, height: 44 },
                          )}

                          <div class="profile-post__meta">
                            <strong>${escapeHtml(
                              `${post.authorFirstName} ${post.authorLastName}`.trim() ||
                                post.authorUsername,
                            )}</strong>
                          </div>
                        </a>

                        ${
                          isOwnProfile && post.isOwnPost
                            ? `
                              <div class="profile-post__actions">
                                <button
                                  type="button"
                                  class="profile-post__menu-toggle"
                                  data-profile-post-menu-toggle="${escapeHtml(post.id)}"
                                  aria-label="Действия с публикацией"
                                  aria-expanded="false"
                                >
                                  <span></span><span></span><span></span>
                                </button>
                                <div class="profile-post__menu" data-profile-post-menu="${escapeHtml(post.id)}" hidden>
                                  <button
                                    type="button"
                                    class="profile-post__menu-action"
                                    data-profile-post-edit="${escapeHtml(post.id)}"
                                  >
                                    Редактировать
                                  </button>
                                  <button
                                    type="button"
                                    class="profile-post__menu-action profile-post__menu-action--danger"
                                    data-profile-post-delete="${escapeHtml(post.id)}"
                                  >
                                    Удалить
                                  </button>
                                </div>
                              </div>
                            `
                            : ""
                        }
                      </header>

                      <p class="profile-post__text">${escapeHtml(post.text)}</p>

                      ${renderProfilePostImages(post.images)}

                      <footer class="profile-post__footer">
                        <div class="profile-post__stats">
                          <span class="profile-post__stat">
                            <img src="/assets/img/icons/heart.svg" class="profile-post__icon" alt="" />
                            ${post.likes}
                          </span>
                          <span class="profile-post__stat">
                            <img src="/assets/img/icons/repost.svg" class="profile-post__icon" alt="" />
                            ${post.reposts}
                          </span>
                          <span class="profile-post__stat">
                            <img src="/assets/img/icons/chat.svg" class="profile-post__icon" alt="" />
                            ${post.comments}
                          </span>
                        </div>
                        <time
                          class="profile-post__time"
                          ${post.timeRaw ? `datetime="${escapeHtml(post.timeRaw)}"` : ""}
                          ${post.timeRaw ? `data-tooltip="${escapeHtml(formatPostExactTime(post.timeRaw))}"` : ""}
                        >${escapeHtml(post.time)}</time>
                      </footer>
                    </article>
                  `,
                )
                .join("")}
            `
            : `
                <div class="profile-posts__empty content-card">
                  <p class="profile-empty-copy">Публикаций пока нет</p>
                </div>
              `
        }

        <div class="profile-posts__empty profile-posts__empty--search content-card" data-profile-post-search-empty hidden>
          <p class="profile-empty-copy">Ничего не найдено. Попробуйте изменить запрос.</p>
        </div>
      </div>
    </section>
  `;
}

function renderProfilePostSkeleton(): string {
  return `
    <article class="profile-post content-card">
      <div class="profile-post__header">
        <div class="profile-post__author">
          <span class="avatar-skeleton" style="width:44px;height:44px"></span>
          <div class="profile-post__meta" style="width:100%">
            <span class="skeleton" style="display:block;width:144px;height:16px"></span>
            <span class="skeleton" style="display:block;width:96px;height:13px;margin-top:8px"></span>
          </div>
        </div>
      </div>
      <span class="skeleton" style="display:block;width:62%;height:16px;margin-top:12px"></span>
      <span class="skeleton" style="display:block;width:100%;height:72px;border-radius:16px;margin-top:12px"></span>
    </article>
  `;
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

export function renderSection(title: string, content: string, action = ""): string {
  if (!content.trim()) {
    return "";
  }

  return `
    <section class="profile-section">
      <header class="profile-section__header">
        <h2 class="profile-section__title">${escapeHtml(title)}</h2>
        ${action}
      </header>
      <div class="profile-section__body">
        ${content}
      </div>
    </section>
  `;
}

export function renderProfileSections(profile: DisplayProfile): string {
  const educationSection = renderSection("Образование", renderEducation(profile));
  const workSection = renderSection("Место работы", renderWork(profile));
  const personalSection = renderSection("Личная информация", renderPersonal(profile));
  return `${educationSection}${workSection}${personalSection}`;
}
