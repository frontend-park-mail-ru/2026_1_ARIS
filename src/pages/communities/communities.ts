/**
 * Страница сообществ.
 */
import { renderHeader } from "../../components/header/header";
import { renderSidebar } from "../../components/sidebar/sidebar";
import {
  changeCommunityMemberRole,
  createCommunity,
  deleteCommunity,
  getCommunities,
  getCommunityById,
  getCommunityMembers,
  joinCommunity,
  leaveCommunity,
  removeCommunityMember,
  updateCommunity,
  type CommunityBundle,
  type CommunityMember,
  type CommunityPayload,
} from "../../api/communities";
import {
  createPost,
  deletePost,
  getOfficialCommunityPosts,
  getPostsByCommunityId,
  updatePost,
  uploadPostImages,
} from "../../api/posts";
import { getMyProfile, uploadProfileAvatar } from "../../api/profile";
import { getSessionUser } from "../../state/session";
import { clearFeedCache } from "../feed/cache";
import { clearWidgetbarCache } from "../../components/widgetbar/widgetbar";
import { prepareAvatarLinks } from "../../utils/avatar";
import type { ComposerMediaItem } from "../profile/types";
import type { CommunitiesParams } from "./types";
import {
  buildCommunityMediaFile,
  cancelCommunityMediaDrag,
  endCommunityMediaDrag,
  loadCommunityMediaFile,
  moveCommunityMediaDrag,
  removeCommunityMedia,
  resetCommunityMediaChanges,
  rotateCommunityMedia,
  setCommunityMediaZoom,
  startCommunityMediaDrag,
  syncCommunityMediaEditorsUi,
} from "./media-editor";
import {
  communitiesState,
  findCommunityById,
  nextCommunityFormStep,
  openCreateCommunityForm,
  openCommunityPostComposer,
  openEditCommunityPostComposer,
  openEditCommunityForm,
  prevCommunityFormStep,
  removeCommunityComposerMediaItem,
  resetCommunitiesState,
  resetCommunityFormState,
  resetCommunityPostComposer,
  setActiveCommunity,
  setActiveMembers,
  setActivePosts,
  setCommunities,
} from "./state";
import { isOfficialCommunityPost, mapPostToCommunityPost, slugifyCommunityTitle } from "./helpers";
import {
  refreshCommunitiesList,
  refreshCommunitiesPage,
  renderCommunitiesListContent,
  renderCommunityDetailContent,
  renderCommunityRightRail,
} from "./render";

type CommunitiesRoot = (Document | HTMLElement) & {
  __communitiesBound?: boolean;
  __communityFormBackdropPressStarted?: boolean;
  __communityDeleteBackdropPressStarted?: boolean;
  __communityLeaveBackdropPressStarted?: boolean;
  __communityMembersBackdropPressStarted?: boolean;
  __memberConfirmBackdropPressStarted?: boolean;
  __communityPostBackdropPressStarted?: boolean;
  __communityPostDeleteBackdropPressStarted?: boolean;
};

const COMMUNITY_TITLE_MIN_LENGTH = 3;
const COMMUNITY_BIO_MAX_LENGTH = 2047;
const COMMUNITY_TITLE_MAX_LENGTH = 64;

function syncCommunityBundle(bundle: CommunityBundle): void {
  if (communitiesState.activeCommunity?.community.id === bundle.community.id) {
    communitiesState.activeCommunity = bundle;
  }
  communitiesState.items = communitiesState.items.some(
    (item) => item.community.id === bundle.community.id,
  )
    ? communitiesState.items.map((item) =>
        item.community.id === bundle.community.id ? bundle : item,
      )
    : [bundle, ...communitiesState.items];
}

async function ensureViewerProfileId(signal?: AbortSignal): Promise<void> {
  if (
    typeof communitiesState.viewerProfileId === "number" &&
    communitiesState.viewerProfileId > 0
  ) {
    return;
  }

  const profile = await getMyProfile(signal);
  const profileId = Number(profile.profileId ?? 0);
  communitiesState.viewerProfileId = Number.isFinite(profileId) && profileId > 0 ? profileId : null;
}

async function loadCommunityMembers(
  communityId: number,
  includeBlocked = false,
  signal?: AbortSignal,
): Promise<CommunityMember[]> {
  try {
    const members = await getCommunityMembers(communityId, includeBlocked, signal);
    setActiveMembers(members);
    return members;
  } finally {
    communitiesState.membersLoading = false;
  }
}

async function loadCommunityPosts(bundle: CommunityBundle, signal?: AbortSignal): Promise<void> {
  const posts =
    communitiesState.postFeedMode === "official"
      ? await getOfficialCommunityPosts(bundle.community.id, signal)
      : await getPostsByCommunityId(bundle.community.id, signal);

  setActivePosts(
    posts.map((post) => mapPostToCommunityPost(post, bundle, communitiesState.viewerProfileId)),
  );
}

async function ensureCommunitiesLoaded(signal?: AbortSignal): Promise<void> {
  if (communitiesState.loaded && communitiesState.items.length) {
    return;
  }

  communitiesState.loading = true;
  communitiesState.errorMessage = "";

  try {
    const items = await getCommunities(50, 0, signal);
    setCommunities(items);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    communitiesState.errorMessage =
      error instanceof Error ? error.message : "Не удалось загрузить сообщества.";
    communitiesState.items = [];
  } finally {
    communitiesState.loading = false;
  }
}

async function resolveCommunityDetail(id: string, signal?: AbortSignal): Promise<void> {
  const bundle = await getCommunityById(id, signal);
  syncCommunityBundle(bundle);
  setActiveCommunity(bundle);
  communitiesState.membersLoading = true;
  communitiesState.membersLoaded = false;

  const members = await loadCommunityMembers(bundle.community.id, false, signal);

  const sessionUser = getSessionUser();
  if (sessionUser && communitiesState.viewerProfileId === null) {
    const sessionAccountId = Number(sessionUser.id);
    const selfMember = members.find((m) => m.userAccountId === sessionAccountId);
    if (selfMember) {
      communitiesState.viewerProfileId = selfMember.profileId;
    }
  }

  await loadCommunityPosts(bundle, signal);
}

function syncCommunityFormFromDom(root: ParentNode): void {
  const form = root.querySelector<HTMLFormElement>("[data-community-form]");
  if (!form) return;

  const formData = new FormData(form);
  const title = formData.get("title");
  const bio = formData.get("bio");

  if (typeof title === "string") {
    communitiesState.form.title = title.trim();
  }
  if (typeof bio === "string") {
    communitiesState.form.bio = bio.trim();
  }
}

function buildCommunityPayload(): CommunityPayload {
  const title = communitiesState.form.title.trim();
  const explicitUsername = communitiesState.form.username.trim();
  const generatedUsername = slugifyCommunityTitle(title).slice(0, 20);
  const username = explicitUsername || generatedUsername;
  return {
    title,
    username,
    bio: communitiesState.form.bio.trim(),
    type: "public",
  };
}

function validateCommunityTitle(value: string): string {
  const title = value.trim();

  if (!title) {
    return "Введите название сообщества.";
  }

  if (title.length < COMMUNITY_TITLE_MIN_LENGTH) {
    return `Название сообщества должно содержать минимум ${COMMUNITY_TITLE_MIN_LENGTH} символа.`;
  }

  if (title.length > COMMUNITY_TITLE_MAX_LENGTH) {
    return `Название сообщества должно быть не длиннее ${COMMUNITY_TITLE_MAX_LENGTH} символов.`;
  }

  return "";
}

function validateCommunityBio(value: string): string {
  const bio = value.trim();

  if (bio.length > COMMUNITY_BIO_MAX_LENGTH) {
    return `Описание сообщества должно быть не длиннее ${COMMUNITY_BIO_MAX_LENGTH} символов.`;
  }

  return "";
}

function validateCommunityPayload(payload: CommunityPayload): string {
  const username = payload.username?.trim().toLowerCase() ?? "";
  const titleError = validateCommunityTitle(payload.title ?? "");
  const bioError = validateCommunityBio(payload.bio ?? "");

  if (titleError) return titleError;
  if (bioError) return bioError;

  if (username.length < 3 || username.length > 20) {
    return "Адрес сообщества должен содержать от 3 до 20 символов.";
  }

  return "";
}

function getInvalidCommunityFormStep(payload: CommunityPayload): 1 | 2 | 3 | null {
  if (validateCommunityTitle(payload.title ?? "")) {
    return 1;
  }

  if (validateCommunityBio(payload.bio ?? "")) {
    return 2;
  }

  if ((payload.username?.trim().length ?? 0) < 3 || (payload.username?.trim().length ?? 0) > 20) {
    return 1;
  }

  return null;
}

async function saveCommunityForm(root: ParentNode): Promise<void> {
  syncCommunityFormFromDom(root);

  const payload = buildCommunityPayload();
  const validationError = validateCommunityPayload(payload);

  if (validationError) {
    const invalidStep = getInvalidCommunityFormStep(payload);
    if (invalidStep) {
      communitiesState.form.step = invalidStep;
    }
    communitiesState.form.errorMessage = validationError;
    refreshCommunitiesPage(root);
    return;
  }

  communitiesState.form.isSaving = true;
  communitiesState.form.errorMessage = "";
  refreshCommunitiesPage(root);

  try {
    if (communitiesState.form.avatarEditor.dirty && communitiesState.form.avatarEditor.objectUrl) {
      const avatarFile = await buildCommunityMediaFile("avatar", root);
      const uploaded = await uploadProfileAvatar(avatarFile);
      payload.avatarId = uploaded.mediaID;
    } else if (communitiesState.form.avatarEditor.removed) {
      payload.removeAvatar = true;
    }

    if (communitiesState.form.coverEditor.dirty && communitiesState.form.coverEditor.objectUrl) {
      const coverFile = await buildCommunityMediaFile("cover", root);
      const uploaded = await uploadProfileAvatar(coverFile);
      payload.coverId = uploaded.mediaID;
    } else if (communitiesState.form.coverEditor.removed) {
      payload.removeCover = true;
    }

    const saved =
      communitiesState.form.mode === "edit" && communitiesState.form.communityId
        ? await updateCommunity(communitiesState.form.communityId, payload)
        : await createCommunity(payload);

    syncCommunityBundle(saved);
    communitiesState.loaded = true;
    resetCommunityFormState();

    if (communitiesState.activeCommunity) {
      communitiesState.activeCommunity = saved;
      await rerenderCurrentRoute();
      return;
    }

    window.history.pushState(
      {},
      "",
      `/communities/${encodeURIComponent(String(saved.community.id))}`,
    );
    window.dispatchEvent(new PopStateEvent("popstate"));
  } catch (error) {
    communitiesState.form.isSaving = false;
    communitiesState.form.errorMessage =
      error instanceof Error ? error.message : "Не удалось сохранить сообщество.";
    refreshCommunitiesPage(root);
  }
}

function validateCommunityFormStep(): string {
  if (communitiesState.form.step === 1) {
    return validateCommunityTitle(communitiesState.form.title);
  }

  if (communitiesState.form.step === 2) {
    return validateCommunityBio(communitiesState.form.bio);
  }

  return "";
}

function goToNextCommunityFormStep(root: ParentNode): void {
  syncCommunityFormFromDom(root);
  const errorMessage = validateCommunityFormStep();

  if (errorMessage) {
    communitiesState.form.errorMessage = errorMessage;
    refreshCommunitiesPage(root);
    return;
  }

  communitiesState.form.errorMessage = "";
  nextCommunityFormStep();
  refreshCommunitiesPage(root);
}

async function readFilesAsPreviews(files: File[]): Promise<ComposerMediaItem[]> {
  const previews = await Promise.all(
    files.map(
      (file) =>
        new Promise<ComposerMediaItem>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result !== "string") {
              reject(new Error("Не получилось прочитать изображение."));
              return;
            }

            resolve({
              mediaURL: reader.result,
              file,
              isUploaded: false,
            });
          };
          reader.onerror = () => reject(new Error("Не получилось прочитать изображение."));
          reader.readAsDataURL(file);
        }),
    ),
  );

  return previews;
}

async function handleCommunityPostImages(files: FileList | null, root: ParentNode): Promise<void> {
  if (!files?.length) return;

  const availableSlots = Math.max(0, 5 - communitiesState.postComposer.mediaItems.length);
  const nextFiles = Array.from(files).slice(0, availableSlots);
  if (!nextFiles.length) return;

  communitiesState.postComposer.mediaItems = communitiesState.postComposer.mediaItems.concat(
    await readFilesAsPreviews(nextFiles),
  );
  refreshCommunitiesPage(root);
}

async function uploadPendingCommunityPostImages(): Promise<void> {
  const pending = communitiesState.postComposer.mediaItems.filter(
    (item) => !item.isUploaded && item.file,
  );
  if (!pending.length) return;

  const uploaded = await uploadPostImages(pending.map((item) => item.file!));
  let uploadIndex = 0;

  communitiesState.postComposer.mediaItems = communitiesState.postComposer.mediaItems.map(
    (item) => {
      if (item.isUploaded) return item;
      const next = uploaded[uploadIndex];
      uploadIndex += 1;
      return next
        ? {
            mediaID: next.mediaID,
            mediaURL: next.mediaURL,
            isUploaded: true,
          }
        : item;
    },
  );
}

async function waitForNextPaint(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

async function waitMinimumSkeletonTime(ms = 240): Promise<void> {
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function saveCommunityPost(root: ParentNode): Promise<void> {
  const bundle = communitiesState.activeCommunity;
  if (!bundle || !bundle.permissions.canPost) return;

  const text = communitiesState.postComposer.text.trim();
  if (!text && communitiesState.postComposer.mediaItems.length === 0) {
    communitiesState.postComposer.errorMessage = "Добавьте текст или изображение.";
    refreshCommunitiesPage(root);
    return;
  }

  const pendingMode = communitiesState.postComposer.mode;
  const pendingPostId = communitiesState.postComposer.editingPostId;
  communitiesState.pendingPost = {
    mode: pendingMode,
    postId: pendingMode === "edit" ? pendingPostId : null,
  };
  communitiesState.postComposer.isSaving = true;
  communitiesState.postComposer.errorMessage = "";
  communitiesState.postComposer.open = false;
  refreshCommunitiesPage(root);
  await waitForNextPaint();

  try {
    await uploadPendingCommunityPostImages();
    const media = communitiesState.postComposer.mediaItems
      .filter(
        (item): item is ComposerMediaItem & { mediaID: number } =>
          item.isUploaded && typeof item.mediaID === "number",
      )
      .map((item) => ({
        mediaID: item.mediaID,
        mediaURL: item.mediaURL,
      }));

    const savedPost =
      communitiesState.postComposer.mode === "edit" && communitiesState.postComposer.editingPostId
        ? await updatePost(communitiesState.postComposer.editingPostId, {
            ...(text ? { text } : {}),
            media,
          })
        : await createPost({
            ...(text ? { text } : {}),
            media,
            communityId: bundle.community.id,
            ...(communitiesState.postComposer.authorMode === "community"
              ? { authorProfileId: bundle.community.profileId }
              : {}),
          });

    if (
      savedPost &&
      typeof savedPost.id === "number" &&
      (communitiesState.postFeedMode !== "official" || isOfficialCommunityPost(savedPost, bundle))
    ) {
      const mappedPost = mapPostToCommunityPost(
        savedPost,
        bundle,
        communitiesState.viewerProfileId,
      );
      setActivePosts([
        mappedPost,
        ...communitiesState.activePosts.filter((post) => post.id !== mappedPost.id),
      ]);
    }

    await waitMinimumSkeletonTime(520);
    clearFeedCache();
    clearWidgetbarCache();
    communitiesState.pendingPost = { mode: "idle", postId: null };
    resetCommunityPostComposer();
    refreshCommunitiesPage(root);

    void (
      communitiesState.postFeedMode === "official"
        ? getOfficialCommunityPosts(bundle.community.id)
        : getPostsByCommunityId(bundle.community.id)
    )
      .then((posts) => {
        setActivePosts(
          posts.map((post) =>
            mapPostToCommunityPost(post, bundle, communitiesState.viewerProfileId),
          ),
        );
        refreshCommunitiesPage(root);
      })
      .catch(() => {
        // Интерфейс уже обновлён оптимистично из ответа createPost; тихо пропускаем сбой фоновой сверки.
      });
  } catch (error) {
    communitiesState.pendingPost = { mode: "idle", postId: null };
    communitiesState.postComposer.isSaving = false;
    communitiesState.postComposer.open = true;
    communitiesState.postComposer.errorMessage =
      error instanceof Error ? error.message : "Не удалось опубликовать запись.";
    refreshCommunitiesPage(root);
  }
}

async function deleteCommunityPostRecord(root: ParentNode): Promise<void> {
  const postId = communitiesState.postComposer.deleteConfirmPostId;
  if (!postId) return;

  communitiesState.pendingPost = {
    mode: "delete",
    postId,
  };
  communitiesState.postComposer.isSaving = true;
  communitiesState.postComposer.errorMessage = "";
  communitiesState.postComposer.deleteConfirmPostId = null;
  refreshCommunitiesPage(root);
  await waitForNextPaint();

  try {
    await deletePost(postId);
    await waitMinimumSkeletonTime(520);
    setActivePosts(communitiesState.activePosts.filter((post) => post.id !== postId));
    const bundle = communitiesState.activeCommunity;
    communitiesState.pendingPost = { mode: "idle", postId: null };
    resetCommunityPostComposer();
    refreshCommunitiesPage(root);

    if (bundle?.community.id) {
      void (
        communitiesState.postFeedMode === "official"
          ? getOfficialCommunityPosts(bundle.community.id)
          : getPostsByCommunityId(bundle.community.id)
      )
        .then((posts) => {
          setActivePosts(
            posts.map((post) =>
              mapPostToCommunityPost(post, bundle, communitiesState.viewerProfileId),
            ),
          );
          refreshCommunitiesPage(root);
        })
        .catch(() => {
          // Локальный список уже обновлён; если фоновая сверка не удалась, не дёргаем интерфейс.
        });
    }
  } catch (error) {
    communitiesState.pendingPost = { mode: "idle", postId: null };
    communitiesState.postComposer.isSaving = false;
    communitiesState.postComposer.deleteConfirmPostId = postId;
    communitiesState.postComposer.errorMessage =
      error instanceof Error ? error.message : "Не удалось удалить публикацию.";
    refreshCommunitiesPage(root);
  }
}

async function rerenderCurrentRoute(): Promise<void> {
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function closeCommunityMenus(root: Document | HTMLElement): void {
  document.querySelectorAll<HTMLElement>("[data-community-menu]").forEach((menu) => {
    menu.hidden = true;
    menu.style.top = "";
    menu.style.right = "";
    menu.style.left = "";
  });

  root.querySelectorAll<HTMLButtonElement>("[data-community-menu-toggle]").forEach((button) => {
    button.setAttribute("aria-expanded", "false");
  });
}

function closeCommunityPostMenus(root: Document | HTMLElement): void {
  document.querySelectorAll<HTMLElement>("[data-community-post-menu]").forEach((menu) => {
    menu.hidden = true;
    menu.style.top = "";
    menu.style.right = "";
    menu.style.left = "";
  });

  root
    .querySelectorAll<HTMLButtonElement>("[data-community-post-menu-toggle]")
    .forEach((button) => {
      button.setAttribute("aria-expanded", "false");
    });
}

function positionCommunityMenu(menu: HTMLElement, toggle: HTMLButtonElement): void {
  const rect = toggle.getBoundingClientRect();
  menu.style.top = `${rect.bottom + 8}px`;
  menu.style.right = `${window.innerWidth - rect.right}px`;
  menu.style.left = "auto";
}

function bindFloatingCommunityMenuActions(
  menu: HTMLElement,
  root: Document | HTMLElement,
  communityId: string,
): void {
  const bundle = findCommunityById(communityId);

  const editButton = menu.querySelector<HTMLButtonElement>(
    `[data-community-edit="${communityId}"]`,
  );
  if (editButton && bundle) {
    editButton.onclick = () => {
      closeCommunityMenus(root);
      openEditCommunityForm(bundle, 1);
      refreshCommunitiesPage(root);
    };
  }

  const deleteButton = menu.querySelector<HTMLButtonElement>(
    `[data-community-delete-open="${communityId}"]`,
  );
  if (deleteButton) {
    deleteButton.onclick = () => {
      closeCommunityMenus(root);
      communitiesState.deleteConfirmId = Number(communityId);
      refreshCommunitiesPage(root);
    };
  }

  const membersButton = menu.querySelector<HTMLButtonElement>(
    `[data-community-members-open="${communityId}"]`,
  );
  if (membersButton) {
    membersButton.onclick = () => {
      closeCommunityMenus(root);
      communitiesState.membersManager.open = true;
      communitiesState.membersManager.errorMessage = "";
      communitiesState.membersManager.query = "";
      communitiesState.membersLoading = true;
      refreshCommunitiesPage(root);
      void loadCommunityMembers(Number(communityId), communitiesState.membersManager.includeBlocked)
        .then(() => {
          refreshCommunitiesPage(root);
        })
        .catch((error: unknown) => {
          communitiesState.membersManager.errorMessage =
            error instanceof Error ? error.message : "Не удалось загрузить участников.";
          refreshCommunitiesPage(root);
        });
    };
  }

  const leaveButton = menu.querySelector<HTMLButtonElement>(
    `[data-community-leave="${communityId}"]`,
  );
  if (leaveButton) {
    leaveButton.onclick = () => {
      closeCommunityMenus(root);
      communitiesState.leaveConfirmId = Number(communityId);
      refreshCommunitiesPage(root);
    };
  }
}

function positionCommunityPostMenu(menu: HTMLElement, toggle: HTMLButtonElement): void {
  const rect = toggle.getBoundingClientRect();
  menu.style.top = `${rect.bottom + 8}px`;
  menu.style.right = `${window.innerWidth - rect.right}px`;
  menu.style.left = "auto";
}

function bindFloatingCommunityPostMenuActions(
  menu: HTMLElement,
  root: Document | HTMLElement,
  postId: string,
): void {
  const bundle = communitiesState.activeCommunity;
  const post = communitiesState.activePosts.find((item) => item.id === postId);
  const authorMode =
    bundle && post && Number(post.authorId) === bundle.community.profileId ? "community" : "member";

  const editButton = menu.querySelector<HTMLButtonElement>(
    `[data-community-post-edit="${postId}"]`,
  );
  if (editButton) {
    editButton.onclick = () => {
      closeCommunityPostMenus(root);
      openEditCommunityPostComposer(postId, authorMode);
      refreshCommunitiesPage(root);
    };
  }

  const deleteButton = menu.querySelector<HTMLButtonElement>(
    `[data-community-post-delete="${postId}"]`,
  );
  if (deleteButton) {
    deleteButton.onclick = () => {
      closeCommunityPostMenus(root);
      communitiesState.postComposer.deleteConfirmPostId = postId;
      communitiesState.postComposer.errorMessage = "";
      refreshCommunitiesPage(root);
    };
  }
}

export async function renderCommunities(
  params: CommunitiesParams = {},
  signal?: AbortSignal,
): Promise<string> {
  const isAuthorised = getSessionUser() !== null;

  if (!isAuthorised) {
    return (await import("../feed/feed")).renderFeed(undefined, signal);
  }

  resetCommunitiesState();

  if (params.id) {
    try {
      await resolveCommunityDetail(params.id, signal);
      const bundle = communitiesState.activeCommunity;
      await prepareAvatarLinks([
        getSessionUser()?.avatarLink,
        bundle?.community.avatarUrl,
        bundle?.community.coverUrl,
        ...communitiesState.activeMembers.map((member) => member.avatarUrl),
        ...communitiesState.activePosts.map((post) => post.authorAvatarLink),
        ...communitiesState.activePosts.flatMap((post) => post.images),
      ]);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw error;
      communitiesState.errorMessage =
        error instanceof Error ? error.message : "Не удалось загрузить сообщество.";
      setActiveCommunity(null);
    }

    return `
      <div class="app-page">
        ${renderHeader()}
        <main class="app-layout">
          <aside class="app-layout__left">
            ${renderSidebar({ isAuthorised })}
          </aside>
          <section class="app-layout__center">
            ${renderCommunityDetailContent()}
          </section>
          <aside class="app-layout__right">
            ${renderCommunityRightRail()}
          </aside>
        </main>
      </div>
    `;
  }

  await ensureCommunitiesLoaded(signal);
  await ensureViewerProfileId(signal).catch(() => {
    communitiesState.viewerProfileId = null;
  });
  await prepareAvatarLinks([
    getSessionUser()?.avatarLink,
    ...communitiesState.items.map((item) => item.community.avatarUrl),
    ...communitiesState.items.map((item) => item.community.coverUrl),
  ]);

  return `
    <div class="app-page">
      ${renderHeader()}
      <main class="app-layout">
        <aside class="app-layout__left">
          ${renderSidebar({ isAuthorised })}
        </aside>
        <section class="app-layout__center">
          ${renderCommunitiesListContent()}
        </section>
        <aside class="app-layout__right">
          <div class="profile-right-rail"></div>
        </aside>
      </main>
    </div>
  `;
}

export function initCommunities(root: Document | HTMLElement = document): void {
  const bindableRoot = root as CommunitiesRoot;
  if (bindableRoot.__communitiesBound) return;

  closeCommunityMenus(root);
  closeCommunityPostMenus(root);

  root.addEventListener("pointerdown", (event: Event) => {
    if (event instanceof PointerEvent) {
      const stage =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>("[data-community-media-stage]")
          : null;
      const kind = stage?.getAttribute("data-community-media-stage");
      if (kind === "avatar" || kind === "cover") {
        startCommunityMediaDrag(kind, event, root);
      }
    }

    const target = event.target;
    if (!(target instanceof Element)) return;

    bindableRoot.__communityFormBackdropPressStarted = target.matches(
      "[data-community-form-modal]",
    );
    bindableRoot.__communityDeleteBackdropPressStarted = target.matches(
      "[data-community-delete-modal]",
    );
    bindableRoot.__communityLeaveBackdropPressStarted = target.matches(
      "[data-community-leave-modal]",
    );
    bindableRoot.__memberConfirmBackdropPressStarted = target.matches(
      "[data-member-confirm-modal]",
    );
    bindableRoot.__communityMembersBackdropPressStarted = target.matches(
      "[data-community-members-modal]",
    );
    bindableRoot.__communityPostBackdropPressStarted = target.matches(
      "[data-community-post-modal]",
    );
    bindableRoot.__communityPostDeleteBackdropPressStarted = target.matches(
      "[data-community-post-delete-modal]",
    );
  });

  root.addEventListener("pointermove", (event: Event) => {
    if (!(event instanceof PointerEvent)) {
      return;
    }

    moveCommunityMediaDrag("avatar", event, root);
    moveCommunityMediaDrag("cover", event, root);
  });

  root.addEventListener("pointerup", (event: Event) => {
    if (!(event instanceof PointerEvent)) {
      return;
    }

    endCommunityMediaDrag("avatar", event, root);
    endCommunityMediaDrag("cover", event, root);
  });

  root.addEventListener("pointercancel", (event: Event) => {
    if (!(event instanceof PointerEvent)) {
      return;
    }

    cancelCommunityMediaDrag("avatar", root);
    cancelCommunityMediaDrag("cover", root);
  });

  root.addEventListener("input", (event: Event) => {
    const target = event.target;

    if (target instanceof HTMLInputElement && target.matches("[data-communities-search]")) {
      communitiesState.query = target.value;
      refreshCommunitiesList(root);
      return;
    }

    if (target instanceof HTMLInputElement && target.matches("[data-community-members-search]")) {
      communitiesState.membersManager.query = target.value;
      refreshCommunitiesPage(root);
      return;
    }

    if (target instanceof HTMLInputElement && target.matches("[data-community-title]")) {
      communitiesState.form.title = target.value;
      communitiesState.form.errorMessage =
        communitiesState.form.step === 1 ? validateCommunityTitle(target.value) : "";
      return;
    }

    if (target instanceof HTMLTextAreaElement && target.matches("[data-community-bio]")) {
      communitiesState.form.bio = target.value;
      communitiesState.form.errorMessage =
        communitiesState.form.step === 2 ? validateCommunityBio(target.value) : "";
      return;
    }

    if (target instanceof HTMLTextAreaElement && target.matches("[data-community-post-text]")) {
      communitiesState.postComposer.text = target.value;
      communitiesState.postComposer.errorMessage = "";
      return;
    }

    if (target instanceof HTMLInputElement && target.matches("[data-community-media-zoom]")) {
      const kind = target.getAttribute("data-community-media-zoom");
      if (kind === "avatar" || kind === "cover") {
        setCommunityMediaZoom(kind, root, Number.parseInt(target.value, 10) || 100);
      }
      return;
    }
  });

  root.addEventListener("change", (event: Event) => {
    const target = event.target;

    if (target instanceof HTMLInputElement && target.matches("[data-community-avatar-input]")) {
      const file = target.files?.[0];
      if (!file) return;
      void loadCommunityMediaFile("avatar", file, root);
      return;
    }

    if (target instanceof HTMLInputElement && target.matches("[data-community-cover-input]")) {
      const file = target.files?.[0];
      if (!file) return;
      void loadCommunityMediaFile("cover", file, root);
      return;
    }

    if (target instanceof HTMLInputElement && target.matches("[data-community-post-image-input]")) {
      void handleCommunityPostImages(target.files, root).catch((error: unknown) => {
        communitiesState.postComposer.errorMessage =
          error instanceof Error ? error.message : "Не получилось подготовить изображения.";
        refreshCommunitiesPage(root);
      });
      return;
    }

    if (
      target instanceof HTMLInputElement &&
      target.matches("[data-community-members-include-blocked]")
    ) {
      const bundle = communitiesState.activeCommunity;
      if (!bundle) return;

      communitiesState.membersManager.includeBlocked = target.checked;
      communitiesState.membersManager.errorMessage = "";
      communitiesState.membersLoading = true;
      refreshCommunitiesPage(root);
      void loadCommunityMembers(bundle.community.id, target.checked)
        .then(() => {
          refreshCommunitiesPage(root);
        })
        .catch((error: unknown) => {
          communitiesState.membersManager.errorMessage =
            error instanceof Error ? error.message : "Не удалось обновить список участников.";
          refreshCommunitiesPage(root);
        });
      return;
    }

    if (target instanceof HTMLSelectElement && target.matches("[data-community-member-role]")) {
      const bundle = communitiesState.activeCommunity;
      const profileId = Number(target.getAttribute("data-community-member-role"));
      const nextRole = target.value;
      if (!bundle || !Number.isFinite(profileId) || profileId <= 0) return;
      if (
        nextRole !== "owner" &&
        nextRole !== "admin" &&
        nextRole !== "moderator" &&
        nextRole !== "member" &&
        nextRole !== "blocked"
      ) {
        return;
      }

      communitiesState.membersManager.confirmAction = {
        type: "role",
        profileId,
        newRole: nextRole,
      };
      refreshCommunitiesPage(root);
    }
  });

  root.addEventListener("submit", (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLFormElement)) return;

    if (target.matches("[data-community-form]")) {
      event.preventDefault();
      void saveCommunityForm(root);
      return;
    }

    if (target.matches("[data-community-post-form]")) {
      event.preventDefault();
      void saveCommunityPost(root);
    }
  });

  root.addEventListener("click", (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const createButton = target.closest("[data-community-create-open]");
    if (createButton instanceof HTMLButtonElement) {
      openCreateCommunityForm();
      refreshCommunitiesPage(root);
      return;
    }

    const menuToggle = target.closest("[data-community-menu-toggle]");
    if (menuToggle instanceof HTMLButtonElement) {
      const id = menuToggle.getAttribute("data-community-menu-toggle");
      if (!id) {
        return;
      }

      const menu = document.querySelector<HTMLElement>(`[data-community-menu="${id}"]`);
      const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
      closeCommunityMenus(root);
      closeCommunityPostMenus(root);

      if (menu && !isExpanded) {
        positionCommunityMenu(menu, menuToggle);
        document.body.appendChild(menu);
        bindFloatingCommunityMenuActions(menu, root, id);
        menu.hidden = false;
        menuToggle.setAttribute("aria-expanded", "true");
      }
      return;
    }

    if (!target.closest(".community-actions") && !target.closest("[data-community-menu]")) {
      closeCommunityMenus(root);
    }

    const postMenuToggle = target.closest("[data-community-post-menu-toggle]");
    if (postMenuToggle instanceof HTMLButtonElement) {
      const postId = postMenuToggle.getAttribute("data-community-post-menu-toggle");
      if (!postId) return;

      const menu = document.querySelector<HTMLElement>(`[data-community-post-menu="${postId}"]`);
      const isExpanded = postMenuToggle.getAttribute("aria-expanded") === "true";
      closeCommunityPostMenus(root);

      if (menu && !isExpanded) {
        positionCommunityPostMenu(menu, postMenuToggle);
        document.body.appendChild(menu);
        bindFloatingCommunityPostMenuActions(menu, root, postId);
        menu.hidden = false;
        postMenuToggle.setAttribute("aria-expanded", "true");
      }
      return;
    }

    if (
      !target.closest(".profile-post__actions") &&
      !target.closest("[data-community-post-menu]")
    ) {
      closeCommunityPostMenus(root);
    }

    const stepButton = target.closest("[data-community-form-step]");
    if (stepButton instanceof HTMLButtonElement && communitiesState.form.mode === "edit") {
      syncCommunityFormFromDom(root);
      const nextStep = Number(stepButton.getAttribute("data-community-form-step"));
      if (nextStep >= 1 && nextStep <= 4) {
        communitiesState.form.step = nextStep as 1 | 2 | 3 | 4;
        communitiesState.form.errorMessage = "";
        refreshCommunitiesPage(root);
      }
      return;
    }

    const editButton = target.closest("[data-community-edit]");
    if (editButton instanceof HTMLButtonElement) {
      const id = editButton.getAttribute("data-community-edit");
      const bundle = id ? findCommunityById(id) : null;
      if (bundle) {
        openEditCommunityForm(bundle, 1);
        closeCommunityMenus(root);
        refreshCommunitiesPage(root);
      }
      return;
    }

    const closeFormButton = target.closest("[data-community-form-close]");
    const formBackdrop = target.closest("[data-community-form-modal]");
    if (
      closeFormButton instanceof HTMLButtonElement ||
      (formBackdrop === target && bindableRoot.__communityFormBackdropPressStarted)
    ) {
      bindableRoot.__communityFormBackdropPressStarted = false;
      resetCommunityFormState();
      refreshCommunitiesPage(root);
      return;
    }

    const pickAvatarButton = target.closest("[data-community-avatar-pick]");
    if (pickAvatarButton instanceof HTMLButtonElement) {
      const input = root.querySelector<HTMLInputElement>("[data-community-avatar-input]");
      input?.click();
      return;
    }

    const pickCoverButton = target.closest("[data-community-cover-pick]");
    if (pickCoverButton instanceof HTMLButtonElement) {
      const input = root.querySelector<HTMLInputElement>("[data-community-cover-input]");
      input?.click();
      return;
    }

    const pickMediaButton = target.closest("[data-community-media-pick]");
    if (pickMediaButton instanceof HTMLButtonElement) {
      const kind = pickMediaButton.getAttribute("data-community-media-pick");
      if (kind === "avatar" || kind === "cover") {
        const input = root.querySelector<HTMLInputElement>(`[data-community-${kind}-input]`);
        if (input) {
          input.value = "";
          input.click();
        }
      }
      return;
    }

    const resetMediaButton = target.closest("[data-community-media-delete]");
    if (resetMediaButton instanceof HTMLButtonElement) {
      const kind = resetMediaButton.getAttribute("data-community-media-delete");
      if (kind === "avatar" || kind === "cover") {
        const editor =
          kind === "avatar"
            ? communitiesState.form.avatarEditor
            : communitiesState.form.coverEditor;
        const hasCurrent = Boolean(
          kind === "avatar"
            ? communitiesState.form.currentAvatarUrl
            : communitiesState.form.currentCoverUrl,
        );
        if (hasCurrent && !editor.dirty) {
          removeCommunityMedia(kind, root);
        } else {
          resetCommunityMediaChanges(kind, root);
        }
        refreshCommunitiesPage(root);
      }
      return;
    }

    const rotateLeftMediaButton = target.closest("[data-community-media-rotate-left]");
    if (rotateLeftMediaButton instanceof HTMLButtonElement) {
      const kind = rotateLeftMediaButton.getAttribute("data-community-media-rotate-left");
      if (kind === "avatar" || kind === "cover") {
        rotateCommunityMedia(kind, root, "left");
      }
      return;
    }

    const rotateRightMediaButton = target.closest("[data-community-media-rotate-right]");
    if (rotateRightMediaButton instanceof HTMLButtonElement) {
      const kind = rotateRightMediaButton.getAttribute("data-community-media-rotate-right");
      if (kind === "avatar" || kind === "cover") {
        rotateCommunityMedia(kind, root, "right");
      }
      return;
    }

    const nextStepButton = target.closest("[data-community-form-next]");
    if (nextStepButton instanceof HTMLButtonElement) {
      goToNextCommunityFormStep(root);
      return;
    }

    const prevStepButton = target.closest("[data-community-form-prev]");
    if (prevStepButton instanceof HTMLButtonElement) {
      communitiesState.form.errorMessage = "";
      prevCommunityFormStep();
      refreshCommunitiesPage(root);
      return;
    }

    const deleteOpenButton = target.closest("[data-community-delete-open]");
    if (deleteOpenButton instanceof HTMLButtonElement) {
      communitiesState.deleteConfirmId = Number(
        deleteOpenButton.getAttribute("data-community-delete-open"),
      );
      closeCommunityMenus(root);
      refreshCommunitiesPage(root);
      return;
    }

    const deleteCloseButton = target.closest("[data-community-delete-close]");
    const deleteBackdrop = target.closest("[data-community-delete-modal]");
    if (
      deleteCloseButton instanceof HTMLButtonElement ||
      (deleteBackdrop === target && bindableRoot.__communityDeleteBackdropPressStarted)
    ) {
      bindableRoot.__communityDeleteBackdropPressStarted = false;
      communitiesState.deleteConfirmId = null;
      refreshCommunitiesPage(root);
      return;
    }

    const deleteConfirmButton = target.closest("[data-community-delete-confirm]");
    if (deleteConfirmButton instanceof HTMLButtonElement) {
      const id = deleteConfirmButton.getAttribute("data-community-delete-confirm");
      if (!id) return;
      deleteConfirmButton.disabled = true;
      void deleteCommunity(id)
        .then(() => {
          communitiesState.loaded = false;
          communitiesState.deleteConfirmId = null;
          if (communitiesState.activeCommunity?.community.id === Number(id)) {
            window.history.pushState({}, "", "/communities");
            window.dispatchEvent(new PopStateEvent("popstate"));
            return;
          }
          return rerenderCurrentRoute();
        })
        .catch((error: unknown) => {
          communitiesState.errorMessage =
            error instanceof Error ? error.message : "Не удалось удалить сообщество.";
          communitiesState.deleteConfirmId = null;
          refreshCommunitiesPage(root);
        });
      return;
    }

    const membersOpenButton = target.closest("[data-community-members-open]");
    if (membersOpenButton instanceof HTMLButtonElement) {
      const bundle = communitiesState.activeCommunity;
      if (!bundle) return;

      closeCommunityMenus(root);
      communitiesState.membersManager.open = true;
      communitiesState.membersManager.errorMessage = "";
      communitiesState.membersLoading = true;
      refreshCommunitiesPage(root);
      void loadCommunityMembers(bundle.community.id, communitiesState.membersManager.includeBlocked)
        .then(() => {
          refreshCommunitiesPage(root);
        })
        .catch((error: unknown) => {
          communitiesState.membersManager.errorMessage =
            error instanceof Error ? error.message : "Не удалось загрузить участников.";
          refreshCommunitiesPage(root);
        });
      return;
    }

    const membersCloseButton = target.closest("[data-community-members-close]");
    const membersBackdrop = target.closest("[data-community-members-modal]");
    if (
      membersCloseButton instanceof HTMLButtonElement ||
      (membersBackdrop === target && bindableRoot.__communityMembersBackdropPressStarted)
    ) {
      bindableRoot.__communityMembersBackdropPressStarted = false;
      communitiesState.membersManager.open = false;
      communitiesState.membersManager.errorMessage = "";
      refreshCommunitiesPage(root);
      return;
    }

    const joinButton = target.closest("[data-community-join]");
    if (joinButton instanceof HTMLButtonElement) {
      const bundle = communitiesState.activeCommunity;
      if (!bundle) return;

      closeCommunityMenus(root);
      communitiesState.membershipLoading = true;
      communitiesState.membersLoading = true;
      communitiesState.membersLoaded = false;
      refreshCommunitiesPage(root);
      void (async () => {
        try {
          await Promise.all([joinCommunity(bundle.community.id), waitMinimumSkeletonTime(800)]);
          const freshBundle = await getCommunityById(bundle.community.id);
          syncCommunityBundle(freshBundle);
          setActiveCommunity(freshBundle);
          await Promise.all([
            loadCommunityMembers(
              freshBundle.community.id,
              communitiesState.membersManager.includeBlocked,
            ),
            loadCommunityPosts(freshBundle),
          ]);
          communitiesState.membershipLoading = false;
          refreshCommunitiesPage(root);
        } catch (error) {
          communitiesState.membershipLoading = false;
          communitiesState.errorMessage =
            error instanceof Error ? error.message : "Не удалось вступить в сообщество.";
          refreshCommunitiesPage(root);
        }
      })();
      return;
    }

    const leaveConfirmButton = target.closest("[data-community-leave-confirm]");
    if (leaveConfirmButton instanceof HTMLButtonElement) {
      const communityId = leaveConfirmButton.getAttribute("data-community-leave-confirm");
      const bundle = communityId ? findCommunityById(communityId) : null;
      if (!bundle) return;

      communitiesState.leaveConfirmId = null;
      communitiesState.membershipLoading = true;
      communitiesState.membersLoading = true;
      communitiesState.membersLoaded = false;
      refreshCommunitiesPage(root);
      void (async () => {
        try {
          await Promise.all([leaveCommunity(bundle.community.id), waitMinimumSkeletonTime(800)]);
          const freshBundle = await getCommunityById(bundle.community.id);
          syncCommunityBundle(freshBundle);
          if (communitiesState.activeCommunity?.community.id === bundle.community.id) {
            setActiveCommunity(freshBundle);
            await Promise.all([
              loadCommunityMembers(
                freshBundle.community.id,
                communitiesState.membersManager.includeBlocked,
              ),
              loadCommunityPosts(freshBundle),
            ]);
          }
          communitiesState.membershipLoading = false;
          refreshCommunitiesPage(root);
        } catch (error) {
          communitiesState.membershipLoading = false;
          communitiesState.leaveConfirmId = null;
          communitiesState.errorMessage =
            error instanceof Error ? error.message : "Не удалось покинуть сообщество.";
          refreshCommunitiesPage(root);
        }
      })();
      return;
    }

    const leaveCloseButton = target.closest("[data-community-leave-close]");
    const leaveBackdrop = target.closest("[data-community-leave-modal]");
    if (
      leaveCloseButton instanceof HTMLButtonElement ||
      (leaveBackdrop === target && bindableRoot.__communityLeaveBackdropPressStarted)
    ) {
      bindableRoot.__communityLeaveBackdropPressStarted = false;
      communitiesState.leaveConfirmId = null;
      refreshCommunitiesPage(root);
      return;
    }

    const switchFeedButton = target.closest("[data-community-post-feed]");
    if (switchFeedButton instanceof HTMLButtonElement) {
      const bundle = communitiesState.activeCommunity;
      const nextMode = switchFeedButton.getAttribute("data-community-post-feed");
      if (!bundle || (nextMode !== "all" && nextMode !== "official")) {
        return;
      }

      communitiesState.postFeedMode = nextMode;
      refreshCommunitiesPage(root);
      void loadCommunityPosts(bundle)
        .then(() => {
          refreshCommunitiesPage(root);
        })
        .catch((error: unknown) => {
          communitiesState.errorMessage =
            error instanceof Error ? error.message : "Не удалось переключить ленту сообщества.";
          refreshCommunitiesPage(root);
        });
      return;
    }

    const removeMemberButton = target.closest("[data-community-member-remove]");
    if (removeMemberButton instanceof HTMLButtonElement) {
      const bundle = communitiesState.activeCommunity;
      const profileId = Number(removeMemberButton.getAttribute("data-community-member-remove"));
      if (!bundle || !Number.isFinite(profileId) || profileId <= 0) return;

      communitiesState.membersManager.confirmAction = { type: "remove", profileId };
      communitiesState.membersManager.errorMessage = "";
      refreshCommunitiesPage(root);
      return;
    }

    const unblockMemberButton = target.closest("[data-community-member-unblock]");
    if (unblockMemberButton instanceof HTMLButtonElement) {
      const bundle = communitiesState.activeCommunity;
      const profileId = Number(unblockMemberButton.getAttribute("data-community-member-unblock"));
      if (!bundle || !Number.isFinite(profileId) || profileId <= 0) return;

      communitiesState.membersManager.confirmAction = { type: "remove", profileId };
      communitiesState.membersManager.errorMessage = "";
      refreshCommunitiesPage(root);
      return;
    }

    const memberConfirmOkButton = target.closest("[data-member-confirm-ok]");
    if (memberConfirmOkButton instanceof HTMLButtonElement) {
      const action = communitiesState.membersManager.confirmAction;
      const bundle = communitiesState.activeCommunity;
      if (!action || !bundle) return;

      communitiesState.membersManager.confirmAction = null;
      communitiesState.membersManager.errorMessage = "";

      if (action.type === "remove") {
        communitiesState.membersManager.removingProfileId = action.profileId;
        refreshCommunitiesPage(root);
        void (async () => {
          try {
            await Promise.all([
              removeCommunityMember(bundle.community.id, action.profileId),
              waitMinimumSkeletonTime(600),
            ]);
            setActiveMembers(
              communitiesState.activeMembers.filter((m) => m.profileId !== action.profileId),
            );
            const freshBundle = await getCommunityById(bundle.community.id);
            syncCommunityBundle(freshBundle);
            setActiveCommunity(freshBundle);
          } catch (error) {
            communitiesState.membersManager.errorMessage =
              error instanceof Error ? error.message : "Не удалось удалить участника.";
          } finally {
            communitiesState.membersManager.removingProfileId = null;
            refreshCommunitiesPage(root);
          }
        })();
      } else {
        communitiesState.membersManager.changingRoleProfileId = action.profileId;
        refreshCommunitiesPage(root);
        void (async () => {
          try {
            const [updatedMember] = await Promise.all([
              changeCommunityMemberRole(bundle.community.id, action.profileId, action.newRole),
              waitMinimumSkeletonTime(600),
            ]);
            setActiveMembers(
              communitiesState.activeMembers.map((m) =>
                m.profileId === action.profileId ? updatedMember : m,
              ),
            );
            if (updatedMember.isSelf && communitiesState.activeCommunity) {
              syncCommunityBundle({
                ...communitiesState.activeCommunity,
                membership: {
                  isMember: true,
                  role: updatedMember.blocked ? "blocked" : updatedMember.role,
                  blocked: updatedMember.blocked,
                },
              });
            }
          } catch (error) {
            communitiesState.membersManager.errorMessage =
              error instanceof Error ? error.message : "Не удалось изменить роль участника.";
          } finally {
            communitiesState.membersManager.changingRoleProfileId = null;
            refreshCommunitiesPage(root);
          }
        })();
      }
      return;
    }

    const memberConfirmCloseButton = target.closest("[data-member-confirm-close]");
    const memberConfirmBackdrop = target.closest("[data-member-confirm-modal]");
    if (
      memberConfirmCloseButton instanceof HTMLButtonElement ||
      (memberConfirmBackdrop === target && bindableRoot.__memberConfirmBackdropPressStarted)
    ) {
      bindableRoot.__memberConfirmBackdropPressStarted = false;
      communitiesState.membersManager.confirmAction = null;
      refreshCommunitiesPage(root);
      return;
    }

    const openPostButton = target.closest("[data-community-post-open]");
    if (openPostButton instanceof HTMLButtonElement) {
      closeCommunityPostMenus(root);
      const authorMode = openPostButton.getAttribute("data-community-post-open");
      openCommunityPostComposer(authorMode === "member" ? "member" : "community");
      refreshCommunitiesPage(root);
      return;
    }

    const editPostButton = target.closest("[data-community-post-edit]");
    if (editPostButton instanceof HTMLButtonElement) {
      const postId = editPostButton.getAttribute("data-community-post-edit");
      const bundle = communitiesState.activeCommunity;
      const post = postId ? communitiesState.activePosts.find((item) => item.id === postId) : null;
      if (postId) {
        closeCommunityPostMenus(root);
        openEditCommunityPostComposer(
          postId,
          bundle && post && Number(post.authorId) === bundle.community.profileId
            ? "community"
            : "member",
        );
        refreshCommunitiesPage(root);
      }
      return;
    }

    const deletePostButton = target.closest("[data-community-post-delete]");
    if (deletePostButton instanceof HTMLButtonElement) {
      const postId = deletePostButton.getAttribute("data-community-post-delete");
      if (postId) {
        closeCommunityPostMenus(root);
        communitiesState.postComposer.deleteConfirmPostId = postId;
        communitiesState.postComposer.errorMessage = "";
        refreshCommunitiesPage(root);
      }
      return;
    }

    const closePostButton = target.closest("[data-community-post-close]");
    const postBackdrop = target.closest("[data-community-post-modal]");
    if (
      closePostButton instanceof HTMLButtonElement ||
      (postBackdrop === target && bindableRoot.__communityPostBackdropPressStarted)
    ) {
      if (communitiesState.postComposer.isSaving) {
        return;
      }
      bindableRoot.__communityPostBackdropPressStarted = false;
      resetCommunityPostComposer();
      refreshCommunitiesPage(root);
      return;
    }

    const closePostDeleteButton = target.closest("[data-community-post-delete-close]");
    const postDeleteBackdrop = target.closest("[data-community-post-delete-modal]");
    if (
      closePostDeleteButton instanceof HTMLButtonElement ||
      (postDeleteBackdrop === target && bindableRoot.__communityPostDeleteBackdropPressStarted)
    ) {
      if (communitiesState.postComposer.isSaving) {
        return;
      }
      bindableRoot.__communityPostDeleteBackdropPressStarted = false;
      communitiesState.postComposer.deleteConfirmPostId = null;
      communitiesState.postComposer.isSaving = false;
      communitiesState.postComposer.errorMessage = "";
      refreshCommunitiesPage(root);
      return;
    }

    const confirmDeletePostButton = target.closest("[data-community-post-delete-confirm]");
    if (confirmDeletePostButton instanceof HTMLButtonElement) {
      void deleteCommunityPostRecord(root);
      return;
    }

    const pickPostImageButton = target.closest("[data-community-post-pick-image]");
    if (pickPostImageButton instanceof HTMLButtonElement) {
      const input = root.querySelector<HTMLInputElement>("[data-community-post-image-input]");
      if (input) {
        input.value = "";
        input.click();
      }
      return;
    }

    const removePostImageButton = target.closest("[data-community-post-remove-image]");
    if (removePostImageButton instanceof HTMLButtonElement) {
      const index = Number.parseInt(
        removePostImageButton.getAttribute("data-community-post-remove-image") ?? "-1",
        10,
      );
      removeCommunityComposerMediaItem(index);
      refreshCommunitiesPage(root);
      return;
    }
  });

  bindableRoot.__communitiesBound = true;

  window.addEventListener(
    "scroll",
    () => {
      const openMenu = document.querySelector<HTMLElement>("[data-community-menu]:not([hidden])");
      if (openMenu) {
        const communityId = openMenu.getAttribute("data-community-menu");
        if (communityId) {
          const toggle = root.querySelector<HTMLButtonElement>(
            `[data-community-menu-toggle="${communityId}"]`,
          );
          if (toggle) {
            positionCommunityMenu(openMenu, toggle);
          }
        }
      }

      const openPostMenu = document.querySelector<HTMLElement>(
        "[data-community-post-menu]:not([hidden])",
      );
      if (!openPostMenu) return;
      const postId = openPostMenu.getAttribute("data-community-post-menu");
      if (!postId) return;
      const postToggle = root.querySelector<HTMLButtonElement>(
        `[data-community-post-menu-toggle="${postId}"]`,
      );
      if (!postToggle) return;
      positionCommunityPostMenu(openPostMenu, postToggle);
    },
    { passive: true },
  );

  syncCommunityMediaEditorsUi(root);
}

export async function prefetchCommunities(): Promise<void> {
  if (getSessionUser()) {
    await ensureCommunitiesLoaded();
  }
}
