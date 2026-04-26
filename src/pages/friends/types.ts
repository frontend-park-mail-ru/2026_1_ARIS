import type { Friend } from "../../api/friends";

export type DisplayFriend = Friend & {
  educationLabel: string;
};

export type FriendsTab = "accepted" | "incoming" | "outgoing";

export type FriendsState = {
  loaded: boolean;
  loadedForUserId: string;
  loading: boolean;
  errorMessage: string;
  query: string;
  activeTab: FriendsTab;
  friends: DisplayFriend[];
  incoming: DisplayFriend[];
  outgoing: DisplayFriend[];
  deleteModalFriend: DisplayFriend | null;
};

export type FriendsData = {
  friends: DisplayFriend[];
  incoming: DisplayFriend[];
  outgoing: DisplayFriend[];
};

export const TAB_TITLES: Record<FriendsTab, string> = {
  accepted: "Все друзья",
  incoming: "Входящие заявки",
  outgoing: "Исходящие заявки",
};
