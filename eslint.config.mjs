import globals from "globals";
import tseslint from "typescript-eslint";

const isProd = process.env.NODE_ENV === "production";
const sharedRules = {
  "no-console": isProd ? "warn" : "off",
  "no-var": "error",
  "prefer-const": "warn",
};

function createTypeScriptConfig(files, envGlobals) {
  return tseslint.configs.recommended.map((config) => ({
    ...config,
    files,
    languageOptions: {
      ...config.languageOptions,
      globals: {
        ...config.languageOptions?.globals,
        ...envGlobals,
      },
    },
    rules: {
      ...config.rules,
      ...sharedRules,
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  }));
}

export default [
  {
    ignores: ["node_modules/**", "dist/**", "build/**", "coverage/**"],
  },

  {
    files: ["public/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      ...sharedRules,
    },
  },

  {
    files: ["server/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      ...sharedRules,
    },
  },

  ...createTypeScriptConfig(["src/**/*.ts"], globals.browser),
  ...createTypeScriptConfig(["server/**/*.ts"], globals.node),
];
