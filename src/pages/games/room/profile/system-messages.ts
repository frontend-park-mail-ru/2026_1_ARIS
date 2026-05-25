export {
  getPlayerGender,
  getProfileGender,
  inferGenderByFirstName,
  inferPlayerGenderByName,
  normalizeGamePlayerGender,
} from "./system-messages/gender";
export { getSystemPlayerFullName } from "./system-messages/names";
export { normalizeRenderedSystemMessageText } from "./system-messages/normalization";
export { getRoomSystemMessages } from "./system-messages/diff";
export {
  formatRoomModeLabel,
  getAssignedAdminVerb,
  getJoinedVerb,
  getLeftVerb,
  getReadyVerb,
  getRemovedVerb,
  getRoomJoinLeavePlayerLabel,
} from "./system-messages/verbs";
