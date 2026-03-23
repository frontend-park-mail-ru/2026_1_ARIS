import { getSessionUser } from "../../state/session";

type ProfileParams = {
  id?: string;
};

/**
 * Renders profile page.
 *
 * @param {ProfileParams} [params={}]
 * @returns {string}
 */
export function renderProfile(params: ProfileParams = {}): string {
  const user = getSessionUser();

  const profileId = params.id ?? user?.id ?? "";
  const isOwnProfile = Boolean(user?.id) && profileId === user?.id;

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