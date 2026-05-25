import type { GamesPageState } from "../state/store";

export type HandleGamesCopyClickOptions = {
  handleCopyInviteCode: (code: string) => Promise<void>;
  handleCopyRoomTitle: (title: string) => Promise<void>;
  setGamesState: (patch: Partial<GamesPageState>) => void;
};

/**
 * Обрабатывает click-события копирования invite-кода и названия комнаты.
 */
export function handleGamesCopyClick(
  event: Event,
  target: Element,
  options: HandleGamesCopyClickOptions,
): boolean {
  const copyInviteButton = target.closest("[data-games-copy-invite]");
  if (copyInviteButton instanceof HTMLElement) {
    event.preventDefault();
    const code = copyInviteButton.getAttribute("data-games-copy-invite") ?? "";
    void options.handleCopyInviteCode(code).catch(() => {
      options.setGamesState({ message: "", error: "Не удалось скопировать код приглашения." });
    });
    return true;
  }

  const copyRoomTitleButton = target.closest("[data-games-copy-room-title]");
  if (copyRoomTitleButton instanceof HTMLElement) {
    event.preventDefault();
    const title = copyRoomTitleButton.getAttribute("data-games-copy-room-title") ?? "";
    void options.handleCopyRoomTitle(title).catch(() => {
      options.setGamesState({ message: "", error: "Не удалось скопировать название комнаты." });
    });
    return true;
  }

  return false;
}
