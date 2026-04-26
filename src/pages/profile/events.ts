import { createPrivateChat } from "../../api/chat";
import { createPost, deletePost, updatePost } from "../../api/posts";
import {
  acceptFriendRequest,
  declineFriendRequest,
  deleteFriend,
  requestFriendship,
  revokeFriendRequest,
} from "../../api/friends";
import { getMyProfile, uploadProfileAvatar, updateMyProfile } from "../../api/profile";
import { getSessionUser, setSessionUser } from "../../state/session";
import { clearFeedCache } from "../feed/cache";
import { clearWidgetbarCache } from "../../components/widgetbar/widgetbar";
import { invalidateFriendsState } from "../friends/friends";
import { isOutboxQueuedError } from "../../utils/outbox-idb";

import type { ComposerMediaItem } from "./types";
import {
  postComposerState,
  avatarModalState,
  resetPostComposerState,
  resetAvatarModalState,
  openCreatePostComposer,
  openEditPostComposer,
  removeComposerMediaItem,
  validateProfilePatch,
  hasProfileFieldErrors,
  setOwnAvatarOverride,
  updateSessionUserAvatarLink,
  normaliseAvatarLink,
  clampAvatarOffsets,
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
} from "./render";
import {
  uploadPendingComposerImages,
  handlePostImagesSelected,
  validateProfileFormLive,
  toggleProfileEditor,
  rerenderCurrentRoute,
  isOfflineNetworkError,
  getProfileFormSourceValues,
  buildProfilePatch,
} from "./actions";

// ---------------------------------------------------------------------------
// Привязка обработчиков событий профиля
// ---------------------------------------------------------------------------

export function bindProfileEvents(root: Document | HTMLElement): void {
  root.addEventListener("click", (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

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

    const postFilterButton = target.closest("[data-profile-post-filter]");
    if (postFilterButton instanceof HTMLButtonElement) {
      event.preventDefault();
      const nextFilter = postFilterButton.getAttribute("data-profile-post-filter");
      if (nextFilter === "all" || nextFilter === "own") {
        switchProfilePostFilter(root, nextFilter);
      }
      return;
    }

    const postMenuToggle = target.closest("[data-profile-post-menu-toggle]");
    if (postMenuToggle instanceof HTMLButtonElement) {
      const postId = postMenuToggle.getAttribute("data-profile-post-menu-toggle");
      if (!postId) {
        return;
      }

      const menu = root.querySelector<HTMLElement>(`[data-profile-post-menu="${postId}"]`);
      const isExpanded = postMenuToggle.getAttribute("aria-expanded") === "true";
      closeProfilePostMenus(root);

      if (menu && !isExpanded) {
        menu.hidden = false;
        postMenuToggle.setAttribute("aria-expanded", "true");
      }
      return;
    }

    if (!target.closest(".profile-post__actions")) {
      closeProfilePostMenus(root);
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
      const imageInput = root.querySelector<HTMLInputElement>("[data-profile-post-image-input]");
      if (imageInput) {
        imageInput.value = "";
        imageInput.click();
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

    const savePostButton = target.closest("[data-profile-post-save]");
    if (savePostButton instanceof HTMLButtonElement) {
      const trimmedText = postComposerState.text.trim();
      if (!trimmedText && postComposerState.mediaItems.length === 0) {
        postComposerState.errorMessage = "Добавьте текст или изображение.";
        syncPostComposerUi(root);
        return;
      }

      postComposerState.isSaving = true;
      postComposerState.errorMessage = "";
      syncPostComposerUi(root);

      const savePromise =
        postComposerState.mode === "edit" && postComposerState.editingPostId
          ? (async () => {
              await uploadPendingComposerImages();
              const knownMediaItems = postComposerState.mediaItems.filter(
                (item): item is ComposerMediaItem & { mediaID: number } =>
                  item.isUploaded && typeof item.mediaID === "number" && item.mediaID > 0,
              );
              const canSyncMedia = knownMediaItems.length === postComposerState.mediaItems.length;

              if (
                !canSyncMedia &&
                postComposerState.mediaItems.some(
                  (item) => !item.isUploaded || item.mediaID == null,
                )
              ) {
                throw new Error(
                  "Не получилось обновить изображения поста. Перезагрузите страницу и попробуйте снова.",
                );
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
                    }
                  : {
                      text: trimmedText,
                    },
              );
            })()
          : (async () => {
              await uploadPendingComposerImages();

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
              } as {
                text?: string;
                media: Array<{ mediaID: number; mediaURL: string }>;
              };

              if (trimmedText) {
                createPayload.text = trimmedText;
              }

              return createPost(createPayload);
            })();

      void savePromise
        .then(async () => {
          clearFeedCache();
          clearWidgetbarCache();
          resetPostComposerState();
          syncPostComposerUi(root);
          await rerenderCurrentRoute();
        })
        .catch((error: unknown) => {
          postComposerState.isSaving = false;
          postComposerState.errorMessage = isOutboxQueuedError(error)
            ? "Публикация сохранена и отправится при восстановлении сети."
            : isOfflineNetworkError(error)
              ? "Нет соединения с интернетом."
              : error instanceof Error
                ? error.message
                : "Не получилось сохранить публикацию.";
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
    if (closeAvatarDeleteButton instanceof HTMLButtonElement || avatarDeleteBackdrop === target) {
      avatarModalState.deleteConfirmOpen = false;
      syncAvatarModalUi(root);
      return;
    }

    const confirmAvatarDeleteButton = target.closest("[data-profile-avatar-delete-confirm]");
    if (confirmAvatarDeleteButton instanceof HTMLButtonElement) {
      avatarModalState.isSaving = true;
      avatarModalState.errorMessage = "";
      syncAvatarModalUi(root);

      void updateMyProfile({ removeAvatar: true })
        .then(async () => {
          const freshProfile = await getMyProfile();
          setOwnAvatarOverride(null);
          updateSessionUserAvatarLink(normaliseAvatarLink(freshProfile.imageLink));

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
    if (closeAvatarButton instanceof HTMLButtonElement || avatarModalBackdrop === target) {
      resetAvatarModalState();
      syncAvatarModalUi(root);
      return;
    }

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
          const nextOverride =
            normaliseAvatarLink(freshProfile.imageLink) ?? uploadedAvatar.mediaURL;
          setOwnAvatarOverride(nextOverride);

          updateSessionUserAvatarLink(nextOverride);

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

      void createPrivateChat(profileId)
        .then((chat) => {
          window.history.pushState({}, "", `/chats?chatId=${encodeURIComponent(chat.id)}`);
          window.dispatchEvent(new PopStateEvent("popstate"));
        })
        .catch((error: unknown) => {
          console.error("[profile] open chat failed", error);
        });
      return;
    }

    const requestFriendButton = target.closest("[data-profile-request-friend]");
    if (requestFriendButton instanceof HTMLButtonElement) {
      const profileId = requestFriendButton.getAttribute("data-profile-request-friend");
      if (!profileId) {
        return;
      }

      requestFriendButton.disabled = true;
      void requestFriendship(profileId)
        .then(async () => {
          invalidateFriendsState();
          await rerenderCurrentRoute();
        })
        .catch((error: unknown) => {
          console.error("[profile] request friend failed", error);
          requestFriendButton.disabled = false;
        });
      return;
    }

    const revokeFriendButton = target.closest("[data-profile-revoke-friend]");
    if (revokeFriendButton instanceof HTMLButtonElement) {
      const profileId = revokeFriendButton.getAttribute("data-profile-revoke-friend");
      if (!profileId) {
        return;
      }

      revokeFriendButton.disabled = true;
      void revokeFriendRequest(profileId)
        .then(async () => {
          invalidateFriendsState();
          await rerenderCurrentRoute();
        })
        .catch((error: unknown) => {
          console.error("[profile] revoke friend request failed", error);
          revokeFriendButton.disabled = false;
        });
      return;
    }

    const acceptFriendButton = target.closest("[data-profile-accept-friend]");
    if (acceptFriendButton instanceof HTMLButtonElement) {
      const profileId = acceptFriendButton.getAttribute("data-profile-accept-friend");
      if (!profileId) {
        return;
      }

      acceptFriendButton.disabled = true;
      void acceptFriendRequest(profileId)
        .then(async () => {
          invalidateFriendsState();
          await rerenderCurrentRoute();
        })
        .catch((error: unknown) => {
          console.error("[profile] accept friend failed", error);
          acceptFriendButton.disabled = false;
        });
      return;
    }

    const declineFriendButton = target.closest("[data-profile-decline-friend]");
    if (declineFriendButton instanceof HTMLButtonElement) {
      const profileId = declineFriendButton.getAttribute("data-profile-decline-friend");
      if (!profileId) {
        return;
      }

      declineFriendButton.disabled = true;
      void declineFriendRequest(profileId)
        .then(async () => {
          invalidateFriendsState();
          await rerenderCurrentRoute();
        })
        .catch((error: unknown) => {
          console.error("[profile] decline friend failed", error);
          declineFriendButton.disabled = false;
        });
      return;
    }

    const deleteFriendButton = target.closest("[data-profile-delete-friend]");
    if (deleteFriendButton instanceof HTMLButtonElement) {
      const deleteModal = root.querySelector("[data-profile-delete-modal]");
      if (!(deleteModal instanceof HTMLElement)) {
        return;
      }

      deleteModal.hidden = false;
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
        .then(async () => {
          invalidateFriendsState();
          await rerenderCurrentRoute();
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

      postComposerState.isSaving = true;
      postComposerState.errorMessage = "";
      syncPostComposerUi(root);

      void deletePost(postId)
        .then(async () => {
          clearFeedCache();
          clearWidgetbarCache();
          resetPostComposerState();
          syncPostComposerUi(root);
          await rerenderCurrentRoute();
        })
        .catch((error: unknown) => {
          postComposerState.isSaving = false;
          postComposerState.errorMessage = isOutboxQueuedError(error)
            ? "Удаление сохранено и выполнится при восстановлении сети."
            : isOfflineNetworkError(error)
              ? "Нет соединения с интернетом."
              : error instanceof Error
                ? error.message
                : "Не получилось удалить публикацию.";
          syncPostComposerUi(root);
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
            error instanceof Error ? error.message : "Не получилось подготовить изображения.";
        })
        .finally(() => {
          syncPostComposerUi(root);
        });
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
}

function getActiveProfilePostFilter(root: Document | HTMLElement): "all" | "own" {
  const activeButton = root.querySelector<HTMLElement>("[data-profile-post-filter].is-active");
  return activeButton?.getAttribute("data-profile-post-filter") === "own" ? "own" : "all";
}

function switchProfilePostFilter(root: Document | HTMLElement, nextFilter: "all" | "own"): void {
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  preserveProfilePostsHeight(root);

  root.querySelectorAll<HTMLButtonElement>("[data-profile-post-filter]").forEach((button) => {
    const isActive = button.getAttribute("data-profile-post-filter") === nextFilter;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  applyProfilePostFilters(root);
  preserveProfilePostsHeight(root);

  window.scrollTo(scrollX, scrollY);
  requestAnimationFrame(() => {
    window.scrollTo(scrollX, scrollY);
  });
}

function preserveProfilePostsHeight(root: Document | HTMLElement): void {
  const postsList = root.querySelector<HTMLElement>("[data-profile-post-list]");
  if (!postsList) {
    return;
  }

  const currentHeight = Math.ceil(postsList.getBoundingClientRect().height);
  const storedHeight = Number(postsList.dataset.profilePostsMinHeight || 0);
  const nextHeight = Math.max(currentHeight, storedHeight);

  postsList.dataset.profilePostsMinHeight = String(nextHeight);
  postsList.style.minHeight = `${nextHeight}px`;
}

function openProfilePostSearch(root: Document | HTMLElement): void {
  const toolbar = root.querySelector<HTMLElement>("[data-profile-post-toolbar]");
  const searchPanel = root.querySelector<HTMLElement>("[data-profile-post-search-panel]");
  const searchInput = root.querySelector<HTMLInputElement>("[data-profile-post-search]");

  if (toolbar) toolbar.hidden = true;
  if (searchPanel) searchPanel.hidden = false;
  searchInput?.focus();
}

function closeProfilePostSearch(root: Document | HTMLElement): void {
  const toolbar = root.querySelector<HTMLElement>("[data-profile-post-toolbar]");
  const searchPanel = root.querySelector<HTMLElement>("[data-profile-post-search-panel]");
  const searchInput = root.querySelector<HTMLInputElement>("[data-profile-post-search]");

  if (searchInput) {
    searchInput.value = "";
  }

  if (searchPanel) searchPanel.hidden = true;
  if (toolbar) toolbar.hidden = false;
  applyProfilePostFilters(root);
}

function closeProfilePostMenus(root: Document | HTMLElement): void {
  root.querySelectorAll<HTMLElement>("[data-profile-post-menu]").forEach((menu) => {
    menu.hidden = true;
  });

  root.querySelectorAll<HTMLButtonElement>("[data-profile-post-menu-toggle]").forEach((button) => {
    button.setAttribute("aria-expanded", "false");
  });
}

export function applyProfilePostFilters(root: Document | HTMLElement): void {
  const queryInput = root.querySelector<HTMLInputElement>("[data-profile-post-search]");
  const query = queryInput?.value.trim().toLowerCase() ?? "";
  const scope = getActiveProfilePostFilter(root);
  const cards = root.querySelectorAll<HTMLElement>("[data-profile-post-card]");
  let visibleCount = 0;
  let firstVisibleCard: HTMLElement | null = null;

  cards.forEach((card) => {
    const cardScope = card.getAttribute("data-profile-post-scope") ?? "all";
    const searchable = card.getAttribute("data-profile-post-searchable") ?? "";
    const matchesScope = scope === "all" || cardScope === "own";
    const matchesQuery = !query || searchable.includes(query);
    const isVisible = matchesScope && matchesQuery;

    card.hidden = !isVisible;
    card.classList.remove("profile-post--first-visible");
    if (isVisible) {
      visibleCount += 1;
      firstVisibleCard ??= card;
    }
  });

  firstVisibleCard?.classList.add("profile-post--first-visible");

  const searchEmptyState = root.querySelector<HTMLElement>("[data-profile-post-search-empty]");
  if (searchEmptyState) {
    searchEmptyState.hidden = visibleCount > 0 || !query;
  }
}

export function initProfilePostListLayout(root: Document | HTMLElement): void {
  preserveProfilePostsHeight(root);
  requestAnimationFrame(() => {
    preserveProfilePostsHeight(root);
  });
}
