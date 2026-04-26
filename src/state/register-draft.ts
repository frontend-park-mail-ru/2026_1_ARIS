/**
 * Значения формы регистрации.
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
 * Доступные шаги регистрации.
 */
export type RegisterStep = 1 | 2;

/**
 * Состояние черновика регистрации.
 */
export type RegisterDraft = {
  step: RegisterStep;
  values: RegisterValues;
  touchedFields: string[];
  submitAttempted: boolean;
};

/**
 * Шаблон пустых значений регистрации.
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
 * Глобальное состояние черновика регистрации.
 */
export const registerDraft: RegisterDraft = {
  step: 1,
  values: { ...EMPTY_REGISTER_VALUES },
  touchedFields: [],
  submitAttempted: false,
};

/**
 * Сбрасывает черновик регистрации в исходное состояние.
 */
export function resetRegisterDraft(): void {
  registerDraft.step = 1;
  registerDraft.values = { ...EMPTY_REGISTER_VALUES };
  registerDraft.touchedFields = [];
  registerDraft.submitAttempted = false;
}
