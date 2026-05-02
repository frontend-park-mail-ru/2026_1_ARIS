import type { CommunityBundle } from "../../api/communities";
import type { ComposerMediaItem, ProfilePost } from "../profile/types";

export type CommunitiesParams = {
  id?: string;
};

export type CommunityFormMode = "create" | "edit";
export type CommunityFormStep = 1 | 2 | 3 | 4 | 5;

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
  avatarFile: File | null;
  avatarPreviewUrl: string;
  currentAvatarUrl: string;
  coverFile: File | null;
  coverPreviewUrl: string;
  currentCoverUrl: string;
};

export type CommunityPostComposerState = {
  open: boolean;
  mode: "create" | "edit";
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

export type CommunitiesState = {
  loaded: boolean;
  loading: boolean;
  errorMessage: string;
  query: string;
  items: CommunityBundle[];
  activeCommunity: CommunityBundle | null;
  activePosts: ProfilePost[];
  pendingPost: CommunityPendingPostState;
  form: CommunityFormState;
  postComposer: CommunityPostComposerState;
  deleteConfirmId: number | null;
  actionMenuId: number | null;
};
