import {
  authorisedFeed,
  chatMessages,
  chats,
  communityBundle,
  communityMembers,
  communityPosts,
  friends,
  profileMe,
  profilePosts,
  publicCommunityBundle,
  publicFeed,
  sessionUser,
  suggestedUsers,
  supportTicket,
} from "./data";

const sessionStorageKey = "arisfront:session-user";

type VisitAppOptions = {
  authenticated?: boolean;
  path?: string;
};

function apiPattern(path: string): string {
  return `**${path}`;
}

function profileByIdResponse(profileId: string) {
  const accepted = friends.accepted.find((friend) => String(friend.id) === profileId);
  const incoming = friends.incoming.find((friend) => String(friend.id) === profileId);
  const outgoing = friends.outgoing.find((friend) => String(friend.id) === profileId);
  const friend = accepted ?? incoming ?? outgoing;

  if (!friend) {
    return {
      profileId: Number(profileId),
      userAccountId: Number(profileId),
      firstName: "Пользователь",
      lastName: profileId,
      username: `user${profileId}`,
      bio: "Профиль пользователя ARISNET",
      town: "Москва",
      education: [],
      work: [],
    };
  }

  return {
    profileId: Number(friend.id),
    userAccountId: Number(friend.id),
    firstName: friend.firstName,
    lastName: friend.lastName,
    username: friend.username,
    bio: `Профиль ${friend.firstName}`,
    town: "Москва",
    education: [{ institution: "МГУ", grade: "Бакалавриат" }],
    work: [],
  };
}

Cypress.Commands.add("mockGuestApi", () => {
  cy.intercept("GET", apiPattern("/api/public/feed*"), {
    body: publicFeed,
  }).as("publicFeed");
  cy.intercept("GET", apiPattern("/api/public/popular-users"), {
    body: suggestedUsers,
  }).as("popularUsers");
});

Cypress.Commands.add("mockAuthApi", () => {
  cy.intercept("GET", apiPattern("/api/auth/me"), {
    body: sessionUser,
  }).as("authMe");
  cy.intercept("POST", apiPattern("/api/auth/logout"), {
    body: {},
  }).as("logout");
  cy.intercept("GET", apiPattern("/api/profile/me*"), {
    body: profileMe,
  }).as("profileMe");
  cy.intercept("GET", /\/api\/profile\/(?!me\b)[^/?]+\?/, (req) => {
    const match = req.url.match(/\/api\/profile\/([^/?]+)/);
    req.reply({ body: profileByIdResponse(decodeURIComponent(match?.[1] ?? "0")) });
  }).as("profileById");
  cy.intercept("GET", apiPattern("/api/settings/"), {
    body: { userAccountID: 1, language: "RU", theme: "light" },
  }).as("settings");
  cy.intercept("POST", apiPattern("/api/settings/"), (req) => {
    req.reply({
      body: {
        userAccountID: 1,
        language: req.body?.language ?? "RU",
        theme: req.body?.theme ?? "light",
      },
    });
  }).as("saveSettings");

  cy.intercept("GET", apiPattern("/api/feed*"), {
    body: authorisedFeed,
  }).as("feed");
  cy.intercept("GET", apiPattern("/api/users/suggested"), {
    body: suggestedUsers,
  }).as("suggestedUsers");
  cy.intercept("GET", apiPattern("/api/public/popular-users"), {
    body: suggestedUsers,
  }).as("popularUsers");
  cy.intercept("GET", apiPattern("/api/users/latest-events"), {
    body: { items: [] },
  }).as("latestEvents");

  cy.mockFriendsApi();
});

Cypress.Commands.add("mockFriendsApi", () => {
  cy.intercept("GET", apiPattern("/api/friends/accepted"), {
    body: { friends: friends.accepted },
  }).as("friendsAccepted");
  cy.intercept("GET", apiPattern("/api/friends/requests/incoming/pending"), {
    body: { friends: friends.incoming },
  }).as("friendsIncoming");
  cy.intercept("GET", apiPattern("/api/friends/requests/outgoing/pending"), {
    body: { friends: friends.outgoing },
  }).as("friendsOutgoing");
  cy.intercept("GET", apiPattern("/api/users/*/friends"), {
    body: { friends: friends.accepted },
  }).as("userFriends");
});

Cypress.Commands.add("mockProfileApi", () => {
  cy.intercept("GET", apiPattern("/api/post/me*"), {
    body: profilePosts,
  }).as("myPosts");
  cy.intercept("GET", apiPattern("/api/post/profile/*"), {
    body: profilePosts,
  }).as("profilePosts");
  cy.intercept("GET", apiPattern("/api/post/301"), {
    body: profilePosts.posts[0],
  }).as("post301");
  cy.intercept("POST", apiPattern("/api/post/upload"), {
    body: {
      id: 302,
      profileID: 1,
      firstName: "Мария",
      lastName: "Соколова",
      text: "Новый пост из Cypress.",
      createdAt: "2026-05-04T10:00:00.000Z",
      likes: 0,
      isLiked: false,
    },
  }).as("createPost");
  cy.intercept("PATCH", apiPattern("/api/post/301"), {
    body: {
      ...profilePosts.posts[0],
      text: "Отредактированный пост профиля.",
      updatedAt: "2026-05-04T10:05:00.000Z",
    },
  }).as("updatePost");
  cy.intercept("DELETE", apiPattern("/api/post/301"), {
    body: null,
  }).as("deletePost");
  cy.intercept("POST", apiPattern("/api/post/301/likes"), {
    body: { ...profilePosts.posts[0], likes: 5, isLiked: true },
  }).as("likeProfilePost");
});

Cypress.Commands.add("mockCommunitiesApi", () => {
  cy.intercept("GET", apiPattern("/api/communities?*"), {
    body: { items: [communityBundle, publicCommunityBundle] },
  }).as("communities");
  cy.intercept("GET", apiPattern("/api/communities/10?*"), {
    body: communityBundle,
  }).as("communityDetail");
  cy.intercept("GET", apiPattern("/api/communities/11?*"), {
    body: publicCommunityBundle,
  }).as("publicCommunityDetail");
  cy.intercept("GET", apiPattern("/api/communities/77?*"), {
    body: {
      ...communityBundle,
      community: {
        ...communityBundle.community,
        id: 77,
        profileId: 177,
        username: "cypress-club",
        title: "Cypress клуб",
        bio: "Сообщество создано из e2e.",
      },
    },
  }).as("createdCommunityDetail");
  cy.intercept("GET", apiPattern("/api/communities/*/members*"), {
    body: communityMembers,
  }).as("communityMembers");
  cy.intercept("GET", apiPattern("/api/post/community/10?*"), {
    body: communityPosts,
  }).as("communityPosts");
  cy.intercept("GET", apiPattern("/api/post/community/10/official*"), {
    body: communityPosts,
  }).as("officialCommunityPosts");
  cy.intercept("GET", apiPattern("/api/post/community/77*"), {
    body: { posts: [] },
  }).as("createdCommunityPosts");
  cy.intercept("POST", apiPattern("/api/communities"), {
    body: {
      ...communityBundle,
      community: {
        ...communityBundle.community,
        id: 77,
        profileId: 177,
        username: "cypress-club",
        title: "Cypress клуб",
        bio: "Сообщество создано из e2e.",
      },
    },
  }).as("createCommunity");
  cy.intercept("POST", apiPattern("/api/communities/11/join"), {
    body: communityMembers.items[0],
  }).as("joinCommunity");
  cy.intercept("POST", apiPattern("/api/post/upload"), {
    body: {
      id: 402,
      profileID: 100,
      communityId: 10,
      firstName: "Клуб",
      lastName: "Настольных игр",
      text: "Пост сообщества из Cypress.",
      createdAt: "2026-05-04T10:10:00.000Z",
      likes: 0,
      isLiked: false,
    },
  }).as("createCommunityPost");
  cy.intercept("POST", apiPattern("/api/post/401/likes"), {
    body: { ...communityPosts.posts[0], likes: 6, isLiked: true },
  }).as("likeCommunityPost");
});

Cypress.Commands.add("mockChatsApi", () => {
  cy.intercept("GET", apiPattern("/api/chats"), {
    body: chats,
  }).as("chats");
  cy.intercept("GET", apiPattern("/api/chats/*/messages"), {
    body: chatMessages,
  }).as("chatMessages");
  cy.intercept("POST", apiPattern("/api/chats/chat-2/messages"), {
    body: {
      id: "msg-3",
      text: "Сообщение из Cypress",
      authorName: "Мария Соколова",
      authorId: "1",
      createdAt: "2026-05-04T10:20:00.000Z",
    },
  }).as("sendChatMessage");
  cy.intercept("POST", apiPattern("/api/chats?otherUserId=*"), {
    body: chats[0],
  }).as("createPrivateChat");
});

Cypress.Commands.add("mockSupportApi", () => {
  cy.intercept("POST", apiPattern("/api/support/tickets"), {
    body: supportTicket,
  }).as("createTicket");
  cy.intercept("GET", apiPattern("/api/support/tickets/my"), {
    body: { tickets: [supportTicket] },
  }).as("myTickets");
  cy.intercept("GET", apiPattern("/api/support/tickets/501"), {
    body: supportTicket,
  }).as("ticketDetails");
  cy.intercept("GET", apiPattern("/api/support/tickets/501/messages"), {
    body: {
      messages: [
        {
          id: "m-501",
          ticketId: "501",
          text: "Мы уже смотрим проблему.",
          authorId: "9",
          authorName: "Поддержка",
          authorRole: "support_l1",
          createdAt: "2026-05-04T08:00:00.000Z",
        },
      ],
    },
  }).as("ticketMessages");
  cy.intercept("POST", apiPattern("/api/support/tickets/501/messages"), {
    body: {
      id: "m-502",
      ticketId: "501",
      text: "Спасибо за ответ.",
      authorId: "1",
      authorName: "Мария Соколова",
      authorRole: "user",
      createdAt: "2026-05-04T10:30:00.000Z",
    },
  }).as("sendTicketMessage");
});

Cypress.Commands.add("visitApp", (pathOrOptions?: string | VisitAppOptions) => {
  const options =
    typeof pathOrOptions === "string" ? { path: pathOrOptions } : (pathOrOptions ?? {});
  const path = options.path ?? "/";

  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem("arisfront:language", "RU");
      win.localStorage.setItem("arisfront:theme", "light");
      win.localStorage.setItem("feedMode", "by-time");

      if (options.authenticated) {
        win.localStorage.setItem(sessionStorageKey, JSON.stringify(sessionUser));
      } else {
        win.localStorage.removeItem(sessionStorageKey);
      }
    },
  });

  cy.window().its("__ARIS_APP_READY__").should("eq", true);
});

declare global {
  namespace Cypress {
    interface Chainable {
      mockAuthApi(): Chainable<void>;
      mockChatsApi(): Chainable<void>;
      mockCommunitiesApi(): Chainable<void>;
      mockFriendsApi(): Chainable<void>;
      mockGuestApi(): Chainable<void>;
      mockProfileApi(): Chainable<void>;
      mockSupportApi(): Chainable<void>;
      visitApp(pathOrOptions?: string | VisitAppOptions): Chainable<void>;
    }
  }
}

export {};
