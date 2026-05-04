import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["allure-vitest/setup"],
    reporters: [
      "default",
      [
        "allure-vitest/reporter",
        {
          resultsDir: "allure-results",
        },
      ],
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: ["coverage/**", "dist/**", "allure-results/**", "allure-report/**", "**/*.d.ts"],
    },
  },
});
