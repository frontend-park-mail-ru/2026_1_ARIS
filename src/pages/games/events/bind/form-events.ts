import { gameT } from "../../shared/i18n";
import {
  applyCreateRoomRankedRules,
  setJoinPasswordFieldError,
  setNumericFieldError,
  showRankedLockedCreateFieldError,
  validateInviteCodeField,
  validateNumericField,
  validateTitleField,
} from "../../shared/forms";
import { bindGamesFormFieldEvents } from "../form-fields";
import { bindGamesLiveFieldEvents } from "../live-fields";
import { bindGamesNumberFieldEvents } from "../number-fields";
import { bindGamesSubmitEvents } from "../submit";
import type { BindGamesPageEventsOptions, GamesEventsRoot } from "./types";

/**
 * Подключает события полей, live-inputs и submit-форм страницы игр.
 */
export function bindGamesFormEvents(
  root: GamesEventsRoot,
  options: BindGamesPageEventsOptions,
): void {
  bindGamesNumberFieldEvents(root, {
    showRankedLockedCreateFieldError,
    setNumericFieldError,
    getInvalidNumberMessage: (target) =>
      target.dataset.gamesNumberInvalidMessage ?? gameT("common.invalidNumber"),
  });
  bindGamesFormFieldEvents(root, {
    patchGamesState: options.patchGamesState,
    validateTitleField,
    showRankedLockedCreateFieldError,
    validateNumericField,
    applyCreateRoomRankedRules,
    validateInviteCodeField,
    setJoinPasswordFieldError,
  });
  bindGamesSubmitEvents(root, {
    handleSubmitRoomChat: options.handleSubmitRoomChat,
    handleCreateRoom: options.handleCreateRoom,
    handleJoinRoom: options.handleJoinRoom,
    handleJoinPublicRoom: options.handleJoinPublicRoom,
    handleJoinListedRoom: options.handleJoinListedRoom,
    handleRenameRoomTitle: options.handleRenameRoomTitle,
    handlePasswordForm: options.handlePasswordForm,
    handleSubmitAnswer: options.handleSubmitAnswer,
    setRoomChatState: options.setRoomChatState,
    setGamesState: options.setGamesState,
    getErrorMessage: options.getErrorMessage,
  });
  bindGamesLiveFieldEvents(root, {
    patchGamesState: options.patchGamesState,
    setRoomChatState: options.setRoomChatState,
    renderRoomsList: options.renderRoomsList,
  });
}
