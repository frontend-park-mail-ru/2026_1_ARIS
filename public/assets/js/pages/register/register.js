import { renderAuthForm } from "../../components/auth-form/auth-form.js";

export function renderRegister() {
  return `
    <div class="register-page">
      <main class="register-page__content">
        ${renderAuthForm({ mode: "register" })}
      </main>
    </div>
  `;
}
