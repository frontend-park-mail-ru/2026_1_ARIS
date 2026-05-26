/**
 * Рендер страницы групп.
 */
import { renderModalCloseButton } from "../../components/modal-close/modal-close";
import { renderCommentCompose } from "../../components/comment-compose/comment-compose";
import { renderInput } from "../../components/input/input";
import { renderAvatarMarkup, resolveAvatarSrc } from "../../utils/avatar";
import { getMediaFileName, isVideoMedia, resolveMediaUrl } from "../../utils/media";
import { formatPersonName } from "../../utils/display-name";
import { getSessionUser } from "../../state/session";
import { t } from "../../state/i18n";
import type { CommunityBundle } from "../../api/communities";
import type { PostMedia } from "../../api/posts";
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
  formatPostRelativeTime,
  getCommunityName,
  getCommunityUrl,
  getMemberDisplayName,
  getMembersLabel,
  getPostAuthorDisplayName,
  getRoleLabel,
} from "./helpers";
import type { CommunityFormStep } from "./types";

const COMMUNITY_MEMBERS_PREVIEW_COUNT = 5;

function renderCommunityFormHelpTooltip(text: string, align: "left" | "right" = "left"): string {
  return `
    <button
      type="button"
      class="community-form__hint-button community-form__hint-button--${align}"
      data-community-form-hint
      data-tooltip="${escapeHtml(text)}"
      aria-label="${escapeHtml(text)}"
      aria-expanded="false"
    >
      ?
    </button>
  `;
}

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
  const canShowLeaveAction =
    bundle.membership.isMember &&
    !bundle.membership.blocked &&
    bundle.membership.role !== "owner" &&
    (permissions.canEditCommunity ||
      permissions.canDeleteCommunity ||
      permissions.canManageMembers ||
      permissions.canChangeRoles);

  if (
    !permissions.canEditCommunity &&
    !permissions.canDeleteCommunity &&
    !permissions.canManageMembers &&
    !permissions.canChangeRoles &&
    !canShowLeaveAction
  ) {
    return "";
  }

  return `
    <div class="community-actions">
      <button
        type="button"
        class="community-actions__toggle"
        data-community-menu-toggle="${community.id}"
        aria-label="${t("communities.actionsAria")}"
        aria-expanded="false"
      >
        <span></span><span></span><span></span>
      </button>
      <div class="community-actions__menu" data-community-menu="${community.id}" hidden>
        ${
          permissions.canEditCommunity
            ? `
              <button type="button" class="community-actions__item" data-community-edit="${community.id}">
                ${t("communities.edit")}
              </button>
            `
            : ""
        }
        ${
          permissions.canManageMembers || permissions.canChangeRoles
            ? `
              <button type="button" class="community-actions__item" data-community-members-open="${community.id}">
                ${t("communities.members")}
              </button>
            `
            : ""
        }
        ${
          permissions.canDeleteCommunity
            ? `
              <button type="button" class="community-actions__item community-actions__item--danger" data-community-delete-open="${community.id}">
                ${t("communities.delete")}
              </button>
            `
            : ""
        }
        ${
          canShowLeaveAction
            ? `
              <button type="button" class="community-actions__item community-actions__item--danger" data-community-leave="${community.id}">
                ${t("communities.leave")}
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
          ${roleLabel ? escapeHtml(roleLabel) : t("communities.communityFallback")}
        </p>
      </div>

      ${renderCommunityMenu(bundle)}
    </article>
  `;
}

function renderCommunitiesList(): string {
  if (communitiesState.loading || communitiesState.searchLoading) {
    return Array.from(
      { length: 3 },
      () => `
        <article class="community-list-card" aria-hidden="true">
          <span class="avatar-skeleton community-skeleton__list-avatar"></span>
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
        ${communitiesState.query.trim() ? t("friends.noneFound") : t("common.emptyList")}
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
        <span class="profile-composer__label">${t("communities.create")}</span>
      </button>

      <section class="communities-panel content-card">
        <label class="communities-search search-field" aria-label="${t("communities.search")}">
          <img class="communities-search__icon search-field__icon" src="/assets/img/icons/search.svg" alt="">
          <input
            class="communities-search__input search-field__input"
            type="text"
            value="${escapeHtml(communitiesState.query)}"
            placeholder="${t("communities.search")}"
            data-communities-search
          >
        </label>

        <p class="communities-panel__eyebrow">${t("communities.yours")}</p>

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
        ${t("communities.wait")}
      </button>
    `;
  }

  if (bundle.membership.blocked) {
    return `
      <button type="button" class="community-hero__cta community-hero__cta--muted" disabled>
        ${t("community.blocked")}
      </button>
    `;
  }

  if (!bundle.membership.isMember) {
    return `
      <button type="button" class="community-hero__cta community-hero__cta--primary" data-community-join="${bundle.community.id}">
        ${t("communities.join")}
      </button>
    `;
  }

  const hasManagementMenu =
    bundle.permissions.canEditCommunity ||
    bundle.permissions.canDeleteCommunity ||
    bundle.permissions.canManageMembers ||
    bundle.permissions.canChangeRoles;

  if (bundle.membership.role !== "owner" && !hasManagementMenu) {
    return `
      <button type="button" class="community-hero__cta community-hero__cta--muted" data-community-leave="${bundle.community.id}">
        ${t("communities.leave")}
      </button>
    `;
  }

  return "";
}

function renderCommunityDescription(bundle: CommunityBundle): string {
  return `
    <section class="community-side-card">
      <h2>${t("communities.description")}</h2>
      <p>${escapeHtml(bundle.community.bio || t("communities.descriptionEmpty"))}</p>
    </section>
  `;
}

function renderCommunityMembersCard(bundle: CommunityBundle): string {
  const visibleMembers = communitiesState.activeMembers.filter((member) => !member.blocked);
  const previewMembers = visibleMembers.slice(0, COMMUNITY_MEMBERS_PREVIEW_COUNT);
  const isLoadingMembers =
    communitiesState.membershipLoading ||
    (communitiesState.membersLoading && !communitiesState.membersLoaded);

  return `
    <section class="community-side-card">
      <div class="community-side-card__header">
        <h2>
          ${t("communities.membersShort")}
          ${
            isLoadingMembers
              ? '<span class="skeleton community-members-card__count-skeleton"></span>'
              : `<span class="community-side-card__count">(${visibleMembers.length})</span>`
          }
        </h2>
      </div>
      ${
        isLoadingMembers
          ? renderCommunityMembersCardSkeleton()
          : previewMembers.length
            ? `
            <div class="community-members-card">
              ${previewMembers
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
                      </div>
                    </a>
                  `,
                )
                .join("")}
            </div>
          `
            : `<p class="community-members-card__empty">${t("common.emptyList")}</p>`
      }
      ${
        visibleMembers.length > COMMUNITY_MEMBERS_PREVIEW_COUNT
          ? `
            <button type="button" class="community-side-card__button" data-community-members-open="${bundle.community.id}">
              ${t("profile.moreFriends")}
            </button>
          `
          : ""
      }
    </section>
  `;
}

function renderCommunityMembersCardSkeleton(): string {
  return `
    <div class="community-members-card" aria-hidden="true">
      ${Array.from(
        { length: 3 },
        (_, index) => `
          <div class="community-members-card__item">
            <span class="avatar-skeleton community-members-card__avatar"></span>
            <div class="community-members-card__copy">
              <span class="skeleton community-members-card__line-skeleton${index === 1 ? " community-members-card__line-skeleton--short" : ""}"></span>
              <span class="skeleton community-members-card__meta-skeleton"></span>
            </div>
          </div>
        `,
      ).join("")}
    </div>
  `;
}

function renderPostMedia(post: ProfilePost): string {
  const media: PostMedia[] = post.media.length
    ? post.media
    : post.images.map((image, index) => ({ mediaID: index + 1, mediaURL: image }));

  if (!media.length) return "";

  const count = Math.min(media.length, 5);
  const modifiers: Record<number, string> = {
    1: "profile-post__images--single",
    2: "profile-post__images--double",
    3: "profile-post__images--triple",
    4: "profile-post__images--quad",
    5: "profile-post__images--five",
  };

  return `
    <div class="profile-post__images ${modifiers[count] ?? ""}">
      ${media
        .slice(0, 5)
        .map((item, index) =>
          isVideoMedia(item.mediaURL, item.mimeType)
            ? `
                <video
                  class="profile-post__image profile-post__video${count === 3 && index === 0 ? " profile-post__image--lead" : ""}"
                  src="${escapeHtml(resolveMediaUrl(item.mediaURL))}"
                  controls
                  preload="metadata"
                ></video>
              `
            : `
                <img
                  loading="lazy"
                  decoding="async"
                  class="profile-post__image${count === 3 && index === 0 ? " profile-post__image--lead" : ""}"
                  src="${escapeHtml(resolveMediaUrl(item.mediaURL))}"
                  alt="${t("profile.imageAlt")}"
                  role="button"
                  tabindex="0"
                  data-post-image-open
                >
              `,
        )
        .join("")}
    </div>
  `;
}

function renderPostFiles(files: ProfilePost["files"]): string {
  if (!files.length) return "";

  return `
    <div class="profile-post__files">
      ${files
        .map(
          (file) => `
            <a class="profile-post__file" href="${escapeHtml(resolveMediaUrl(file.mediaURL))}" target="_blank" rel="noopener noreferrer">
              <img class="profile-post__file-icon" src="/assets/img/icons/file.svg" alt="" aria-hidden="true">
              <span class="profile-post__file-name">${escapeHtml(file.name || getMediaFileName(file.mediaURL, t("chats.file")))}</span>
            </a>
          `,
        )
        .join("")}
    </div>
  `;
}

function canCommentCommunityPost(bundle: CommunityBundle): boolean {
  return (
    bundle.membership.isMember && !bundle.membership.blocked && bundle.membership.role !== "blocked"
  );
}

function renderCommunityPostComments(postId: string, bundle: CommunityBundle): string {
  const sessionUser = getSessionUser();
  const canComment = canCommentCommunityPost(bundle) && Boolean(sessionUser);
  const userName = sessionUser
    ? formatPersonName(sessionUser.firstName, sessionUser.lastName) || t("widgetbar.userFallback")
    : "";

  return `
    <div class="profile-post__comments" data-community-post-comments="${escapeHtml(postId)}" hidden>
      <div class="profile-post__comment-list" data-community-post-comment-list="${escapeHtml(postId)}"></div>
      ${
        canComment && sessionUser
          ? `
            ${renderCommentCompose({
              postId,
              userName,
              avatarLink: sessionUser.avatarLink,
              formAttribute: "data-community-post-comment-form",
              inputAttribute: "data-community-post-comment-input",
              errorAttribute: "data-community-post-comment-error",
            })}
          `
          : ""
      }
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
            ${isOfficialPost ? `<span class="community-post__badge">${t("community.badge")}</span>` : ""}
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
                  aria-label="${t("profile.actionsAria")}"
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
                          ${t("profile.editPost")}
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
                          ${t("communities.removePost")}
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
      ${renderPostMedia(post)}
      ${renderPostFiles(post.files)}

      <footer class="profile-post__footer">
        <div class="profile-post__stats">
          <button
            type="button"
            class="profile-post__stat profile-post__stat-button${
              post.isLiked ? " profile-post__stat-button--liked" : ""
            }"
            data-community-post-like="${escapeHtml(post.id)}"
            aria-pressed="${post.isLiked ? "true" : "false"}"
            aria-label="${t("profile.likes")}"
          >
            <span class="profile-post__stat-icon">
              <img src="/assets/img/icons/heart.svg" class="profile-post__icon" alt="" />
            </span>
            <span class="profile-post__stat-count">${post.likes}</span>
          </button>
          <button
            type="button"
            class="profile-post__stat profile-post__stat-button"
            data-community-post-toggle-comments="${escapeHtml(post.id)}"
            aria-expanded="false"
          >
            <img src="/assets/img/icons/chat.svg" class="profile-post__icon" alt="" />
            <span class="profile-post__stat-count" data-community-post-comment-count="${escapeHtml(post.id)}">${post.comments}</span>
          </button>
        </div>
        <time
          class="profile-post__time"
          ${post.timeRaw ? `datetime="${escapeHtml(post.timeRaw)}"` : ""}
          ${post.timeRaw ? `data-tooltip="${escapeHtml(formatPostExactTime(post.timeRaw))}"` : ""}
        >${escapeHtml(formatPostRelativeTime(post.timeRaw) || post.time)}</time>
      </footer>

      ${renderCommunityPostComments(post.id, bundle)}
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
        files: [],
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
                  searchQuery ? t("friends.noneFound") : t("communities.postsEmpty")
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
  const composerActions = renderCommunityComposerActions(bundle);
  return `
    <div class="community-posts__controls content-card">
      ${
        communitiesState.postSearchOpen
          ? `
            <label class="community-posts__search search-field" aria-label="${t("communities.postSearch")}">
              <span class="community-posts__search-icon search-field__icon" aria-hidden="true">
                <img src="/assets/img/icons/search.svg" alt="">
              </span>
              <input
                type="search"
                class="community-posts__search-input search-field__input"
                placeholder="${t("header.search")}"
                value="${escapeHtml(communitiesState.postSearchQuery)}"
                data-community-post-search
              >
              <button
                type="button"
                class="community-posts__search-close"
                data-community-post-search-close
                aria-label="${t("profile.closePostSearch")}"
              >
                ×
              </button>
            </label>
          `
          : `
            <header class="community-posts__header">
              ${
                composerActions
                  ? `
                    ${composerActions}
                    <button
                      type="button"
                      class="community-posts__search-toggle"
                      data-community-post-search-open
                      aria-label="${t("profile.openPostSearch")}"
                    >
                      <img src="/assets/img/icons/search.svg" alt="">
                    </button>
                  `
                  : `
                    <label class="community-posts__search community-posts__search--inline search-field" aria-label="${t("communities.postSearch")}">
                      <span class="community-posts__search-icon search-field__icon" aria-hidden="true">
                        <img src="/assets/img/icons/search.svg" alt="">
                      </span>
                      <input
                        type="search"
                        class="community-posts__search-input search-field__input"
                        placeholder="${t("header.search")}"
                        value="${escapeHtml(communitiesState.postSearchQuery)}"
                        data-community-post-search
                      >
                    </label>
                  `
              }
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
      <button type="button" class="profile-composer community-posts__composer-link" data-community-post-open>
        <span class="profile-composer__icon" aria-hidden="true">+</span>
        <span class="profile-composer__label">${t("communities.writePost")}</span>
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
        ${t("communities.postsAll")}
      </button>
      <button
        type="button"
        class="community-posts__feed-button${communitiesState.postFeedMode === "official" ? " community-posts__feed-button--active" : ""}"
        data-community-post-feed="official"
      >
        ${t("communities.postAsCommunity")}
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
          <p class="communities-page__empty">${t("communities.notFound")}</p>
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
          <p class="communities-page__empty" style="margin:0">${t("community.blockedInCommunity")}</p>
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
      ${renderCommunityMembersCard(bundle)}
    </div>
  `;
}

export function renderCommunityFormModal(): string {
  const form = communitiesState.form;
  const title =
    form.mode === "edit" ? t("communities.formEditTitle") : t("communities.formCreateTitle");
  const isCheckingName = form.step === 1 && form.nameCheckStatus === "checking";

  return `
    <div class="community-modal" data-community-form-modal ${form.open ? "" : "hidden"}>
      <section class="community-modal__dialog community-modal__dialog--form" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <header class="community-modal__header">
          <h2 class="community-modal__title">${escapeHtml(title)}</h2>
          ${renderModalCloseButton({
            className: "community-modal__close",
            attributes: "data-community-form-close",
          })}
        </header>

        ${renderCommunityFormProgress(form.step)}

        <form class="community-form" data-community-form>
          <div class="community-form__body">
            ${renderCommunityFormStepContent(form.step)}
          </div>

          <p class="community-modal__error${form.errorMessage ? "" : " community-modal__error--hidden"}" data-community-form-error>
            ${form.errorMessage ? escapeHtml(form.errorMessage) : "&nbsp;"}
          </p>

          <div class="community-modal__actions">
            ${
              form.step > 1
                ? `
                  <button type="button" class="button button--neutral community-modal__button" data-community-form-prev>
                    ${t("communities.formBack")}
                  </button>
                `
                : `
                  <button type="button" class="button button--neutral community-modal__button" data-community-form-close>
                    ${t("communities.formCancel")}
                  </button>
                `
            }
            ${
              form.step < 4
                ? `
                  <button type="button" class="button button--primary community-modal__button community-modal__button--primary" data-community-form-next ${isCheckingName ? 'aria-busy="true"' : ""}>
                    ${t("communities.formNext")}
                  </button>
                `
                : `
                  <button type="submit" class="button button--primary community-modal__button community-modal__button--primary" ${form.isSaving ? "disabled" : ""}>
                    ${
                      form.isSaving
                        ? t("communities.formSaving")
                        : form.mode === "edit"
                          ? t("communities.formApply")
                          : t("communities.formCreate")
                    }
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
    { step: 1, label: t("communities.formName") },
    { step: 2, label: t("communities.description") },
    { step: 3, label: t("communities.formAvatar") },
    { step: 4, label: t("communities.formCover") },
  ];

  return `
    <div class="community-form__progress" aria-label="${isEditableNavigation ? t("communities.formEditAria") : t("communities.formCreateAria")}">
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
        <div class="community-form__field">
          <span class="community-form__field-label">
            ${t("communities.formName")}
            ${renderCommunityFormHelpTooltip(t("communities.formTitleHint"))}
          </span>
          ${renderInput({
            name: "title",
            value: escapeHtml(form.title),
            placeholder: t("communities.formPickTitle"),
            className: "community-form__input",
            attributes: `maxlength="64" required data-community-title aria-label="${t("communities.formName")}"`,
          })}
        </div>
        <div class="community-form__field">
          <span class="community-form__field-label">
            ${t("communities.formUsername")}
            ${renderCommunityFormHelpTooltip(t("communities.formUsernameHint"), "right")}
          </span>
          ${renderInput({
            name: "username",
            value: escapeHtml(form.username),
            placeholder: t("communities.formUsernamePlaceholder"),
            className: "community-form__input",
            attributes: `maxlength="20" required autocapitalize="off" autocomplete="off" spellcheck="false" data-community-username aria-label="${t("communities.formUsername")}"`,
          })}
        </div>
        <p class="community-form__helper${form.username ? "" : " community-form__helper--hidden"}" data-community-form-address-preview>
          ${form.username ? t("communities.formAddressPreview").replace("{username}", escapeHtml(form.username)) : "&nbsp;"}
        </p>
        <p class="community-form__helper${form.nameCheckMessage ? "" : " community-form__helper--hidden"}">
          ${form.nameCheckMessage ? escapeHtml(form.nameCheckMessage) : "&nbsp;"}
        </p>
      </div>
    `;
  }

  if (step === 2) {
    return `
      <div class="community-form__step">
        <p class="community-form__step-title">${t("communities.formShortDescription")}</p>
        <label class="community-form__field">
          <textarea
            name="bio"
            rows="5"
            maxlength="2047"
            data-community-bio
            placeholder="${t("communities.formDescriptionPlaceholder")}"
          >${escapeHtml(form.bio)}</textarea>
        </label>
      </div>
    `;
  }

  if (step === 3) {
    return `
      <div class="community-form__step">
        <p class="community-form__step-title">
          ${t("communities.formChooseAvatar")}
          ${
            form.mode === "create"
              ? renderCommunityFormHelpTooltip(t("communities.formMediaLaterHint"), "right")
              : ""
          }
        </p>
        ${renderCommunityMediaEditor("avatar")}
      </div>
    `;
  }

  return `
    <div class="community-form__step">
      <p class="community-form__step-title">
        ${t("communities.formChooseCover")}
        ${
          form.mode === "create"
            ? renderCommunityFormHelpTooltip(t("communities.formMediaLaterHint"), "right")
            : ""
        }
      </p>
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
  const editorLabel = isAvatar ? t("communities.formAvatarLabel") : t("communities.formCoverLabel");
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
        <div
          class="community-media-editor__crop-stage community-media-editor__crop-stage--${kind}"
          data-community-media-stage="${kind}"
          data-community-media-pick-target="${kind}"
          role="button"
          tabindex="0"
          aria-label="${escapeHtml(t("communities.formChooseImage"))}"
        >
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
              class="button button--neutral community-media-editor__button community-media-editor__button--secondary community-media-editor__tool-button"
              data-community-media-rotate-left="${kind}"
            >
            ${t("communities.formRotateLeft")}
          </button>
            <button
              type="button"
              class="button button--neutral community-media-editor__button community-media-editor__button--secondary community-media-editor__tool-button"
              data-community-media-rotate-right="${kind}"
            >
            ${t("communities.formRotateRight")}
          </button>
        </div>

        <button
          type="button"
          class="button button--neutral community-media-editor__button community-media-editor__button--secondary community-media-editor__button--full community-media-editor__button--danger"
          data-community-media-delete="${kind}"
          ${canResetChanges ? "" : "hidden"}
        >
          ${hasCurrentImage ? t("communities.formResetChanges") : t("communities.formRemoveImage")}
        </button>

        <span class="community-media-editor__zoom-label">${t("communities.formZoom")}</span>
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
  const title =
    composer.mode === "edit" ? t("communities.editPostTitle") : t("communities.newPostTitle");
  const submitLabel =
    composer.mode === "edit" ? t("communities.savePost") : t("communities.publishPost");
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
        : t("communities.communityFallback")
      : t("communities.yourProfile");

  return `
    <div class="profile-post-modal community-post-modal" data-community-post-modal ${composer.open ? "" : "hidden"}>
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
                <div class="community-post-modal__author-options${canPostAsCommunity && canPostAsMember ? "" : " community-post-modal__author-options--single"}" role="group" aria-label="${t("communities.postAuthorAria")}">
                  ${
                    canPostAsCommunity
                      ? `
                        <button
                          type="button"
                          class="community-post-modal__author-button${composer.authorMode === "community" ? " community-post-modal__author-button--active" : ""}"
                          data-community-post-author-mode="community"
                          aria-pressed="${composer.authorMode === "community" ? "true" : "false"}"
                        >
                          ${t("communities.postAsCommunityAuthor")}
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
                          ${t("communities.postAsMemberAuthor")}
                        </button>
                      `
                      : ""
                  }
                </div>
              </div>
            `
            : `
              <p class="profile-post-modal__scope">
                ${t("communities.editPostScope")}
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
            placeholder="${composer.mode === "edit" ? t("communities.updatePostPlaceholder") : t("communities.newPostPlaceholder")}"
          >${escapeHtml(composer.text)}</textarea>

          <input
            id="community-post-images"
            name="communityPostImages"
            type="file"
            accept="image/*,video/*"
            multiple
            hidden
            data-community-post-image-input
          >
          <input
            id="community-post-files"
            name="communityPostFiles"
            type="file"
            multiple
            hidden
            data-community-post-file-input
          >

          <div class="profile-post-modal__toolbar">
            <button
              type="button"
              class="button button--neutral profile-post-modal__button profile-post-modal__button--secondary"
              data-community-post-pick-image
              ${composer.isSaving || composer.mediaItems.length >= 5 ? "disabled" : ""}
            >
              ${composer.mediaItems.length >= 5 ? t("profile.mediaLimit") : t("profile.addMedia")}
            </button>
            <button
              type="button"
              class="button button--neutral profile-post-modal__button profile-post-modal__button--secondary"
              data-community-post-pick-file
              ${composer.isSaving || composer.fileItems.length >= 10 ? "disabled" : ""}
            >
              ${composer.fileItems.length >= 10 ? t("profile.filesLimit") : t("profile.addFiles")}
            </button>
          </div>

          <div class="profile-post-modal__previews ${["", "profile-post-modal__previews--single", "profile-post-modal__previews--double", "profile-post-modal__previews--triple", "profile-post-modal__previews--quad", "profile-post-modal__previews--five"][Math.min(composer.mediaItems.length, 5)] ?? ""}" ${composer.mediaItems.length ? "" : "hidden"}>
            ${composer.mediaItems
              .map(
                (item, index) => `
                  <div class="profile-post-modal__preview">
                    ${
                      isVideoMedia(item.mediaURL, item.mimeType)
                        ? `<video src="${escapeHtml(item.mediaURL)}" muted playsinline preload="metadata"></video>`
                        : `<img src="${escapeHtml(item.mediaURL)}" alt="${t("communities.imageAlt")} ${index + 1}">`
                    }
                    <button type="button" class="profile-post-modal__preview-remove" data-community-post-remove-image="${index}" aria-label="${t("communities.removeImage")}">×</button>
                  </div>
                `,
              )
              .join("")}
          </div>

          <div class="profile-post-modal__files" ${composer.fileItems.length ? "" : "hidden"}>
            ${composer.fileItems
              .map(
                (item, index) => `
                  <div class="profile-post-modal__file-preview">
                    <img class="profile-post-modal__file-icon" src="/assets/img/icons/file.svg" alt="" aria-hidden="true">
                    <span class="profile-post-modal__file-name">${escapeHtml(item.fileName || getMediaFileName(item.mediaURL, t("chats.file")))}</span>
                    <button type="button" class="profile-post-modal__file-remove" data-community-post-remove-file="${index}" aria-label="${t("profile.fileRemove")}">×</button>
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
              class="button button--primary profile-post-modal__button profile-post-modal__button--primary"
              data-community-post-save
            >
              ${submitLabel}
            </button>
            <button type="button" class="button button--neutral profile-post-modal__button" data-community-post-close>
              ${t("friends.cancel")}
            </button>
          </div>
        </form>
      </section>
    </div>
  `;
}

export function renderCommunityMembersManagerList(bundle: CommunityBundle): string {
  const manager = communitiesState.membersManager;
  const members = getVisibleCommunityMembers();
  const canManageMembers = bundle.permissions.canManageMembers || bundle.permissions.canChangeRoles;
  const memberItems = members
    .map((member) => {
      const canChange =
        canManageMembers &&
        canManageCommunityMemberRole(bundle, member, communitiesState.viewerProfileId);
      const canRemove =
        canManageMembers &&
        canRemoveCommunityMember(bundle, member, communitiesState.viewerProfileId);
      const isProcessing =
        manager.changingRoleProfileId === member.profileId ||
        manager.removingProfileId === member.profileId;
      const profileHref = `/id${member.profileId}`;
      const roleOptions = ["admin", "moderator", "member", "blocked"];

      return `
        <article class="community-members-manager__item${isProcessing ? " community-members-manager__item--processing" : ""}${canManageMembers ? "" : " community-members-manager__item--readonly"}">
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
            </div>
          </div>

          ${
            canManageMembers
              ? `
              <div class="community-members-manager__controls">
                ${
                  member.blocked
                    ? `<span class="community-members-manager__role">${escapeHtml(getRoleLabel("blocked"))}</span>`
                    : canChange
                      ? `
                      <div class="community-members-manager__role-select" data-community-member-role-select="${member.profileId}">
                        <button
                          type="button"
                          class="community-members-manager__role-current"
                          data-community-member-role-toggle="${member.profileId}"
                          aria-haspopup="listbox"
                          aria-expanded="false"
                          ${isProcessing ? "disabled" : ""}
                        >
                          <span>${escapeHtml(getRoleLabel(member.role))}</span>
                        </button>
                        <div
                          class="community-members-manager__role-menu"
                          data-community-member-role-menu="${member.profileId}"
                          role="listbox"
                          aria-label="${t("communities.memberRoleAria")}"
                          hidden
                        >
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
                      </div>
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
                        ${isProcessing ? t("communities.wait") : t("communities.removeFromBlocked")}
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
                        ${isProcessing ? t("communities.wait") : t("communities.remove")}
                      </button>
                    `
                      : ""
                }
              </div>
            `
              : ""
          }
        </article>
      `;
    })
    .join("");

  return `
    ${
      communitiesState.membersLoading
        ? `<p class="communities-page__empty">${t("communities.membersLoading")}</p>`
        : members.length
          ? `${memberItems}${
              manager.loadingMore
                ? `<p class="communities-page__empty">${t("communities.membersLoadingMore")}</p>`
                : ""
            }`
          : `<p class="communities-page__empty">${
              manager.query.trim() ? t("friends.noneFound") : t("common.emptyList")
            }</p>`
    }
  `;
}

function renderCommunityMembersManagerModal(bundle: CommunityBundle): string {
  const manager = communitiesState.membersManager;
  const canManageMembers = bundle.permissions.canManageMembers || bundle.permissions.canChangeRoles;

  return `
    <div class="community-modal" data-community-members-modal ${manager.open ? "" : "hidden"}>
      <section class="community-modal__dialog community-modal__dialog--members" role="dialog" aria-modal="true" aria-label="${t("communities.members")}">
        <header class="community-modal__header">
          <h2 class="community-modal__title">${t("communities.members")}</h2>
          ${renderModalCloseButton({
            className: "community-modal__close",
            attributes: "data-community-members-close",
          })}
        </header>

        <div class="community-members-manager__toolbar">
          <label class="communities-search search-field" aria-label="${t("communities.searchMembers")}">
            <img class="communities-search__icon search-field__icon" src="/assets/img/icons/search.svg" alt="">
            <input
              class="communities-search__input search-field__input"
              type="text"
              value="${escapeHtml(manager.query)}"
              placeholder="${t("communities.searchMembers")}"
              data-community-members-search
            >
          </label>

          ${
            canManageMembers
              ? `
                <label class="community-members-manager__toggle">
                  <input type="checkbox" ${manager.includeBlocked ? "checked" : ""} data-community-members-include-blocked>
                  <span>${t("communities.showBlocked")}</span>
                </label>
              `
              : ""
          }
        </div>

        <p
          class="community-modal__error${manager.errorMessage ? "" : " community-modal__error--hidden"}"
          data-community-members-error
        >
          ${manager.errorMessage ? escapeHtml(manager.errorMessage) : "&nbsp;"}
        </p>

        <div class="community-members-manager__list" data-community-members-list>
          ${renderCommunityMembersManagerList(bundle)}
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
        aria-label="${t("communities.deletePostTitle")}"
      >
        <header class="profile-post-delete-modal__header">
          <h2 class="profile-post-delete-modal__title">${t("communities.deletePostTitle")}</h2>
          ${renderModalCloseButton({
            className: "profile-post-delete-modal__close",
            attributes: "data-community-post-delete-close",
          })}
        </header>

        <p class="profile-post-delete-modal__text">
          ${t("communities.deletePostText")}
        </p>

        <div class="profile-post-delete-modal__actions">
          <button
            type="button"
            class="button button--primary profile-post-delete-modal__button profile-post-delete-modal__button--primary"
            data-community-post-delete-confirm
          >
            ${t("communities.removePost")}
          </button>
          <button
            type="button"
            class="button button--neutral profile-post-delete-modal__button"
            data-community-post-delete-close
          >
            ${t("friends.cancel")}
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
    title = t("communities.unblockMemberTitle");
    text = t("communities.unblockMemberText");
  } else if (action.type === "remove") {
    title = t("communities.removeMemberTitle");
    text = t("communities.removeMemberText");
  } else if (action.newRole === "blocked") {
    title = t("communities.blockMemberTitle");
    text = t("communities.blockMemberText");
  } else {
    title = t("communities.changeRoleTitle");
    text = `${t("communities.changeRoleText")} «${escapeHtml(getRoleLabel(action.newRole))}»?`;
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
            ${
              joinedDate
                ? `<span class="community-modal__identity-meta">${t("communities.memberSince")} ${escapeHtml(joinedDate)}</span>`
                : ""
            }
          </div>
        </div>

        <p class="community-modal__text">${text}</p>

        <div class="community-modal__actions">
          <button type="button" class="button button--primary community-modal__button community-modal__button--primary" data-member-confirm-ok>
            ${t("communities.confirm")}
          </button>
          <button type="button" class="button button--neutral community-modal__button" data-member-confirm-close>
            ${t("friends.cancel")}
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
      <section class="community-modal__dialog community-modal__dialog--small" role="dialog" aria-modal="true" aria-label="${t("communities.leaveTitle")}">
        <header class="community-modal__header">
          <h2 class="community-modal__title">${t("communities.leaveTitle")}</h2>
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
          ${joinedDate ? `${t("communities.leaveJoinedPrefix")} ${escapeHtml(joinedDate)}.<br>` : ""}
          ${t("communities.leaveText")}
        </p>

        <div class="community-modal__actions">
          <button type="button" class="button button--primary community-modal__button community-modal__button--primary" data-community-leave-confirm="${id}">
            ${t("communities.confirm")}
          </button>
          <button type="button" class="button button--neutral community-modal__button" data-community-leave-close>
            ${t("friends.cancel")}
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
      <section class="community-modal__dialog community-modal__dialog--small" role="dialog" aria-modal="true" aria-label="${t("communities.delete")}">
        <header class="community-modal__header">
          <h2 class="community-modal__title">${t("communities.delete")}</h2>
          ${renderModalCloseButton({
            className: "community-modal__close",
            attributes: "data-community-delete-close",
          })}
        </header>

        <div class="community-modal__identity">
          ${renderCommunityAvatar(bundle, "community-modal__avatar")}
          <p>${escapeHtml(getCommunityName(bundle.community))}</p>
        </div>

        <p class="community-modal__text">${t("communities.deleteText")}</p>

        <div class="community-modal__actions">
          <button type="button" class="button button--primary community-modal__button community-modal__button--primary" data-community-delete-confirm="${id}">
            ${t("communities.delete")}
          </button>
          <button type="button" class="button button--neutral community-modal__button" data-community-delete-close>
            ${t("friends.cancel")}
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
  window.dispatchEvent(new CustomEvent("communities:refreshed"));
  if (isDetail) {
    refreshCommunityRightRail(root);
  }
  syncCommunityMediaEditorsUi(document);
}

function refreshCommunityRightRail(root: ParentNode): void {
  const railContainer =
    root instanceof HTMLElement && root.matches(".app-layout__right--rail")
      ? root
      : (root.querySelector(".app-layout__right--rail") ??
        (root === document ? null : document.querySelector(".app-layout__right--rail")));
  if (!(railContainer instanceof HTMLElement)) return;

  const template = document.createElement("template");
  template.innerHTML = renderCommunityRightRail().trim();
  const next = template.content.firstElementChild;
  if (!(next instanceof HTMLElement)) return;

  const currentRail = railContainer.querySelector(".profile-right-rail");
  if (currentRail instanceof HTMLElement) {
    currentRail.replaceWith(next);
    return;
  }

  railContainer.appendChild(next);
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
