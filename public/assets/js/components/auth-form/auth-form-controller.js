import { loginUser, registerUser } from "../../api/auth.js";

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

  root.addEventListener("submit", (event) => {
    handleSubmit(event).catch((error) => {
      console.error(error);
    });
  });

  root.__authFormBound = true;
}
