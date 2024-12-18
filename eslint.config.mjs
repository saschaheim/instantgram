import globals from "globals";  // Import the global variables for different environments (browser, node, etc.)
import pluginJs from "@eslint/js";  // Import the ESLint configuration for JavaScript
import tsPlugin from "@typescript-eslint/eslint-plugin";  // Import the ESLint plugin for TypeScript
import tsParser from "@typescript-eslint/parser";  // Import the TypeScript parser for ESLint

export default [
  {
    files: ["**/*.ts", "**/*.tsx"],  // Apply this configuration to TypeScript files (.ts and .tsx)
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },  // Define global variables for browser and node environments
      parser: tsParser,  // Use the TypeScript parser for TypeScript files
      parserOptions: {
        ecmaVersion: 2020,  // Set the ECMAScript version to 2020
        sourceType: "module",  // Set the module type for the code
        project: "./tsconfig.json",  // Reference the TypeScript configuration file for project settings
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,  // Use the TypeScript ESLint plugin
    },
    rules: {
      "no-useless-escape": "off",  // Disable the 'no-useless-escape' rule which can cause incorrect warnings
      "@typescript-eslint/no-explicit-any": "off",  // Disable the rule that disallows the use of 'any' type
    },
  },
  {
    files: ["**/*.js"],  // Apply this configuration to JavaScript files (.js)
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },  // Define global variables for browser and node environments
    },
    rules: {
      // Additional rules for JavaScript files, if needed, can be added here
    },
  },
  pluginJs.configs.recommended,  // Apply the recommended ESLint configuration for JavaScript files
];