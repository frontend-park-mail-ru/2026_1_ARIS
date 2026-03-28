import { renderHeader } from "../../components/header/header";
import { renderSidebar } from "../../components/sidebar/sidebar";
import { renderPostcard } from "../../components/postcard/postcard";
import { getSessionUser } from "../../state/session";
import { renderFeed } from "../feed/feed";
import { getProfileRecordById, PROFILE_RECORDS, type ProfileRecord } from "./profile-data";

type ProfileParams = {
  id?: string;
};

type ProfileRoot = (Document | HTMLElement) & {
  __profileToggleBound?: boolean;
};

type DisplayProfile = ProfileRecord & {
  isOwnProfile: boolean;
};

type ProfilePost = {
  id: string;
  text: string;
  time: string;
  likes: number;
  reposts: number;
  comments: number;
};

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function formatNamePart(value: string): string {
  if (!value) return "";

  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function getFallbackIdentity(profileId: string): {
  firstName: string;
  lastName: string;
  username: string;
} {
  const rawParts = profileId
    .split(/[-_]/)
    .map((part) => part.trim())
    .filter(Boolean);

  const firstName = formatNamePart(rawParts[0] ?? "Новый");
  const lastName = formatNamePart(rawParts[1] ?? "пользователь");

  return {
    firstName,
    lastName,
    username: profileId,
  };
}

function withOptionalAvatar(value: ProfileRecord, avatarLink?: string): ProfileRecord {
  if (!avatarLink) {
    return value;
  }

  return {
    ...value,
    avatarLink,
  };
}

function createFallbackProfile(profileId: string, useSessionIdentity = false): ProfileRecord {
  const sessionUser = getSessionUser();
  const generatedIdentity = getFallbackIdentity(profileId);
  const firstName =
    useSessionIdentity && sessionUser?.firstName
      ? sessionUser.firstName
      : generatedIdentity.firstName;
  const lastName =
    useSessionIdentity && sessionUser?.lastName ? sessionUser.lastName : generatedIdentity.lastName;
  const username =
    useSessionIdentity && sessionUser?.id ? sessionUser.id : generatedIdentity.username;

  return withOptionalAvatar(
    {
      id: profileId,
      firstName,
      lastName,
      username,
      status: "Собираю профиль по частям, но уже открыт для общения и новых знакомств.",
      city: useSessionIdentity ? "Не указано" : "Москва",
      phone: useSessionIdentity ? "Не указано" : "+7 999 123-45-67",
      email: useSessionIdentity ? "Не указано" : `${username}@arisnet.dev`,
      birthday: useSessionIdentity ? "Не указано" : "12 марта 2001",
      gender: useSessionIdentity ? "Не указано" : "не указано",
      interests: "Технологии, дизайн продуктов, цифровые сообщества",
      favoriteMusic: "The xx, ODESZA, Kedr Livanskiy",
      favoriteMovies: "Интерстеллар, Социальная сеть, Она",
      workCompany: useSessionIdentity ? "ARISNET" : "ARISNET Community",
      workRole: useSessionIdentity ? "Участник сообщества" : "Участник сообщества",
      education: [
        {
          place: useSessionIdentity ? "Информация появится позже" : "МГТУ им. Н.Э. Баумана '24",
          subtitle: useSessionIdentity
            ? "Профиль еще заполняется"
            : "Информационные системы и технологии",
        },
      ],
      friends: [],
    },
    sessionUser?.avatarLink,
  );
}

function resolveProfile(params: ProfileParams): DisplayProfile {
  const sessionUser = getSessionUser();
  const profileId = params.id ?? sessionUser?.id ?? PROFILE_RECORDS[0]?.id ?? "profile";
  const ownProfileFallback =
    sessionUser && !params.id
      ? withOptionalAvatar(
          {
            ...createFallbackProfile(profileId, true),
            id: sessionUser.id,
            firstName: sessionUser.firstName,
            lastName: sessionUser.lastName,
          },
          sessionUser.avatarLink,
        )
      : null;
  const profile =
    getProfileRecordById(profileId) ??
    ownProfileFallback ??
    createFallbackProfile(profileId, false);
  const isOwnProfile = sessionUser ? profileId === sessionUser.id : false;

  return {
    ...profile,
    isOwnProfile,
  };
}

function renderAvatar(profile: DisplayProfile, className: string): string {
  if (profile.avatarLink) {
    return `
      <img
        class="${className}"
        src="/image-proxy?url=${encodeURIComponent(profile.avatarLink)}"
        alt="${profile.firstName} ${profile.lastName}"
      >
    `;
  }

  return `
    <div class="${className} ${className}--placeholder" aria-hidden="true">
      ${getInitials(profile.firstName, profile.lastName)}
    </div>
  `;
}

function renderSection(title: string, content: string, actionLabel = ""): string {
  return `
    <section class="profile-section">
      <header class="profile-section__header">
        <h2 class="profile-section__title">${title}</h2>
        ${actionLabel ? `<span class="profile-section__action">${actionLabel}</span>` : ""}
      </header>
      <div class="profile-section__body">
        ${content}
      </div>
    </section>
  `;
}

function getProfilePosts(profile: DisplayProfile): ProfilePost[] {
  return [
    {
      id: `${profile.id}-intro`,
      text: `${profile.status}

Сейчас больше всего внимания уделяю задачам на стыке продукта и интерфейсов. Люблю, когда в решении есть и чистая логика, и нормальное визуальное ощущение от страницы.

Постепенно собираю вокруг себя набор приёмов, которые помогают делать интерфейсы быстрее и спокойнее в поддержке. В какой-то момент именно это начинает экономить больше всего времени.`,
      time: "1 д назад",
      likes: 324000,
      reposts: 167000,
      comments: 88,
    },
    {
      id: `${profile.id}-details`,
      text: `Сейчас фокус на направлениях: ${profile.interests}. В работе особенно интересно выстраивать понятные сценарии и не перегружать экран лишними деталями.

Из того, что постоянно играет в наушниках: ${profile.favoriteMusic}. А если выключить рабочий режим, то чаще всего пересматриваю ${profile.favoriteMovies}.`,
      time: "3 д назад",
      likes: 91000,
      reposts: 12000,
      comments: 24,
    },
  ];
}

function renderInfoRows(profile: DisplayProfile): string {
  return `
    <div class="profile-info-grid">
      <div class="profile-info-grid__row">
        <dt>Пол</dt>
        <dd>${profile.gender}</dd>
      </div>
      <div class="profile-info-grid__row">
        <dt>День рождения</dt>
        <dd>${profile.birthday}</dd>
      </div>
      <div class="profile-info-grid__row">
        <dt>Телефон</dt>
        <dd>${profile.phone}</dd>
      </div>
      <div class="profile-info-grid__row">
        <dt>Email</dt>
        <dd>${profile.email}</dd>
      </div>
      <div class="profile-info-grid__row">
        <dt>Город</dt>
        <dd>${profile.city}</dd>
      </div>
    </div>
  `;
}

function renderEducation(profile: DisplayProfile): string {
  return `
    <div class="profile-stack">
      ${profile.education
        .map(
          (item) => `
            <article class="profile-stack__item">
              <h3>${item.place}</h3>
              <p>${item.subtitle}</p>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderWork(profile: DisplayProfile): string {
  return `
    <div class="profile-stack">
      <article class="profile-stack__item">
        <h3>${profile.workCompany}</h3>
        <p>${profile.workRole}</p>
      </article>
    </div>
  `;
}

function renderPersonal(profile: DisplayProfile): string {
  return `
    <div class="profile-info-grid">
      <div class="profile-info-grid__row">
        <dt>Интересы</dt>
        <dd>${profile.interests}</dd>
      </div>
      <div class="profile-info-grid__row">
        <dt>Любимая музыка</dt>
        <dd>${profile.favoriteMusic}</dd>
      </div>
      <div class="profile-info-grid__row">
        <dt>Любимые фильмы</dt>
        <dd>${profile.favoriteMovies}</dd>
      </div>
    </div>
  `;
}

function renderFriends(profile: DisplayProfile): string {
  const friends = profile.friends
    .map((friendId) => getProfileRecordById(friendId))
    .filter((friend): friend is ProfileRecord => Boolean(friend));
  const previewCount = 3;
  const hasMoreFriends = friends.length > previewCount;

  return `
    <section class="profile-friends-card">
      <div class="profile-friends-card__header">
        <h2>Друзья</h2>
        <span>${friends.length}</span>
      </div>

      <div class="profile-friends-card__list">
        ${friends
          .map(
            (friend, index) => `
              <a
                href="/profile/${friend.id}"
                data-link
                class="profile-friend"
                ${index >= previewCount ? "data-friend-extra hidden" : ""}
              >
                <img
                  class="profile-friend__avatar"
                  src="${
                    friend.avatarLink
                      ? `/image-proxy?url=${encodeURIComponent(friend.avatarLink)}`
                      : "/assets/img/default-avatar.png"
                  }"
                  alt="${friend.firstName} ${friend.lastName}"
                >
                <div class="profile-friend__content">
                  <strong>${friend.firstName} ${friend.lastName}</strong>
                </div>
              </a>
            `,
          )
          .join("")}
      </div>

      ${
        hasMoreFriends
          ? `
            <footer class="profile-friends-card__footer">
              <button
                type="button"
                class="profile-friends-card__more"
                data-friends-toggle
                aria-expanded="false"
              >
                показать всех
              </button>
            </footer>
          `
          : ""
      }
    </section>
  `;
}

function renderProfilePosts(profile: DisplayProfile): string {
  const posts = getProfilePosts(profile);

  return `
    <section class="profile-posts" id="profile-posts">
      <header class="profile-posts__header">
        <h2>Публикации</h2>
      </header>

      ${posts
        .map((post) =>
          renderPostcard({
            id: post.id,
            authorId: profile.id,
            author: profile.username,
            firstName: profile.firstName,
            lastName: profile.lastName,
            avatar: profile.avatarLink ?? "/assets/img/default-avatar.png",
            text: post.text,
            time: post.time,
            likes: post.likes,
            comments: post.comments,
            reposts: post.reposts,
            images: [],
          }),
        )
        .join("")}
    </section>
  `;
}

export async function renderProfile(params: ProfileParams = {}): Promise<string> {
  const isAuthorised = getSessionUser() !== null;

  if (!isAuthorised) {
    return renderFeed();
  }

  const profile = resolveProfile(params);
  const profileInfoAction = profile.isOwnProfile ? "[ред.]" : "";

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
                ${renderAvatar(profile, "profile-card__avatar")}

                <div class="profile-card__hero-copy">
                  ${profile.isOwnProfile ? '<div class="profile-card__eyebrow">Мой профиль</div>' : ""}
                  <h1>${profile.firstName} ${profile.lastName}</h1>
                  <p>${profile.status}</p>
                </div>
              </header>

              <div class="profile-card__details">
                ${renderSection("Информация", renderInfoRows(profile), profileInfoAction)}

                <div class="profile-card__more" hidden>
                  ${renderSection("Образование", renderEducation(profile))}
                  ${renderSection("Место работы", renderWork(profile))}
                  ${renderSection("Личная информация", renderPersonal(profile))}
                </div>

                <button type="button" class="profile-card__toggle" data-profile-toggle aria-expanded="false">
                  показать подробнее
                </button>
              </div>
            </article>

            <a href="#profile-posts" class="profile-composer" data-profile-anchor>
              + Написать пост
            </a>

            ${renderProfilePosts(profile)}
          </section>
        </section>

        <aside class="app-layout__right">
          <div class="profile-right-rail">
            ${renderFriends(profile)}
          </div>
        </aside>
      </main>
    </div>
  `;
}

export function initProfileToggle(root: Document | HTMLElement = document): void {
  const bindableRoot = root as ProfileRoot;

  if (bindableRoot.__profileToggleBound) {
    return;
  }

  root.addEventListener("click", (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const button = target.closest("[data-profile-toggle]");
    if (!(button instanceof HTMLButtonElement)) return;

    const card = button.closest(".profile-card");
    if (!(card instanceof HTMLElement)) return;

    const more = card.querySelector(".profile-card__more");
    if (!(more instanceof HTMLElement)) return;

    const isExpanded = button.getAttribute("aria-expanded") === "true";
    const nextExpanded = !isExpanded;

    more.hidden = !nextExpanded;
    button.setAttribute("aria-expanded", String(nextExpanded));
    button.textContent = nextExpanded ? "свернуть" : "показать подробнее";
  });

  root.addEventListener("click", (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const button = target.closest("[data-friends-toggle]");
    if (!(button instanceof HTMLButtonElement)) return;

    const card = button.closest(".profile-friends-card");
    if (!(card instanceof HTMLElement)) return;

    const hiddenFriends = card.querySelectorAll<HTMLElement>("[data-friend-extra]");
    const isExpanded = button.getAttribute("aria-expanded") === "true";
    const nextExpanded = !isExpanded;

    hiddenFriends.forEach((friend) => {
      friend.hidden = !nextExpanded;
    });

    button.setAttribute("aria-expanded", String(nextExpanded));
    button.textContent = nextExpanded ? "свернуть" : "показать всех";
  });

  bindableRoot.__profileToggleBound = true;
}
