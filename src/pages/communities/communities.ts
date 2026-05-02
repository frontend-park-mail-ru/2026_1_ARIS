/**
 * Страница сообществ.
 */
import { renderHeader } from "../../components/header/header";
import { renderSidebar } from "../../components/sidebar/sidebar";
import {
  createCommunity,
  deleteCommunity,
  getCommunities,
  getCommunityById,
  updateCommunity,
  type CommunityPayload,
} from "../../api/communities";
import {
  createPost,
  deletePost,
  getPostsByProfileId,
  updatePost,
  uploadPostImages,
} from "../../api/posts";
import { uploadProfileAvatar } from "../../api/profile";
import { getSessionUser } from "../../state/session";
import { clearFeedCache } from "../feed/cache";
import { clearWidgetbarCache } from "../../components/widgetbar/widgetbar";
import { prepareAvatarLinks } from "../../utils/avatar";
import type { ComposerMediaItem } from "../profile/types";
import type { CommunitiesParams } from "./types";
import {
  communitiesState,
  findCommunityById,
  isCommunityType,
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
  setCommunityCoverFile,
  setActiveCommunity,
  setActivePosts,
  setCommunities,
  setCommunityAvatarFile,
} from "./state";
import { getCommunityName, mapPostToCommunityPost, slugifyCommunityTitle } from "./helpers";
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
  __communityPostBackdropPressStarted?: boolean;
  __communityPostDeleteBackdropPressStarted?: boolean;
};

const COMMUNITY_TITLE_MIN_LENGTH = 3;
const COMMUNITY_BIO_MAX_LENGTH = 2047;
const COMMUNITY_TITLE_MAX_LENGTH = 64;

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
  const posts = bundle.community.profileId
    ? await getPostsByProfileId(String(bundle.community.profileId), signal)
    : [];

  setActiveCommunity(bundle);
  setActivePosts(posts.map((post) => mapPostToCommunityPost(post, bundle)));
}

function syncCommunityFormFromDom(root: ParentNode): void {
  const form = root.querySelector<HTMLFormElement>("[data-community-form]");
  if (!form) return;

  const formData = new FormData(form);
  const title = formData.get("title");
  const bio = formData.get("bio");
  const type = formData.get("type");

  if (typeof title === "string") {
    communitiesState.form.title = title.trim();
  }
  if (typeof bio === "string") {
    communitiesState.form.bio = bio.trim();
  }
  if (typeof type === "string" && isCommunityType(type)) {
    communitiesState.form.type = type;
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
    type: communitiesState.form.type,
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

  if (!bio) {
    return "Введите описание сообщества.";
  }

  if (bio.length > COMMUNITY_BIO_MAX_LENGTH) {
    return `Описание сообщества должно быть не длиннее ${COMMUNITY_BIO_MAX_LENGTH} символов.`;
  }

  return "";
}

function validateCommunityType(value: string): string {
  if (!isCommunityType(value)) {
    return "Выберите тип сообщества.";
  }

  return "";
}

function validateCommunityPayload(payload: CommunityPayload): string {
  const username = payload.username?.trim().toLowerCase() ?? "";
  const titleError = validateCommunityTitle(payload.title ?? "");
  const bioError = validateCommunityBio(payload.bio ?? "");
  const typeError = validateCommunityType(payload.type ?? "");

  if (titleError) return titleError;
  if (bioError) return bioError;
  if (typeError) return typeError;

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

  if (validateCommunityType(payload.type ?? "")) {
    return 3;
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
    if (communitiesState.form.avatarFile) {
      const uploaded = await uploadProfileAvatar(communitiesState.form.avatarFile);
      payload.avatarId = uploaded.mediaID;
    }

    const saved =
      communitiesState.form.mode === "edit" && communitiesState.form.communityId
        ? await updateCommunity(communitiesState.form.communityId, payload)
        : await createCommunity(payload);

    communitiesState.loaded = false;
    resetCommunityFormState();

    if (communitiesState.activeCommunity) {
      setActiveCommunity(saved);
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

  if (communitiesState.form.step === 3) {
    return validateCommunityType(communitiesState.form.type);
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
            authorProfileId: bundle.community.profileId,
          });

    if (savedPost && typeof savedPost.id === "number") {
      const mappedPost = mapPostToCommunityPost(savedPost, bundle);
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

    void getPostsByProfileId(String(bundle.community.profileId))
      .then((posts) => {
        setActivePosts(posts.map((post) => mapPostToCommunityPost(post, bundle)));
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

    if (bundle?.community.profileId) {
      void getPostsByProfileId(String(bundle.community.profileId))
        .then((posts) => {
          setActivePosts(posts.map((post) => mapPostToCommunityPost(post, bundle)));
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
  const editButton = menu.querySelector<HTMLButtonElement>(
    `[data-community-post-edit="${postId}"]`,
  );
  if (editButton) {
    editButton.onclick = () => {
      closeCommunityPostMenus(root);
      openEditCommunityPostComposer(postId);
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
      await prepareAvatarLinks([getSessionUser()?.avatarLink, bundle?.community.avatarUrl]);
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
  await prepareAvatarLinks([
    getSessionUser()?.avatarLink,
    ...communitiesState.items.map((item) => item.community.avatarUrl),
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
    const target = event.target;
    if (!(target instanceof Element)) return;

    bindableRoot.__communityFormBackdropPressStarted = target.matches(
      "[data-community-form-modal]",
    );
    bindableRoot.__communityDeleteBackdropPressStarted = target.matches(
      "[data-community-delete-modal]",
    );
    bindableRoot.__communityPostBackdropPressStarted = target.matches(
      "[data-community-post-modal]",
    );
    bindableRoot.__communityPostDeleteBackdropPressStarted = target.matches(
      "[data-community-post-delete-modal]",
    );
  });

  root.addEventListener("input", (event: Event) => {
    const target = event.target;

    if (target instanceof HTMLInputElement && target.matches("[data-communities-search]")) {
      communitiesState.query = target.value;
      refreshCommunitiesList(root);
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
    }
  });

  root.addEventListener("change", (event: Event) => {
    const target = event.target;

    if (target instanceof HTMLInputElement && target.matches("[data-community-avatar-input]")) {
      const file = target.files?.[0];
      if (!file) return;
      setCommunityAvatarFile(file);
      refreshCommunitiesPage(root);
      return;
    }

    if (target instanceof HTMLInputElement && target.matches("[data-community-cover-input]")) {
      const file = target.files?.[0];
      if (!file) return;
      setCommunityCoverFile(file);
      refreshCommunitiesPage(root);
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

    if (target instanceof HTMLSelectElement && target.matches("[data-community-type-select]")) {
      const value = target.value;
      communitiesState.form.type = isCommunityType(value) ? value : "public";
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
      if (nextStep >= 1 && nextStep <= 5) {
        communitiesState.form.step = nextStep as 1 | 2 | 3 | 4 | 5;
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

    const typeOptionButton = target.closest("[data-community-type]");
    if (typeOptionButton instanceof HTMLButtonElement) {
      const type = typeOptionButton.getAttribute("data-community-type");
      if (type && isCommunityType(type)) {
        communitiesState.form.type = type;
        communitiesState.form.errorMessage = "";
        refreshCommunitiesPage(root);
      }
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

    const openPostButton = target.closest("[data-community-post-open]");
    if (openPostButton instanceof HTMLButtonElement) {
      closeCommunityPostMenus(root);
      openCommunityPostComposer();
      refreshCommunitiesPage(root);
      return;
    }

    const editPostButton = target.closest("[data-community-post-edit]");
    if (editPostButton instanceof HTMLButtonElement) {
      const postId = editPostButton.getAttribute("data-community-post-edit");
      if (postId) {
        closeCommunityPostMenus(root);
        openEditCommunityPostComposer(postId);
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
}

export async function prefetchCommunities(): Promise<void> {
  if (getSessionUser()) {
    await ensureCommunitiesLoaded();
  }
}
