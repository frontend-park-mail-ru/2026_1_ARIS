/**
 * Рендер страницы сообществ.
 */
import { renderModalCloseButton } from "../../components/modal-close/modal-close";
import { renderAvatarMarkup, resolveAvatarSrc } from "../../utils/avatar";
import type { CommunityBundle } from "../../api/communities";
import type { ProfilePost } from "../profile/types";
import { communitiesState, getVisibleCommunities } from "./state";
import {
  escapeHtml,
  formatPostExactTime,
  getCommunityName,
  getCommunityUrl,
  getMembersLabel,
  getRoleLabel,
} from "./helpers";
import type { CommunityFormStep } from "./types";

function renderCommunityAvatar(bundle: CommunityBundle, className: string): string {
  return renderAvatarMarkup(
    className,
    getCommunityName(bundle.community),
    bundle.community.avatarUrl,
    { width: 96, height: 96 },
  );
}

function renderCommunityMenu(bundle: CommunityBundle): string {
  const { community, permissions } = bundle;

  if (!permissions.canEdit && !permissions.canDelete) {
    return "";
  }

  return `
    <div class="community-actions">
      <button
        type="button"
        class="community-actions__toggle"
        data-community-menu-toggle="${community.id}"
        aria-label="Действия с сообществом"
        aria-expanded="false"
      >
        <span></span><span></span><span></span>
      </button>
      <div class="community-actions__menu" data-community-menu="${community.id}" hidden>
        ${
          permissions.canEdit
            ? `
              <button type="button" class="community-actions__item" data-community-edit="${community.id}">
                Изменить сообщество
              </button>
            `
            : ""
        }
        ${
          permissions.canDelete
            ? `
              <button type="button" class="community-actions__item community-actions__item--danger" data-community-delete-open="${community.id}">
                Удалить сообщество
              </button>
            `
            : ""
        }
      </div>
    </div>
  `;
}

function renderCommunityListItem(bundle: CommunityBundle): string {
  const community = bundle.community;
  const roleLabel = getRoleLabel(bundle.membership.role);

  return `
    <article class="community-list-card" data-community-card="${community.id}">
      <a href="${getCommunityUrl(community)}" data-link class="community-list-card__avatar-link">
        ${renderCommunityAvatar(bundle, "community-list-card__avatar")}
      </a>

      <div class="community-list-card__body">
        <a href="${getCommunityUrl(community)}" data-link class="community-list-card__title">
          ${escapeHtml(getCommunityName(community))}
        </a>
        <p class="community-list-card__meta">
          ${escapeHtml(community.type === "private" ? "Закрытое сообщество" : "Открытое сообщество")}
          ${roleLabel ? ` · ${escapeHtml(roleLabel)}` : ""}
        </p>
      </div>

      ${renderCommunityMenu(bundle)}
    </article>
  `;
}

function renderCommunitiesList(): string {
  if (communitiesState.loading) {
    return Array.from(
      { length: 3 },
      () => `
        <article class="community-list-card" aria-hidden="true">
          <span class="community-list-card__avatar skeleton"></span>
          <div class="community-list-card__body">
            <span class="skeleton" style="display:block;width:180px;height:16px"></span>
            <span class="skeleton" style="display:block;width:112px;height:13px;margin-top:7px"></span>
          </div>
        </article>
      `,
    ).join("");
  }

  const visible = getVisibleCommunities();

  if (!visible.length) {
    return `
      <p class="communities-page__empty">
        ${communitiesState.query.trim() ? "Ничего не найдено." : "Сообществ пока нет."}
      </p>
    `;
  }

  return visible.map(renderCommunityListItem).join("");
}

export function renderCommunitiesListContent(): string {
  return `
    <section class="communities-page" data-communities-page>
      <button type="button" class="profile-composer content-card communities-create-button" data-community-create-open>
        <span class="profile-composer__icon" aria-hidden="true">+</span>
        <span class="profile-composer__label">Создать новое сообщество</span>
      </button>

      <section class="communities-panel content-card">
        <label class="communities-search search-field" aria-label="Поиск по сообществам">
          <img class="communities-search__icon search-field__icon" src="/assets/img/icons/search.svg" alt="">
          <input
            class="communities-search__input search-field__input"
            type="text"
            value="${escapeHtml(communitiesState.query)}"
            placeholder="Поиск по сообществам"
            data-communities-search
          >
        </label>

        <p class="communities-panel__eyebrow">Ваши сообщества</p>

        ${communitiesState.errorMessage ? `<p class="communities-page__error">${escapeHtml(communitiesState.errorMessage)}</p>` : ""}

        <div class="communities-list" data-communities-list>
          ${renderCommunitiesList()}
        </div>
      </section>

      ${renderCommunityFormModal()}
      ${renderCommunityDeleteModal()}
    </section>
  `;
}

function renderCommunityHero(bundle: CommunityBundle): string {
  const community = bundle.community;
  const roleLabel = getRoleLabel(bundle.membership.role);
  const avatarSrc = resolveAvatarSrc(community.avatarUrl);

  return `
    <article class="community-hero content-card">
      <div class="community-hero__cover" aria-hidden="true">
        ${
          avatarSrc
            ? `<img src="${escapeHtml(avatarSrc)}" alt="" loading="eager" decoding="async">`
            : ""
        }
      </div>

      <div class="community-hero__body">
        <div class="community-hero__avatar-wrap">
          ${renderCommunityAvatar(bundle, "community-hero__avatar")}
        </div>

        <div class="community-hero__copy">
          <h1>${escapeHtml(getCommunityName(community))}</h1>
          <p>
            ${escapeHtml(getMembersLabel(bundle.membership.isMember ? 1 : 0))}
            ${roleLabel ? ` · ${escapeHtml(roleLabel)}` : ""}
          </p>
        </div>

        ${renderCommunityMenu(bundle)}
      </div>
    </article>
  `;
}

function renderCommunityDescription(bundle: CommunityBundle): string {
  return `
    <section class="community-side-card">
      <h2>Описание</h2>
      <p>${escapeHtml(bundle.community.bio || "Описание пока не заполнено.")}</p>
    </section>
  `;
}

function renderCommunityMeta(bundle: CommunityBundle): string {
  return `
    <section class="community-side-card">
      <h2>Сообщество</h2>
      <dl class="community-meta">
        <div>
          <dt>Тип</dt>
          <dd>${bundle.community.type === "private" ? "Закрытое" : "Открытое"}</dd>
        </div>
        <div>
          <dt>Адрес</dt>
          <dd>@${escapeHtml(bundle.community.username || String(bundle.community.id))}</dd>
        </div>
      </dl>
    </section>
  `;
}

function renderPostImages(images: string[]): string {
  if (!images.length) return "";

  const count = Math.min(images.length, 5);
  const modifiers: Record<number, string> = {
    1: "profile-post__images--single",
    2: "profile-post__images--double",
    3: "profile-post__images--triple",
    4: "profile-post__images--quad",
    5: "profile-post__images--five",
  };

  return `
    <div class="profile-post__images ${modifiers[count] ?? ""}">
      ${images
        .slice(0, 5)
        .map(
          (image, index) => `
            <img
              loading="lazy"
              decoding="async"
              class="profile-post__image${count === 3 && index === 0 ? " profile-post__image--lead" : ""}"
              src="${escapeHtml(image)}"
              alt="Изображение публикации"
            >
          `,
        )
        .join("")}
    </div>
  `;
}

function renderCommunityPost(post: ProfilePost, bundle: CommunityBundle): string {
  return `
    <article class="profile-post content-card" data-community-post="${escapeHtml(post.id)}">
      <header class="profile-post__header">
        <a class="profile-post__author" href="${getCommunityUrl(bundle.community)}" data-link>
          ${renderAvatarMarkup(
            "profile-post__avatar",
            getCommunityName(bundle.community),
            bundle.community.avatarUrl,
            { width: 44, height: 44 },
          )}
          <div class="profile-post__meta">
            <strong>${escapeHtml(getCommunityName(bundle.community))}</strong>
          </div>
        </a>

        ${
          bundle.permissions.canPost && post.isOwnPost
            ? `
              <div class="profile-post__actions">
                <button
                  type="button"
                  class="profile-post__menu-toggle"
                  data-community-post-menu-toggle="${escapeHtml(post.id)}"
                  aria-label="Действия с публикацией"
                  aria-expanded="false"
                >
                  <span></span><span></span><span></span>
                </button>
                <div class="profile-post__menu" data-community-post-menu="${escapeHtml(post.id)}" hidden>
                  <button
                    type="button"
                    class="profile-post__menu-action"
                    data-community-post-edit="${escapeHtml(post.id)}"
                  >
                    Редактировать
                  </button>
                  <button
                    type="button"
                    class="profile-post__menu-action profile-post__menu-action--danger"
                    data-community-post-delete="${escapeHtml(post.id)}"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            `
            : ""
        }
      </header>

      ${post.text ? `<p class="profile-post__text">${escapeHtml(post.text)}</p>` : ""}
      ${renderPostImages(post.images)}

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
  `;
}

function renderCommunityPostSkeleton(): string {
  return `
    <article class="profile-post content-card community-posts__saving-card" aria-hidden="true">
      <div class="profile-post__header">
        <div class="profile-post__author">
          <span class="avatar-skeleton community-skeleton__post-avatar"></span>
          <div class="profile-post__meta" style="width:100%">
            <span class="skeleton" style="display:block;width:144px;height:16px"></span>
            <span class="skeleton" style="display:block;width:96px;height:13px;margin-top:8px"></span>
          </div>
        </div>
      </div>
      <span class="skeleton community-posts__saving-text"></span>
      <span class="skeleton community-posts__saving-media"></span>
    </article>
  `;
}

function renderCommunityPostsDeleteSkeleton(count: number): string {
  return Array.from({ length: Math.max(1, count) }, () => renderCommunityPostSkeleton()).join("");
}

function renderCommunityPosts(bundle: CommunityBundle, posts: ProfilePost[]): string {
  const pending = communitiesState.pendingPost;
  const isSavingCreate = pending.mode === "create";
  const isSavingEdit = pending.mode === "edit" && !!pending.postId;
  const isSavingDelete = pending.mode === "delete" && !!pending.postId;

  if (isSavingDelete) {
    return `
      <section class="community-posts">
        ${
          bundle.permissions.canPost
            ? `
              <button type="button" class="profile-composer content-card" data-community-post-open>
                <span class="profile-composer__icon" aria-hidden="true">+</span>
                <span class="profile-composer__label">Создать запись от имени сообщества</span>
              </button>
            `
            : ""
        }

        <header class="profile-posts__header content-card">
          <h2>Публикации</h2>
        </header>

        <div class="profile-posts__list">
          ${renderCommunityPostsDeleteSkeleton(Math.min(Math.max(posts.length, 1), 3))}
        </div>
      </section>
    `;
  }

  const renderedPosts = [...posts];

  if (isSavingEdit && pending.postId) {
    const index = renderedPosts.findIndex((post) => post.id === pending.postId);
    if (index >= 0) {
      renderedPosts.splice(index, 1, {
        id: `community-post-skeleton-edit-${pending.postId}`,
        authorId: "",
        authorFirstName: "",
        authorLastName: "",
        authorUsername: "",
        authorAvatarLink: "",
        isOwnPost: false,
        text: "__COMMUNITY_SKELETON__",
        time: "",
        timeRaw: "",
        likes: 0,
        reposts: 0,
        comments: 0,
        media: [],
        images: [],
      });
    }
  }

  return `
    <section class="community-posts">
      ${
        bundle.permissions.canPost
          ? `
            <button type="button" class="profile-composer content-card" data-community-post-open>
              <span class="profile-composer__icon" aria-hidden="true">+</span>
              <span class="profile-composer__label">Создать запись от имени сообщества</span>
            </button>
          `
          : ""
      }

      <header class="profile-posts__header content-card">
        <h2>Публикации</h2>
      </header>

      <div class="profile-posts__list">
        ${
          renderedPosts.length || isSavingCreate
            ? `
              ${isSavingCreate ? renderCommunityPostSkeleton() : ""}
              ${renderedPosts
                .map((post) =>
                  post.text === "__COMMUNITY_SKELETON__"
                    ? renderCommunityPostSkeleton()
                    : renderCommunityPost(post, bundle),
                )
                .join("")}
            `
            : `
              <div class="profile-posts__empty content-card">
                <p class="profile-empty-copy">Публикаций пока нет</p>
              </div>
            `
        }
      </div>
    </section>
  `;
}

export function renderCommunityDetailContent(): string {
  const bundle = communitiesState.activeCommunity;

  if (!bundle) {
    return `
      <section class="communities-page" data-communities-page>
        <section class="communities-panel content-card">
          <p class="communities-page__empty">Сообщество не найдено.</p>
        </section>
      </section>
    `;
  }

  return `
    <section class="communities-page community-detail" data-communities-page>
      ${renderCommunityHero(bundle)}
      ${renderCommunityPosts(bundle, communitiesState.activePosts)}
      ${renderCommunityFormModal()}
      ${renderCommunityPostModal()}
      ${renderCommunityPostDeleteModal()}
      ${renderCommunityDeleteModal()}
    </section>
  `;
}

export function renderCommunityRightRail(): string {
  const bundle = communitiesState.activeCommunity;
  if (!bundle) return '<div class="profile-right-rail"></div>';

  return `
    <div class="profile-right-rail community-right-rail">
      ${renderCommunityDescription(bundle)}
      ${renderCommunityMeta(bundle)}
    </div>
  `;
}

export function renderCommunityFormModal(): string {
  const form = communitiesState.form;
  const title = form.mode === "edit" ? "Изменить сообщество" : "Создать сообщество";
  const avatarPreview = form.avatarPreviewUrl || form.currentAvatarUrl;
  const coverPreview = form.coverPreviewUrl || form.currentCoverUrl;

  return `
    <div class="community-modal" data-community-form-modal ${form.open ? "" : "hidden"}>
      <section class="community-modal__dialog" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <header class="community-modal__header">
          <h2 class="community-modal__title">${escapeHtml(title)}</h2>
          ${renderModalCloseButton({
            className: "community-modal__close",
            attributes: "data-community-form-close",
          })}
        </header>

        ${renderCommunityFormProgress(form.step)}

        <form class="community-form" data-community-form>
          ${renderCommunityFormStepContent(form.step, avatarPreview, coverPreview)}

          <p class="community-modal__error${form.errorMessage ? "" : " community-modal__error--hidden"}">
            ${form.errorMessage ? escapeHtml(form.errorMessage) : "&nbsp;"}
          </p>

          <div class="community-modal__actions">
            ${
              form.step > 1
                ? `
                  <button type="button" class="community-modal__button" data-community-form-prev>
                    Назад
                  </button>
                `
                : `
                  <button type="button" class="community-modal__button" data-community-form-close>
                    Отмена
                  </button>
                `
            }
            ${
              form.step < 5
                ? `
                  <button type="button" class="community-modal__button community-modal__button--primary" data-community-form-next>
                    Далее
                  </button>
                `
                : `
                  <button type="submit" class="community-modal__button community-modal__button--primary" ${form.isSaving ? "disabled" : ""}>
                    ${form.isSaving ? "Сохраняем..." : form.mode === "edit" ? "Применить" : "Создать"}
                  </button>
                `
            }
          </div>
        </form>
      </section>
    </div>
  `;
}

function renderCommunityFormProgress(step: CommunityFormStep): string {
  const isEditableNavigation = communitiesState.form.mode === "edit";
  const items: Array<{ step: CommunityFormStep; label: string }> = [
    { step: 1, label: "Название" },
    { step: 2, label: "Описание" },
    { step: 3, label: "Тип" },
    { step: 4, label: "Аватар" },
    { step: 5, label: "Обложка" },
  ];

  return `
    <div class="community-form__progress" aria-label="${isEditableNavigation ? "Шаги редактирования сообщества" : "Шаги создания сообщества"}">
      ${items
        .map((item, index) => {
          const modifier =
            item.step === step
              ? " community-form__progress-item--active"
              : item.step < step
                ? " community-form__progress-item--done"
                : "";
          const clickableModifier = isEditableNavigation
            ? " community-form__progress-step--clickable"
            : "";
          const stepContent = `
            <span class="community-form__progress-dot">${item.step}</span>
            <span class="community-form__progress-label">${escapeHtml(item.label)}</span>
          `;

          return `
            <div class="community-form__progress-segment">
              ${
                isEditableNavigation
                  ? `
                    <button
                      type="button"
                      class="community-form__progress-step community-form__progress-item${modifier}${clickableModifier}"
                      data-community-form-step="${item.step}"
                      aria-current="${item.step === step ? "step" : "false"}"
                    >
                      ${stepContent}
                    </button>
                  `
                  : `
                    <div class="community-form__progress-step community-form__progress-item${modifier}">
                      ${stepContent}
                    </div>
                  `
              }
              ${index < items.length - 1 ? '<div class="community-form__progress-line"></div>' : ""}
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderCommunityFormStepContent(
  step: CommunityFormStep,
  avatarPreview: string,
  coverPreview: string,
): string {
  const form = communitiesState.form;

  if (step === 1) {
    return `
      <div class="community-form__step">
        <p class="community-form__step-title">Выберите название сообщества</p>
        <label class="community-form__field">
          <span>Название</span>
          <input
            name="title"
            value="${escapeHtml(form.title)}"
            maxlength="120"
            required
            data-community-title
            placeholder="Например, Клуб настольных игр"
          >
        </label>
      </div>
    `;
  }

  if (step === 2) {
    return `
      <div class="community-form__step">
        <p class="community-form__step-title">Сформулируйте краткое описание</p>
        <label class="community-form__field">
          <span>Описание</span>
          <textarea
            name="bio"
            rows="5"
            maxlength="500"
            data-community-bio
            placeholder="Расскажите, для кого это сообщество и о чём оно."
          >${escapeHtml(form.bio)}</textarea>
        </label>
      </div>
    `;
  }

  if (step === 3) {
    return `
      <div class="community-form__step">
        <p class="community-form__step-title">Выберите тип сообщества</p>
        <div class="community-form__type-grid" role="radiogroup" aria-label="Тип сообщества">
          <button
            type="button"
            class="community-form__type-option${form.type === "public" ? " community-form__type-option--active" : ""}"
            data-community-type="public"
            aria-pressed="${form.type === "public"}"
          >
            <strong>Открытое</strong>
            <span>Сообщество видно всем, публикации доступны публично.</span>
          </button>
          <button
            type="button"
            class="community-form__type-option${form.type === "private" ? " community-form__type-option--active" : ""}"
            data-community-type="private"
            aria-pressed="${form.type === "private"}"
          >
            <strong>Закрытое</strong>
            <span>Сообщество для ограниченного круга участников.</span>
          </button>
        </div>
      </div>
    `;
  }

  if (step === 4) {
    return `
      <div class="community-form__step">
        <p class="community-form__step-title">Выберите аватар для сообщества</p>
        <div class="community-form__media-stage community-form__media-stage--avatar">
          ${renderAvatarMarkup(
            "community-form__avatar",
            form.title || "Сообщество",
            avatarPreview,
            {
              width: 124,
              height: 124,
            },
          )}
        </div>
        ${
          form.mode === "create"
            ? '<p class="community-form__hint">Вы сможете изменить его позже.</p>'
            : ""
        }
        <input type="file" accept="image/png,image/jpeg,image/webp,image/jpg" hidden data-community-avatar-input>
        <button type="button" class="community-form__button" data-community-avatar-pick>
          Загрузить изображение
        </button>
      </div>
    `;
  }

  return `
    <div class="community-form__step">
      <p class="community-form__step-title">Выберите обложку для сообщества</p>
      <div class="community-form__media-stage community-form__media-stage--cover">
        ${
          coverPreview
            ? `<img class="community-form__cover" src="${escapeHtml(coverPreview)}" alt="Обложка сообщества">`
            : '<div class="community-form__cover community-form__cover--placeholder"></div>'
        }
      </div>
      ${
        form.mode === "create"
          ? '<p class="community-form__hint">Вы сможете добавить или заменить её позже.</p>'
          : ""
      }
      <input type="file" accept="image/png,image/jpeg,image/webp,image/jpg" hidden data-community-cover-input>
      <button type="button" class="community-form__button" data-community-cover-pick>
        Загрузить изображение
      </button>
    </div>
  `;
}

export function renderCommunityPostModal(): string {
  const composer = communitiesState.postComposer;
  const title = composer.mode === "edit" ? "Редактировать публикацию" : "Новая публикация";
  const submitLabel = composer.mode === "edit" ? "Сохранить" : "Опубликовать";

  return `
    <div class="profile-post-modal" data-community-post-modal ${composer.open ? "" : "hidden"}>
      <section class="profile-post-modal__dialog" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <header class="profile-post-modal__header">
          <h2 class="profile-post-modal__title">${escapeHtml(title)}</h2>
          ${renderModalCloseButton({
            className: "profile-post-modal__close",
            attributes: "data-community-post-close",
          })}
        </header>
        <form data-community-post-form>
          <textarea
            id="community-post-text"
            name="communityPostText"
            class="profile-post-modal__textarea"
            data-community-post-text
            rows="8"
            maxlength="5000"
            placeholder="${composer.mode === "edit" ? "Обновите публикацию" : "Что нового в сообществе?"}"
          >${escapeHtml(composer.text)}</textarea>

          <input
            id="community-post-images"
            name="communityPostImages"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/jpg"
            multiple
            hidden
            data-community-post-image-input
          >

          <div class="profile-post-modal__toolbar">
            <button type="button" class="profile-post-modal__button profile-post-modal__button--secondary" data-community-post-pick-image>
              ${composer.mediaItems.length >= 5 ? "Достигнут лимит 5 изображений" : "+ Изображения"}
            </button>
          </div>

          <div class="profile-post-modal__previews" ${composer.mediaItems.length ? "" : "hidden"}>
            ${composer.mediaItems
              .map(
                (item, index) => `
                  <div class="profile-post-modal__preview">
                    <img src="${escapeHtml(item.mediaURL)}" alt="Изображение ${index + 1}">
                    <button type="button" class="profile-post-modal__preview-remove" data-community-post-remove-image="${index}" aria-label="Удалить изображение">[X]</button>
                  </div>
                `,
              )
              .join("")}
          </div>

          <p class="profile-post-modal__error${composer.errorMessage ? "" : " profile-post-modal__error--hidden"}">
            ${composer.errorMessage ? escapeHtml(composer.errorMessage) : "&nbsp;"}
          </p>

          <div class="profile-post-modal__actions">
            <button
              type="submit"
              class="profile-post-modal__button profile-post-modal__button--primary"
              data-community-post-save
            >
              ${submitLabel}
            </button>
            <button type="button" class="profile-post-modal__button" data-community-post-close>
              Отмена
            </button>
          </div>
        </form>
      </section>
    </div>
  `;
}

export function renderCommunityPostDeleteModal(): string {
  return `
    <div class="profile-post-delete-modal" data-community-post-delete-modal ${communitiesState.postComposer.deleteConfirmPostId ? "" : "hidden"}>
      <section
        class="profile-post-delete-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Удалить публикацию"
      >
        <header class="profile-post-delete-modal__header">
          <h2 class="profile-post-delete-modal__title">Удалить публикацию</h2>
          ${renderModalCloseButton({
            className: "profile-post-delete-modal__close",
            attributes: "data-community-post-delete-close",
          })}
        </header>

        <p class="profile-post-delete-modal__text">
          Вы действительно хотите удалить этот пост?
        </p>

        <div class="profile-post-delete-modal__actions">
          <button
            type="button"
            class="profile-post-delete-modal__button profile-post-delete-modal__button--primary"
            data-community-post-delete-confirm
          >
            Удалить пост
          </button>
          <button
            type="button"
            class="profile-post-delete-modal__button"
            data-community-post-delete-close
          >
            Отмена
          </button>
        </div>
      </section>
    </div>
  `;
}

export function renderCommunityDeleteModal(): string {
  const id = communitiesState.deleteConfirmId;
  const bundle = id
    ? (communitiesState.items.find((item) => item.community.id === id) ??
      communitiesState.activeCommunity)
    : null;
  if (!id || !bundle) return "";

  return `
    <div class="community-modal" data-community-delete-modal>
      <section class="community-modal__dialog community-modal__dialog--small" role="dialog" aria-modal="true" aria-label="Удалить сообщество">
        <header class="community-modal__header">
          <h2 class="community-modal__title">Удалить сообщество</h2>
          ${renderModalCloseButton({
            className: "community-modal__close",
            attributes: "data-community-delete-close",
          })}
        </header>

        <div class="community-modal__identity">
          ${renderCommunityAvatar(bundle, "community-modal__avatar")}
          <p>${escapeHtml(getCommunityName(bundle.community))}</p>
        </div>

        <p class="community-modal__text">Вы действительно хотите удалить это сообщество?</p>

        <div class="community-modal__actions">
          <button type="button" class="community-modal__button community-modal__button--primary" data-community-delete-confirm="${id}">
            Удалить сообщество
          </button>
          <button type="button" class="community-modal__button" data-community-delete-close>
            Отмена
          </button>
        </div>
      </section>
    </div>
  `;
}

export function refreshCommunitiesPage(root: ParentNode = document): void {
  const container =
    root instanceof HTMLElement && root.matches("[data-communities-page]")
      ? root
      : root.querySelector("[data-communities-page]");
  if (!(container instanceof HTMLElement)) return;

  const isDetail = container.classList.contains("community-detail");
  const template = document.createElement("template");
  template.innerHTML = (
    isDetail ? renderCommunityDetailContent() : renderCommunitiesListContent()
  ).trim();
  const next = template.content.firstElementChild;
  if (!(next instanceof HTMLElement)) return;
  container.replaceWith(next);
}

export function refreshCommunitiesList(root: ParentNode = document): void {
  const list =
    root instanceof HTMLElement && root.matches("[data-communities-list]")
      ? root
      : root.querySelector("[data-communities-list]");
  if (list instanceof HTMLElement) {
    list.innerHTML = renderCommunitiesList();
  }
}
