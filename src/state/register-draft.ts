/**
 * Register form values.
 */
export type RegisterValues = {
  firstName: string;
  lastName: string;
  gender: string;
  birthDate: string;
  login: string;
  password: string;
  repeatPassword: string;
};

/**
 * Available register steps.
 */
export type RegisterStep = 1 | 2;

/**
 * Register draft state.
 */
export type RegisterDraft = {
  step: RegisterStep;
  values: RegisterValues;
  touchedFields: string[];
  submitAttempted: boolean;
};

/**
 * Empty register values template.
 */
export const EMPTY_REGISTER_VALUES: RegisterValues = {
  firstName: "",
  lastName: "",
  gender: "",
  birthDate: "",
  login: "",
  password: "",
  repeatPassword: "",
};

/**
 * Global register draft state.
 */
export const registerDraft: RegisterDraft = {
  step: 1,
  values: { ...EMPTY_REGISTER_VALUES },
  touchedFields: [],
  submitAttempted: false,
};

/**
 * Resets register draft to initial state.
 */
export function resetRegisterDraft(): void {
  registerDraft.step = 1;
  registerDraft.values = { ...EMPTY_REGISTER_VALUES };
  registerDraft.touchedFields = [];
  registerDraft.submitAttempted = false;
}
