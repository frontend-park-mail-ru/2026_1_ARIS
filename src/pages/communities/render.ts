/**
 * Рендер страницы сообществ.
 */
import { renderModalCloseButton } from "../../components/modal-close/modal-close";
import { renderAvatarMarkup, resolveAvatarSrc } from "../../utils/avatar";
import { resolveMediaUrl } from "../../utils/media";
import type { CommunityBundle } from "../../api/communities";
import type { ProfilePost } from "../profile/types";
import { communitiesState, getVisibleCommunities, getVisibleCommunityMembers } from "./state";
import { getCommunityMediaAvatarInitials, syncCommunityMediaEditorsUi } from "./media-editor";
import {
  canDeleteCommunityPost,
  canEditCommunityPost,
  canManageCommunityMemberRole,
  canRemoveCommunityMember,
  escapeHtml,
  formatMemberJoinDate,
  formatPostExactTime,
  getCommunityName,
  getCommunityUrl,
  getMemberDisplayName,
  getMembersLabel,
  getPostAuthorDisplayName,
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

  if (
    !permissions.canEditCommunity &&
    !permissions.canDeleteCommunity &&
    !permissions.canManageMembers &&
    !permissions.canChangeRoles
  ) {
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
          permissions.canEditCommunity
            ? `
              <button type="button" class="community-actions__item" data-community-edit="${community.id}">
                Изменить сообщество
              </button>
            `
            : ""
        }
        ${
          permissions.canManageMembers || permissions.canChangeRoles
            ? `
              <button type="button" class="community-actions__item" data-community-members-open="${community.id}">
                Участники сообщества
              </button>
            `
            : ""
        }
        ${
          permissions.canDeleteCommunity
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
          ${roleLabel ? escapeHtml(roleLabel) : "Сообщество"}
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
        ${communitiesState.query.trim() ? "Ничего не найдено." : "Список пуст."}
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
      ${communitiesState.activeCommunity ? renderCommunityMembersManagerModal(communitiesState.activeCommunity) : ""}
      ${renderMemberConfirmModal()}
      ${renderCommunityLeaveModal()}
      ${renderCommunityDeleteModal()}
    </section>
  `;
}

function renderCommunityHero(bundle: CommunityBundle): string {
  const community = bundle.community;
  const roleLabel = getRoleLabel(bundle.membership.role);
  const coverSrc = resolveAvatarSrc(community.coverUrl);
  const visibleMembers = communitiesState.activeMembers.filter((member) => !member.blocked);

  return `
    <article class="community-hero content-card">
      <div class="community-hero__cover" aria-hidden="true">
        ${
          coverSrc
            ? `<img src="${escapeHtml(coverSrc)}" alt="" loading="eager" decoding="async">`
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
            ${
              communitiesState.membershipLoading
                ? `<span class="skeleton" style="display:inline-block;width:130px;height:14px;vertical-align:middle;border-radius:4px"></span>`
                : `${escapeHtml(getMembersLabel(visibleMembers.length))}${roleLabel ? ` · ${escapeHtml(roleLabel)}` : ""}`
            }
          </p>
        </div>

        ${renderCommunityPrimaryAction(bundle)}
        ${communitiesState.membershipLoading ? "" : renderCommunityMenu(bundle)}
      </div>
    </article>
  `;
}

function renderCommunityPrimaryAction(bundle: CommunityBundle): string {
  if (communitiesState.membershipLoading) {
    return `
      <button type="button" class="community-hero__cta community-hero__cta--muted" disabled aria-busy="true">
        Пожалуйста, подождите...
      </button>
    `;
  }

  if (bundle.membership.blocked) {
    return `
      <button type="button" class="community-hero__cta community-hero__cta--muted" disabled>
        Вы заблокированы
      </button>
    `;
  }

  if (!bundle.membership.isMember) {
    return `
      <button type="button" class="community-hero__cta community-hero__cta--primary" data-community-join="${bundle.community.id}">
        Вступить в сообщество
      </button>
    `;
  }

  if (bundle.membership.role !== "owner") {
    return `
      <button type="button" class="community-hero__cta community-hero__cta--muted" data-community-leave="${bundle.community.id}">
        Покинуть сообщество
      </button>
    `;
  }

  return "";
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
          <dt>Адрес</dt>
          <dd>@${escapeHtml(bundle.community.username || String(bundle.community.id))}</dd>
        </div>
      </dl>
    </section>
  `;
}

function renderCommunityMembersCard(bundle: CommunityBundle): string {
  const visibleMembers = communitiesState.activeMembers
    .filter((member) => !member.blocked)
    .slice(0, 6);

  return `
    <section class="community-side-card">
      <div class="community-side-card__header">
        <h2>Участники</h2>
        <span>${visibleMembers.length}</span>
      </div>
      ${
        communitiesState.membershipLoading ||
        (communitiesState.membersLoading && !communitiesState.membersLoaded)
          ? '<p class="community-members-card__empty">Загружаем участников...</p>'
          : visibleMembers.length
            ? `
            <div class="community-members-card">
              ${visibleMembers
                .map(
                  (member) => `
                    <a class="community-members-card__item" href="/id${member.profileId}" data-link>
                      ${renderAvatarMarkup(
                        "community-members-card__avatar",
                        getMemberDisplayName(member),
                        member.avatarUrl,
                        { width: 36, height: 36 },
                      )}
                      <div class="community-members-card__copy">
                        <strong>${escapeHtml(getMemberDisplayName(member))}</strong>
                        <span>${escapeHtml(getRoleLabel(member.role))}</span>
                      </div>
                    </a>
                  `,
                )
                .join("")}
            </div>
          `
            : '<p class="community-members-card__empty">Список пуст.</p>'
      }
      ${
        bundle.permissions.canManageMembers || bundle.permissions.canChangeRoles
          ? `
            <button type="button" class="community-side-card__button" data-community-members-open="${bundle.community.id}">
              Управление участниками
            </button>
          `
          : ""
      }
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
  const canEdit = canEditCommunityPost(post, bundle, communitiesState.viewerProfileId);
  const canDelete = canDeleteCommunityPost(post, bundle, communitiesState.viewerProfileId);
  const isOfficialPost = Number(post.authorId) === bundle.community.profileId;

  return `
    <article class="profile-post content-card" data-community-post="${escapeHtml(post.id)}">
      <header class="profile-post__header">
        <a
          class="profile-post__author"
          href="${isOfficialPost ? getCommunityUrl(bundle.community) : `/id${escapeHtml(post.authorId)}`}"
          data-link
        >
          ${renderAvatarMarkup(
            "profile-post__avatar",
            getPostAuthorDisplayName(post),
            post.authorAvatarLink,
            { width: 44, height: 44 },
          )}
          <div class="profile-post__meta">
            <strong>${escapeHtml(getPostAuthorDisplayName(post))}</strong>
            ${isOfficialPost ? '<span class="community-post__badge">Сообщество</span>' : ""}
          </div>
        </a>

        ${
          canEdit || canDelete
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
                  ${
                    canEdit
                      ? `
                        <button
                          type="button"
                          class="profile-post__menu-action"
                          data-community-post-edit="${escapeHtml(post.id)}"
                        >
                          Редактировать
                        </button>
                      `
                      : ""
                  }
                  ${
                    canDelete
                      ? `
                        <button
                          type="button"
                          class="profile-post__menu-action profile-post__menu-action--danger"
                          data-community-post-delete="${escapeHtml(post.id)}"
                        >
                          Удалить
                        </button>
                      `
                      : ""
                  }
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
          <button
            type="button"
            class="profile-post__stat profile-post__stat-button${
              post.isLiked ? " profile-post__stat-button--liked" : ""
            }"
            data-community-post-like="${escapeHtml(post.id)}"
            aria-pressed="${post.isLiked ? "true" : "false"}"
            aria-label="Лайки"
          >
            <span class="profile-post__stat-icon">
              <img src="/assets/img/icons/heart.svg" class="profile-post__icon" alt="" />
            </span>
            <span>${post.likes}</span>
          </button>
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
  const searchQuery = communitiesState.postSearchQuery.trim().toLowerCase();

  if (isSavingDelete) {
    return `
      <section class="community-posts">
        ${renderCommunityPostsControls(bundle)}

        <div class="profile-posts__list">
          ${renderCommunityPostsDeleteSkeleton(Math.min(Math.max(posts.length, 1), 3))}
        </div>
      </section>
    `;
  }

  const renderedPosts = searchQuery
    ? posts.filter((post) => getCommunityPostSearchableText(post).includes(searchQuery))
    : [...posts];

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
        isLiked: false,
        reposts: 0,
        comments: 0,
        media: [],
        images: [],
      });
    }
  }

  return `
    <section class="community-posts">
      ${renderCommunityPostsControls(bundle)}

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
                <p class="profile-empty-copy">${
                  searchQuery ? "Ничего не найдено." : "Список пуст."
                }</p>
              </div>
            `
        }
      </div>
    </section>
  `;
}

function getCommunityPostSearchableText(post: ProfilePost): string {
  return [
    post.text,
    post.authorFirstName,
    post.authorLastName,
    post.authorUsername,
    post.time,
    post.timeRaw,
  ]
    .join(" ")
    .toLowerCase();
}

function renderCommunityPostsControls(bundle: CommunityBundle): string {
  return `
    <div class="community-posts__controls content-card">
      ${
        communitiesState.postSearchOpen
          ? `
            <label class="community-posts__search search-field" aria-label="Поиск по публикациям сообщества">
              <span class="community-posts__search-icon search-field__icon" aria-hidden="true">
                <img src="/assets/img/icons/search.svg" alt="">
              </span>
              <input
                type="search"
                class="community-posts__search-input search-field__input"
                placeholder="Поиск"
                value="${escapeHtml(communitiesState.postSearchQuery)}"
                data-community-post-search
              >
              <button
                type="button"
                class="community-posts__search-close"
                data-community-post-search-close
                aria-label="Закрыть поиск по публикациям"
              >
                ×
              </button>
            </label>
          `
          : `
            <header class="community-posts__header">
              ${renderCommunityComposerActions(bundle)}
              <button
                type="button"
                class="community-posts__search-toggle"
                data-community-post-search-open
                aria-label="Открыть поиск по публикациям"
              >
                <img src="/assets/img/icons/search.svg" alt="">
              </button>
            </header>
          `
      }

      ${renderCommunityPostFeedSwitcher()}
    </div>
  `;
}

function renderCommunityComposerActions(bundle: CommunityBundle): string {
  const canPostAsCommunity = bundle.permissions.canPost && bundle.permissions.canPostAsCommunity;
  const canPostAsMember = bundle.permissions.canPost && bundle.permissions.canPostAsMember;

  if (!canPostAsCommunity && !canPostAsMember) {
    return "";
  }

  return `
    <div class="community-posts__composer-row">
      <button type="button" class="profile-composer" data-community-post-open>
        <span class="profile-composer__icon" aria-hidden="true">+</span>
        <span class="profile-composer__label">Написать пост</span>
      </button>
    </div>
  `;
}

function renderCommunityPostFeedSwitcher(): string {
  return `
    <div class="community-posts__feed-switcher">
      <button
        type="button"
        class="community-posts__feed-button${communitiesState.postFeedMode === "all" ? " community-posts__feed-button--active" : ""}"
        data-community-post-feed="all"
      >
        Все публикации
      </button>
      <button
        type="button"
        class="community-posts__feed-button${communitiesState.postFeedMode === "official" ? " community-posts__feed-button--active" : ""}"
        data-community-post-feed="official"
      >
        Посты сообщества
      </button>
    </div>
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

  if (bundle.membership.blocked) {
    return `
      <section class="communities-page community-detail" data-communities-page>
        <article class="community-hero content-card">
          <div class="community-hero__cover" aria-hidden="true"></div>
          <div class="community-hero__body">
            <div class="community-hero__avatar-wrap">
              ${renderCommunityAvatar(bundle, "community-hero__avatar")}
            </div>
            <div class="community-hero__copy">
              <h1>${escapeHtml(getCommunityName(bundle.community))}</h1>
            </div>
          </div>
        </article>
        <section class="communities-panel content-card" style="text-align:center;padding:32px 24px">
          <p class="communities-page__empty" style="margin:0">Вы заблокированы в этом сообществе.</p>
        </section>
      </section>
    `;
  }

  return `
    <section class="communities-page community-detail" data-communities-page>
      ${renderCommunityHero(bundle)}
      ${renderCommunityPosts(bundle, communitiesState.activePosts)}
      ${renderCommunityFormModal()}
      ${renderCommunityMembersManagerModal(bundle)}
      ${renderMemberConfirmModal()}
      ${renderCommunityPostModal()}
      ${renderCommunityPostDeleteModal()}
      ${renderCommunityLeaveModal()}
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
      ${renderCommunityMembersCard(bundle)}
    </div>
  `;
}

export function renderCommunityFormModal(): string {
  const form = communitiesState.form;
  const title = form.mode === "edit" ? "Изменить сообщество" : "Создать сообщество";

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
          ${renderCommunityFormStepContent(form.step)}

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
              form.step < 4
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
    { step: 3, label: "Аватар" },
    { step: 4, label: "Обложка" },
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

function renderCommunityFormStepContent(step: CommunityFormStep): string {
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
        <p class="community-form__step-title">Выберите аватар для сообщества</p>
        ${renderCommunityMediaEditor("avatar")}
      </div>
    `;
  }

  return `
    <div class="community-form__step">
      <p class="community-form__step-title">Выберите обложку для сообщества</p>
      ${renderCommunityMediaEditor("cover")}
    </div>
  `;
}

function renderCommunityMediaEditor(kind: "avatar" | "cover"): string {
  const isAvatar = kind === "avatar";
  const editor = isAvatar ? communitiesState.form.avatarEditor : communitiesState.form.coverEditor;
  const currentSrc = editor.removed
    ? ""
    : isAvatar
      ? resolveAvatarSrc(communitiesState.form.currentAvatarUrl)
      : resolveMediaUrl(communitiesState.form.currentCoverUrl);
  const hasCurrentImage = Boolean(currentSrc);
  const canResetChanges = editor.dirty;
  const editorLabel = isAvatar ? "Аватар сообщества" : "Обложка сообщества";
  const currentImageMarkup = hasCurrentImage
    ? `
        <div
          class="community-media-editor__current-image${isAvatar ? " community-media-editor__current-image--avatar" : ""}"
          data-community-media-current-image="${kind}"
          style="background-image: url('${escapeHtml(currentSrc)}');"
          aria-label="${escapeHtml(editorLabel)}"
          role="img"
        ></div>
      `
    : isAvatar
      ? `
          <div
            class="community-media-editor__current-image community-media-editor__current-image--avatar community-media-editor__current-image--placeholder"
            data-community-media-current-image="${kind}"
            aria-hidden="true"
          >
            <span class="community-media-editor__initials">${escapeHtml(getCommunityMediaAvatarInitials())}</span>
          </div>
        `
      : `
          <div
            class="community-media-editor__current-image community-media-editor__current-image--cover community-media-editor__current-image--placeholder"
            data-community-media-current-image="${kind}"
            aria-hidden="true"
          ></div>
        `;

  return `
    <div class="community-media-editor${isAvatar ? " community-media-editor--avatar" : " community-media-editor--cover"}" data-community-media-editor="${kind}">
      <div class="community-media-editor__preview">
        <div class="community-media-editor__crop-stage community-media-editor__crop-stage--${kind}" data-community-media-stage="${kind}">
          <div
            class="community-media-editor__crop-image"
            data-community-media-crop-image="${kind}"
            hidden
            aria-label="${escapeHtml(editorLabel)}"
            role="img"
          ></div>
          ${currentImageMarkup}
          ${
            isAvatar
              ? '<div class="community-media-editor__crop-ring" aria-hidden="true"></div>'
              : ""
          }
        </div>
      </div>

      <input type="file" accept="image/png,image/jpeg,image/webp,image/jpg" hidden data-community-${kind}-input>

      <div class="community-media-editor__controls" data-community-media-zoom-wrap="${kind}" hidden>
        <div class="community-media-editor__tools">
          <button
            type="button"
            class="community-media-editor__button community-media-editor__button--secondary community-media-editor__tool-button"
            data-community-media-rotate-left="${kind}"
          >
            Повернуть влево
          </button>
          <button
            type="button"
            class="community-media-editor__button community-media-editor__button--secondary community-media-editor__tool-button"
            data-community-media-rotate-right="${kind}"
          >
            Повернуть вправо
          </button>
        </div>

        <button
          type="button"
          class="community-media-editor__button community-media-editor__button--secondary community-media-editor__button--full"
          data-community-media-pick="${kind}"
        >
          ${hasCurrentImage || editor.objectUrl ? "Заменить изображение" : "Выбрать изображение"}
        </button>

        <button
          type="button"
          class="community-media-editor__button community-media-editor__button--secondary community-media-editor__button--full community-media-editor__button--danger"
          data-community-media-delete="${kind}"
          ${canResetChanges ? "" : "hidden"}
        >
          ${hasCurrentImage ? "Сбросить изменения" : "Удалить изображение"}
        </button>

        <span class="community-media-editor__zoom-label">Масштаб</span>
        <input
          type="range"
          class="community-media-editor__zoom-input"
          min="100"
          max="300"
          step="1"
          value="100"
          data-community-media-zoom="${kind}"
        >
      </div>

      <p class="community-media-editor__error" data-community-media-error="${kind}" hidden></p>
    </div>
  `;
}

export function renderCommunityPostModal(): string {
  const composer = communitiesState.postComposer;
  const bundle = communitiesState.activeCommunity;
  const title = composer.mode === "edit" ? "Редактировать публикацию" : "Новая публикация";
  const submitLabel = composer.mode === "edit" ? "Сохранить" : "Опубликовать";
  const canPostAsCommunity = Boolean(
    bundle?.permissions.canPost && bundle.permissions.canPostAsCommunity,
  );
  const canPostAsMember = Boolean(
    bundle?.permissions.canPost && bundle.permissions.canPostAsMember,
  );
  const authorLabel =
    composer.authorMode === "community"
      ? bundle
        ? getCommunityName(bundle.community)
        : "Сообщество"
      : "Ваш профиль";

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
        ${
          composer.mode === "create"
            ? `
              <div class="community-post-modal__author">
                <div class="community-post-modal__author-options${canPostAsCommunity && canPostAsMember ? "" : " community-post-modal__author-options--single"}" role="group" aria-label="Выбор автора публикации">
                  ${
                    canPostAsCommunity
                      ? `
                        <button
                          type="button"
                          class="community-post-modal__author-button${composer.authorMode === "community" ? " community-post-modal__author-button--active" : ""}"
                          data-community-post-author-mode="community"
                          aria-pressed="${composer.authorMode === "community" ? "true" : "false"}"
                        >
                          От имени сообщества
                        </button>
                      `
                      : ""
                  }
                  ${
                    canPostAsMember
                      ? `
                        <button
                          type="button"
                          class="community-post-modal__author-button${composer.authorMode === "member" ? " community-post-modal__author-button--active" : ""}"
                          data-community-post-author-mode="member"
                          aria-pressed="${composer.authorMode === "member" ? "true" : "false"}"
                        >
                          От своего имени
                        </button>
                      `
                      : ""
                  }
                </div>
              </div>
            `
            : `
              <p class="profile-post-modal__scope">
                Вы редактируете публикацию от имени:
                <strong>${escapeHtml(authorLabel)}</strong>
              </p>
            `
        }
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

function renderCommunityMembersManagerModal(bundle: CommunityBundle): string {
  const manager = communitiesState.membersManager;
  const members = getVisibleCommunityMembers();

  return `
    <div class="community-modal" data-community-members-modal ${manager.open ? "" : "hidden"}>
      <section class="community-modal__dialog community-modal__dialog--members" role="dialog" aria-modal="true" aria-label="Участники сообщества">
        <header class="community-modal__header">
          <h2 class="community-modal__title">Участники сообщества</h2>
          ${renderModalCloseButton({
            className: "community-modal__close",
            attributes: "data-community-members-close",
          })}
        </header>

        <div class="community-members-manager__toolbar">
          <label class="communities-search search-field" aria-label="Поиск участников">
            <img class="communities-search__icon search-field__icon" src="/assets/img/icons/search.svg" alt="">
            <input
              class="communities-search__input search-field__input"
              type="text"
              value="${escapeHtml(manager.query)}"
              placeholder="Поиск по участникам"
              data-community-members-search
            >
          </label>

          <label class="community-members-manager__toggle">
            <input type="checkbox" ${manager.includeBlocked ? "checked" : ""} data-community-members-include-blocked>
            <span>Показывать заблокированных</span>
          </label>
        </div>

        ${
          manager.errorMessage
            ? `<p class="community-modal__error">${escapeHtml(manager.errorMessage)}</p>`
            : ""
        }

        <div class="community-members-manager__list">
          ${
            communitiesState.membersLoading
              ? '<p class="communities-page__empty">Загружаем участников...</p>'
              : members.length
                ? members
                    .map((member) => {
                      const canChange = canManageCommunityMemberRole(
                        bundle,
                        member,
                        communitiesState.viewerProfileId,
                      );
                      const canRemove = canRemoveCommunityMember(
                        bundle,
                        member,
                        communitiesState.viewerProfileId,
                      );
                      const isProcessing =
                        manager.changingRoleProfileId === member.profileId ||
                        manager.removingProfileId === member.profileId;
                      const profileHref = `/id${member.profileId}`;
                      const roleOptions = ["admin", "moderator", "member", "blocked"];

                      return `
                        <article class="community-members-manager__item${isProcessing ? " community-members-manager__item--processing" : ""}">
                          <div class="community-members-manager__identity">
                            <a class="community-members-manager__avatar-link" href="${profileHref}" data-link>
                              ${renderAvatarMarkup(
                                "community-members-manager__avatar",
                                getMemberDisplayName(member),
                                member.avatarUrl,
                                { width: 48, height: 48 },
                              )}
                            </a>
                            <div class="community-members-manager__copy">
                              <a href="${profileHref}" data-link>${escapeHtml(getMemberDisplayName(member))}</a>
                              <span>@${escapeHtml(member.username)}</span>
                            </div>
                          </div>

                          <div class="community-members-manager__controls">
                            ${
                              member.blocked
                                ? `<span class="community-members-manager__role">${escapeHtml(getRoleLabel("blocked"))}</span>`
                                : canChange
                                  ? `
                                  <details class="community-members-manager__role-select">
                                    <summary class="community-members-manager__role-current">
                                      <span>${escapeHtml(getRoleLabel(member.role))}</span>
                                    </summary>
                                    <div class="community-members-manager__role-menu" role="listbox" aria-label="Роль участника">
                                      ${roleOptions
                                        .map(
                                          (role) => `
                                          <button
                                            type="button"
                                            class="community-members-manager__role-option${member.role === role ? " community-members-manager__role-option--active" : ""}"
                                            data-community-member-role="${member.profileId}"
                                            data-community-member-role-value="${role}"
                                            role="option"
                                            aria-selected="${member.role === role ? "true" : "false"}"
                                            ${isProcessing || member.role === role ? "disabled" : ""}
                                          >
                                            ${escapeHtml(getRoleLabel(role))}
                                          </button>
                                        `,
                                        )
                                        .join("")}
                                    </div>
                                  </details>
                                `
                                  : `<span class="community-members-manager__role">${escapeHtml(getRoleLabel(member.role))}</span>`
                            }
                            ${
                              member.blocked && canRemove
                                ? `
                                  <button
                                    type="button"
                                    class="community-members-manager__remove"
                                    data-community-member-unblock="${member.profileId}"
                                    ${isProcessing ? "disabled" : ""}
                                  >
                                    ${isProcessing ? "Пожалуйста, подождите..." : "Удалить из чёрного списка"}
                                  </button>
                                `
                                : !member.blocked && canRemove
                                  ? `
                                  <button
                                    type="button"
                                    class="community-members-manager__remove"
                                    data-community-member-remove="${member.profileId}"
                                    ${isProcessing ? "disabled" : ""}
                                  >
                                    ${isProcessing ? "Пожалуйста, подождите..." : "Удалить"}
                                  </button>
                                `
                                  : ""
                            }
                          </div>
                        </article>
                      `;
                    })
                    .join("")
                : `<p class="communities-page__empty">${
                    manager.query.trim() ? "Ничего не найдено." : "Список пуст."
                  }</p>`
          }
        </div>
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

export function renderMemberConfirmModal(): string {
  const action = communitiesState.membersManager.confirmAction;
  if (!action) return "";

  const member = communitiesState.activeMembers.find((m) => m.profileId === action.profileId);
  if (!member) return "";

  const displayName = getMemberDisplayName(member);
  const joinedDate = formatMemberJoinDate(member.joinedAt);
  const profileHref = `/id${member.profileId}`;

  let title: string;
  let text: string;
  if (action.type === "remove" && member.blocked) {
    title = "Разблокировать участника";
    text = `Вы действительно хотите удалить этого пользователя из чёрного списка? Пользователь сможет сам вступить в сообщество.`;
  } else if (action.type === "remove") {
    title = "Удалить участника";
    text = `Вы действительно хотите удалить этого пользователя из сообщества?`;
  } else if (action.newRole === "blocked") {
    title = "Заблокировать участника";
    text = `Вы действительно хотите заблокировать этого пользователя?`;
  } else {
    title = "Изменить роль";
    text = `Вы действительно хотите назначить этому пользователю роль «${escapeHtml(getRoleLabel(action.newRole))}»?`;
  }

  return `
    <div class="community-modal community-modal--top" data-member-confirm-modal>
      <section class="community-modal__dialog community-modal__dialog--small" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <header class="community-modal__header">
          <h2 class="community-modal__title">${escapeHtml(title)}</h2>
          ${renderModalCloseButton({
            className: "community-modal__close",
            attributes: "data-member-confirm-close",
          })}
        </header>

        <div class="community-modal__identity">
          <a class="community-modal__avatar-link" href="${profileHref}" data-link>
            ${renderAvatarMarkup("community-modal__avatar", displayName, member.avatarUrl, { width: 72, height: 72 })}
          </a>
          <div>
            <a class="community-modal__identity-name" href="${profileHref}" data-link>${escapeHtml(displayName)}</a>
            ${joinedDate ? `<span class="community-modal__identity-meta">Участник с ${escapeHtml(joinedDate)}</span>` : ""}
          </div>
        </div>

        <p class="community-modal__text">${text}</p>

        <div class="community-modal__actions">
          <button type="button" class="community-modal__button community-modal__button--primary" data-member-confirm-ok>
            Подтвердить
          </button>
          <button type="button" class="community-modal__button" data-member-confirm-close>
            Отмена
          </button>
        </div>
      </section>
    </div>
  `;
}

export function renderCommunityLeaveModal(): string {
  const id = communitiesState.leaveConfirmId;
  const bundle = id
    ? (communitiesState.items.find((item) => item.community.id === id) ??
      communitiesState.activeCommunity)
    : null;
  if (!id || !bundle) return "";

  const selfMember = communitiesState.activeMembers.find((m) => m.isSelf);
  const joinedDate = formatMemberJoinDate(selfMember?.joinedAt);

  return `
    <div class="community-modal" data-community-leave-modal>
      <section class="community-modal__dialog community-modal__dialog--small" role="dialog" aria-modal="true" aria-label="Покинуть сообщество">
        <header class="community-modal__header">
          <h2 class="community-modal__title">Покинуть сообщество</h2>
          ${renderModalCloseButton({
            className: "community-modal__close",
            attributes: "data-community-leave-close",
          })}
        </header>

        <div class="community-modal__identity">
          ${renderCommunityAvatar(bundle, "community-modal__avatar")}
          <p>${escapeHtml(getCommunityName(bundle.community))}</p>
        </div>

        <p class="community-modal__text">
          ${joinedDate ? `Вы состоите в этом сообществе с ${escapeHtml(joinedDate)}.<br>` : ""}
          Вы действительно хотите покинуть его?
        </p>

        <div class="community-modal__actions">
          <button type="button" class="community-modal__button community-modal__button--primary" data-community-leave-confirm="${id}">
            Подтвердить
          </button>
          <button type="button" class="community-modal__button" data-community-leave-close>
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
  syncCommunityMediaEditorsUi(document);
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
