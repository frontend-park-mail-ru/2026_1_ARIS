/**
 * Страница сообществ.
 */
import { renderHeader } from "../../components/header/header";
import { renderSidebar } from "../../components/sidebar/sidebar";
import {
  changeCommunityMemberRole,
  checkCommunityExists,
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
  type CommunityRole,
} from "../../api/communities";
import { searchUsersAndCommunities, type SearchCommunity } from "../../api/search";
import {
  createPost,
  deletePost,
  getOfficialCommunityPosts,
  getPostsByCommunityId,
  likePost,
  unlikePost,
  updatePost,
  uploadPostImages,
} from "../../api/posts";
import { getMyProfile, uploadProfileAvatar } from "../../api/profile";
import { getSessionUser } from "../../state/session";
import { t } from "../../state/i18n";
import { clearFeedCache } from "../feed/cache";
import { clearWidgetbarCache } from "../../components/widgetbar/widgetbar";
import { prepareAvatarLinks } from "../../utils/avatar";
import { openPostImageViewerFromTarget } from "../../utils/image-viewer";
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
import {
  isOfficialCommunityPost,
  mapPostToCommunityPost,
  canManageCommunityMemberRole,
  canRemoveCommunityMember,
} from "./helpers";
import {
  refreshCommunitiesList,
  refreshCommunitiesPage,
  renderCommunitiesListContent,
  renderCommunityMembersManagerList,
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

const COMMUNITY_MEMBERS_PAGE_SIZE = 30;

const COMMUNITY_TITLE_MIN_LENGTH = 3;
const COMMUNITY_BIO_MAX_LENGTH = 2047;
const COMMUNITY_TITLE_MAX_LENGTH = 64;
const COMMUNITIES_SEARCH_DEBOUNCE_MS = 250;
const COMMUNITY_NAME_CHECK_DEBOUNCE_MS = 350;

let communitiesSearchTimerId: number | null = null;
let communitiesSearchAbortController: AbortController | null = null;
let communitiesSearchRequestId = 0;
let communityNameCheckTimerId: number | null = null;
let communityNameCheckAbortController: AbortController | null = null;
let communityNameCheckRequestId = 0;

function formatCommunityMessage(message: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, String(value)),
    message,
  );
}

function clearCommunitiesSearchRequest(): void {
  if (communitiesSearchTimerId !== null) {
    window.clearTimeout(communitiesSearchTimerId);
    communitiesSearchTimerId = null;
  }

  communitiesSearchAbortController?.abort();
  communitiesSearchAbortController = null;
}

function clearCommunityNameCheckRequest(): void {
  if (communityNameCheckTimerId !== null) {
    window.clearTimeout(communityNameCheckTimerId);
    communityNameCheckTimerId = null;
  }

  communityNameCheckAbortController?.abort();
  communityNameCheckAbortController = null;
}

function resetCommunityNameCheckState(): void {
  clearCommunityNameCheckRequest();
  communityNameCheckRequestId += 1;
  communitiesState.form.nameCheckStatus = "idle";
  communitiesState.form.nameCheckTitle = "";
  communitiesState.form.nameCheckUsername = "";
  communitiesState.form.nameCheckMessage = "";
}

function validateCommunityUsername(value: string): string {
  const username = value.trim().toLowerCase();

  if (!username) {
    return t("communities.formUsernameRequired");
  }

  if (username.length < 3 || username.length > 20) {
    return t("communities.formUsernameLengthError");
  }

  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(username)) {
    return t("communities.formUsernameFormatError");
  }

  return "";
}

function validateCommunityUsernameInput(value: string): string {
  const username = value.trim().toLowerCase();
  if (!username) {
    return "";
  }
  return validateCommunityUsername(username);
}

function mapSearchCommunityToBundle(result: SearchCommunity): CommunityBundle {
  const existing = findCommunityById(result.id);
  if (existing) {
    return {
      ...existing,
      community: {
        ...existing.community,
        title: result.title || existing.community.title,
        username: result.username || existing.community.username,
        ...(typeof result.bio === "string" ? { bio: result.bio } : {}),
        ...(result.avatarUrl ? { avatarUrl: result.avatarUrl } : {}),
        ...(result.coverUrl ? { coverUrl: result.coverUrl } : {}),
      },
    };
  }

  return {
    community: {
      id: result.id,
      uid: "",
      profileId: result.profileId,
      username: result.username,
      title: result.title,
      ...(typeof result.bio === "string" ? { bio: result.bio } : {}),
      type: result.type === "private" ? "private" : "public",
      ...(result.avatarId ? { avatarId: result.avatarId } : {}),
      ...(result.avatarUrl ? { avatarUrl: result.avatarUrl } : {}),
      ...(result.coverId ? { coverId: result.coverId } : {}),
      ...(result.coverUrl ? { coverUrl: result.coverUrl } : {}),
      isActive: true,
      createdAt: "",
      updatedAt: "",
    },
    membership: {
      isMember: false,
      role: "",
      blocked: false,
    },
    permissions: {
      canEditCommunity: false,
      canDeleteCommunity: false,
      canPost: false,
      canPostAsCommunity: false,
      canPostAsMember: false,
      canManageMembers: false,
      canChangeRoles: false,
    },
  };
}

function scheduleCommunitiesBackendSearch(root: ParentNode): void {
  const query = communitiesState.query.trim();
  const requestId = ++communitiesSearchRequestId;

  clearCommunitiesSearchRequest();

  if (!query) {
    communitiesState.searchLoading = false;
    communitiesState.searchResults = null;
    refreshCommunitiesList(root);
    return;
  }

  communitiesState.searchLoading = true;
  communitiesState.searchResults = null;
  refreshCommunitiesList(root);

  communitiesSearchTimerId = window.setTimeout(() => {
    communitiesSearchTimerId = null;
    const controller = new AbortController();
    communitiesSearchAbortController = controller;

    void searchUsersAndCommunities(query, controller.signal)
      .then((results) => {
        if (requestId !== communitiesSearchRequestId || communitiesState.query.trim() !== query) {
          return;
        }
        communitiesState.searchResults = results.communities.map(mapSearchCommunityToBundle);
        communitiesState.errorMessage = "";
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        if (requestId !== communitiesSearchRequestId) return;
        communitiesState.searchResults = [];
        communitiesState.errorMessage =
          error instanceof Error ? error.message : "Не удалось выполнить поиск сообществ.";
      })
      .finally(() => {
        if (requestId !== communitiesSearchRequestId) return;
        communitiesState.searchLoading = false;
        refreshCommunitiesList(root);
      });
  }, COMMUNITIES_SEARCH_DEBOUNCE_MS);
}

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

function updateCommunityPostLikeState(postId: string, likes: number, isLiked: boolean): void {
  setActivePosts(
    communitiesState.activePosts.map((post) =>
      post.id === postId
        ? {
            ...post,
            likes,
            isLiked,
          }
        : post,
    ),
  );
}

function syncActiveCommunity(bundle: CommunityBundle): void {
  syncCommunityBundle(bundle);
  setActiveCommunity(bundle);
}

function syncActiveCommunityMembership(
  membership: CommunityBundle["membership"],
  permissions?: CommunityBundle["permissions"],
): void {
  const bundle = communitiesState.activeCommunity;
  if (!bundle) return;

  syncActiveCommunity({
    ...bundle,
    membership,
    ...(permissions ? { permissions } : {}),
  });
}

function upsertActiveMember(member: CommunityMember): void {
  const shouldKeepMember =
    !member.blocked || communitiesState.membersManager.includeBlocked || member.isSelf;
  if (!shouldKeepMember) {
    setActiveMembers(
      communitiesState.activeMembers.filter((item) => item.profileId !== member.profileId),
    );
    return;
  }

  setActiveMembers(
    communitiesState.activeMembers.some((item) => item.profileId === member.profileId)
      ? communitiesState.activeMembers.map((item) =>
          item.profileId === member.profileId ? member : item,
        )
      : [member, ...communitiesState.activeMembers],
  );
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
  options: { append?: boolean; limit?: number; offset?: number } = {},
): Promise<CommunityMember[]> {
  try {
    const members = await getCommunityMembers(
      communityId,
      includeBlocked,
      signal,
      options.limit,
      options.offset,
    );
    const existingMembers = options.append ? communitiesState.activeMembers : [];
    const existingIds = new Set(existingMembers.map((member) => member.profileId));
    const newMembers = members.filter((member) => !existingIds.has(member.profileId));
    const nextMembers = options.append ? [...existingMembers, ...newMembers] : members;

    setActiveMembers(nextMembers);

    if (typeof options.limit === "number") {
      communitiesState.membersManager.offset = (options.offset ?? 0) + members.length;
      communitiesState.membersManager.hasMore =
        members.length >= options.limit && (!options.append || newMembers.length > 0);
    } else {
      communitiesState.membersManager.offset = nextMembers.length;
      communitiesState.membersManager.hasMore = false;
    }

    return nextMembers;
  } finally {
    if (options.append) {
      communitiesState.membersManager.loadingMore = false;
    } else {
      communitiesState.membersLoading = false;
    }
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
  const username = formData.get("username");
  const bio = formData.get("bio");

  if (typeof title === "string") {
    communitiesState.form.title = title.trim();
  }
  if (typeof username === "string") {
    communitiesState.form.username = username.trim().toLowerCase();
  }
  if (typeof bio === "string") {
    communitiesState.form.bio = bio.trim();
  }
}

function buildCommunityPayload(): CommunityPayload {
  const title = communitiesState.form.title.trim();
  const username = communitiesState.form.username.trim().toLowerCase();
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
    return t("communities.formTitleRequired");
  }

  if (title.length < COMMUNITY_TITLE_MIN_LENGTH) {
    return formatCommunityMessage(t("communities.formTitleMinError"), {
      count: COMMUNITY_TITLE_MIN_LENGTH,
    });
  }

  if (title.length > COMMUNITY_TITLE_MAX_LENGTH) {
    return formatCommunityMessage(t("communities.formTitleMaxError"), {
      count: COMMUNITY_TITLE_MAX_LENGTH,
    });
  }

  return "";
}

function validateCommunityBio(value: string): string {
  const bio = value.trim();

  if (bio.length > COMMUNITY_BIO_MAX_LENGTH) {
    return formatCommunityMessage(t("communities.formBioMaxError"), {
      count: COMMUNITY_BIO_MAX_LENGTH,
    });
  }

  return "";
}

function validateCommunityPayload(payload: CommunityPayload): string {
  const titleError = validateCommunityTitle(payload.title ?? "");
  const bioError = validateCommunityBio(payload.bio ?? "");
  const usernameError = validateCommunityUsername(payload.username ?? "");

  if (titleError) return titleError;
  if (bioError) return bioError;
  if (usernameError) return usernameError;

  return "";
}

function validateCommunityNamePayload(payload: CommunityPayload): string {
  const titleError = validateCommunityTitle(payload.title ?? "");
  const usernameError = validateCommunityUsername(payload.username ?? "");

  if (titleError) return titleError;
  if (usernameError) return usernameError;

  return "";
}

function syncCommunityFormErrorNode(root: ParentNode, message: string): void {
  const errorNode = root.querySelector<HTMLElement>("[data-community-form-error]");
  if (!errorNode) return;

  errorNode.textContent = message || "\u00a0";
  errorNode.classList.toggle("community-modal__error--hidden", !message);
}

function syncCommunityFormAddressPreviewNode(root: ParentNode): void {
  const previewNode = root.querySelector<HTMLElement>("[data-community-form-address-preview]");
  if (!previewNode) return;

  const username = communitiesState.form.username.trim().toLowerCase();
  previewNode.textContent = username
    ? formatCommunityMessage(t("communities.formAddressPreview"), { username })
    : "\u00a0";
  previewNode.classList.toggle("community-form__helper--hidden", !username);
}

function openCommunityMediaPicker(root: ParentNode, kind: "avatar" | "cover"): void {
  const input = root.querySelector<HTMLInputElement>(`[data-community-${kind}-input]`);
  if (!input) return;
  input.value = "";
  input.click();
}

function closeCommunityFormHints(root: ParentNode, except?: HTMLButtonElement): void {
  root.querySelectorAll<HTMLButtonElement>("[data-community-form-hint]").forEach((button) => {
    if (button === except) return;
    button.classList.remove("community-form__hint-button--open");
    button.setAttribute("aria-expanded", "false");
  });
}

async function ensureCommunityNameAvailable(
  root: ParentNode,
  options: {
    refresh?: boolean;
    signal?: AbortSignal;
    showRequestErrors?: boolean;
    force?: boolean;
  } = {},
): Promise<string> {
  const payload = buildCommunityPayload();
  const validationError = validateCommunityNamePayload(payload);

  if (validationError) {
    resetCommunityNameCheckState();
    communitiesState.form.errorMessage = validationError;
    if (options.refresh) {
      refreshCommunitiesPage(root);
    } else {
      syncCommunityFormErrorNode(root, validationError);
    }
    return validationError;
  }

  if (communitiesState.form.mode !== "create") {
    communitiesState.form.nameCheckStatus = "available";
    communitiesState.form.nameCheckTitle = payload.title ?? "";
    communitiesState.form.nameCheckUsername = payload.username ?? "";
    communitiesState.form.nameCheckMessage = "";
    return "";
  }

  const title = payload.title ?? "";
  const username = payload.username ?? "";
  if (
    !options.force &&
    communitiesState.form.nameCheckStatus === "available" &&
    communitiesState.form.nameCheckTitle === title &&
    communitiesState.form.nameCheckUsername === username
  ) {
    return "";
  }

  if (options.signal) {
    if (communityNameCheckTimerId !== null) {
      window.clearTimeout(communityNameCheckTimerId);
      communityNameCheckTimerId = null;
    }
  } else {
    clearCommunityNameCheckRequest();
  }
  const requestId = ++communityNameCheckRequestId;
  communitiesState.form.nameCheckStatus = "checking";
  communitiesState.form.nameCheckTitle = title;
  communitiesState.form.nameCheckUsername = username;
  communitiesState.form.nameCheckMessage = "";
  if (options.refresh) {
    refreshCommunitiesPage(root);
  }

  try {
    const result = await checkCommunityExists(
      { title, username },
      options.signal ?? communityNameCheckAbortController?.signal,
    );
    if (requestId !== communityNameCheckRequestId) {
      return "";
    }

    const unavailableMessage = result.usernameExists
      ? formatCommunityMessage(t("communities.formUsernameTakenError"), { username })
      : "";

    communitiesState.form.nameCheckStatus = unavailableMessage ? "unavailable" : "available";
    communitiesState.form.nameCheckUsername = username;
    communitiesState.form.nameCheckMessage = "";
    communitiesState.form.errorMessage = unavailableMessage;

    if (options.refresh) {
      refreshCommunitiesPage(root);
    } else {
      syncCommunityFormErrorNode(root, unavailableMessage);
    }

    return unavailableMessage;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return "";
    }

    const message = error instanceof Error ? error.message : t("communities.formNameCheckError");
    if (options.showRequestErrors === false) {
      communitiesState.form.nameCheckStatus = "idle";
      communitiesState.form.nameCheckMessage = "";
      return "";
    }

    communitiesState.form.nameCheckStatus = "error";
    communitiesState.form.nameCheckMessage = "";
    communitiesState.form.errorMessage = message;

    if (options.refresh) {
      refreshCommunitiesPage(root);
    } else {
      syncCommunityFormErrorNode(root, message);
    }

    return message;
  }
}

function scheduleCommunityNameAvailabilityCheck(root: ParentNode): void {
  clearCommunityNameCheckRequest();

  const payload = buildCommunityPayload();
  const validationError = validateCommunityNamePayload(payload);
  if (validationError || communitiesState.form.mode !== "create") {
    communitiesState.form.nameCheckStatus = "idle";
    communitiesState.form.nameCheckTitle = "";
    communitiesState.form.nameCheckUsername = "";
    communitiesState.form.nameCheckMessage = "";
    return;
  }

  const controller = new AbortController();
  communityNameCheckAbortController = controller;
  communityNameCheckTimerId = window.setTimeout(() => {
    communityNameCheckTimerId = null;
    void ensureCommunityNameAvailable(root, {
      signal: controller.signal,
      showRequestErrors: false,
    });
  }, COMMUNITY_NAME_CHECK_DEBOUNCE_MS);
}

function getInvalidCommunityFormStep(payload: CommunityPayload): 1 | 2 | 3 | null {
  if (validateCommunityTitle(payload.title ?? "")) {
    return 1;
  }

  if (validateCommunityBio(payload.bio ?? "")) {
    return 2;
  }

  if (validateCommunityUsername(payload.username ?? "")) {
    return 1;
  }

  return null;
}

async function saveCommunityForm(root: ParentNode): Promise<void> {
  syncCommunityFormFromDom(root);

  let payload = buildCommunityPayload();
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

  const nameAvailabilityError =
    communitiesState.form.mode === "create"
      ? await ensureCommunityNameAvailable(root, { refresh: true, force: true })
      : "";
  if (nameAvailabilityError) {
    communitiesState.form.step = 1;
    communitiesState.form.errorMessage = nameAvailabilityError;
    refreshCommunitiesPage(root);
    return;
  }

  payload = buildCommunityPayload();

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
    const message = error instanceof Error ? error.message : t("communities.formSaveError");
    if (/duplicate entry/i.test(message)) {
      communitiesState.form.step = 1;
      communitiesState.form.nameCheckStatus = "unavailable";
      communitiesState.form.nameCheckTitle = payload.title ?? "";
      communitiesState.form.nameCheckUsername = payload.username ?? "";
      communitiesState.form.nameCheckMessage = "";
      communitiesState.form.errorMessage = formatCommunityMessage(
        t("communities.formUsernameTakenError"),
        { username: payload.username ?? "" },
      );
    } else {
      communitiesState.form.errorMessage = message;
    }
    refreshCommunitiesPage(root);
  }
}

function validateCommunityFormStep(): string {
  if (communitiesState.form.step === 1) {
    return validateCommunityNamePayload(buildCommunityPayload());
  }

  if (communitiesState.form.step === 2) {
    return validateCommunityBio(communitiesState.form.bio);
  }

  return "";
}

async function goToNextCommunityFormStep(root: ParentNode): Promise<void> {
  syncCommunityFormFromDom(root);
  const errorMessage = validateCommunityFormStep();

  if (errorMessage) {
    communitiesState.form.errorMessage = errorMessage;
    refreshCommunitiesPage(root);
    return;
  }

  if (communitiesState.form.step === 1) {
    const nameAvailabilityError = await ensureCommunityNameAvailable(root, {
      refresh: true,
      force: true,
    });
    if (nameAvailabilityError) {
      communitiesState.form.errorMessage = nameAvailabilityError;
      refreshCommunitiesPage(root);
      return;
    }
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
              reject(new Error(t("communities.imageReadError")));
              return;
            }

            resolve({
              mediaURL: reader.result,
              file,
              isUploaded: false,
            });
          };
          reader.onerror = () => reject(new Error(t("communities.imageReadError")));
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
    communitiesState.postComposer.errorMessage = t("communities.addTextOrImage");
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
            communityId: bundle.community.id,
            ...(communitiesState.postComposer.authorMode === "community"
              ? { authorProfileId: bundle.community.profileId }
              : {}),
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

function closeCommunityMemberRoleMenus(root: Document | HTMLElement): void {
  document.querySelectorAll<HTMLElement>("[data-community-member-role-menu]").forEach((menu) => {
    menu.hidden = true;
    menu.style.top = "";
    menu.style.right = "";
    menu.style.left = "";
    menu.style.width = "";
    menu.style.maxHeight = "";
  });

  root
    .querySelectorAll<HTMLButtonElement>("[data-community-member-role-toggle]")
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

function positionCommunityMemberRoleMenu(menu: HTMLElement, toggle: HTMLButtonElement): void {
  const rect = toggle.getBoundingClientRect();
  const viewportMargin = 12;
  const gap = 6;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const menuWidth = Math.min(
    Math.max(rect.width, menu.offsetWidth || rect.width),
    viewportWidth - viewportMargin * 2,
  );
  const desiredMenuHeight = menu.scrollHeight || menu.offsetHeight || 220;
  const belowSpace = viewportHeight - rect.bottom - gap - viewportMargin;
  const aboveSpace = rect.top - gap - viewportMargin;
  const shouldOpenUp = belowSpace < desiredMenuHeight && aboveSpace > belowSpace;
  const menuHeight = Math.min(desiredMenuHeight, viewportHeight - viewportMargin * 2);
  const left = Math.min(
    Math.max(viewportMargin, rect.left),
    viewportWidth - viewportMargin - menuWidth,
  );
  const unclampedTop = shouldOpenUp ? rect.top - gap - menuHeight : rect.bottom + gap;
  const top = Math.min(
    Math.max(viewportMargin, unclampedTop),
    viewportHeight - viewportMargin - menuHeight,
  );

  menu.style.top = `${top}px`;
  menu.style.left = `${left}px`;
  menu.style.right = "auto";
  menu.style.width = `${menuWidth}px`;
  menu.style.maxHeight = "";
}

function repositionOpenCommunityMemberRoleMenu(root: Document | HTMLElement): void {
  const openRoleMenu = document.querySelector<HTMLElement>(
    "[data-community-member-role-menu]:not([hidden])",
  );
  if (!openRoleMenu) return;

  const profileId = openRoleMenu.getAttribute("data-community-member-role-menu");
  const roleToggle = profileId
    ? root.querySelector<HTMLButtonElement>(`[data-community-member-role-toggle="${profileId}"]`)
    : null;
  if (!roleToggle || !roleToggle.isConnected) {
    closeCommunityMemberRoleMenus(root);
    return;
  }

  const rect = roleToggle.getBoundingClientRect();
  if (rect.bottom < 0 || rect.top > window.innerHeight) {
    closeCommunityMemberRoleMenus(root);
    return;
  }

  positionCommunityMemberRoleMenu(openRoleMenu, roleToggle);
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
      resetCommunityNameCheckState();
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
  if (membersButton && bundle) {
    membersButton.onclick = () => {
      openCommunityMembersManager(root, bundle);
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

function openCommunityMembersManager(root: Document | HTMLElement, bundle: CommunityBundle): void {
  const canManageMembers = bundle.permissions.canManageMembers || bundle.permissions.canChangeRoles;
  closeCommunityMenus(root);
  closeCommunityMemberRoleMenus(root);
  setActiveCommunity(bundle);
  communitiesState.membersManager.open = true;
  communitiesState.membersManager.errorMessage = "";
  communitiesState.membersManager.query = "";
  communitiesState.membersManager.includeBlocked = canManageMembers
    ? communitiesState.membersManager.includeBlocked
    : false;
  communitiesState.membersManager.offset = 0;
  communitiesState.membersManager.hasMore = true;
  communitiesState.membersManager.loadingMore = false;
  communitiesState.membersLoading = true;
  communitiesState.membersLoaded = false;
  refreshCommunitiesPage(root);
  void loadCommunityMembers(
    bundle.community.id,
    communitiesState.membersManager.includeBlocked,
    undefined,
    {
      limit: COMMUNITY_MEMBERS_PAGE_SIZE,
      offset: 0,
    },
  )
    .then(() => {
      refreshCommunitiesPage(root);
    })
    .catch((error: unknown) => {
      communitiesState.membersManager.errorMessage =
        error instanceof Error ? error.message : t("communities.membersLoadError");
      refreshCommunitiesPage(root);
    });
}

function loadMoreCommunityMembers(root: Document | HTMLElement): void {
  const bundle = communitiesState.activeCommunity;
  const manager = communitiesState.membersManager;
  if (!bundle || communitiesState.membersLoading || manager.loadingMore || !manager.hasMore) {
    return;
  }

  manager.loadingMore = true;
  refreshCommunitiesPage(root);
  void loadCommunityMembers(bundle.community.id, manager.includeBlocked, undefined, {
    append: true,
    limit: COMMUNITY_MEMBERS_PAGE_SIZE,
    offset: manager.offset,
  })
    .then(() => {
      refreshCommunitiesPage(root);
    })
    .catch((error: unknown) => {
      manager.errorMessage =
        error instanceof Error ? error.message : t("communities.membersLoadError");
      manager.loadingMore = false;
      refreshCommunitiesPage(root);
    });
}

function isCommunityMemberRole(value: string | null): value is Exclude<CommunityRole, "owner"> {
  return value === "admin" || value === "moderator" || value === "member" || value === "blocked";
}

function handleCommunityMemberRoleChoice(
  root: Document | HTMLElement,
  profileId: number,
  nextRole: string | null,
): void {
  const bundle = communitiesState.activeCommunity;
  if (!bundle || !Number.isFinite(profileId) || profileId <= 0) return;
  if (!isCommunityMemberRole(nextRole)) return;

  const member = communitiesState.activeMembers.find((item) => item.profileId === profileId);
  if (
    !member ||
    member.role === nextRole ||
    !canManageCommunityMemberRole(bundle, member, communitiesState.viewerProfileId)
  ) {
    closeCommunityMemberRoleMenus(root);
    refreshCommunitiesPage(root);
    return;
  }

  closeCommunityMemberRoleMenus(root);
  communitiesState.membersManager.confirmAction = {
    type: "role",
    profileId,
    newRole: nextRole,
  };
  refreshCommunitiesPage(root);
}

function bindFloatingCommunityMemberRoleMenuActions(
  menu: HTMLElement,
  root: Document | HTMLElement,
): void {
  menu.querySelectorAll<HTMLButtonElement>("[data-community-member-role]").forEach((button) => {
    button.onclick = () => {
      const profileId = Number(button.getAttribute("data-community-member-role"));
      const nextRole = button.getAttribute("data-community-member-role-value");
      handleCommunityMemberRoleChoice(root, profileId, nextRole);
    };
  });
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

  clearCommunityNameCheckRequest();
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
          <aside class="app-layout__right app-layout__right--rail">
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
        <aside class="app-layout__right app-layout__right--optional">
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
  closeCommunityMemberRoleMenus(root);

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

  root.addEventListener(
    "scroll",
    (event: Event) => {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-community-members-modal]")) {
        repositionOpenCommunityMemberRoleMenu(root);
      }
      if (target instanceof HTMLElement && target.matches("[data-community-members-list]")) {
        const remaining = target.scrollHeight - target.scrollTop - target.clientHeight;
        if (remaining < 120) {
          loadMoreCommunityMembers(root);
        }
      }
    },
    { capture: true, passive: true },
  );

  root.addEventListener("keydown", (event: Event) => {
    if (!(event instanceof KeyboardEvent)) return;

    if (event.key === "Escape") {
      const openHint = root.querySelector(".community-form__hint-button--open");
      if (openHint) {
        event.preventDefault();
        closeCommunityFormHints(root);
        return;
      }
    }

    if (
      (event.key === "Enter" || event.key === " ") &&
      event.target instanceof HTMLElement &&
      event.target.matches("[data-community-media-pick-target]")
    ) {
      const kind = event.target.getAttribute("data-community-media-pick-target");
      if (kind === "avatar" || kind === "cover") {
        event.preventDefault();
        openCommunityMediaPicker(root, kind);
        return;
      }
    }

    if (
      event.key === "Enter" &&
      event.target instanceof HTMLInputElement &&
      event.target.form?.matches("[data-community-form]") &&
      (event.target.matches("[data-community-title]") ||
        event.target.matches("[data-community-username]")) &&
      communitiesState.form.step < 4
    ) {
      event.preventDefault();
      void goToNextCommunityFormStep(root);
      return;
    }

    if (
      (event.key === "Enter" || event.key === " ") &&
      event.target instanceof Element &&
      event.target.closest("[data-post-image-open]")
    ) {
      closeCommunityMenus(root);
      closeCommunityPostMenus(root);
      closeCommunityMemberRoleMenus(root);
      openPostImageViewerFromTarget(event.target);
      event.preventDefault();
    }
  });

  root.addEventListener("input", (event: Event) => {
    const target = event.target;

    if (target instanceof HTMLInputElement && target.matches("[data-communities-search]")) {
      communitiesState.query = target.value;
      scheduleCommunitiesBackendSearch(root);
      return;
    }

    if (target instanceof HTMLInputElement && target.matches("[data-community-members-search]")) {
      const cursorStart = target.selectionStart ?? target.value.length;
      const cursorEnd = target.selectionEnd ?? cursorStart;
      communitiesState.membersManager.query = target.value;
      refreshCommunitiesPage(root);
      const nextInput = root.querySelector<HTMLInputElement>("[data-community-members-search]");
      if (nextInput) {
        nextInput.focus();
        nextInput.setSelectionRange(cursorStart, cursorEnd);
      }
      return;
    }

    if (target instanceof HTMLInputElement && target.matches("[data-community-post-search]")) {
      communitiesState.postSearchQuery = target.value;
      refreshCommunitiesPage(root);
      const nextInput = root.querySelector<HTMLInputElement>("[data-community-post-search]");
      if (nextInput) {
        nextInput.focus();
        nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
      }
      return;
    }

    if (target instanceof HTMLInputElement && target.matches("[data-community-title]")) {
      communitiesState.form.title = target.value;
      const errorMessage =
        communitiesState.form.step === 1 ? validateCommunityTitle(target.value) : "";
      communitiesState.form.errorMessage = errorMessage;
      communitiesState.form.nameCheckStatus = "idle";
      communitiesState.form.nameCheckTitle = "";
      communitiesState.form.nameCheckUsername = "";
      communitiesState.form.nameCheckMessage = "";
      syncCommunityFormErrorNode(root, errorMessage);
      syncCommunityFormAddressPreviewNode(root);
      if (errorMessage) {
        clearCommunityNameCheckRequest();
      } else {
        scheduleCommunityNameAvailabilityCheck(root);
      }
      return;
    }

    if (target instanceof HTMLInputElement && target.matches("[data-community-username]")) {
      const normalizedValue = target.value.toLowerCase();
      if (target.value !== normalizedValue) {
        target.value = normalizedValue;
      }
      communitiesState.form.username = normalizedValue;
      const errorMessage =
        communitiesState.form.step === 1 ? validateCommunityUsernameInput(normalizedValue) : "";
      communitiesState.form.errorMessage = errorMessage;
      communitiesState.form.nameCheckStatus = "idle";
      communitiesState.form.nameCheckTitle = "";
      communitiesState.form.nameCheckUsername = "";
      communitiesState.form.nameCheckMessage = "";
      syncCommunityFormErrorNode(root, errorMessage);
      syncCommunityFormAddressPreviewNode(root);
      if (errorMessage) {
        clearCommunityNameCheckRequest();
      } else {
        scheduleCommunityNameAvailabilityCheck(root);
      }
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
          error instanceof Error ? error.message : t("communities.imagePrepareError");
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
      communitiesState.membersManager.offset = 0;
      communitiesState.membersManager.hasMore = true;
      communitiesState.membersManager.loadingMore = false;
      communitiesState.membersLoading = true;
      communitiesState.membersLoaded = false;
      const errorNode = root.querySelector<HTMLElement>("[data-community-members-error]");
      if (errorNode) {
        errorNode.textContent = "\u00a0";
        errorNode.classList.add("community-modal__error--hidden");
      }
      const list = root.querySelector<HTMLElement>("[data-community-members-list]");
      if (list) {
        list.innerHTML = renderCommunityMembersManagerList(bundle);
      }
      const includeBlocked = target.checked;
      void loadCommunityMembers(bundle.community.id, includeBlocked, undefined, {
        limit: COMMUNITY_MEMBERS_PAGE_SIZE,
        offset: 0,
      })
        .then(() => {
          if (communitiesState.membersManager.includeBlocked !== includeBlocked) return;
          const nextList = root.querySelector<HTMLElement>("[data-community-members-list]");
          if (nextList) {
            nextList.innerHTML = renderCommunityMembersManagerList(bundle);
          }
        })
        .catch((error: unknown) => {
          if (communitiesState.membersManager.includeBlocked !== includeBlocked) return;
          communitiesState.membersManager.errorMessage =
            error instanceof Error ? error.message : t("communities.membersLoadError");
          communitiesState.membersLoading = false;
          const nextErrorNode = root.querySelector<HTMLElement>("[data-community-members-error]");
          if (nextErrorNode) {
            nextErrorNode.textContent = communitiesState.membersManager.errorMessage;
            nextErrorNode.classList.remove("community-modal__error--hidden");
          }
          const nextList = root.querySelector<HTMLElement>("[data-community-members-list]");
          if (nextList) {
            nextList.innerHTML = renderCommunityMembersManagerList(bundle);
          }
        });
      return;
    }
  });

  root.addEventListener("submit", (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLFormElement)) return;

    if (target.matches("[data-community-form]")) {
      event.preventDefault();
      if (communitiesState.form.step < 4) {
        void goToNextCommunityFormStep(root);
      } else {
        void saveCommunityForm(root);
      }
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

    const hintButton = target.closest("[data-community-form-hint]");
    if (hintButton instanceof HTMLButtonElement) {
      const willOpen = !hintButton.classList.contains("community-form__hint-button--open");
      closeCommunityFormHints(root, hintButton);
      hintButton.classList.toggle("community-form__hint-button--open", willOpen);
      hintButton.setAttribute("aria-expanded", String(willOpen));
      return;
    }

    closeCommunityFormHints(root);

    if (target.closest("[data-post-image-open]")) {
      closeCommunityMenus(root);
      closeCommunityPostMenus(root);
      closeCommunityMemberRoleMenus(root);
      if (openPostImageViewerFromTarget(target)) return;
    }

    if (target.closest("[data-member-confirm-modal] a[data-link]")) {
      communitiesState.membersManager.confirmAction = null;
      refreshCommunitiesPage(root);
      return;
    }

    const createButton = target.closest("[data-community-create-open]");
    if (createButton instanceof HTMLButtonElement) {
      resetCommunityNameCheckState();
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
      closeCommunityMemberRoleMenus(root);

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
      closeCommunityMemberRoleMenus(root);

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

    const likePostButton = target.closest("[data-community-post-like]");
    if (likePostButton instanceof HTMLButtonElement) {
      const postId = likePostButton.getAttribute("data-community-post-like");
      const post = postId ? communitiesState.activePosts.find((item) => item.id === postId) : null;
      if (!postId || !post || likePostButton.disabled) {
        return;
      }

      likePostButton.disabled = true;
      void (post.isLiked ? unlikePost(postId) : likePost(postId))
        .then((updatedPost) => {
          updateCommunityPostLikeState(
            postId,
            updatedPost.likes ?? 0,
            updatedPost.isLiked ?? !post.isLiked,
          );
          clearFeedCache();
          refreshCommunitiesPage(root);
        })
        .catch((error: unknown) => {
          console.error("[communities] like toggle failed", error);
          likePostButton.disabled = false;
        });
      return;
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
        resetCommunityNameCheckState();
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
      resetCommunityNameCheckState();
      resetCommunityFormState();
      refreshCommunitiesPage(root);
      return;
    }

    const pickAvatarButton = target.closest("[data-community-avatar-pick]");
    if (pickAvatarButton instanceof HTMLButtonElement) {
      openCommunityMediaPicker(root, "avatar");
      return;
    }

    const pickCoverButton = target.closest("[data-community-cover-pick]");
    if (pickCoverButton instanceof HTMLButtonElement) {
      openCommunityMediaPicker(root, "cover");
      return;
    }

    const pickMediaTarget = target.closest("[data-community-media-pick-target]");
    if (pickMediaTarget instanceof HTMLElement) {
      const kind = pickMediaTarget.getAttribute("data-community-media-pick-target");
      if (kind === "avatar" || kind === "cover") {
        const editor =
          kind === "avatar"
            ? communitiesState.form.avatarEditor
            : communitiesState.form.coverEditor;
        if (editor.dragMoved) {
          editor.dragMoved = false;
        } else {
          openCommunityMediaPicker(root, kind);
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
      void goToNextCommunityFormStep(root);
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
      const communityId = membersOpenButton.getAttribute("data-community-members-open");
      const bundle = communityId
        ? findCommunityById(communityId)
        : communitiesState.activeCommunity;
      if (!bundle) return;

      openCommunityMembersManager(root, bundle);
      return;
    }

    const memberRoleToggle = target.closest("[data-community-member-role-toggle]");
    if (memberRoleToggle instanceof HTMLButtonElement) {
      const profileId = memberRoleToggle.getAttribute("data-community-member-role-toggle");
      if (!profileId) return;

      const menu = document.querySelector<HTMLElement>(
        `[data-community-member-role-menu="${profileId}"]`,
      );
      const isExpanded = memberRoleToggle.getAttribute("aria-expanded") === "true";
      closeCommunityMemberRoleMenus(root);

      if (menu && !isExpanded) {
        document.body.appendChild(menu);
        menu.hidden = false;
        positionCommunityMemberRoleMenu(menu, memberRoleToggle);
        bindFloatingCommunityMemberRoleMenuActions(menu, root);
        memberRoleToggle.setAttribute("aria-expanded", "true");
      }
      return;
    }

    const memberRoleButton = target.closest("[data-community-member-role]");
    if (memberRoleButton instanceof HTMLButtonElement) {
      const profileId = Number(memberRoleButton.getAttribute("data-community-member-role"));
      const nextRole = memberRoleButton.getAttribute("data-community-member-role-value");
      handleCommunityMemberRoleChoice(root, profileId, nextRole);
      return;
    }

    if (
      !target.closest("[data-community-member-role-select]") &&
      !target.closest("[data-community-member-role-menu]")
    ) {
      closeCommunityMemberRoleMenus(root);
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
      closeCommunityMemberRoleMenus(root);
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
          const [joinedMember] = await Promise.all([
            joinCommunity(bundle.community.id),
            waitMinimumSkeletonTime(800),
          ]);
          upsertActiveMember(joinedMember);
          communitiesState.viewerProfileId = joinedMember.profileId;
          communitiesState.membershipLoading = false;
          communitiesState.membersLoading = false;
          syncActiveCommunityMembership({
            isMember: true,
            role: joinedMember.blocked ? "blocked" : joinedMember.role,
            blocked: joinedMember.blocked,
          });
          refreshCommunitiesPage(root);

          const freshBundle = await getCommunityById(bundle.community.id);
          syncActiveCommunity(freshBundle);
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

    const leaveButton = target.closest("[data-community-leave]");
    if (leaveButton instanceof HTMLButtonElement) {
      const communityId = leaveButton.getAttribute("data-community-leave");
      const bundle = communityId ? findCommunityById(communityId) : null;
      if (!bundle) return;

      closeCommunityMenus(root);
      communitiesState.leaveConfirmId = bundle.community.id;
      refreshCommunitiesPage(root);
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
          const selfProfileId =
            communitiesState.viewerProfileId ??
            communitiesState.activeMembers.find((item) => item.isSelf)?.profileId ??
            null;
          if (selfProfileId !== null) {
            setActiveMembers(
              communitiesState.activeMembers.filter((member) => member.profileId !== selfProfileId),
            );
          }
          communitiesState.membershipLoading = false;
          communitiesState.membersLoading = false;
          syncActiveCommunityMembership(
            {
              isMember: false,
              role: "",
              blocked: false,
            },
            {
              canEditCommunity: false,
              canDeleteCommunity: false,
              canPost: false,
              canPostAsCommunity: false,
              canPostAsMember: false,
              canManageMembers: false,
              canChangeRoles: false,
            },
          );
          refreshCommunitiesPage(root);

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

    const openPostSearchButton = target.closest("[data-community-post-search-open]");
    if (openPostSearchButton instanceof HTMLButtonElement) {
      communitiesState.postSearchOpen = true;
      refreshCommunitiesPage(root);
      requestAnimationFrame(() => {
        root.querySelector<HTMLInputElement>("[data-community-post-search]")?.focus();
      });
      return;
    }

    const closePostSearchButton = target.closest("[data-community-post-search-close]");
    if (closePostSearchButton instanceof HTMLButtonElement) {
      communitiesState.postSearchOpen = false;
      communitiesState.postSearchQuery = "";
      refreshCommunitiesPage(root);
      return;
    }

    const removeMemberButton = target.closest("[data-community-member-remove]");
    if (removeMemberButton instanceof HTMLButtonElement) {
      const bundle = communitiesState.activeCommunity;
      const profileId = Number(removeMemberButton.getAttribute("data-community-member-remove"));
      if (!bundle || !Number.isFinite(profileId) || profileId <= 0) return;
      const member = communitiesState.activeMembers.find((item) => item.profileId === profileId);
      if (!member || !canRemoveCommunityMember(bundle, member, communitiesState.viewerProfileId)) {
        refreshCommunitiesPage(root);
        return;
      }

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
      const member = communitiesState.activeMembers.find((item) => item.profileId === profileId);
      if (!member || !canRemoveCommunityMember(bundle, member, communitiesState.viewerProfileId)) {
        refreshCommunitiesPage(root);
        return;
      }

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
      const member = communitiesState.activeMembers.find(
        (item) => item.profileId === action.profileId,
      );
      if (
        !member ||
        (action.type === "remove" &&
          !canRemoveCommunityMember(bundle, member, communitiesState.viewerProfileId)) ||
        (action.type === "role" &&
          !canManageCommunityMemberRole(bundle, member, communitiesState.viewerProfileId))
      ) {
        communitiesState.membersManager.confirmAction = null;
        communitiesState.membersManager.errorMessage = "";
        refreshCommunitiesPage(root);
        return;
      }

      communitiesState.membersManager.confirmAction = null;
      communitiesState.membersManager.errorMessage = "";

      if (action.type === "remove") {
        communitiesState.membersManager.removingProfileId = action.profileId;
        refreshCommunitiesPage(root);
        void (async () => {
          try {
            await removeCommunityMember(bundle.community.id, action.profileId);
            setActiveMembers(
              communitiesState.activeMembers.filter((m) => m.profileId !== action.profileId),
            );
            refreshCommunitiesPage(root);
            const freshBundle = await getCommunityById(bundle.community.id);
            syncActiveCommunity(freshBundle);
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
            const updatedMember = await changeCommunityMemberRole(
              bundle.community.id,
              action.profileId,
              action.newRole,
            );
            upsertActiveMember(updatedMember);
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
            refreshCommunitiesPage(root);
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
      const bundle = communitiesState.activeCommunity;
      closeCommunityPostMenus(root);
      openCommunityPostComposer(bundle?.permissions.canPostAsCommunity ? "community" : "member");
      refreshCommunitiesPage(root);
      return;
    }

    const postAuthorModeButton = target.closest("[data-community-post-author-mode]");
    if (postAuthorModeButton instanceof HTMLButtonElement) {
      const nextMode = postAuthorModeButton.getAttribute("data-community-post-author-mode");
      if (nextMode === "community" || nextMode === "member") {
        communitiesState.postComposer.authorMode = nextMode;
        communitiesState.postComposer.errorMessage = "";
        refreshCommunitiesPage(root);
      }
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
      if (pickPostImageButton.disabled || communitiesState.postComposer.mediaItems.length >= 5) {
        return;
      }

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
      if (openPostMenu) {
        const postId = openPostMenu.getAttribute("data-community-post-menu");
        const postToggle = postId
          ? root.querySelector<HTMLButtonElement>(`[data-community-post-menu-toggle="${postId}"]`)
          : null;
        if (postToggle) {
          positionCommunityPostMenu(openPostMenu, postToggle);
        }
      }

      repositionOpenCommunityMemberRoleMenu(root);
    },
    { passive: true },
  );

  window.addEventListener("resize", () => repositionOpenCommunityMemberRoleMenu(root), {
    passive: true,
  });

  syncCommunityMediaEditorsUi(root);
}

export async function prefetchCommunities(): Promise<void> {
  if (getSessionUser()) {
    await ensureCommunitiesLoaded();
  }
}
