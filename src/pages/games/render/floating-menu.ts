import type { GameRoom } from "../../../api/games";
import {
  renderFloatingMenu,
  type FloatingMenuItem,
} from "../../../components/floating-menu/floating-menu";
import type { GamesPageState } from "../state/store";
import { findReportableQuestion } from "../room/question-report";

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
        label: "Скопировать",
      },
      {
        action: `question-report:${state.questionMenuKey}`,
        label: isReported ? "Жалоба отправлена" : isReporting ? "Отправляем..." : "Пожаловаться",
        danger: true,
      },
    ];
  }

  if (state.playerMenuProfileId) {
    return [
      {
        action: `player-admin:${state.playerMenuProfileId}`,
        label: "Назначить администратором",
      },
      {
        action: `player-kick:${state.playerMenuProfileId}`,
        label: "Удалить из комнаты",
        danger: true,
      },
    ];
  }

  if (state.titleMenuOpen) {
    return [
      {
        action: "title-copy",
        label: "Скопировать",
      },
      ...(isCurrentRoomCreator(room)
        ? [
            {
              action: "title-rename",
              label: "Переименовать",
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
          label: state.passwordVisible ? "Скрыть пароль" : "Показать пароль",
        },
        {
          action: "password-change",
          label: "Изменить пароль",
        },
        {
          action: "password-remove",
          label: "Удалить пароль",
          danger: true,
        },
      ];
    }

    return [
      {
        action: "password-set",
        label: "Поставить пароль",
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
