import type { CommunityBundle, CommunityMember, CommunityType } from "../../api/communities";
import type { ComposerMediaItem, ProfilePost } from "../profile/types";
import type {
  CommunityMediaEditorKind,
  CommunityMediaEditorState,
  CommunitiesState,
  CommunityFormStep,
  CommunityPostAuthorMode,
  CommunityPostFeedMode,
} from "./types";

function createInitialMediaEditorState(): CommunityMediaEditorState {
  return {
    objectUrl: null,
    fileName: "",
    naturalWidth: 0,
    naturalHeight: 0,
    scale: 1,
    minScale: 1,
    rotation: 0,
    offsetX: 0,
    offsetY: 0,
    dragPointerId: null,
    dragStartX: 0,
    dragStartY: 0,
    dragStartOffsetX: 0,
    dragStartOffsetY: 0,
    dirty: false,
    removed: false,
    loading: false,
    errorMessage: "",
  };
}

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
    currentAvatarUrl: "",
    currentCoverUrl: "",
    avatarEditor: createInitialMediaEditorState(),
    coverEditor: createInitialMediaEditorState(),
  };
}

function createInitialPostComposerState() {
  return {
    open: false,
    mode: "create" as const,
    authorMode: "community" as CommunityPostAuthorMode,
    editingPostId: null,
    deleteConfirmPostId: null,
    isSaving: false,
    errorMessage: "",
    text: "",
    mediaItems: [] as ComposerMediaItem[],
  };
}

function createInitialMembersManagerState() {
  return {
    open: false,
    loading: false,
    errorMessage: "",
    query: "",
    includeBlocked: false,
    changingRoleProfileId: null,
    removingProfileId: null,
    confirmAction: null,
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
    activeMembers: [],
    membersLoaded: false,
    membersLoading: false,
    viewerProfileId: null,
    activePosts: [],
    postFeedMode: "all" as CommunityPostFeedMode,
    pendingPost: {
      mode: "idle",
      postId: null,
    },
    form: createInitialFormState(),
    postComposer: createInitialPostComposerState(),
    membersManager: createInitialMembersManagerState(),
    membershipLoading: false,
    deleteConfirmId: null,
    leaveConfirmId: null,
    actionMenuId: null,
  };
}

export const communitiesState = createInitialState();

export function resetCommunitiesState(): void {
  resetCommunityMediaEditorState("avatar");
  resetCommunityMediaEditorState("cover");
  Object.assign(communitiesState, createInitialState());
}

export function resetCommunityFormState(): void {
  resetCommunityMediaEditorState("avatar");
  resetCommunityMediaEditorState("cover");
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
  communitiesState.form.bio = bundle.community.bio ?? "";
  communitiesState.form.type = bundle.community.type;
  communitiesState.form.currentAvatarUrl = bundle.community.avatarUrl ?? "";
  communitiesState.form.currentCoverUrl = bundle.community.coverUrl ?? "";
}

export function nextCommunityFormStep(): void {
  communitiesState.form.step = Math.min(4, communitiesState.form.step + 1) as CommunityFormStep;
}

export function prevCommunityFormStep(): void {
  communitiesState.form.step = Math.max(1, communitiesState.form.step - 1) as CommunityFormStep;
}

export function resetCommunityPostComposer(): void {
  communitiesState.postComposer = createInitialPostComposerState();
}

export function openCommunityPostComposer(authorMode: CommunityPostAuthorMode): void {
  resetCommunityPostComposer();
  communitiesState.postComposer.open = true;
  communitiesState.postComposer.authorMode = authorMode;
}

export function openEditCommunityPostComposer(
  postId: string,
  authorMode: CommunityPostAuthorMode,
): void {
  const post = communitiesState.activePosts.find((item) => item.id === postId);
  if (!post) return;

  resetCommunityPostComposer();
  communitiesState.postComposer.open = true;
  communitiesState.postComposer.mode = "edit";
  communitiesState.postComposer.authorMode = authorMode;
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

export function setActiveMembers(members: CommunityMember[]): void {
  communitiesState.activeMembers = members;
  communitiesState.membersLoaded = true;
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
  const memberItems = communitiesState.items.filter((item) => item.membership.isMember);

  if (!query) return memberItems;

  return memberItems.filter((item) =>
    [item.community.title, item.community.username, item.community.bio ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(query),
  );
}

export function getVisibleCommunityMembers(): CommunityMember[] {
  const query = communitiesState.membersManager.query.trim().toLowerCase();
  if (!query) {
    return communitiesState.activeMembers;
  }

  return communitiesState.activeMembers.filter((member) =>
    [member.firstName, member.lastName, member.username].join(" ").toLowerCase().includes(query),
  );
}

export function getCommunityMediaEditor(kind: CommunityMediaEditorKind): CommunityMediaEditorState {
  return kind === "avatar" ? communitiesState.form.avatarEditor : communitiesState.form.coverEditor;
}

function revokeCommunityMediaObjectUrl(editor: CommunityMediaEditorState): void {
  if (editor.objectUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(editor.objectUrl);
  }
}

export function resetCommunityMediaEditorState(kind: CommunityMediaEditorKind): void {
  const editor = getCommunityMediaEditor(kind);
  revokeCommunityMediaObjectUrl(editor);
  editor.objectUrl = null;
  editor.fileName = "";
  editor.naturalWidth = 0;
  editor.naturalHeight = 0;
  editor.scale = 1;
  editor.minScale = 1;
  editor.rotation = 0;
  editor.offsetX = 0;
  editor.offsetY = 0;
  editor.dragPointerId = null;
  editor.dragStartX = 0;
  editor.dragStartY = 0;
  editor.dragStartOffsetX = 0;
  editor.dragStartOffsetY = 0;
  editor.dirty = false;
  editor.removed = false;
  editor.loading = false;
  editor.errorMessage = "";
}

export function clearCommunityMediaDraft(kind: CommunityMediaEditorKind): void {
  const editor = getCommunityMediaEditor(kind);
  resetCommunityMediaEditorState(kind);
  editor.errorMessage = "";
}

export function isCommunityType(value: string): value is CommunityType {
  return value === "public" || value === "private";
}
