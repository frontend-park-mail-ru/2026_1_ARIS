import { getSessionUser } from "../../state/session.js";

/**
 * Renders profile page.
 * @param {Object} [params={}]
 * @param {string} [params.id]
 * @returns {string}
 */
export function renderProfile(params = {}) {
  const user = getSessionUser();
  const profileId = params.id || user?.id || "";
  const isOwnProfile = Boolean(user?.id) && profileId === user.id;

  const title = isOwnProfile ? "Мой профиль" : "Профиль пользователя";
  const subtitle = profileId ? `ID профиля: ${profileId}` : "Профиль не найден";

  return `
    <section class="profile-page">
      <h1>${title}</h1>
      <p>${subtitle}</p>
      <p>TODO: полноценная страница профиля</p>
    </section>
  `;
}
