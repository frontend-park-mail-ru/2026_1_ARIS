import type { PostcardModel } from "../../api/feed";

export type FeedMode = "by-time" | "for-you";
export type FeedAuthKey = "guest" | "authorised";

export type FeedItemsCache = Record<FeedAuthKey, Record<FeedMode, PostcardModel[] | null>>;

export type FeedCenterResult =
  | { kind: "items"; items: PostcardModel[] }
  | { kind: "html"; html: string };

export type ActiveFeedState = {
  items: PostcardModel[];
  renderedCount: number;
  isLoadingMore: boolean;
};
