import type { CommunityBundle, CommunityType } from "../../api/communities";
import type { ComposerMediaItem, ProfilePost } from "../profile/types";
import type { CommunitiesState, CommunityFormStep } from "./types";

function createInitialFormState() {
  return {
    open: false,
    mode: "create" as const,
    step: 1 as const,
    communityId: null,
    isSaving: false,
    errorMessage: "",
    title: "",
    username: "",
    bio: "",
    type: "public" as const,
    avatarFile: null,
    avatarPreviewUrl: "",
    currentAvatarUrl: "",
    coverFile: null,
    coverPreviewUrl: "",
    currentCoverUrl: "",
  };
}

function createInitialPostComposerState() {
  return {
    open: false,
    mode: "create" as const,
    editingPostId: null,
    deleteConfirmPostId: null,
    isSaving: false,
    errorMessage: "",
    text: "",
    mediaItems: [] as ComposerMediaItem[],
  };
}

function createInitialState(): CommunitiesState {
  return {
    loaded: false,
    loading: false,
    errorMessage: "",
    query: "",
    items: [],
    activeCommunity: null,
    activePosts: [],
    pendingPost: {
      mode: "idle",
      postId: null,
    },
    form: createInitialFormState(),
    postComposer: createInitialPostComposerState(),
    deleteConfirmId: null,
    actionMenuId: null,
  };
}

export const communitiesState = createInitialState();

export function resetCommunitiesState(): void {
  revokeCommunityAvatarPreview();
  revokeCommunityCoverPreview();
  Object.assign(communitiesState, createInitialState());
}

export function resetCommunityFormState(): void {
  revokeCommunityAvatarPreview();
  revokeCommunityCoverPreview();
  communitiesState.form = createInitialFormState();
}

export function openCreateCommunityForm(): void {
  resetCommunityFormState();
  communitiesState.form.open = true;
}

export function openEditCommunityForm(bundle: CommunityBundle, step: CommunityFormStep = 1): void {
  resetCommunityFormState();
  communitiesState.form.open = true;
  communitiesState.form.mode = "edit";
  communitiesState.form.step = step;
  communitiesState.form.communityId = bundle.community.id;
  communitiesState.form.title = bundle.community.title;
  communitiesState.form.username = bundle.community.username;
  communitiesState.form.bio = bundle.community.bio;
  communitiesState.form.type = bundle.community.type;
  communitiesState.form.currentAvatarUrl = bundle.community.avatarUrl ?? "";
}

export function nextCommunityFormStep(): void {
  communitiesState.form.step = Math.min(5, communitiesState.form.step + 1) as CommunityFormStep;
}

export function prevCommunityFormStep(): void {
  communitiesState.form.step = Math.max(1, communitiesState.form.step - 1) as CommunityFormStep;
}

export function resetCommunityPostComposer(): void {
  communitiesState.postComposer = createInitialPostComposerState();
}

export function openCommunityPostComposer(): void {
  resetCommunityPostComposer();
  communitiesState.postComposer.open = true;
}

export function openEditCommunityPostComposer(postId: string): void {
  const post = communitiesState.activePosts.find((item) => item.id === postId);
  if (!post) return;

  resetCommunityPostComposer();
  communitiesState.postComposer.open = true;
  communitiesState.postComposer.mode = "edit";
  communitiesState.postComposer.editingPostId = post.id;
  communitiesState.postComposer.text = post.text;
  communitiesState.postComposer.mediaItems = post.media.map((item) => ({
    mediaID: item.mediaID,
    mediaURL: item.mediaURL,
    isUploaded: true,
  }));
}

export function removeCommunityComposerMediaItem(index: number): void {
  const items = communitiesState.postComposer.mediaItems;
  if (index < 0 || index >= items.length || communitiesState.postComposer.isSaving) return;
  items.splice(index, 1);
}

export function setActiveCommunity(bundle: CommunityBundle | null): void {
  communitiesState.activeCommunity = bundle;
}

export function setActivePosts(posts: ProfilePost[]): void {
  communitiesState.activePosts = posts;
}

export function setCommunities(items: CommunityBundle[]): void {
  communitiesState.items = items;
  communitiesState.loaded = true;
}

export function findCommunityById(id: string | number): CommunityBundle | null {
  const numericId = Number(id);
  return (
    communitiesState.items.find((item) => item.community.id === numericId) ??
    (communitiesState.activeCommunity?.community.id === numericId
      ? communitiesState.activeCommunity
      : null)
  );
}

export function getVisibleCommunities(): CommunityBundle[] {
  const query = communitiesState.query.trim().toLowerCase();
  if (!query) return communitiesState.items;

  return communitiesState.items.filter((item) =>
    [item.community.title, item.community.username, item.community.bio]
      .join(" ")
      .toLowerCase()
      .includes(query),
  );
}

export function revokeCommunityAvatarPreview(): void {
  if (communitiesState.form.avatarPreviewUrl.startsWith("blob:")) {
    URL.revokeObjectURL(communitiesState.form.avatarPreviewUrl);
  }
}

export function setCommunityAvatarFile(file: File): void {
  revokeCommunityAvatarPreview();
  communitiesState.form.avatarFile = file;
  communitiesState.form.avatarPreviewUrl = URL.createObjectURL(file);
}

export function revokeCommunityCoverPreview(): void {
  if (communitiesState.form.coverPreviewUrl.startsWith("blob:")) {
    URL.revokeObjectURL(communitiesState.form.coverPreviewUrl);
  }
}

export function setCommunityCoverFile(file: File): void {
  revokeCommunityCoverPreview();
  communitiesState.form.coverFile = file;
  communitiesState.form.coverPreviewUrl = URL.createObjectURL(file);
}

export function isCommunityType(value: string): value is CommunityType {
  return value === "public" || value === "private";
}
