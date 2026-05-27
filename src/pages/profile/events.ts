/**
 * Обработчики событий страницы профиля.
 *
 * Содержит пользовательские сценарии и реакцию интерфейса на действия пользователя.
 */
import { createOrResolvePrivateChatId } from "../../api/chat";
import {
  createPost,
  deletePost,
  likePost,
  unlikePost,
  updatePost,
  getPostComments,
  getPostCommentReplies,
  getPostCommentRepliesBatch,
  createPostComment,
  likePostComment,
  unlikePostComment,
  updatePostComment,
  deletePostComment,
} from "../../api/posts";
import type { PostComment } from "../../api/posts";
import {
  acceptFriendRequest,
  declineFriendRequest,
  deleteFriend,
  requestFriendship,
  revokeFriendRequest,
} from "../../api/friends";
import { uploadProfileAvatar, updateMyProfile, getMyProfile } from "../../api/profile";
import { getSessionUser, setSessionUser } from "../../state/session";
import { clearFeedCache } from "../feed/cache";
import { clearWidgetbarCache } from "../../components/widgetbar/widgetbar";
import { invalidateFriendsState } from "../friends/friends";
import { rememberChatContactHint } from "../chats/contact-hints";
import { isOutboxQueuedError } from "../../utils/outbox-idb";
import {
  completeFixedCommentBlockSkeleton,
  restoreFixedCommentBlockSkeleton,
  showFixedCommentBlockSkeleton,
} from "../../utils/comment-block-loading";
import {
  bindFloatingCommentMenuActions,
  cancelCommentEdit,
  closeCommentMenus,
  confirmCommentDelete,
  finishCommentEdit,
  openCommentEditForm,
  positionCommentMenu,
  setCommentEditError,
} from "../../utils/comment-actions";
import { waitForMinimumLoadingTime } from "../../utils/loading-state";
import { showAppToast as showProfileToast } from "../../utils/toast";
import { t } from "../../state/i18n";

import type { ComposerMediaItem } from "./types";
import {
  postComposerState,
  avatarModalState,
  currentProfile,
  currentProfilePosts,
  setCurrentProfilePosts,
  pendingProfilePostState,
  resetPostComposerState,
  resetPendingProfilePostState,
  resetAvatarModalState,
  openCreatePostComposer,
  openEditPostComposer,
  removeComposerMediaItem,
  removeComposerFileItem,
  validateProfilePatch,
  hasProfileFieldErrors,
  setOwnAvatarOverride,
  updateSessionUserAvatarLink,
  normaliseAvatarLink,
  clampAvatarOffsets,
  OWN_PROFILE_CACHE_KEY,
  OWN_PROFILE_POSTS_CACHE_KEY,
  readJsonStorage,
  writeJsonStorage,
} from "./state";
import {
  syncAvatarModalUi,
  loadAvatarFile,
  setAvatarZoom,
  rotateAvatar,
  buildAvatarFile,
  ensureAvatarEditorSource,
} from "./avatar";
import { syncPostComposerUi } from "./composer";
import {
  renderProfileFieldErrors,
  clearProfileFieldErrors,
  focusFirstProfileErrorField,
  renderProfileFriendActions,
  renderProfilePosts,
} from "./render";
import {
  uploadPendingComposerImages,
  uploadPendingComposerFiles,
  handlePostImagesSelected,
  handlePostFilesSelected,
  validateProfileFormLive,
  toggleProfileEditor,
  rerenderCurrentRoute,
  isOfflineNetworkError,
  getProfileFormSourceValues,
  buildProfilePatch,
} from "./actions";
import {
  applyProfilePostFilters,
  closeProfilePostMenus,
  closeProfilePostSearch,
  initProfilePostListLayout,
  openProfilePostSearch,
} from "./post-list";
import { canEditProfilePost, escapeHtml } from "./helpers";
import type { DisplayProfile } from "./types";
import { openPostImageViewerFromTarget } from "../../utils/image-viewer";

const expandedPosts = new Set<string>();
// postId → Set of commentIds whose full reply list is loaded
const expandedReplies = new Map<string, Set<string>>();

export { renderSingleCommentHtml, renderCommentItemHtml } from "../../utils/post-comment-render";
import {
  COMMENT_PAGE_SIZE,
  renderCommentItemsHtml,
  renderCommentsListHtml,
  renderMoreCommentsButtonHtml,
  renderSingleCommentHtml,
} from "../../utils/post-comment-render";

function getProfilePostCommentTotal(postId: string, loadedCount: number): number {
  const postCount = currentProfilePosts.find((post) => post.id === postId)?.comments ?? 0;
  return Math.max(postCount, loadedCount);
}

async function loadAndRenderPostComments(
  root: Document | HTMLElement,
  postId: string,
  options: { showLoading?: boolean } = {},
): Promise<void> {
  const listEl = root.querySelector<HTMLElement>(
    `[data-profile-post-comment-list="${CSS.escape(postId)}"]`,
  );
  if (!listEl) return;

  if (options.showLoading !== false) {
    listEl.innerHTML = `<p class="profile-comment-loading">${t("profile.commentLoading")}</p>`;
  }

  const comments = await getPostComments(postId, { limit: COMMENT_PAGE_SIZE, offset: 0 });

  const parentIds = comments.filter((c) => c.repliesCount > 0).map((c) => c.id);
  let firstReplies: Record<string, PostComment[]> = {};
  if (parentIds.length > 0) {
    firstReplies = await getPostCommentRepliesBatch(postId, parentIds, { limit: 1 });
  }

  const totalCount = getProfilePostCommentTotal(postId, comments.length);

  if (!comments.length) {
    listEl.innerHTML = `<p class="profile-comment-empty">${t("profile.commentsEmpty")}</p>`;
    return;
  }

  listEl.innerHTML = renderCommentsListHtml(postId, comments, firstReplies, { totalCount });

  const expanded = expandedReplies.get(postId);
  if (expanded && expanded.size > 0) {
    for (const commentId of expanded) {
      const repliesContainer = root.querySelector<HTMLElement>(
        `[data-comment-replies="${CSS.escape(commentId)}"]`,
      );
      if (repliesContainer) {
        void getPostCommentReplies(postId, commentId, { limit: 50 }).then((replies) => {
          repliesContainer.innerHTML = replies
            .map((r) => renderSingleCommentHtml(r, true))
            .join("");
        });
      }
    }
  }
}

async function loadMoreProfilePostComments(
  root: Document | HTMLElement,
  postId: string,
  button: HTMLButtonElement,
): Promise<void> {
  const listEl = root.querySelector<HTMLElement>(
    `[data-profile-post-comment-list="${CSS.escape(postId)}"]`,
  );
  if (!listEl) return;

  const offset = listEl.querySelectorAll("[data-comment-item]").length;
  button.disabled = true;

  try {
    const comments = await getPostComments(postId, {
      limit: COMMENT_PAGE_SIZE,
      offset,
    });

    if (!comments.length) {
      button.remove();
      return;
    }

    const parentIds = comments.filter((c) => c.repliesCount > 0).map((c) => c.id);
    const firstReplies =
      parentIds.length > 0 ? await getPostCommentRepliesBatch(postId, parentIds, { limit: 1 }) : {};
    const nextLoadedCount = offset + comments.length;
    const totalCount = getProfilePostCommentTotal(postId, nextLoadedCount);

    button.insertAdjacentHTML("beforebegin", renderCommentItemsHtml(comments, firstReplies));

    const nextButtonHtml = renderMoreCommentsButtonHtml(postId, nextLoadedCount, totalCount);
    if (nextButtonHtml) {
      button.outerHTML = nextButtonHtml;
    } else {
      button.remove();
    }
  } catch (error) {
    console.error("[profile] load more comments failed", error);
    button.disabled = false;
  }
}

async function reloadProfileCommentsAfterMutation(
  root: Document | HTMLElement,
  postId: string,
  options: { skeletonState?: Parameters<typeof completeFixedCommentBlockSkeleton>[0] } = {},
): Promise<void> {
  try {
    await loadAndRenderPostComments(root, postId, { showLoading: !options.skeletonState });
  } catch (error) {
    console.error("[profile] reload comments failed", error);
    const listEl = root.querySelector<HTMLElement>(
      `[data-profile-post-comment-list="${CSS.escape(postId)}"]`,
    );
    if (listEl) {
      listEl.innerHTML = `<p class="profile-comment-empty">${t("profile.commentSendError")}</p>`;
    }
  }

  completeFixedCommentBlockSkeleton(options.skeletonState ?? null);
}

function openProfileCommentMenu(root: Document | HTMLElement, toggle: HTMLButtonElement): void {
  const commentId = toggle.getAttribute("data-comment-menu-toggle") ?? "";
  const postId = toggle.getAttribute("data-comment-menu-post") ?? "";
  if (!commentId || !postId) return;

  const menu = document.querySelector<HTMLElement>(
    `[data-comment-menu="${CSS.escape(commentId)}"][data-comment-menu-post="${CSS.escape(postId)}"]`,
  );
  const isExpanded = toggle.getAttribute("aria-expanded") === "true";
  closeCommentMenus(root);

  if (!menu || isExpanded) return;

  const floatingMenu = menu.cloneNode(true);
  if (!(floatingMenu instanceof HTMLElement)) return;

  floatingMenu.dataset.commentMenuFloating = "";
  positionCommentMenu(floatingMenu, toggle);
  document.body.appendChild(floatingMenu);
  bindFloatingCommentMenuActions(floatingMenu, root, {
    onEdit: (targetPostId, targetCommentId) => {
      openCommentEditForm(root, targetPostId, targetCommentId);
    },
    onDelete: (targetPostId, targetCommentId, removedCount) => {
      void deleteProfileComment(root, targetPostId, targetCommentId, removedCount);
    },
  });
  floatingMenu.hidden = false;
  toggle.setAttribute("aria-expanded", "true");
}

async function deleteProfileComment(
  root: Document | HTMLElement,
  postId: string,
  commentId: string,
  removedCount: number,
): Promise<void> {
  if (!(await confirmCommentDelete())) return;

  const commentsEl = root.querySelector<HTMLElement>(
    `[data-profile-post-comments="${CSS.escape(postId)}"]`,
  );
  const skeletonStartedAt = Date.now();
  const skeletonState = commentsEl
    ? showFixedCommentBlockSkeleton({
        commentsEl,
        postId,
        listAttribute: "data-profile-post-comment-list",
      })
    : null;

  try {
    await deletePostComment(postId, commentId);
    await waitForMinimumLoadingTime(skeletonStartedAt);
    const nextPosts = currentProfilePosts.map((post) =>
      post.id === postId ? { ...post, comments: Math.max(0, post.comments - removedCount) } : post,
    );
    setCurrentProfilePosts(nextPosts);
    const updatedPost = nextPosts.find((post) => post.id === postId);
    const countEl = root.querySelector<HTMLElement>(
      `[data-profile-post-comment-count="${CSS.escape(postId)}"]`,
    );
    if (countEl && updatedPost) {
      countEl.textContent = String(updatedPost.comments);
    }
    expandedReplies.get(postId)?.delete(commentId);
    await reloadProfileCommentsAfterMutation(root, postId, { skeletonState });
  } catch (error) {
    console.error("[profile] comment delete failed", error);
    restoreFixedCommentBlockSkeleton(skeletonState);
    showProfileToast(t("profile.commentDeleteError"));
  }
}

function updateOwnProfileCacheAvatar(avatarLink?: string): void {
  const cachedProfile = readJsonStorage<DisplayProfile>(OWN_PROFILE_CACHE_KEY);
  if (!cachedProfile) {
    return;
  }

  writeJsonStorage(OWN_PROFILE_CACHE_KEY, {
    ...cachedProfile,
    avatarLink,
  });
}

function rerenderProfilePostsSection(root: Document | HTMLElement): void {
  if (!currentProfile) {
    return;
  }

  const section = root.querySelector<HTMLElement>("#profile-posts");
  if (!section) {
    return;
  }

  const template = document.createElement("template");
  template.innerHTML = renderProfilePosts(currentProfile, currentProfilePosts, []).trim();
  const next = template.content.firstElementChild;
  if (!(next instanceof HTMLElement)) {
    return;
  }

  section.replaceWith(next);
  applyProfilePostFilters(root);
  initProfilePostListLayout(root);

  expandedPosts.forEach((postId) => {
    const commentsEl = root.querySelector<HTMLElement>(
      `[data-profile-post-comments="${CSS.escape(postId)}"]`,
    );
    const toggleBtn = root.querySelector<HTMLButtonElement>(
      `[data-profile-post-toggle-comments="${CSS.escape(postId)}"]`,
    );
    if (commentsEl) {
      commentsEl.hidden = false;
      toggleBtn?.setAttribute("aria-expanded", "true");
      void loadAndRenderPostComments(root, postId);
    }
  });
}

function restoreProfileCommentForm(
  root: Document | HTMLElement,
  postId: string,
  text: string,
  replyToId?: string,
  placeholder?: string,
): void {
  const form = root.querySelector<HTMLFormElement>(
    `[data-profile-post-comment-form="${CSS.escape(postId)}"]`,
  );
  const input = form?.querySelector<HTMLInputElement>(
    `[data-profile-post-comment-input="${CSS.escape(postId)}"]`,
  );
  const submitBtn = form?.querySelector<HTMLButtonElement>('button[type="submit"]');
  const errorEl = root.querySelector<HTMLElement>(
    `[data-profile-post-comment-error="${CSS.escape(postId)}"]`,
  );

  if (form && replyToId) {
    form.dataset.profilePostReplyTo = replyToId;
  }

  if (input) {
    input.value = text;
    if (placeholder) input.placeholder = placeholder;
  }
  if (submitBtn) submitBtn.disabled = false;

  if (errorEl) {
    errorEl.textContent = t("profile.commentSendError");
    errorEl.hidden = false;
  }
}

function resetProfileCommentForm(root: Document | HTMLElement, postId: string): void {
  const form = root.querySelector<HTMLFormElement>(
    `[data-profile-post-comment-form="${CSS.escape(postId)}"]`,
  );
  const input = form?.querySelector<HTMLInputElement>(
    `[data-profile-post-comment-input="${CSS.escape(postId)}"]`,
  );
  const submitBtn = form?.querySelector<HTMLButtonElement>('button[type="submit"]');
  const errorEl = root.querySelector<HTMLElement>(
    `[data-profile-post-comment-error="${CSS.escape(postId)}"]`,
  );

  if (form) delete form.dataset.profilePostReplyTo;
  if (input) {
    input.value = "";
    input.placeholder = t("profile.commentPlaceholder");
  }
  if (submitBtn) submitBtn.disabled = false;
  if (errorEl) {
    errorEl.hidden = true;
  }
}

function updateProfilePostLikeState(postId: string, likes: number, isLiked: boolean): void {
  const nextPosts = currentProfilePosts.map((post) =>
    post.id === postId
      ? {
          ...post,
          likes,
          isLiked,
        }
      : post,
  );

  setCurrentProfilePosts(nextPosts);

  if (currentProfile?.isOwnProfile) {
    writeJsonStorage(OWN_PROFILE_POSTS_CACHE_KEY, nextPosts);
  }
}

async function waitForNextPaint(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

async function waitMinimumSkeletonTime(ms = 520): Promise<void> {
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function updateProfileFriendActions(
  root: Document | HTMLElement,
  profileId: string,
  relation: "friend" | "none" | "outgoing",
): void {
  closeProfileFriendMenus(root);

  const actionsRoot = root.querySelector("[data-profile-friend-actions-root]");
  if (!(actionsRoot instanceof HTMLElement)) {
    return;
  }

  const template = document.createElement("template");
  template.innerHTML = renderProfileFriendActions({
    id: profileId,
    friendRelation: relation,
    isOwnProfile: false,
    isApiBacked: true,
  }).trim();

  const nextActionsRoot = template.content.firstElementChild;
  if (!(nextActionsRoot instanceof HTMLElement)) {
    return;
  }

  actionsRoot.replaceWith(nextActionsRoot);
}

function closeProfileFriendMenus(root: Document | HTMLElement): void {
  document.querySelectorAll<HTMLElement>("[data-profile-friend-menu-floating]").forEach((menu) => {
    menu.remove();
  });

  document.querySelectorAll<HTMLElement>("[data-profile-friend-menu]").forEach((menu) => {
    menu.hidden = true;
    menu.style.top = "";
    menu.style.right = "";
    menu.style.left = "";
  });

  root
    .querySelectorAll<HTMLButtonElement>("[data-profile-friend-menu-toggle]")
    .forEach((button) => {
      button.setAttribute("aria-expanded", "false");
    });
}

function positionProfileFriendMenu(menu: HTMLElement, toggle: HTMLButtonElement): void {
  const rect = toggle.getBoundingClientRect();
  menu.style.top = `${rect.bottom + 8}px`;
  menu.style.right = `${window.innerWidth - rect.right}px`;
  menu.style.left = "auto";
}

async function resolveChatIdForProfile(profileId: string, profileName: string): Promise<string> {
  return createOrResolvePrivateChatId(profileId, { expectedTitle: profileName });
}

function readProfileAvatarLinkFromRoot(root: Document | HTMLElement): string | undefined {
  const avatarImage = root.querySelector<HTMLImageElement>(".profile-card__avatar");
  const avatarSrc = avatarImage?.getAttribute("src")?.trim();
  return avatarSrc || undefined;
}

function bindFloatingPostMenuActions(
  menu: HTMLElement,
  root: Document | HTMLElement,
  postId: string,
): void {
  const editButton = menu.querySelector<HTMLButtonElement>(`[data-profile-post-edit="${postId}"]`);
  if (editButton) {
    editButton.onclick = () => {
      const post = currentProfilePosts.find((item) => item.id === postId);
      if (!post || !canEditProfilePost(post)) {
        closeProfilePostMenus(root);
        return;
      }

      closeProfilePostMenus(root);
      openEditPostComposer(postId);
      syncPostComposerUi(root);
    };
  }

  const deleteButton = menu.querySelector<HTMLButtonElement>(
    `[data-profile-post-delete="${postId}"]`,
  );
  if (deleteButton) {
    deleteButton.onclick = () => {
      closeProfilePostMenus(root);
      postComposerState.deleteConfirmPostId = postId;
      postComposerState.errorMessage = "";
      syncPostComposerUi(root);
    };
  }
}

function getProfileNameFromRoot(root: Document | HTMLElement, profileId: string): string {
  return root.querySelector(".profile-card__hero-copy h1")?.textContent?.trim() || profileId;
}

function openChatWithProfile(root: Document | HTMLElement, profileId: string): void {
  const profileName = getProfileNameFromRoot(root, profileId);

  void resolveChatIdForProfile(profileId, profileName)
    .then((chatId) => {
      rememberChatContactHint({
        chatId,
        profileId,
        title: profileName,
        avatarLink: readProfileAvatarLinkFromRoot(root),
      });
      window.history.pushState({}, "", `/chats?chatId=${encodeURIComponent(chatId)}`);
      window.dispatchEvent(new PopStateEvent("popstate"));
    })
    .catch((error: unknown) => {
      console.error("[profile] open chat failed", error);
    });
}

function requestProfileFriend(
  root: Document | HTMLElement,
  profileId: string,
  button?: HTMLButtonElement,
): void {
  if (button) {
    button.disabled = true;
  }

  void requestFriendship(profileId)
    .then(() => {
      invalidateFriendsState();
      updateProfileFriendActions(root, profileId, "outgoing");
      showProfileToast(t("profile.friendRequestSentToast"));
    })
    .catch((error: unknown) => {
      console.error("[profile] request friend failed", error);
      if (button) {
        button.disabled = false;
      }
    });
}

function revokeProfileFriendRequest(
  root: Document | HTMLElement,
  profileId: string,
  button?: HTMLButtonElement,
): void {
  if (button) {
    button.disabled = true;
  }

  void revokeFriendRequest(profileId)
    .then(() => {
      invalidateFriendsState();
      updateProfileFriendActions(root, profileId, "none");
      showProfileToast(t("profile.friendRequestRevokedToast"));
    })
    .catch((error: unknown) => {
      console.error("[profile] revoke friend request failed", error);
      if (button) {
        button.disabled = false;
      }
    });
}

function acceptProfileFriendRequest(
  root: Document | HTMLElement,
  profileId: string,
  button?: HTMLButtonElement,
): void {
  if (button) {
    button.disabled = true;
  }

  void acceptFriendRequest(profileId)
    .then(() => {
      invalidateFriendsState();
      updateProfileFriendActions(root, profileId, "friend");
      showProfileToast(t("profile.friendRequestAcceptedToast"));
    })
    .catch((error: unknown) => {
      console.error("[profile] accept friend failed", error);
      if (button) {
        button.disabled = false;
      }
    });
}

function declineProfileFriendRequest(
  root: Document | HTMLElement,
  profileId: string,
  button?: HTMLButtonElement,
): void {
  if (button) {
    button.disabled = true;
  }

  void declineFriendRequest(profileId)
    .then(() => {
      invalidateFriendsState();
      updateProfileFriendActions(root, profileId, "none");
      showProfileToast(t("profile.friendRequestDeclinedToast"));
    })
    .catch((error: unknown) => {
      console.error("[profile] decline friend failed", error);
      if (button) {
        button.disabled = false;
      }
    });
}

function openProfileDeleteFriendModal(root: Document | HTMLElement): void {
  const deleteModal = root.querySelector("[data-profile-delete-modal]");
  if (deleteModal instanceof HTMLElement) {
    closeProfileFriendMenus(root);
    deleteModal.hidden = false;
  }
}

function bindFloatingProfileFriendMenuActions(
  menu: HTMLElement,
  root: Document | HTMLElement,
  profileId: string,
): void {
  const openChatButton = menu.querySelector<HTMLButtonElement>("[data-profile-open-chat]");
  if (openChatButton) {
    openChatButton.onclick = () => {
      closeProfileFriendMenus(root);
      openChatWithProfile(root, profileId);
    };
  }

  const requestButton = menu.querySelector<HTMLButtonElement>("[data-profile-request-friend]");
  if (requestButton) {
    requestButton.onclick = () => {
      requestProfileFriend(root, profileId, requestButton);
    };
  }

  const revokeButton = menu.querySelector<HTMLButtonElement>("[data-profile-revoke-friend]");
  if (revokeButton) {
    revokeButton.onclick = () => {
      revokeProfileFriendRequest(root, profileId, revokeButton);
    };
  }

  const acceptButton = menu.querySelector<HTMLButtonElement>("[data-profile-accept-friend]");
  if (acceptButton) {
    acceptButton.onclick = () => {
      acceptProfileFriendRequest(root, profileId, acceptButton);
    };
  }

  const declineButton = menu.querySelector<HTMLButtonElement>("[data-profile-decline-friend]");
  if (declineButton) {
    declineButton.onclick = () => {
      declineProfileFriendRequest(root, profileId, declineButton);
    };
  }

  const deleteButton = menu.querySelector<HTMLButtonElement>("[data-profile-delete-friend]");
  if (deleteButton) {
    deleteButton.onclick = () => {
      openProfileDeleteFriendModal(root);
    };
  }
}

// ---------------------------------------------------------------------------
// Привязка обработчиков событий профиля
// ---------------------------------------------------------------------------

export function bindProfileEvents(root: Document | HTMLElement): void {
  let avatarBackdropPressStarted = false;
  let avatarDeleteBackdropPressStarted = false;

  root.addEventListener("pointerdown", (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const avatarModalBackdrop = target.closest("[data-profile-avatar-modal]");
    avatarBackdropPressStarted = avatarModalBackdrop === target;

    const avatarDeleteModalBackdrop = target.closest("[data-profile-avatar-delete-modal]");
    avatarDeleteBackdropPressStarted = avatarDeleteModalBackdrop === target;
  });

  root.addEventListener("click", (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (target.closest("[data-post-image-open]")) {
      closeProfilePostMenus(root);
      if (openPostImageViewerFromTarget(target)) return;
    }

    const commentMenuToggle = target.closest("[data-comment-menu-toggle]");
    if (commentMenuToggle instanceof HTMLButtonElement) {
      openProfileCommentMenu(root, commentMenuToggle);
      return;
    }

    if (!target.closest("[data-comment-menu]") && !target.closest("[data-comment-menu-toggle]")) {
      closeCommentMenus(root);
    }

    const commentEditCancel = target.closest("[data-comment-edit-cancel]");
    if (commentEditCancel instanceof HTMLButtonElement) {
      const commentId = commentEditCancel.getAttribute("data-comment-edit-cancel") ?? "";
      if (commentId) cancelCommentEdit(root, commentId);
      return;
    }

    const toggleCommentsBtn = target.closest("[data-profile-post-toggle-comments]");
    if (toggleCommentsBtn instanceof HTMLButtonElement) {
      const postId = toggleCommentsBtn.getAttribute("data-profile-post-toggle-comments") ?? "";
      if (!postId) return;

      const commentsEl = root.querySelector<HTMLElement>(
        `[data-profile-post-comments="${CSS.escape(postId)}"]`,
      );
      if (!commentsEl) return;

      const isExpanded = !commentsEl.hidden;
      if (isExpanded) {
        commentsEl.hidden = true;
        expandedPosts.delete(postId);
        expandedReplies.delete(postId);
        toggleCommentsBtn.setAttribute("aria-expanded", "false");
      } else {
        commentsEl.hidden = false;
        expandedPosts.add(postId);
        toggleCommentsBtn.setAttribute("aria-expanded", "true");
        void loadAndRenderPostComments(root, postId);
      }
      return;
    }

    const showMoreCommentsBtn = target.closest("[data-show-more-comments]");
    if (showMoreCommentsBtn instanceof HTMLButtonElement) {
      if (!showMoreCommentsBtn.closest("[data-profile-post-comments]")) return;
      const postId = showMoreCommentsBtn.getAttribute("data-show-more-comments-post") ?? "";
      if (!postId || showMoreCommentsBtn.disabled) return;
      void loadMoreProfilePostComments(root, postId, showMoreCommentsBtn);
      return;
    }

    const showRepliesBtn = target.closest("[data-show-replies]");
    if (showRepliesBtn instanceof HTMLButtonElement) {
      const commentId = showRepliesBtn.getAttribute("data-show-replies") ?? "";
      const postId = showRepliesBtn.getAttribute("data-show-replies-post") ?? "";
      const repliesContainer = root.querySelector<HTMLElement>(
        `[data-comment-replies="${CSS.escape(commentId)}"]`,
      );
      if (!repliesContainer || !postId || !commentId) return;

      showRepliesBtn.disabled = true;
      void getPostCommentReplies(postId, commentId, { limit: 50 })
        .then((replies) => {
          repliesContainer.innerHTML = replies
            .map((r) => renderSingleCommentHtml(r, true))
            .join("");
          if (!expandedReplies.has(postId)) expandedReplies.set(postId, new Set());
          expandedReplies.get(postId)!.add(commentId);
        })
        .catch(() => {
          showRepliesBtn.disabled = false;
        });
      return;
    }

    const commentLikeBtn = target.closest("[data-comment-like]");
    if (commentLikeBtn instanceof HTMLButtonElement) {
      const commentId = commentLikeBtn.getAttribute("data-comment-like") ?? "";
      const postId = commentLikeBtn.getAttribute("data-comment-like-post") ?? "";
      if (!commentId || !postId || commentLikeBtn.disabled) return;

      const isLiked = commentLikeBtn.getAttribute("aria-pressed") === "true";
      commentLikeBtn.disabled = true;
      void (isLiked ? unlikePostComment(postId, commentId) : likePostComment(postId, commentId))
        .then((updated) => {
          const isNowLiked = updated.isLiked;
          commentLikeBtn.setAttribute("aria-pressed", String(isNowLiked));
          commentLikeBtn.classList.toggle("profile-comment__like--liked", isNowLiked);
          const countSpan = commentLikeBtn.querySelector<HTMLElement>(
            ".profile-comment__like-count",
          );
          if (countSpan) {
            countSpan.textContent = String(Math.max(0, updated.likes));
          }
        })
        .catch((error: unknown) => {
          console.error("[profile] comment like failed", error);
        })
        .finally(() => {
          commentLikeBtn.disabled = false;
        });
      return;
    }

    const replyButton = target.closest("[data-comment-reply]");
    if (replyButton instanceof HTMLButtonElement) {
      const commentId = replyButton.getAttribute("data-comment-reply") ?? "";
      const postId = replyButton.getAttribute("data-reply-post") ?? "";
      const authorName = replyButton.getAttribute("data-reply-author") ?? "";
      const form = root.querySelector<HTMLFormElement>(
        `[data-profile-post-comment-form="${CSS.escape(postId)}"]`,
      );
      const input = form?.querySelector<HTMLInputElement>(
        `[data-profile-post-comment-input="${CSS.escape(postId)}"]`,
      );
      if (form && input) {
        form.dataset.profilePostReplyTo = commentId;
        input.placeholder = t("profile.commentReplyPlaceholder").replace("{{name}}", authorName);
        input.focus();
      }
      return;
    }

    const postSearchOpenButton = target.closest("[data-profile-post-search-open]");
    if (postSearchOpenButton instanceof HTMLButtonElement) {
      openProfilePostSearch(root);
      return;
    }

    const postSearchCloseButton = target.closest("[data-profile-post-search-close]");
    if (postSearchCloseButton instanceof HTMLButtonElement) {
      closeProfilePostSearch(root);
      return;
    }

    const postMenuToggle = target.closest("[data-profile-post-menu-toggle]");
    if (postMenuToggle instanceof HTMLButtonElement) {
      const postId = postMenuToggle.getAttribute("data-profile-post-menu-toggle");
      if (!postId) {
        return;
      }

      const menu = document.querySelector<HTMLElement>(`[data-profile-post-menu="${postId}"]`);
      const isExpanded = postMenuToggle.getAttribute("aria-expanded") === "true";
      closeProfilePostMenus(root);

      if (menu && !isExpanded) {
        const rect = postMenuToggle.getBoundingClientRect();
        menu.style.top = `${rect.bottom + 8}px`;
        menu.style.right = `${window.innerWidth - rect.right}px`;
        menu.style.left = "auto";
        document.body.appendChild(menu);
        bindFloatingPostMenuActions(menu, root, postId);
        menu.hidden = false;
        postMenuToggle.setAttribute("aria-expanded", "true");
      }
      return;
    }

    if (!target.closest(".profile-post__actions") && !target.closest("[data-profile-post-menu]")) {
      closeProfilePostMenus(root);
    }

    const friendMenuToggle = target.closest("[data-profile-friend-menu-toggle]");
    if (friendMenuToggle instanceof HTMLButtonElement) {
      event.preventDefault();
      event.stopPropagation();

      const profileId = friendMenuToggle.getAttribute("data-profile-friend-menu-toggle");
      if (!profileId) return;

      const menu = root.querySelector<HTMLElement>(`[data-profile-friend-menu="${profileId}"]`);
      const isExpanded = friendMenuToggle.getAttribute("aria-expanded") === "true";
      closeProfileFriendMenus(root);

      if (menu && !isExpanded) {
        const floatingMenu = menu.cloneNode(true);
        if (!(floatingMenu instanceof HTMLElement)) {
          return;
        }

        floatingMenu.dataset.profileFriendMenuFloating = "";
        floatingMenu.hidden = false;
        document.body.appendChild(floatingMenu);
        bindFloatingProfileFriendMenuActions(floatingMenu, root, profileId);
        positionProfileFriendMenu(floatingMenu, friendMenuToggle);
        friendMenuToggle.setAttribute("aria-expanded", "true");
      }
      return;
    }

    if (
      !target.closest(".profile-friend-actions") &&
      !target.closest("[data-profile-friend-menu]")
    ) {
      closeProfileFriendMenus(root);
    }

    const likePostButton = target.closest("[data-profile-post-like]");
    if (likePostButton instanceof HTMLButtonElement) {
      const postId = likePostButton.getAttribute("data-profile-post-like");
      const post = postId ? currentProfilePosts.find((item) => item.id === postId) : null;
      if (!postId || !post || likePostButton.disabled) {
        return;
      }

      likePostButton.disabled = true;
      void (post.isLiked ? unlikePost(postId) : likePost(postId))
        .then((updatedPost) => {
          updateProfilePostLikeState(
            postId,
            updatedPost.likes ?? 0,
            updatedPost.isLiked ?? !post.isLiked,
          );
          clearFeedCache();
          rerenderProfilePostsSection(root);
        })
        .catch((error: unknown) => {
          console.error("[profile] like toggle failed", error);
          likePostButton.disabled = false;
        });
      return;
    }

    const openPostComposerButton = target.closest("[data-profile-post-open]");
    if (openPostComposerButton instanceof HTMLButtonElement) {
      openCreatePostComposer();
      closeProfilePostMenus(root);
      syncPostComposerUi(root);
      return;
    }

    const editPostButton = target.closest("[data-profile-post-edit]");
    if (editPostButton instanceof HTMLButtonElement) {
      const postId = editPostButton.getAttribute("data-profile-post-edit");
      if (postId) {
        const post = currentProfilePosts.find((item) => item.id === postId);
        if (!post || !canEditProfilePost(post)) {
          closeProfilePostMenus(root);
          return;
        }

        closeProfilePostMenus(root);
        openEditPostComposer(postId);
        syncPostComposerUi(root);
      }
      return;
    }

    const deletePostButton = target.closest("[data-profile-post-delete]");
    if (deletePostButton instanceof HTMLButtonElement) {
      const postId = deletePostButton.getAttribute("data-profile-post-delete");
      if (postId) {
        closeProfilePostMenus(root);
        postComposerState.deleteConfirmPostId = postId;
        postComposerState.errorMessage = "";
        syncPostComposerUi(root);
      }
      return;
    }

    const closePostDeleteButton = target.closest("[data-profile-post-delete-close]");
    const postDeleteBackdrop = target.closest("[data-profile-post-delete-modal]");
    if (closePostDeleteButton instanceof HTMLButtonElement || postDeleteBackdrop === target) {
      postComposerState.deleteConfirmPostId = null;
      postComposerState.isSaving = false;
      postComposerState.errorMessage = "";
      syncPostComposerUi(root);
      return;
    }

    const closePostComposerButton = target.closest("[data-profile-post-close]");
    const postComposerBackdrop = target.closest("[data-profile-post-modal]");
    if (closePostComposerButton instanceof HTMLButtonElement || postComposerBackdrop === target) {
      resetPostComposerState();
      syncPostComposerUi(root);
      return;
    }

    const pickPostImageButton = target.closest("[data-profile-post-pick-image]");
    if (pickPostImageButton instanceof HTMLButtonElement) {
      if (pickPostImageButton.disabled || postComposerState.mediaItems.length >= 5) {
        return;
      }

      const imageInput = root.querySelector<HTMLInputElement>("[data-profile-post-image-input]");
      if (imageInput) {
        imageInput.value = "";
        imageInput.click();
      }
      return;
    }

    const pickPostFileButton = target.closest("[data-profile-post-pick-file]");
    if (pickPostFileButton instanceof HTMLButtonElement) {
      if (pickPostFileButton.disabled || postComposerState.fileItems.length >= 10) {
        return;
      }

      const fileInput = root.querySelector<HTMLInputElement>("[data-profile-post-file-input]");
      if (fileInput) {
        fileInput.value = "";
        fileInput.click();
      }
      return;
    }

    const removePostImageButton = target.closest("[data-profile-post-remove-image]");
    if (removePostImageButton instanceof HTMLButtonElement) {
      const index = Number.parseInt(
        removePostImageButton.getAttribute("data-profile-post-remove-image") ?? "-1",
        10,
      );
      removeComposerMediaItem(index);
      syncPostComposerUi(root);
      return;
    }

    const removePostFileButton = target.closest("[data-profile-post-remove-file]");
    if (removePostFileButton instanceof HTMLButtonElement) {
      const index = Number.parseInt(
        removePostFileButton.getAttribute("data-profile-post-remove-file") ?? "-1",
        10,
      );
      removeComposerFileItem(index);
      syncPostComposerUi(root);
      return;
    }

    const savePostButton = target.closest("[data-profile-post-save]");
    if (savePostButton instanceof HTMLButtonElement) {
      const trimmedText = postComposerState.text.trim();
      if (
        !trimmedText &&
        postComposerState.mediaItems.length === 0 &&
        postComposerState.fileItems.length === 0
      ) {
        postComposerState.errorMessage = t("profile.postContentRequired");
        syncPostComposerUi(root);
        return;
      }

      const composerSnapshot = {
        mode: postComposerState.mode,
        editingPostId: postComposerState.editingPostId,
        text: postComposerState.text,
        mediaItems: [...postComposerState.mediaItems],
        fileItems: [...postComposerState.fileItems],
      };
      pendingProfilePostState.mode = postComposerState.mode === "edit" ? "edit" : "create";
      pendingProfilePostState.postId = postComposerState.editingPostId;
      postComposerState.isSaving = true;
      postComposerState.errorMessage = "";
      postComposerState.open = false;
      syncPostComposerUi(root);
      rerenderProfilePostsSection(root);
      void waitForNextPaint();

      const savePromise =
        postComposerState.mode === "edit" && postComposerState.editingPostId
          ? (async () => {
              await uploadPendingComposerImages();
              await uploadPendingComposerFiles();
              const knownMediaItems = postComposerState.mediaItems.filter(
                (item): item is ComposerMediaItem & { mediaID: number } =>
                  item.isUploaded && typeof item.mediaID === "number" && item.mediaID > 0,
              );
              const knownFileItems = postComposerState.fileItems.filter(
                (item): item is ComposerMediaItem & { mediaID: number } =>
                  item.isUploaded && typeof item.mediaID === "number" && item.mediaID > 0,
              );
              const canSyncMedia = knownMediaItems.length === postComposerState.mediaItems.length;
              const canSyncFiles = knownFileItems.length === postComposerState.fileItems.length;

              if (
                (!canSyncMedia &&
                  postComposerState.mediaItems.some(
                    (item) => !item.isUploaded || item.mediaID == null,
                  )) ||
                (!canSyncFiles &&
                  postComposerState.fileItems.some(
                    (item) => !item.isUploaded || item.mediaID == null,
                  ))
              ) {
                throw new Error(t("profile.postImagesSyncError"));
              }

              return updatePost(
                postComposerState.editingPostId!,
                canSyncMedia
                  ? {
                      text: trimmedText,
                      media: knownMediaItems.map((item) => ({
                        mediaID: item.mediaID,
                        mediaURL: item.mediaURL,
                      })),
                      files: knownFileItems.map((item) => ({
                        mediaID: item.mediaID,
                        mediaURL: item.mediaURL,
                      })),
                    }
                  : {
                      text: trimmedText,
                    },
              );
            })()
          : (async () => {
              await uploadPendingComposerImages();
              await uploadPendingComposerFiles();

              const createPayload = {
                media: postComposerState.mediaItems
                  .filter(
                    (item): item is ComposerMediaItem & { mediaID: number } =>
                      item.isUploaded && typeof item.mediaID === "number",
                  )
                  .map((item) => ({
                    mediaID: item.mediaID,
                    mediaURL: item.mediaURL,
                  })),
                files: postComposerState.fileItems
                  .filter(
                    (item): item is ComposerMediaItem & { mediaID: number } =>
                      item.isUploaded && typeof item.mediaID === "number",
                  )
                  .map((item) => ({
                    mediaID: item.mediaID,
                    mediaURL: item.mediaURL,
                  })),
              } as {
                text?: string;
                media: Array<{ mediaID: number; mediaURL: string }>;
                files: Array<{ mediaID: number; mediaURL: string }>;
              };

              if (trimmedText) {
                createPayload.text = trimmedText;
              }

              return createPost(createPayload);
            })();

      void savePromise
        .then(async (savedPost) => {
          await waitMinimumSkeletonTime();
          clearFeedCache();
          clearWidgetbarCache();
          if (currentProfile) {
            const existingPost = composerSnapshot.editingPostId
              ? currentProfilePosts.find((post) => post.id === composerSnapshot.editingPostId)
              : undefined;
            const createdAt =
              savedPost.createdAt ?? existingPost?.timeRaw ?? new Date().toISOString();
            const nextPost = {
              id: String(savedPost.id),
              authorId: String(savedPost.profileID ?? currentProfile.id),
              authorFirstName: savedPost.firstName ?? currentProfile.firstName,
              authorLastName: savedPost.lastName ?? currentProfile.lastName,
              authorUsername: currentProfile.username,
              authorAvatarLink:
                normaliseAvatarLink(savedPost.avatarURL) ?? currentProfile.avatarLink ?? "",
              isOwnPost: true,
              text: typeof savedPost.text === "string" ? savedPost.text : "",
              time: existingPost?.time ?? t("postcard.justNow"),
              timeRaw: createdAt,
              ...(savedPost.updatedAt ? { updatedAtRaw: savedPost.updatedAt } : {}),
              likes: savedPost.likes ?? 0,
              isLiked: savedPost.isLiked ?? false,
              reposts: 0,
              comments: 0,
              media: Array.isArray(savedPost.media) ? savedPost.media : [],
              files: Array.isArray(savedPost.files) ? savedPost.files : [],
              images: Array.isArray(savedPost.mediaURL)
                ? savedPost.mediaURL.filter(Boolean)
                : Array.isArray(savedPost.media)
                  ? savedPost.media.map((item) => item.mediaURL)
                  : [],
            };
            const nextPosts = [
              nextPost,
              ...currentProfilePosts.filter((post) => post.id !== nextPost.id),
            ];
            setCurrentProfilePosts(nextPosts);
            writeJsonStorage(OWN_PROFILE_POSTS_CACHE_KEY, nextPosts);
          }
          resetPendingProfilePostState();
          resetPostComposerState();
          syncPostComposerUi(root);
          rerenderProfilePostsSection(root);
        })
        .catch((error: unknown) => {
          resetPendingProfilePostState();
          postComposerState.isSaving = false;
          postComposerState.open = true;
          postComposerState.mode = composerSnapshot.mode;
          postComposerState.editingPostId = composerSnapshot.editingPostId;
          postComposerState.text = composerSnapshot.text;
          postComposerState.mediaItems = composerSnapshot.mediaItems;
          postComposerState.fileItems = composerSnapshot.fileItems;
          postComposerState.errorMessage = isOutboxQueuedError(error)
            ? t("profile.postSaveQueued")
            : isOfflineNetworkError(error)
              ? t("feed.noInternet")
              : error instanceof Error
                ? error.message
                : t("profile.postSaveError");
          syncPostComposerUi(root);
        });
      return;
    }

    const openAvatarButton = target.closest("[data-profile-avatar-open]");
    if (openAvatarButton instanceof HTMLButtonElement) {
      avatarModalState.open = true;
      avatarModalState.errorMessage = "";
      syncAvatarModalUi(root);
      ensureAvatarEditorSource(root);
      return;
    }

    const rotateLeftButton = target.closest("[data-profile-avatar-rotate-left]");
    if (rotateLeftButton instanceof HTMLButtonElement) {
      rotateAvatar(root, "left");
      return;
    }

    const rotateRightButton = target.closest("[data-profile-avatar-rotate-right]");
    if (rotateRightButton instanceof HTMLButtonElement) {
      rotateAvatar(root, "right");
      return;
    }

    const openAvatarDeleteButton = target.closest("[data-profile-avatar-delete-open]");
    if (openAvatarDeleteButton instanceof HTMLButtonElement) {
      avatarModalState.deleteConfirmOpen = true;
      syncAvatarModalUi(root);
      return;
    }

    const closeAvatarDeleteButton = target.closest("[data-profile-avatar-delete-close]");
    const avatarDeleteBackdrop = target.closest("[data-profile-avatar-delete-modal]");
    if (
      closeAvatarDeleteButton instanceof HTMLButtonElement ||
      (avatarDeleteBackdropPressStarted && avatarDeleteBackdrop === target)
    ) {
      avatarDeleteBackdropPressStarted = false;
      avatarModalState.deleteConfirmOpen = false;
      syncAvatarModalUi(root);
      return;
    }
    avatarDeleteBackdropPressStarted = false;

    const confirmAvatarDeleteButton = target.closest("[data-profile-avatar-delete-confirm]");
    if (confirmAvatarDeleteButton instanceof HTMLButtonElement) {
      avatarModalState.isSaving = true;
      avatarModalState.errorMessage = "";
      syncAvatarModalUi(root);

      void updateMyProfile({ removeAvatar: true })
        .then(async () => {
          setOwnAvatarOverride(null);
          updateSessionUserAvatarLink(undefined);
          updateOwnProfileCacheAvatar(undefined);

          resetAvatarModalState();
          syncAvatarModalUi(root);
          await rerenderCurrentRoute();
        })
        .catch((error: unknown) => {
          avatarModalState.isSaving = false;
          avatarModalState.deleteConfirmOpen = false;
          avatarModalState.errorMessage = isOfflineNetworkError(error)
            ? "Нет соединения с интернетом."
            : error instanceof Error
              ? error.message
              : "Не получилось удалить аватар.";
          syncAvatarModalUi(root);
        });
      return;
    }

    const closeAvatarButton = target.closest("[data-profile-avatar-close]");
    const avatarModalBackdrop = target.closest("[data-profile-avatar-modal]");
    if (
      closeAvatarButton instanceof HTMLButtonElement ||
      (avatarBackdropPressStarted && avatarModalBackdrop === target)
    ) {
      avatarBackdropPressStarted = false;
      resetAvatarModalState();
      syncAvatarModalUi(root);
      return;
    }
    avatarBackdropPressStarted = false;

    const pickAvatarButton = target.closest("[data-profile-avatar-pick]");
    if (pickAvatarButton instanceof HTMLButtonElement) {
      const fileInput = root.querySelector<HTMLInputElement>("[data-profile-avatar-input]");
      if (fileInput) {
        fileInput.value = "";
        fileInput.click();
      }
      return;
    }

    const saveAvatarButton = target.closest("[data-profile-avatar-save]");
    if (saveAvatarButton instanceof HTMLButtonElement) {
      avatarModalState.isSaving = true;
      avatarModalState.errorMessage = "";
      syncAvatarModalUi(root);

      void buildAvatarFile(root)
        .then(async (file) => {
          const uploadedAvatar = await uploadProfileAvatar(file);

          await updateMyProfile({ avatarID: uploadedAvatar.mediaID });

          const freshProfile = await getMyProfile();
          const nextOverride = normaliseAvatarLink(freshProfile.imageLink);

          setOwnAvatarOverride(nextOverride);
          updateSessionUserAvatarLink(nextOverride);
          updateOwnProfileCacheAvatar(nextOverride);

          resetAvatarModalState();
          syncAvatarModalUi(root);
          await rerenderCurrentRoute();
        })
        .catch((error: unknown) => {
          avatarModalState.isSaving = false;
          avatarModalState.errorMessage = isOfflineNetworkError(error)
            ? "Нет соединения с интернетом."
            : error instanceof Error
              ? error.message
              : "Не получилось сохранить аватар.";
          syncAvatarModalUi(root);
        });
      return;
    }

    const openChatButton = target.closest("[data-profile-open-chat]");
    if (openChatButton instanceof HTMLButtonElement) {
      const profileId = openChatButton.getAttribute("data-profile-open-chat");
      if (!profileId) {
        return;
      }

      closeProfileFriendMenus(root);
      openChatWithProfile(root, profileId);
      return;
    }

    const requestFriendButton = target.closest("[data-profile-request-friend]");
    if (requestFriendButton instanceof HTMLButtonElement) {
      const profileId = requestFriendButton.getAttribute("data-profile-request-friend");
      if (!profileId) {
        return;
      }

      requestProfileFriend(root, profileId, requestFriendButton);
      return;
    }

    const revokeFriendButton = target.closest("[data-profile-revoke-friend]");
    if (revokeFriendButton instanceof HTMLButtonElement) {
      const profileId = revokeFriendButton.getAttribute("data-profile-revoke-friend");
      if (!profileId) {
        return;
      }

      revokeProfileFriendRequest(root, profileId, revokeFriendButton);
      return;
    }

    const acceptFriendButton = target.closest("[data-profile-accept-friend]");
    if (acceptFriendButton instanceof HTMLButtonElement) {
      const profileId = acceptFriendButton.getAttribute("data-profile-accept-friend");
      if (!profileId) {
        return;
      }

      acceptProfileFriendRequest(root, profileId, acceptFriendButton);
      return;
    }

    const declineFriendButton = target.closest("[data-profile-decline-friend]");
    if (declineFriendButton instanceof HTMLButtonElement) {
      const profileId = declineFriendButton.getAttribute("data-profile-decline-friend");
      if (!profileId) {
        return;
      }

      declineProfileFriendRequest(root, profileId, declineFriendButton);
      return;
    }

    const deleteFriendButton = target.closest("[data-profile-delete-friend]");
    if (deleteFriendButton instanceof HTMLButtonElement) {
      openProfileDeleteFriendModal(root);
      return;
    }

    const closeDeleteModalButton = target.closest("[data-profile-delete-modal-close]");
    const deleteModalBackdrop = target.closest("[data-profile-delete-modal]");
    if (closeDeleteModalButton instanceof HTMLButtonElement || deleteModalBackdrop === target) {
      const deleteModal = root.querySelector("[data-profile-delete-modal]");
      if (deleteModal instanceof HTMLElement) {
        deleteModal.hidden = true;
      }
      return;
    }

    const confirmDeleteButton = target.closest("[data-profile-confirm-delete]");
    if (confirmDeleteButton instanceof HTMLButtonElement) {
      const profileId = confirmDeleteButton.getAttribute("data-profile-confirm-delete");
      if (!profileId) {
        return;
      }

      confirmDeleteButton.disabled = true;
      void deleteFriend(profileId)
        .then(() => {
          invalidateFriendsState();
          updateProfileFriendActions(root, profileId, "none");
          const deleteModal = root.querySelector("[data-profile-delete-modal]");
          if (deleteModal instanceof HTMLElement) {
            deleteModal.hidden = true;
          }
          showProfileToast(t("profile.friendRemovedToast"));
        })
        .catch((error: unknown) => {
          console.error("[profile] delete friend failed", error);
          confirmDeleteButton.disabled = false;
        });
      return;
    }

    const confirmPostDeleteButton = target.closest("[data-profile-post-delete-confirm]");
    if (confirmPostDeleteButton instanceof HTMLButtonElement) {
      const postId = postComposerState.deleteConfirmPostId;
      if (!postId) {
        return;
      }

      pendingProfilePostState.mode = "delete";
      pendingProfilePostState.postId = postId;
      postComposerState.isSaving = true;
      postComposerState.errorMessage = "";
      postComposerState.deleteConfirmPostId = null;
      syncPostComposerUi(root);
      rerenderProfilePostsSection(root);
      void waitForNextPaint();

      void deletePost(postId)
        .then(async () => {
          await waitMinimumSkeletonTime();
          clearFeedCache();
          clearWidgetbarCache();
          const nextPosts = currentProfilePosts.filter((post) => post.id !== postId);
          setCurrentProfilePosts(nextPosts);
          writeJsonStorage(OWN_PROFILE_POSTS_CACHE_KEY, nextPosts);
          resetPendingProfilePostState();
          resetPostComposerState();
          syncPostComposerUi(root);
          rerenderProfilePostsSection(root);
        })
        .catch((error: unknown) => {
          resetPendingProfilePostState();
          postComposerState.isSaving = false;
          postComposerState.deleteConfirmPostId = postId;
          postComposerState.errorMessage = isOutboxQueuedError(error)
            ? t("profile.postDeleteQueued")
            : isOfflineNetworkError(error)
              ? t("feed.noInternet")
              : error instanceof Error
                ? error.message
                : t("profile.postDeleteError");
          syncPostComposerUi(root);
          rerenderProfilePostsSection(root);
        });

      return;
    }

    const button = target.closest("[data-profile-toggle]");
    if (!(button instanceof HTMLButtonElement)) return;

    const card = button.closest(".profile-card");
    if (!(card instanceof HTMLElement)) return;

    const more = card.querySelector(".profile-card__more");
    if (!(more instanceof HTMLElement)) return;

    const isExpanded = button.getAttribute("aria-expanded") === "true";
    const nextExpanded = !isExpanded;

    more.hidden = !nextExpanded;
    button.setAttribute("aria-expanded", String(nextExpanded));
    button.textContent = nextExpanded ? "свернуть" : "показать подробнее";
  });

  root.addEventListener("click", (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const button = target.closest("[data-friends-toggle]");
    if (!(button instanceof HTMLButtonElement)) return;

    const card = button.closest(".profile-friends-card");
    if (!(card instanceof HTMLElement)) return;

    const hiddenFriends = card.querySelectorAll<HTMLElement>("[data-friend-extra]");
    const isExpanded = button.getAttribute("aria-expanded") === "true";
    const nextExpanded = !isExpanded;

    hiddenFriends.forEach((friend) => {
      friend.hidden = !nextExpanded;
    });

    button.setAttribute("aria-expanded", String(nextExpanded));
    button.textContent = nextExpanded ? "свернуть" : "показать всех";
  });

  root.addEventListener("click", (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const editButton = target.closest("[data-profile-edit-toggle]");
    if (editButton instanceof HTMLButtonElement) {
      event.preventDefault();
      event.stopPropagation();
      toggleProfileEditor(root);
      return;
    }

    const cancelButton = target.closest("[data-profile-edit-cancel]");
    if (!(cancelButton instanceof HTMLButtonElement)) return;

    event.preventDefault();
    event.stopPropagation();

    const form = cancelButton.closest("[data-profile-edit-form]");

    if (!(form instanceof HTMLFormElement)) return;

    form.reset();
    clearProfileFieldErrors(form);
    toggleProfileEditor(root, false);

    const message = form.querySelector("[data-profile-form-message]");
    if (message instanceof HTMLElement) {
      message.hidden = true;
      message.textContent = "";
      message.classList.remove("is-error", "is-success");
    }
  });

  root.addEventListener("submit", (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLFormElement)) return;
    if (!target.matches("[data-profile-edit-form]")) return;

    event.preventDefault();

    const submitButton = target.querySelector('button[type="submit"]');
    const message = target.querySelector("[data-profile-form-message]");

    if (!(submitButton instanceof HTMLButtonElement) || !(message instanceof HTMLElement)) {
      return;
    }

    const sourceValues = getProfileFormSourceValues(target);

    const patch = buildProfilePatch(new FormData(target), sourceValues);
    clearProfileFieldErrors(target);

    if (!Object.keys(patch).length) {
      message.hidden = false;
      message.textContent = "Изменений пока нет.";
      message.classList.remove("is-error");
      message.classList.add("is-success");
      return;
    }

    const validationErrors = validateProfilePatch(patch, sourceValues);
    if (hasProfileFieldErrors(validationErrors)) {
      renderProfileFieldErrors(target, validationErrors);
      focusFirstProfileErrorField(target, validationErrors);
      message.hidden = true;
      message.textContent = "";
      message.classList.remove("is-error", "is-success");
      return;
    }

    message.hidden = true;
    message.textContent = "";
    message.classList.remove("is-error", "is-success");
    submitButton.disabled = true;
    submitButton.textContent = "Сохраняем...";

    void updateMyProfile(patch)
      .then(async () => {
        const sessionUser = getSessionUser();

        if (sessionUser) {
          setSessionUser({
            ...sessionUser,
            firstName: patch.firstName ?? sessionUser.firstName,
            lastName: patch.lastName ?? sessionUser.lastName,
          });
        }

        clearFeedCache();
        clearWidgetbarCache();
        await rerenderCurrentRoute();
      })
      .catch((error: unknown) => {
        message.hidden = false;
        message.textContent = isOfflineNetworkError(error)
          ? "Нет соединения с интернетом. Изменения пока не отправлены."
          : error instanceof Error
            ? error.message
            : "Не получилось сохранить изменения.";
        message.classList.remove("is-success");
        message.classList.add("is-error");
      })
      .finally(() => {
        submitButton.disabled = false;
        submitButton.textContent = "Сохранить изменения";
      });
  });

  root.addEventListener("submit", (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLFormElement)) return;

    const editCommentId = target.getAttribute("data-comment-edit-form");
    if (editCommentId) {
      const postId = target.getAttribute("data-comment-edit-post") ?? "";
      if (!postId) return;

      event.preventDefault();
      const input = target.querySelector<HTMLTextAreaElement>(
        `[data-comment-edit-input="${CSS.escape(editCommentId)}"]`,
      );
      const submitBtn = target.querySelector<HTMLButtonElement>('button[type="submit"]');
      const text = input?.value.trim() ?? "";
      if (!input || !text) return;

      if (submitBtn) submitBtn.disabled = true;
      void updatePostComment(postId, editCommentId, text)
        .then((updated) => {
          finishCommentEdit(root, editCommentId, updated.text);
        })
        .catch((error: unknown) => {
          console.error("[profile] comment update failed", error);
          setCommentEditError(root, editCommentId, t("profile.commentEditError"));
        })
        .finally(() => {
          if (submitBtn) submitBtn.disabled = false;
        });
      return;
    }

    const postId = target.getAttribute("data-profile-post-comment-form");
    if (!postId) return;

    event.preventDefault();

    const input = target.querySelector<HTMLInputElement>(
      `[data-profile-post-comment-input="${postId}"]`,
    );
    const errorEl = root.querySelector<HTMLElement>(
      `[data-profile-post-comment-error="${CSS.escape(postId)}"]`,
    );
    const submitBtn = target.querySelector<HTMLButtonElement>('button[type="submit"]');
    const text = input?.value.trim() ?? "";

    if (!text || !input) return;

    if (submitBtn) submitBtn.disabled = true;
    if (errorEl) errorEl.hidden = true;

    const replyToId = target.dataset.profilePostReplyTo?.trim();
    const commentPayload = replyToId ? { text, parentCommentId: Number(replyToId) } : { text };
    const inputPlaceholder = input.placeholder;
    const skeletonStartedAt = Date.now();
    const commentsEl = target.closest<HTMLElement>(
      `[data-profile-post-comments="${CSS.escape(postId)}"]`,
    );
    const skeletonState = commentsEl
      ? showFixedCommentBlockSkeleton({
          commentsEl,
          postId,
          listAttribute: "data-profile-post-comment-list",
        })
      : null;

    void createPostComment(postId, commentPayload)
      .then(async () => {
        await waitForMinimumLoadingTime(skeletonStartedAt);
        const nextPosts = currentProfilePosts.map((post) =>
          post.id === postId ? { ...post, comments: post.comments + 1 } : post,
        );
        setCurrentProfilePosts(nextPosts);
        const countEl = root.querySelector<HTMLElement>(
          `[data-profile-post-comment-count="${CSS.escape(postId)}"]`,
        );
        const updatedPost = nextPosts.find((post) => post.id === postId);
        if (countEl && updatedPost) {
          countEl.textContent = String(updatedPost.comments);
        }
        if (replyToId) {
          if (!expandedReplies.has(postId)) expandedReplies.set(postId, new Set());
          expandedReplies.get(postId)?.add(replyToId);
        }
        await reloadProfileCommentsAfterMutation(root, postId, { skeletonState });
        resetProfileCommentForm(root, postId);
      })
      .catch(async (error: unknown) => {
        await waitForMinimumLoadingTime(skeletonStartedAt);
        console.error("[profile] create comment failed", error);
        restoreFixedCommentBlockSkeleton(skeletonState);
        restoreProfileCommentForm(root, postId, text, replyToId, inputPlaceholder);
      })
      .finally(() => {
        if (submitBtn) submitBtn.disabled = false;
      });
  });

  document.addEventListener("click", (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (
      target.closest("[data-profile-friend-menu-toggle]") ||
      target.closest("[data-profile-friend-menu]")
    ) {
      return;
    }

    closeProfileFriendMenus(root);
  });

  root.addEventListener("input", (event: Event) => {
    const target = event.target;

    if (target instanceof HTMLInputElement && target.matches("[data-profile-avatar-zoom]")) {
      setAvatarZoom(root, Number.parseInt(target.value, 10) || 100);
      return;
    }

    if (target instanceof HTMLTextAreaElement && target.matches("[data-profile-post-text]")) {
      postComposerState.text = target.value;
      if (postComposerState.errorMessage) {
        postComposerState.errorMessage = "";
      }
      syncPostComposerUi(root);
      return;
    }

    if (
      !(
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      )
    ) {
      return;
    }

    const form = target.closest("[data-profile-edit-form]");
    if (!(form instanceof HTMLFormElement)) return;

    const message = form.querySelector("[data-profile-form-message]");
    if (message instanceof HTMLElement && message.classList.contains("is-success")) {
      message.hidden = true;
      message.textContent = "";
      message.classList.remove("is-success");
    }

    validateProfileFormLive(form);
  });

  root.addEventListener("change", (event: Event) => {
    const target = event.target;

    if (target instanceof HTMLInputElement && target.matches("[data-profile-avatar-input]")) {
      const file = target.files?.[0];
      if (!file) {
        return;
      }

      void loadAvatarFile(file, root);
      return;
    }

    if (target instanceof HTMLInputElement && target.matches("[data-profile-post-image-input]")) {
      void handlePostImagesSelected(target.files)
        .catch((error: unknown) => {
          postComposerState.errorMessage =
            error instanceof Error ? error.message : t("profile.postImagesPrepareError");
        })
        .finally(() => {
          syncPostComposerUi(root);
        });
      return;
    }

    if (target instanceof HTMLInputElement && target.matches("[data-profile-post-file-input]")) {
      handlePostFilesSelected(target.files);
      syncPostComposerUi(root);
      return;
    }

    if (
      !(
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      )
    ) {
      return;
    }

    const form = target.closest("[data-profile-edit-form]");
    if (!(form instanceof HTMLFormElement)) return;

    validateProfileFormLive(form);
  });

  root.addEventListener("keydown", (event: Event) => {
    if (!(event instanceof KeyboardEvent)) {
      return;
    }

    if (
      (event.key === "Enter" || event.key === " ") &&
      event.target instanceof Element &&
      event.target.closest("[data-post-image-open]")
    ) {
      closeProfilePostMenus(root);
      openPostImageViewerFromTarget(event.target);
      event.preventDefault();
      return;
    }

    if (event.key !== "Escape") {
      return;
    }

    if (postComposerState.open && !postComposerState.isSaving) {
      resetPostComposerState();
      syncPostComposerUi(root);
      return;
    }

    if (avatarModalState.open && !avatarModalState.isSaving) {
      resetAvatarModalState();
      syncAvatarModalUi(root);
    }
  });

  root.addEventListener("pointerdown", (event: Event) => {
    if (!(event instanceof PointerEvent)) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const cropStage = target.closest<HTMLElement>("[data-profile-avatar-crop-stage]");
    if (!(cropStage instanceof HTMLElement) || !avatarModalState.objectUrl) {
      return;
    }

    avatarModalState.dragPointerId = event.pointerId;
    avatarModalState.dragStartX = event.clientX;
    avatarModalState.dragStartY = event.clientY;
    avatarModalState.dragStartOffsetX = avatarModalState.offsetX;
    avatarModalState.dragStartOffsetY = avatarModalState.offsetY;
    cropStage.setPointerCapture(event.pointerId);
    cropStage.classList.add("is-dragging");
  });

  root.addEventListener("pointermove", (event: Event) => {
    if (!(event instanceof PointerEvent) || avatarModalState.dragPointerId !== event.pointerId) {
      return;
    }

    avatarModalState.offsetX =
      avatarModalState.dragStartOffsetX + (event.clientX - avatarModalState.dragStartX);
    avatarModalState.offsetY =
      avatarModalState.dragStartOffsetY + (event.clientY - avatarModalState.dragStartY);

    clampAvatarOffsets(root);
    syncAvatarModalUi(root);
  });

  root.addEventListener("pointerup", (event: Event) => {
    if (!(event instanceof PointerEvent)) {
      return;
    }

    const target = event.target;
    const cropStage =
      target instanceof Element
        ? target.closest<HTMLElement>("[data-profile-avatar-crop-stage]")
        : null;

    if (avatarModalState.dragPointerId === event.pointerId) {
      avatarModalState.dragPointerId = null;
    }

    if (cropStage instanceof HTMLElement) {
      cropStage.classList.remove("is-dragging");
      if (cropStage.hasPointerCapture(event.pointerId)) {
        cropStage.releasePointerCapture(event.pointerId);
      }
    }
  });

  root.addEventListener("pointercancel", (event: Event) => {
    if (!(event instanceof PointerEvent)) {
      return;
    }

    const cropStage = root.querySelector<HTMLElement>("[data-profile-avatar-crop-stage]");
    avatarModalState.dragPointerId = null;
    cropStage?.classList.remove("is-dragging");
  });

  root.addEventListener("input", (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (!target.matches("[data-profile-post-search]")) return;
    applyProfilePostFilters(root);
  });

  window.addEventListener(
    "scroll",
    () => {
      const openMenu = document.querySelector<HTMLElement>(
        "[data-profile-post-menu]:not([hidden])",
      );
      if (openMenu) {
        const postId = openMenu.getAttribute("data-profile-post-menu");
        const toggle = postId
          ? root.querySelector<HTMLButtonElement>(`[data-profile-post-menu-toggle="${postId}"]`)
          : null;
        if (toggle) {
          const rect = toggle.getBoundingClientRect();
          openMenu.style.top = `${rect.bottom + 8}px`;
          openMenu.style.right = `${window.innerWidth - rect.right}px`;
        }
      }

      const openCommentMenu = document.querySelector<HTMLElement>(
        "[data-comment-menu]:not([hidden])",
      );
      if (openCommentMenu) {
        const commentId = openCommentMenu.getAttribute("data-comment-menu");
        const postId = openCommentMenu.getAttribute("data-comment-menu-post");
        const toggle =
          commentId && postId
            ? root.querySelector<HTMLButtonElement>(
                `[data-comment-menu-toggle="${CSS.escape(commentId)}"][data-comment-menu-post="${CSS.escape(postId)}"]`,
              )
            : null;
        if (toggle) positionCommentMenu(openCommentMenu, toggle);
      }

      const openFriendMenu = document.querySelector<HTMLElement>(
        "[data-profile-friend-menu-floating]:not([hidden])",
      );
      if (!openFriendMenu) return;
      const profileId = openFriendMenu.getAttribute("data-profile-friend-menu");
      if (!profileId) return;
      const friendToggle = root.querySelector<HTMLButtonElement>(
        `[data-profile-friend-menu-toggle="${profileId}"]`,
      );
      if (!friendToggle) return;
      positionProfileFriendMenu(openFriendMenu, friendToggle);
    },
    { passive: true },
  );
}
