/* the linter setup. mostly here so that anyone who clones this repo writes code
   that looks like the rest of it without having to be told. run `npm run lint`. */

import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import globals from "globals";

export default [
  {
    /* dont even look at the data file. its generated, one record per line, and
       the lines are absolutely gigantic - the linter has nothing useful to say
       about it and would just be slow. */
    ignores: ["data/timetable.js", "node_modules/**"],
  },

  js.configs.recommended,

  {
    /* the app itself - es modules, running in a browser */
    files: ["js/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.browser,
    },
  },

  {
    /* the service worker is a different world - classic script, and it has its
       own globals (self, clients, caches) that dont exist on a normal page */
    files: ["sw.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: globals.serviceworker,
    },
  },

  {
    /* and these run in node, not a browser, so they get node globals instead */
    files: ["scripts/**/*.mjs", "eslint.config.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.node,
    },
  },

  {
    files: ["**/*.js", "**/*.mjs"],
    plugins: { "@stylistic": stylistic },
    rules: {
      /* the curly braces on their own line thing. thats the house style for this
         repo and this rule is what keeps it that way, so nobody has to remember
         or argue about it.

         note it only applies to BLOCKS, not object literals - objects keep their
         brace up on the assignment line. thats the normal allman convention
         anyway, and also @stylistic/indent literally cannot cope with the other
         way round. */
      "@stylistic/brace-style": ["error", "allman", { allowSingleLine: true }],

      "@stylistic/indent": ["error", 2, { SwitchCase: 1 }],

      /* backticks are allowed even with nothing interpolated, because most of
         them are holding html which is absolutely full of double quotes */
      "@stylistic/quotes": ["error", "double", { avoidEscape: true, allowTemplateLiterals: "always" }],
      "@stylistic/semi": ["error", "always"],
      "@stylistic/comma-dangle": ["error", "always-multiline"],
      "@stylistic/no-trailing-spaces": "error",
      "@stylistic/eol-last": ["error", "always"],

      /* always braces on an if, even a one liner. skipping them is exactly how a
         tiny innocent change turns into a bug at 2am. */
      curly: ["error", "all"],
      eqeqeq: ["error", "always"],
      "no-var": "error",
      "prefer-const": "error",
    },
  },
];
