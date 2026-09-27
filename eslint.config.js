// ESLint config (flat format, ESLint 9). Run with `npm run lint`.
//
// Three kinds of code, three environments:
//   - browser pages: index.html, setup/setup.html (inline <script>s, linted via
//     eslint-plugin-html), setup/parse-guide.js, and the config files
//   - Node dev scripts: setup/test/*.js and this file
//   - vendored pdf.js: not ours, never linted
//
// Browser code is written in plain ES5-style JavaScript on purpose (it must
// run from file:// with no build step), so only the recommended rules apply.

const js = require("@eslint/js");
const html = require("eslint-plugin-html");
const globals = require("globals");

module.exports = [
  { ignores: ["setup/vendor/**", "node_modules/**"] },

  js.configs.recommended,

  // Browser pages and the parser (classic scripts, no modules)
  {
    files: ["**/*.html", "setup/parse-guide.js"],
    plugins: { html },
    languageOptions: {
      ecmaVersion: 2017,
      sourceType: "script",
      globals: {
        ...globals.browser,
        pdfjsLib: "readonly",           // from vendored pdf.min.js
        WGUGuideParser: "readonly",     // from setup/parse-guide.js
        module: "readonly"              // parse-guide.js also exports for Node
      }
    },
    rules: {
      // `catch (e) { /* ignore */ }` is deliberate in a few places (e.g.
      // localStorage unavailable). ES2019's bare `catch {}` isn't used so the
      // code stays ES2017-compatible.
      "no-unused-vars": ["error", { caughtErrors: "none" }]
    }
  },

  // Config files: they only assign window.WGU_TRACKER_CONFIG
  {
    files: ["config.example.js", "examples/*.js"],
    languageOptions: { ecmaVersion: 2017, sourceType: "script", globals: { window: "writable" } }
  },

  // Node dev scripts
  {
    files: ["setup/test/**/*.js", "eslint.config.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "commonjs", globals: { ...globals.node } }
  }
];
