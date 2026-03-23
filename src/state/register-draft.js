export const EMPTY_REGISTER_VALUES = {
  firstName: "",
  lastName: "",
  gender: "",
  birthDate: "",
  login: "",
  password: "",
  repeatPassword: "",
};

export const registerDraft = {
  step: 1,
  values: { ...EMPTY_REGISTER_VALUES },
  touchedFields: [],
  submitAttempted: false,
};

export function resetRegisterDraft() {
  registerDraft.step = 1;
  registerDraft.values = { ...EMPTY_REGISTER_VALUES };
  registerDraft.touchedFields = [];
  registerDraft.submitAttempted = false;
}
