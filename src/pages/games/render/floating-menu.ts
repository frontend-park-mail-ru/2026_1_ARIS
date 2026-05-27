import type { GameRoom } from "../../../api/games";
import {
  renderFloatingMenu,
  type FloatingMenuItem,
} from "../../../components/floating-menu/floating-menu";
import type { GamesPageState } from "../state/store";
import { findReportableQuestion } from "../room/question-report";
import { gameT } from "../shared/i18n";

export type GamesFloatingMenuOptions = {
  state: GamesPageState;
  reportedQuestionKeys: ReadonlySet<string>;
  reportingQuestionKeys: ReadonlySet<string>;
  isCurrentRoomCreator: (room: GameRoom) => boolean;
};

/**
 * Возвращает координаты привязки floating menu к кнопке.
 */
export function setFloatingMenuAnchor(
  toggle: HTMLElement,
): Pick<GamesPageState, "floatingMenuAnchorX" | "floatingMenuAnchorY"> {
  const rect = toggle.getBoundingClientRect();
  return {
    floatingMenuAnchorX: rect.right,
    floatingMenuAnchorY: rect.bottom,
  };
}

/**
 * Возвращает patch для закрытия всех меню страницы игр.
 */
export function closeGamesMenus(): Partial<GamesPageState> {
  return {
    playerMenuProfileId: "",
    questionMenuKey: "",
    titleMenuOpen: false,
    passwordMenuOpen: false,
  };
}

/**
 * Собирает пункты floating menu из состояния комнаты.
 */
export function getGamesFloatingMenuItems(options: GamesFloatingMenuOptions): FloatingMenuItem[] {
  const { state, reportedQuestionKeys, reportingQuestionKeys, isCurrentRoomCreator } = options;
  const room = state.room;
  if (!room) return [];

  if (state.questionMenuKey) {
    const question = findReportableQuestion(room, state.questionMenuKey);
    const isReported = reportedQuestionKeys.has(state.questionMenuKey);
    const isReporting = reportingQuestionKeys.has(state.questionMenuKey);
    if (!question) return [];

    return [
      {
        action: `question-copy:${state.questionMenuKey}`,
        label: gameT("menu.copy"),
      },
      {
        action: `question-report:${state.questionMenuKey}`,
        label: isReported
          ? gameT("menu.reportSent")
          : isReporting
            ? gameT("menu.reporting")
            : gameT("menu.report"),
        danger: true,
      },
    ];
  }

  if (state.playerMenuProfileId) {
    return [
      {
        action: `player-admin:${state.playerMenuProfileId}`,
        label: gameT("menu.assignAdmin"),
      },
      {
        action: `player-kick:${state.playerMenuProfileId}`,
        label: gameT("menu.kickPlayer"),
        danger: true,
      },
    ];
  }

  if (state.titleMenuOpen) {
    return [
      {
        action: "title-copy",
        label: gameT("menu.copy"),
      },
      ...(isCurrentRoomCreator(room)
        ? [
            {
              action: "title-rename",
              label: gameT("menu.rename"),
            },
          ]
        : []),
    ];
  }

  if (state.passwordMenuOpen) {
    if (room.hasPassword) {
      return [
        {
          action: "password-toggle-visibility",
          label: state.passwordVisible ? gameT("menu.hidePassword") : gameT("menu.showPassword"),
        },
        {
          action: "password-change",
          label: gameT("menu.changePassword"),
        },
        {
          action: "password-remove",
          label: gameT("menu.removePassword"),
          danger: true,
        },
      ];
    }

    return [
      {
        action: "password-set",
        label: gameT("menu.setPassword"),
      },
    ];
  }

  return [];
}

/**
 * Рендерит floating menu страницы игр.
 */
export function renderGamesFloatingMenu(options: GamesFloatingMenuOptions): string {
  const items = getGamesFloatingMenuItems(options);
  const { state } = options;
  if (!items.length) return "";
  if (!state.floatingMenuAnchorX || !state.floatingMenuAnchorY) return "";

  return renderFloatingMenu({
    items,
    anchorX: state.floatingMenuAnchorX,
    anchorY: state.floatingMenuAnchorY,
  });
}
