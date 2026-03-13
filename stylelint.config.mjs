export default {
  extends: ["stylelint-config-standard"],
  rules: {
    "selector-class-pattern": [
      "^[a-z]+(?:-[a-z]+)*(?:__(?:[a-z]+(?:-[a-z]+)*))?(?:--(?:[a-z]+(?:-[a-z]+)*))?$",
      {
        message: "Expected class selector to be kebab-case or BEM (block__elem--mod)",
      },
    ],
  },
};
