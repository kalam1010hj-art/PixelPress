import globals from "globals";
import react from "eslint-plugin-react";
export default [
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, ...globals.worker },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { react },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "react/jsx-uses-vars": "error",
      "react/jsx-uses-react": "error",
    },
  },
];
