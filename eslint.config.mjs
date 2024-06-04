import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      "no-useless-escape": "off",  // Disabling the rule that's causing incorrect warnings
    }
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
];