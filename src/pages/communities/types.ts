import type { CommunityBundle, CommunityMember, CommunityRole } from "../../api/communities";
import type { ComposerMediaItem, ProfilePost } from "../profile/types";

export type CommunitiesParams = {
  id?: string;
};

export type CommunityFormMode = "create" | "edit";
export type CommunityFormStep = 1 | 2 | 3 | 4;
export type CommunityPostFeedMode = "all" | "official";
export type CommunityPostAuthorMode = "community" | "member";

export type CommunityMediaEditorKind = "avatar" | "cover";

export type CommunityMediaEditorState = {
  objectUrl: string | null;
  fileName: string;
  naturalWidth: number;
  naturalHeight: number;
  scale: number;
  minScale: number;
  rotation: 0 | 90 | 180 | 270;
  offsetX: number;
  offsetY: number;
  dragPointerId: number | null;
  dragStartX: number;
  dragStartY: number;
  dragStartOffsetX: number;
  dragStartOffsetY: number;
  dirty: boolean;
  removed: boolean;
  loading: boolean;
  errorMessage: string;
};

export type CommunityFormState = {
  open: boolean;
  mode: CommunityFormMode;
  step: CommunityFormStep;
  communityId: number | null;
  isSaving: boolean;
  errorMessage: string;
  title: string;
  username: string;
  bio: string;
  type: "public" | "private";
  currentAvatarUrl: string;
  currentCoverUrl: string;
  avatarEditor: CommunityMediaEditorState;
  coverEditor: CommunityMediaEditorState;
};

export type CommunityPostComposerState = {
  open: boolean;
  mode: "create" | "edit";
  authorMode: CommunityPostAuthorMode;
  editingPostId: string | null;
  deleteConfirmPostId: string | null;
  isSaving: boolean;
  errorMessage: string;
  text: string;
  mediaItems: ComposerMediaItem[];
};

export type CommunityPendingPostState = {
  mode: "idle" | "create" | "edit" | "delete";
  postId: string | null;
};

export type MemberConfirmAction =
  | { type: "remove"; profileId: number }
  | { type: "role"; profileId: number; newRole: CommunityRole };

export type CommunityMembersManagerState = {
  open: boolean;
  loading: boolean;
  errorMessage: string;
  query: string;
  includeBlocked: boolean;
  changingRoleProfileId: number | null;
  removingProfileId: number | null;
  confirmAction: MemberConfirmAction | null;
};

export type CommunityMemberRoleOption = Exclude<CommunityRole, "owner"> | "owner";

export type CommunitiesState = {
  loaded: boolean;
  loading: boolean;
  errorMessage: string;
  query: string;
  items: CommunityBundle[];
  activeCommunity: CommunityBundle | null;
  activeMembers: CommunityMember[];
  membersLoaded: boolean;
  membersLoading: boolean;
  viewerProfileId: number | null;
  activePosts: ProfilePost[];
  postFeedMode: CommunityPostFeedMode;
  pendingPost: CommunityPendingPostState;
  form: CommunityFormState;
  postComposer: CommunityPostComposerState;
  membersManager: CommunityMembersManagerState;
  membershipLoading: boolean;
  deleteConfirmId: number | null;
  leaveConfirmId: number | null;
  actionMenuId: number | null;
};
