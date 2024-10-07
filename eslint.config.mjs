import globals from "globals";
import pluginJs from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    files: ["**/*.ts", "**/*.tsx"],  // Apply this config to TypeScript files
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      "no-useless-escape": "off",  // Disabling the rule causing incorrect warnings
      "@typescript-eslint/no-explicit-any": "off",  // Disabling the no-explicit-any rule
    },
  },
  {
    files: ["**/*.js"],  // Apply this config to JavaScript files
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // Additional rules for JavaScript files, if needed
    },
  },
  pluginJs.configs.recommended,  // Apply the recommended config for JavaScript
];
