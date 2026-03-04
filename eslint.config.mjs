import globals from "globals";

const isProd = process.env.NODE_ENV === "production";

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
      "no-console": isProd ? "warn" : "off",
      "no-var": "error",
      "prefer-const": "warn",
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
      "no-console": isProd ? "warn" : "off",
      "no-var": "error",
      "prefer-const": "warn",
    },
  },
];