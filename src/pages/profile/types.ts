import type { PostMedia } from "../../api/posts";
import type { Friend } from "../../api/friends";

export type ProfileParams = {
  id?: string;
};

export type ProfileFriendRelation = "friend" | "incoming" | "outgoing" | "none";

export type EditableProfileFields = {
  firstName: string;
  lastName: string;
  bio: string;
  gender: "male" | "female" | "";
  birthdayDate: string;
  nativeTown: string;
  town: string;
  phone: string;
  email: string;
  interests: string;
  favMusic: string;
  institution: string;
  group: string;
  company: string;
  jobTitle: string;
};

export type ProfileFieldErrorMap = Partial<Record<keyof EditableProfileFields, string>>;

export type DisplayProfile = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  status: string;
  city: string;
  nativeTown: string;
  phone: string;
  email: string;
  birthday: string;
  gender: string;
  interests: string;
  favoriteMusic: string;
  workCompany: string;
  workRole: string;
  education: Array<{
    place: string;
    subtitle: string;
  }>;
  friends: Friend[];
  isOwnProfile: boolean;
  isApiBacked: boolean;
  avatarLink: string | undefined;
  friendRelation: ProfileFriendRelation;
  friendshipCreatedAt?: string | undefined;
  isMissingProfile: boolean;
  editable: EditableProfileFields;
};

export type ProfileFriendState = {
  relation: ProfileFriendRelation;
  friendshipCreatedAt?: string | undefined;
};

export type ProfilePost = {
  id: string;
  authorId: string;
  authorFirstName: string;
  authorLastName: string;
  authorUsername: string;
  authorAvatarLink?: string;
  isOwnPost: boolean;
  text: string;
  time: string;
  timeRaw: string;
  updatedAtRaw?: string;
  likes: number;
  reposts: number;
  comments: number;
  media: PostMedia[];
  images: string[];
};

export type ComposerMediaItem = {
  mediaID?: number;
  mediaURL: string;
  file?: File;
  isUploaded: boolean;
};

export type PostComposerState = {
  open: boolean;
  mode: "create" | "edit";
  editingPostId: string | null;
  deleteConfirmPostId: string | null;
  isSaving: boolean;
  errorMessage: string;
  text: string;
  mediaItems: ComposerMediaItem[];
};

export type AvatarModalState = {
  open: boolean;
  deleteConfirmOpen: boolean;
  isSaving: boolean;
  errorMessage: string;
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
};
