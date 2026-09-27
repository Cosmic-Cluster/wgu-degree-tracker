# AGENTS.md

Instructions for AI coding agents working in this repository.

- **Helping a student build or update their tracker data** (`config.js`): follow [AI-GUIDE.md](AI-GUIDE.md). Its rules on honesty (no invented assessment types, no unconfirmed transfer credit) and on keeping saved progress intact are mandatory.
- **Changing the code:** read [DECISIONS.md](DECISIONS.md) first. It explains why things are built the way they are (e.g. why pdf.js is pinned to 3.11.174 and loaded as classic scripts).

## Project constraints
- No build step, no framework, no runtime dependencies. `index.html` and `setup/setup.html` must keep working when double-clicked from the file system (`file://`), offline, on a machine with nothing installed.
- The tracker must never depend on an AI at runtime.
- Plain, readable, well-commented ES5-style JavaScript over clever code.
- Record any non-obvious decision in `DECISIONS.md` (newest at the bottom).

## Tests
- `npm install` once (dev tooling only), then:
  - `npm run lint`: ESLint, including inline scripts in the HTML pages
  - `npm test`: PDF-free parser unit tests, the security guard, and schema validation of `config.example.js` + `examples/`. This is what CI runs.
  - `npm run test:guides -- "<folder of Program Guide PDFs>"`: real-PDF regression tests (local only; PDFs aren't in the repo). Run before merging parser changes. Expected results are in `setup/test/expected.json`.
- `run-tests.js` also enforces that every pdf.js `getDocument()` call passes `isEvalSupported: false`. That's the mitigation for CVE-2024-4367 (see SECURITY.md). Never remove it.
