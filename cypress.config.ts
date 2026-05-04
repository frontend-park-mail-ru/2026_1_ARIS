import { defineConfig } from "cypress";

export default defineConfig({
  allowCypressEnv: false,
  e2e: {
    baseUrl: "http://localhost:3001",
    specPattern: "cypress/e2e/**/*.cy.ts",
    supportFile: "cypress/support/e2e.ts",
  },
  defaultCommandTimeout: 8000,
  requestTimeout: 8000,
  responseTimeout: 8000,
  retries: {
    runMode: 1,
    openMode: 0,
  },
  screenshotOnRunFailure: true,
  video: false,
  viewportHeight: 900,
  viewportWidth: 1280,
});
