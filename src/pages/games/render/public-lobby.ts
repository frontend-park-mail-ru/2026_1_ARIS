import { escapeHtml } from "../../../utils/avatar";
import { gameT } from "../shared/i18n";
import type { GamesPageState } from "../state/store";

export function renderPublicLobbyEntry(state: GamesPageState): string {
  return `
    <section class="games-panel content-card">
      <header class="games-panel__header">
        <div>
          <h1 class="games-panel__title">${escapeHtml(gameT("public.title"))}</h1>
          <p class="games-panel__subtitle">${escapeHtml(gameT("public.subtitle"))}</p>
        </div>
      </header>
      <form class="games-form games-form--plain games-form-grid" data-games-public-join data-games-public-invite="${escapeHtml(state.publicInviteCode)}" novalidate>
        <label class="games-field${state.publicGuestFirstNameError ? " games-field--invalid" : ""}">
          <span>${escapeHtml(gameT("public.firstName"))}</span>
          <input
            type="text"
            name="firstName"
            maxlength="12"
            value="${escapeHtml(state.publicGuestFirstName)}"
            autocomplete="given-name"
            aria-invalid="${state.publicGuestFirstNameError ? "true" : "false"}"
          >
          <span class="games-field__error" aria-live="polite">${escapeHtml(state.publicGuestFirstNameError)}</span>
        </label>
        <label class="games-field${state.publicGuestLastNameError ? " games-field--invalid" : ""}">
          <span>${escapeHtml(gameT("public.lastName"))}</span>
          <input
            type="text"
            name="lastName"
            maxlength="12"
            value="${escapeHtml(state.publicGuestLastName)}"
            autocomplete="family-name"
            aria-invalid="${state.publicGuestLastNameError ? "true" : "false"}"
          >
          <span class="games-field__error" aria-live="polite">${escapeHtml(state.publicGuestLastNameError)}</span>
        </label>
        <button type="submit" class="games-button games-button--primary" ${state.loading ? "disabled" : ""}>
          ${escapeHtml(state.loading ? gameT("public.joining") : gameT("public.join"))}
        </button>
      </form>
      ${state.error ? `<p class="games-inline-error">${escapeHtml(state.error)}</p>` : ""}
    </section>
  `;
}
