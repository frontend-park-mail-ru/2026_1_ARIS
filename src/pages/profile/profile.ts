import { renderHeader } from "../../components/header/header";
import { renderSidebar } from "../../components/sidebar/sidebar";
import { getFeed, mapFeedResponse } from "../../api/feed";
import {
  getMyPosts,
  getPostsByProfileId,
  type PostMedia,
  type PostResponse,
} from "../../api/posts";
import {
  getFriends,
  getIncomingFriendRequests,
  getOutgoingFriendRequests,
  getUserFriends,
} from "../../api/friends";
import { getMyProfile, getProfileById } from "../../api/profile";
import { getSessionUser } from "../../state/session";

import type { ProfileParams, ProfileFriendState, ProfilePost } from "./types";
import {
  ownAvatarOverride,
  setOwnAvatarOverride,
  currentProfilePosts,
  setCurrentProfilePosts,
  readJsonStorage,
  writeJsonStorage,
  resolveOwnAvatarLink,
  normaliseAvatarLink,
  normalizeProfileId,
  resetPostComposerState,
  resetAvatarModalState,
  OWN_PROFILE_CACHE_KEY,
  OWN_PROFILE_POSTS_CACHE_KEY,
} from "./state";
import type { DisplayProfile } from "./types";
import { escapeHtml, hasVisibleValue, renderAvatar } from "./helpers";
import {
  createOwnProfileFromApi,
  createPublicProfileFromApi,
  resolveMockProfile,
} from "./builders";
import {
  syncAvatarModalUi,
  syncPostComposerUi,
  renderMissingProfileCard,
  renderAvatarModal,
  renderAvatarDeleteModal,
  renderPostComposerModal,
  renderPostDeleteModal,
  renderProfileFriendActions,
  renderDeleteFriendModal,
  renderFriends,
  renderProfilePosts,
  renderProfileEditor,
  renderSection,
  renderInfoRows,
  renderEducation,
  renderWork,
  renderPersonal,
} from "./render";
import { applyProfilePostFilters, bindProfileEvents, initProfilePostListLayout } from "./events";

type ProfileRoot = (Document | HTMLElement) & {
  __profileInteractionsBound?: boolean;
};

async function resolveProfileFriendState(profileId: string): Promise<ProfileFriendState> {
  try {
    const [friends, incoming, outgoing] = await Promise.all([
      getFriends("accepted"),
      getIncomingFriendRequests("pending"),
      getOutgoingFriendRequests("pending"),
    ]);

    const acceptedFriend = friends.find((friend) => friend.profileId === profileId);
    if (acceptedFriend) {
      return {
        relation: "friend",
        friendshipCreatedAt: acceptedFriend.createdAt,
      };
    }

    if (incoming.some((friend) => friend.profileId === profileId)) {
      return { relation: "incoming" };
    }

    if (outgoing.some((friend) => friend.profileId === profileId)) {
      return { relation: "outgoing" };
    }
  } catch (error) {
    console.error("[profile] source=api scope=friends failed id=%s", profileId, error);
  }

  return { relation: "none" };
}

async function enrichFriendsWithAvatarLinks(
  friends: Awaited<ReturnType<typeof getFriends>>,
): Promise<Awaited<ReturnType<typeof getFriends>>> {
  return Promise.all(
    friends.map(async (friend) => {
      if (friend.avatarLink) {
        return friend;
      }

      try {
        const profile = await getProfileById(friend.profileId);
        const avatarLink = normaliseAvatarLink(profile.imageLink);
        if (!avatarLink) {
          return friend;
        }

        return { ...friend, avatarLink };
      } catch {
        return friend;
      }
    }),
  );
}

async function resolveProfile(params: ProfileParams): Promise<DisplayProfile> {
  const sessionUser = getSessionUser();
  const requestedId = params.id ?? sessionUser?.id ?? "profile";
  const isOwnProfile = !params.id || params.id === sessionUser?.id;

  if (sessionUser && isOwnProfile) {
    try {
      const [profileData, rawFriends] = await Promise.all([getMyProfile(), getFriends("accepted")]);
      console.info("[profile] source=api scope=me id=%s", sessionUser.id, profileData);
      const profile = createOwnProfileFromApi(sessionUser.id, profileData);
      profile.friends = await enrichFriendsWithAvatarLinks(rawFriends);
      writeJsonStorage(OWN_PROFILE_CACHE_KEY, profile);
      return profile;
    } catch (error) {
      console.error("[profile] source=api scope=me failed id=%s", sessionUser.id, error);

      const cachedProfile = readJsonStorage<DisplayProfile>(OWN_PROFILE_CACHE_KEY);
      if (cachedProfile) {
        return {
          ...cachedProfile,
          avatarLink: resolveOwnAvatarLink(cachedProfile.avatarLink),
        };
      }
    }
  }

  if (!isOwnProfile) {
    try {
      const profileData = await getProfileById(requestedId);
      console.info("[profile] source=api scope=public id=%s", requestedId, profileData);
      const profile = createPublicProfileFromApi(requestedId, profileData);
      const [friends, friendState] = await Promise.all([
        getUserFriends(requestedId),
        resolveProfileFriendState(requestedId),
      ]);
      profile.friends = await enrichFriendsWithAvatarLinks(friends);
      profile.friendRelation = friendState.relation;
      profile.friendshipCreatedAt = friendState.friendshipCreatedAt;
      return profile;
    } catch (error) {
      console.error("[profile] source=api scope=public failed id=%s", requestedId, error);
    }
  }

  console.warn("[profile] source=fallback id=%s", requestedId);
  return resolveMockProfile(params);
}

function formatPostRelativeTime(iso?: string): string {
  if (!iso) return "";

  const createdAt = new Date(iso);
  if (Number.isNaN(createdAt.getTime())) {
    return "";
  }

  const diff = Date.now() - createdAt.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин назад`;
  if (hours < 24) return `${hours} ч назад`;
  if (days < 30) return `${days} д назад`;

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(createdAt);
}

function mapApiPostToProfilePost(post: PostResponse, profile: DisplayProfile): ProfilePost {
  const media = Array.isArray(post.media)
    ? post.media.filter(
        (item): item is PostMedia =>
          Boolean(item) &&
          typeof item.mediaID === "number" &&
          typeof item.mediaURL === "string" &&
          item.mediaURL.trim().length > 0,
      )
    : [];

  const images = Array.isArray(post.mediaURL)
    ? post.mediaURL.filter(Boolean)
    : media.map((item) => item.mediaURL);

  const nextPost: ProfilePost = {
    id: String(post.id),
    authorId: String(post.profileID ?? profile.id),
    authorFirstName: post.firstName ?? profile.firstName,
    authorLastName: post.lastName ?? profile.lastName,
    authorUsername: profile.username,
    authorAvatarLink: normaliseAvatarLink(post.avatarURL) ?? profile.avatarLink,
    isOwnPost: profile.isOwnProfile,
    text: typeof post.text === "string" ? post.text : "",
    time: formatPostRelativeTime(post.createdAt),
    timeRaw: post.createdAt ?? "",
    likes: 0,
    reposts: 0,
    comments: 0,
    media,
    images,
  };

  if (post.updatedAt) {
    nextPost.updatedAtRaw = post.updatedAt;
  }

  return nextPost;
}

function mapFeedPostToProfilePost(
  item: ReturnType<typeof mapFeedResponse>["items"][number],
): ProfilePost {
  return {
    id: item.id,
    authorId: item.authorId,
    authorFirstName: item.firstName,
    authorLastName: item.lastName,
    authorUsername: item.author,
    authorAvatarLink: normaliseAvatarLink(item.avatar),
    isOwnPost: false,
    text: item.text,
    time: item.time,
    timeRaw: item.timeRaw,
    likes: item.likes,
    reposts: item.reposts,
    comments: item.comments,
    media: [],
    images: item.images,
  };
}

async function resolveProfilePosts(profile: DisplayProfile): Promise<ProfilePost[]> {
  try {
    const posts = profile.isOwnProfile ? await getMyPosts() : await getPostsByProfileId(profile.id);
    const mappedPosts = posts.map((post) => mapApiPostToProfilePost(post, profile));

    if (profile.isOwnProfile) {
      writeJsonStorage(OWN_PROFILE_POSTS_CACHE_KEY, mappedPosts);
    }

    return mappedPosts;
  } catch (error) {
    console.error("[profile] source=api scope=posts failed id=%s", profile.id, error);

    if (profile.isOwnProfile) {
      const cachedPosts = readJsonStorage<ProfilePost[]>(OWN_PROFILE_POSTS_CACHE_KEY);
      if (Array.isArray(cachedPosts)) {
        return cachedPosts;
      }
    }

    return [];
  }
}

async function resolveAllPosts(): Promise<ProfilePost[]> {
  try {
    const [feedResult, friendsResult] = await Promise.all([
      getFeed({ limit: 100 }),
      getFriends("accepted"),
    ]);

    const friends = friendsResult.status === "fulfilled" ? friendsResult.value : [];
    const friendIds = new Set(friends.map((f) => String(f.profileId)));

    if (feedResult.status === "rejected") {
      throw feedResult.reason;
    }

    const mapped = mapFeedResponse(feedResult.value);
    const filteredItems = mapped.items.filter((item) => friendIds.has(String(item.authorId)));

    return filteredItems.map(mapFeedPostToProfilePost);
  } catch (error) {
    console.error("[profile] source=api scope=all-posts failed", error);
    return [];
  }
}

export async function renderProfile(params: ProfileParams = {}): Promise<string> {
  resetPostComposerState();
  resetAvatarModalState();
  setCurrentProfilePosts([]);

  const isAuthorised = getSessionUser() !== null;

  if (!isAuthorised) {
    return (await import("../feed/feed")).renderFeed();
  }

  const profile = await resolveProfile(params);
  if (profile.isMissingProfile) {
    return `
      <div class="app-page">
        ${renderHeader()}

        <main class="app-layout">
          <aside class="app-layout__left">
            ${renderSidebar({ isAuthorised })}
          </aside>

          <section class="app-layout__center">
            <section class="profile-page">
              ${renderMissingProfileCard(profile)}
            </section>
          </section>

          <aside class="app-layout__right">
            <div class="profile-right-rail"></div>
          </aside>
        </main>
      </div>
    `;
  }

  const [posts, allPosts] = await Promise.all([
    resolveProfilePosts(profile),
    profile.isOwnProfile ? resolveAllPosts() : Promise.resolve([]),
  ]);
  setCurrentProfilePosts(posts);

  const educationSection = renderSection("Образование", renderEducation(profile));
  const workSection = renderSection("Место работы", renderWork(profile));
  const personalSection = renderSection("Личная информация", renderPersonal(profile));
  const hasMoreSections = Boolean(
    educationSection.trim() || workSection.trim() || personalSection.trim(),
  );

  const profileInfoAction = profile.isOwnProfile
    ? `
        <button type="button" class="profile-section__action-button" data-profile-edit-toggle>
          редактировать
        </button>
      `
    : "";

  return `
    <div class="app-page">
      ${renderHeader()}

      <main class="app-layout">
        <aside class="app-layout__left">
          ${renderSidebar({ isAuthorised })}
        </aside>

        <section class="app-layout__center">
          <section class="profile-page">
            <article class="profile-card">
              <header class="profile-card__hero">
                <div class="profile-card__avatar-column">
                  ${
                    profile.isOwnProfile
                      ? `
                        <button
                          type="button"
                          class="profile-card__avatar-trigger"
                          data-profile-avatar-open
                          aria-label="Изменить аватар"
                        >
                          ${renderAvatar(profile, "profile-card__avatar")}
                        </button>
                      `
                      : renderAvatar(profile, "profile-card__avatar")
                  }
                </div>

                <div class="profile-card__hero-copy">
                  ${profile.isOwnProfile ? '<div class="profile-card__eyebrow">Мой профиль</div>' : ""}
                  <h1>${escapeHtml(`${profile.firstName} ${profile.lastName}`)}</h1>
                  ${hasVisibleValue(profile.status) ? `<p>${escapeHtml(profile.status)}</p>` : ""}
                  ${renderProfileFriendActions(profile)}
                </div>
              </header>

              <div class="profile-card__details">
                ${renderSection("Информация", renderInfoRows(profile), profileInfoAction)}

                ${
                  hasMoreSections
                    ? `
                      <div class="profile-card__more" hidden>
                        ${educationSection}
                        ${workSection}
                        ${personalSection}
                      </div>

                      <button type="button" class="profile-card__toggle" data-profile-toggle aria-expanded="false">
                        показать подробнее
                      </button>
                    `
                    : ""
                }
              </div>
            </article>

            ${renderProfileEditor(profile)}

            ${renderProfilePosts(profile, posts, allPosts)}
          </section>
        </section>

        <aside class="app-layout__right">
          <div class="profile-right-rail">
            ${renderFriends(profile)}
          </div>
        </aside>
      </main>

      ${renderDeleteFriendModal(profile)}
      ${renderAvatarModal(profile)}
      ${renderAvatarDeleteModal()}
      ${profile.isOwnProfile ? renderPostComposerModal() : ""}
      ${profile.isOwnProfile ? renderPostDeleteModal() : ""}
    </div>
  `;
}

export function initProfileToggle(root: Document | HTMLElement = document): void {
  const bindableRoot = root as ProfileRoot;

  if (bindableRoot.__profileInteractionsBound) {
    syncAvatarModalUi(root);
    syncPostComposerUi(root);
    applyProfilePostFilters(root);
    return;
  }

  bindProfileEvents(root);
  bindableRoot.__profileInteractionsBound = true;
  syncAvatarModalUi(root);
  syncPostComposerUi(root);
  applyProfilePostFilters(root);
  initProfilePostListLayout(root);
}

// Экспортируемый путь для resolveProfilePath — используется другими модулями.
export { normalizeProfileId };
export { ownAvatarOverride, setOwnAvatarOverride, currentProfilePosts };
