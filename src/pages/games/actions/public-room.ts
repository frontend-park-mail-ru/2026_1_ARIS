import {
  joinPublicGameRoom,
  rememberPublicGameGuestSession,
  type GameRoom,
} from "../../../api/games";
import {
  normalizeName,
  validateAlphabetConsistency,
  validateName,
} from "../../../utils/profile-validation";
import type { GamesPageState } from "../state/store";
import { gameT } from "../shared/i18n";

type SetGamesState = (patch: Partial<GamesPageState>) => void;

export type JoinPublicRoomFromFormOptions = {
  inviteCode: string;
  hydrateRoom: (room: GameRoom) => Promise<GameRoom>;
  setGamesState: SetGamesState;
};

function fieldValue(form: HTMLFormElement, name: string): string {
  const field = form.elements.namedItem(name);
  return field instanceof HTMLInputElement ? field.value.trim() : "";
}

function publicGuestNameErrors(firstName: string, lastName: string) {
  const firstNameError = validateName(firstName, gameT("public.firstName"), true);
  const lastNameError =
    validateName(lastName, gameT("public.lastName"), true) ||
    (!firstNameError ? validateAlphabetConsistency(firstName, lastName) : "");
  return { firstNameError, lastNameError };
}

export async function joinPublicRoomFromFormAction(
  form: HTMLFormElement,
  options: JoinPublicRoomFromFormOptions,
): Promise<void> {
  const firstName = fieldValue(form, "firstName");
  const lastName = fieldValue(form, "lastName");
  const { firstNameError, lastNameError } = publicGuestNameErrors(firstName, lastName);

  if (firstNameError || lastNameError) {
    options.setGamesState({
      publicGuestFirstName: firstName,
      publicGuestLastName: lastName,
      publicGuestFirstNameError: firstNameError,
      publicGuestLastNameError: lastNameError,
      error: "",
      errorTarget: "",
    });
    return;
  }

  options.setGamesState({
    loading: true,
    publicGuestFirstName: firstName,
    publicGuestLastName: lastName,
    publicGuestFirstNameError: "",
    publicGuestLastNameError: "",
    message: gameT("room.joining"),
    error: "",
    errorTarget: "",
  });

  const result = await joinPublicGameRoom(options.inviteCode, {
    firstName: normalizeName(firstName),
    lastName: normalizeName(lastName),
  });
  const room = await options.hydrateRoom(result.room);
  rememberPublicGameGuestSession({
    inviteCode: options.inviteCode,
    roomId: room.id,
    token: result.token,
  });
  options.setGamesState({
    room,
    roomId: room.id,
    loading: false,
    message: "",
    error: "",
    errorTarget: "",
  });
}
