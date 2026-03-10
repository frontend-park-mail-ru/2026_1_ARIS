import { loginUser, registerUser } from "../../api/auth.js";

const FIELD_ORDER = ["firstName", "lastName", "birthDate", "login", "password", "repeatPassword"];

function getFormValues(form) {
  const formData = new FormData(form);

  return {
    firstName: String(formData.get("firstName") || "").trim(),
    lastName: String(formData.get("lastName") || "").trim(),
    birthDate: String(formData.get("birthDate") || "").trim(),
    login: String(formData.get("login") || "").trim(),
    password: String(formData.get("password") || "").trim(),
    repeatPassword: String(formData.get("repeatPassword") || "").trim(),
  };
}

function getTouchedFields(form) {
  try {
    return JSON.parse(form.dataset.touchedFields || "[]");
  } catch {
    return [];
  }
}

function setTouchedField(form, fieldName) {
  const touched = new Set(getTouchedFields(form));
  touched.add(fieldName);
  form.dataset.touchedFields = JSON.stringify([...touched]);
}

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function getDaysInMonth(month, year) {
  const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return days[month - 1];
}

function detectAlphabet(value) {
  if (/^[A-Za-z-]+$/.test(value)) {
    return "latin";
  }

  if (/^[А-Яа-яЁё-]+$/u.test(value)) {
    return "cyrillic";
  }

  return null;
}

function validateName(value, label, isSubmitAttempted = false) {
  if (!value) {
    return isSubmitAttempted ? "Обязательное поле" : "";
  }

  if (value.length < 2) {
    return `${label} должно содержать минимум 2 символа`;
  }

  if (value.length > 12) {
    return `${label} может содержать максимум 12 символов`;
  }

  if (/\d/.test(value)) {
    return `В поле "${label.toLowerCase()}" не должно быть цифр`;
  }

  if (!/^[A-Za-zА-Яа-яЁё-]+$/u.test(value)) {
    return `В поле "${label.toLowerCase()}" не должно быть символов`;
  }

  const hasLatin = /[A-Za-z]/.test(value);
  const hasCyrillic = /[А-Яа-яЁё]/u.test(value);

  if (hasLatin && hasCyrillic) {
    return "Нельзя смешивать русский и английский";
  }

  return "";
}

function validateAlphabetConsistency(firstName, lastName) {
  if (!firstName || !lastName) {
    return "";
  }

  const firstLang = detectAlphabet(firstName);
  const lastLang = detectAlphabet(lastName);

  if (!firstLang || !lastLang) {
    return "";
  }

  if (firstLang !== lastLang) {
    return "Имя и фамилия должны быть на одном языке";
  }

  return "";
}

function validateBirthDate(value, isSubmitAttempted = false) {
  if (!value) {
    return isSubmitAttempted ? "Обязательное поле" : "";
  }

  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    return value.length === 10 ? "Дата должна быть в формате дд/мм/гггг" : "";
  }

  const [dayString, monthString, yearString] = value.split("/");
  const day = Number(dayString);
  const month = Number(monthString);
  const year = Number(yearString);

  if (month < 1 || month > 12) {
    return "Некорректный месяц";
  }

  const maxDay = getDaysInMonth(month, year);
  if (day < 1 || day > maxDay) {
    return "Некорректная дата";
  }

  const birthDate = new Date(year, month - 1, day);
  const now = new Date();

  if (birthDate > now) {
    return "Дата рождения не может быть в будущем";
  }

  const ageLimit = new Date(year + 12, month - 1, day);
  if (ageLimit > now) {
    return "Вам должно быть не меньше 12 лет";
  }

  const maxAgeLimit = new Date(year + 130, month - 1, day);
  if (maxAgeLimit < now) {
    return "Возраст не может превышать 130 лет";
  }

  return "";
}

function validateLogin(value, isSubmitAttempted = false) {
  if (!value) {
    return isSubmitAttempted ? "Обязательное поле" : "";
  }

  if (value.includes(" ")) {
    return "В логине не должно быть пробелов";
  }

  if (!/^[a-zA-Z0-9_]+$/.test(value)) {
    return "Логин может содержать только латинские буквы, цифры и _";
  }

  if (value.length < 6) {
    return "Логин слишком короткий (мин. 6 символов)";
  }

  return "";
}

function validatePassword(value, isSubmitAttempted = false) {
  if (!value) {
    return isSubmitAttempted ? "Обязательное поле" : "";
  }

  if (value.length < 7) {
    return "Пароль слишком короткий (мин. 7 символов)";
  }

  return "";
}

function validateRepeatPassword(password, repeatPassword, isSubmitAttempted = false) {
  if (!repeatPassword) {
    return isSubmitAttempted ? "Обязательное поле" : "";
  }

  if (password !== repeatPassword) {
    return "Пароли не совпадают";
  }

  return "";
}

function validateRegisterForm(values, isSubmitAttempted = false) {
  const errors = {
    firstName: validateName(values.firstName, "Имя", isSubmitAttempted),
    lastName: validateName(values.lastName, "Фамилия", isSubmitAttempted),
    birthDate: validateBirthDate(values.birthDate, isSubmitAttempted),
    login: validateLogin(values.login, isSubmitAttempted),
    password: validatePassword(values.password, isSubmitAttempted),
    repeatPassword: validateRepeatPassword(
      values.password,
      values.repeatPassword,
      isSubmitAttempted,
    ),
  };

  const alphabetError = validateAlphabetConsistency(values.firstName, values.lastName);

  if (alphabetError && !errors.firstName && !errors.lastName) {
    errors.lastName = alphabetError;
  }

  return errors;
}

function validateLoginForm(values, isSubmitAttempted = false) {
  return {
    login: values.login ? "" : isSubmitAttempted ? "Обязательное поле" : "",
    password: values.password ? "" : isSubmitAttempted ? "Обязательное поле" : "",
  };
}

function getValidationErrors(mode, values, isSubmitAttempted = false) {
  if (mode === "register") {
    return validateRegisterForm(values, isSubmitAttempted);
  }

  return validateLoginForm(values, isSubmitAttempted);
}

function getFieldGroup(form, name) {
  const input = form.querySelector(`.input__field[name="${name}"]`);
  if (!(input instanceof HTMLElement)) {
    return null;
  }

  return input.closest(".auth-form__field-group");
}

function clearFieldState(form) {
  FIELD_ORDER.forEach((name) => {
    const group = getFieldGroup(form, name);
    if (!group) return;

    const errorNode = group.querySelector(".auth-form__field-error");
    const inputWrapper = group.querySelector(".input");

    if (errorNode) {
      errorNode.textContent = " ";
      errorNode.classList.add("auth-form__field-error--hidden");
    }

    if (inputWrapper) {
      inputWrapper.classList.remove("input--error");
    }
  });
}

function renderTouchedFieldErrors(form, errors) {
  clearFieldState(form);

  const touchedFields = getTouchedFields(form);
  const isSubmitAttempted = form.dataset.submitAttempted === "true";

  touchedFields.forEach((name) => {
    const message = errors[name];
    if (!message) return;

    const group = getFieldGroup(form, name);
    if (!group) return;

    const input = form.querySelector(`.input__field[name="${name}"]`);
    const value = input instanceof HTMLInputElement ? input.value.trim() : "";
    if (!isSubmitAttempted && !value) return;

    const errorNode = group.querySelector(".auth-form__field-error");
    const inputWrapper = group.querySelector(".input");

    if (errorNode) {
      errorNode.textContent = message;
      errorNode.classList.remove("auth-form__field-error--hidden");
    }

    if (isSubmitAttempted && inputWrapper) {
      inputWrapper.classList.add("input--error");
    }
  });
}

function renderAllFieldErrors(form, errors) {
  clearFieldState(form);

  FIELD_ORDER.forEach((name) => {
    const message = errors[name];
    if (!message) return;

    const group = getFieldGroup(form, name);
    if (!group) return;

    const errorNode = group.querySelector(".auth-form__field-error");
    const inputWrapper = group.querySelector(".input");

    if (errorNode) {
      errorNode.textContent = message;
      errorNode.classList.remove("auth-form__field-error--hidden");
    }

    if (inputWrapper) {
      inputWrapper.classList.add("input--error");
    }
  });
}

function hasErrors(errors) {
  return Object.values(errors).some(Boolean);
}

function navigate(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

async function handleSubmit(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  if (!form.matches(".auth-form__form")) return;

  event.preventDefault();

  const authForm = form.closest(".auth-form");
  if (!(authForm instanceof HTMLElement)) return;

  const mode = authForm.dataset.mode;
  const values = getFormValues(form);

  form.dataset.submitAttempted = "true";
  const errors = getValidationErrors(mode, values, true);

  if (hasErrors(errors)) {
    renderAllFieldErrors(form, errors);
    return;
  }

  clearFieldState(form);

  try {
    if (mode === "login") {
      await loginUser({
        login: values.login,
        password: values.password,
      });

      navigate("/feed");
      return;
    }

    if (mode === "register") {
      await registerUser({
        firstName: values.firstName,
        lastName: values.lastName,
        birthday: values.birthDate,
        login: values.login,
        password1: values.password,
        password2: values.repeatPassword,
      });

      navigate("/feed");
    }
  } catch (error) {
    console.error("Auth error:", error);
  }
}

export function initAuthForm(root = document) {
  if (root.__authFormBound) return;

  root.addEventListener("focusout", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    const form = target.closest(".auth-form__form");
    if (!(form instanceof HTMLFormElement)) return;

    const authForm = form.closest(".auth-form");
    if (!(authForm instanceof HTMLElement)) return;

    setTouchedField(form, target.name);

    const isSubmitAttempted = form.dataset.submitAttempted === "true";
    const values = getFormValues(form);
    const errors = getValidationErrors(authForm.dataset.mode, values, isSubmitAttempted);

    renderTouchedFieldErrors(form, errors);
  });

  root.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    const form = target.closest(".auth-form__form");
    if (!(form instanceof HTMLFormElement)) return;

    const authForm = form.closest(".auth-form");
    if (!(authForm instanceof HTMLElement)) return;

    setTouchedField(form, target.name);

    const isSubmitAttempted = form.dataset.submitAttempted === "true";
    const values = getFormValues(form);
    const errors = getValidationErrors(authForm.dataset.mode, values, isSubmitAttempted);

    renderTouchedFieldErrors(form, errors);
  });

  root.addEventListener("submit", (event) => {
    handleSubmit(event).catch((error) => {
      console.error(error);
    });
  });

  root.__authFormBound = true;
}
