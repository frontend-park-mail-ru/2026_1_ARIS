export const sessionUser = {
  id: "1",
  firstName: "Мария",
  lastName: "Соколова",
  login: "maria",
  email: "maria@example.com",
  role: "user",
};

export const profileMe = {
  profileId: 1,
  userAccountId: 1,
  firstName: "Мария",
  lastName: "Соколова",
  bio: "QA-инженер ARIS",
  gender: "female",
  birthdayDate: "2000-05-04",
  birthday: "2000-05-04",
  nativeTown: "Тверь",
  town: "Москва",
  phone: "+79990000000",
  email: "maria@example.com",
  education: [{ institution: "МГТУ", grade: "ФИВТ" }],
  work: [{ company: "ARIS", jobTitle: "Frontend QA" }],
  interests: "Автотесты, интерфейсы",
  favMusic: "Synthwave",
};

export const friends = {
  accepted: [
    {
      id: 2,
      firstName: "Аня",
      lastName: "Орлова",
      username: "anya",
      status: "accepted",
      createdAt: "2026-04-01T10:00:00.000Z",
    },
    {
      id: 3,
      firstName: "Илья",
      lastName: "Петров",
      username: "ilya",
      status: "accepted",
      createdAt: "2026-04-03T10:00:00.000Z",
    },
  ],
  incoming: [
    {
      id: 4,
      firstName: "Олег",
      lastName: "Заявкин",
      username: "oleg",
      status: "pending",
      createdAt: "2026-04-08T10:00:00.000Z",
    },
  ],
  outgoing: [
    {
      id: 5,
      firstName: "Нина",
      lastName: "Ответная",
      username: "nina",
      status: "pending",
      createdAt: "2026-04-09T10:00:00.000Z",
    },
  ],
};

export const publicFeed = {
  posts: [
    {
      id: 101,
      author: {
        id: "10",
        username: "aris_team",
        firstName: "Команда",
        lastName: "ARIS",
      },
      text: "Публичная лента ARISNET доступна без регистрации.",
      createdAt: "2026-05-04T09:00:00.000Z",
      likes: 7,
      isLiked: false,
      comments: 2,
      reposts: 1,
      medias: [],
    },
  ],
  hasMore: false,
  nextCursor: "",
};

export const authorisedFeed = {
  posts: [
    {
      id: 201,
      author: {
        id: "2",
        username: "anya",
        firstName: "Аня",
        lastName: "Орлова",
      },
      text: "Пост друга в авторизованной ленте.",
      createdAt: "2026-05-04T08:00:00.000Z",
      likes: 2,
      isLiked: false,
      comments: 1,
      reposts: 0,
      medias: [],
    },
    {
      id: 202,
      author: {
        id: "999",
        username: "stranger",
        firstName: "Чужой",
        lastName: "Пользователь",
      },
      text: "Этот пост не должен попасть в ленту друзей.",
      createdAt: "2026-05-04T07:00:00.000Z",
      likes: 1,
      isLiked: false,
      comments: 0,
      reposts: 0,
      medias: [],
    },
  ],
  hasMore: false,
  nextCursor: "",
};

export const suggestedUsers = {
  items: [
    {
      id: "6",
      username: "ivan",
      firstName: "Иван",
      lastName: "Кузнецов",
    },
  ],
};

export const profilePosts = {
  posts: [
    {
      id: 301,
      profileID: 1,
      firstName: "Мария",
      lastName: "Соколова",
      text: "Первый пост профиля.",
      createdAt: "2026-05-04T06:00:00.000Z",
      likes: 4,
      isLiked: false,
    },
  ],
};

export const communityBundle = {
  community: {
    id: 10,
    uid: "club",
    profileId: 100,
    username: "boardgames",
    title: "Клуб настольных игр",
    bio: "Играем и обсуждаем новинки.",
    type: "public",
    isActive: true,
    createdAt: "2026-04-01T10:00:00.000Z",
    updatedAt: "2026-04-20T10:00:00.000Z",
  },
  membership: {
    isMember: true,
    role: "owner",
    blocked: false,
  },
  permissions: {
    canEditCommunity: true,
    canDeleteCommunity: true,
    canPost: true,
    canPostAsCommunity: true,
    canPostAsMember: true,
    canManageMembers: true,
    canChangeRoles: true,
  },
};

export const publicCommunityBundle = {
  community: {
    id: 11,
    uid: "music",
    profileId: 101,
    username: "music",
    title: "Музыкальный клуб",
    bio: "Плейлисты недели.",
    type: "public",
    isActive: true,
    createdAt: "2026-04-02T10:00:00.000Z",
    updatedAt: "2026-04-20T10:00:00.000Z",
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

export const communityMembers = {
  items: [
    {
      profileId: 1,
      userAccountId: 1,
      firstName: "Мария",
      lastName: "Соколова",
      username: "maria",
      role: "owner",
      blocked: false,
      isSelf: true,
      joinedAt: "2026-04-01T10:00:00.000Z",
    },
    {
      profileId: 2,
      userAccountId: 2,
      firstName: "Аня",
      lastName: "Орлова",
      username: "anya",
      role: "member",
      blocked: false,
      isSelf: false,
      joinedAt: "2026-04-02T10:00:00.000Z",
    },
  ],
};

export const communityPosts = {
  posts: [
    {
      id: 401,
      profileID: 100,
      communityId: 10,
      firstName: "Клуб",
      lastName: "Настольных игр",
      text: "Официальный анонс встречи.",
      createdAt: "2026-05-04T05:00:00.000Z",
      likes: 5,
      isLiked: false,
    },
  ],
};

export const chats = [
  {
    id: "chat-2",
    title: "Аня Орлова",
    updatedAt: "2026-05-04T09:30:00.000Z",
    createdAt: "2026-05-01T10:00:00.000Z",
  },
  {
    id: "chat-3",
    title: "Илья Петров",
    updatedAt: "2026-05-03T09:30:00.000Z",
    createdAt: "2026-05-01T10:00:00.000Z",
  },
];

export const chatMessages = [
  {
    id: "msg-1",
    text: "Привет, как дела?",
    authorName: "Аня Орлова",
    authorId: "2",
    createdAt: "2026-05-04T09:00:00.000Z",
  },
  {
    id: "msg-2",
    text: "Готовлю Cypress тесты.",
    authorName: "Мария Соколова",
    authorId: "1",
    createdAt: "2026-05-04T09:05:00.000Z",
  },
];

export const supportTicket = {
  id: "501",
  uid: "SUP-501",
  category: "bug",
  title: "Ошибка в профиле",
  description: "Не сохраняется поле города в профиле.",
  status: "open",
  line: 1,
  media: [],
  createdAt: "2026-05-04T07:00:00.000Z",
};
