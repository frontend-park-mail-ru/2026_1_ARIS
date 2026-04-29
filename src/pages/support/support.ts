import { initSession } from "../../state/session";
import { initSupport } from "./events";

export { initSupport } from "./events";
export { renderSupportWidget } from "./render";

export async function initSupportPage(): Promise<void> {
  await initSession();
  const root = document.getElementById("app");
  if (root) {
    await initSupport(root);
  }
}
