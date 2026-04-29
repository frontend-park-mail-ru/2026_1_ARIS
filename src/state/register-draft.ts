/**
 * Значения формы регистрации.
 */
export type RegisterValues = {
  /** Имя пользователя. */
  firstName: string;
  /** Фамилия пользователя. */
  lastName: string;
  /** Пол из формы регистрации. */
  gender: string;
  /** Дата рождения в пользовательском формате. */
  birthDate: string;
  /** Логин для входа. */
  login: string;
  /** Пароль. */
  password: string;
  /** Повтор пароля для проверки. */
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
  /** Текущий шаг многошаговой регистрации. */
  step: RegisterStep;
  /** Значения полей формы. */
  values: RegisterValues;
  /** Поля, с которыми пользователь уже взаимодействовал. */
  touchedFields: string[];
  /** Была ли попытка отправить форму. */
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
 *
 * @returns {void}
 */
export function resetRegisterDraft(): void {
  registerDraft.step = 1;
  registerDraft.values = { ...EMPTY_REGISTER_VALUES };
  registerDraft.touchedFields = [];
  registerDraft.submitAttempted = false;
}
