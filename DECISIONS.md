# DECISIONS.md: why things are the way they are

This is a running log. Newest entries go at the bottom. Each entry says what was decided, why, and what we gave up.

---

## 2026-09-24: Phase 1 (setup page + tracker fixes)

### The setup tool is a browser page (`setup/setup.html`), not a Node CLI
- **Why:** The target audience is any WGU student, and many of them have nothing installed. A page you double-click works on any machine, offline, with no Node, no npm and no Python. The PDF never leaves the computer.
- **Given up:** You can't script it or run it in batch. The parser (`setup/parse-guide.js`) still runs under Node for tests, so a CLI wrapper could be added later without touching the parsing logic.

### pdf.js 3.11.174 (legacy build), vendored in `setup/vendor/pdfjs/`
- **Why v3, not v4/v5:** v4+ ships only as ES modules. Browsers refuse to load module scripts from `file://` pages, so double-clicking `setup.html` would break. v3 ships classic `<script>` files.
- **Why the worker is loaded as a plain `<script>`:** browsers also block Web Workers on `file://`. Loading `pdf.worker.min.js` as a script makes pdf.js run on the main thread instead. That's slower, but a 20-page guide still parses in well under a second.
- **Security:** v3.11.174 is affected by CVE-2024-4367 (code execution through a crafted font), which is fixed in 4.2.67. The documented mitigation is `isEvalSupported: false`, and `setup.html` always passes it, plus `disableFontFace: true`. The page can't verify where a PDF came from, so provenance isn't a control. Two things lower the likelihood: it only opens a file the student picks themselves, never one fetched automatically or by URL, and there's no server, login or stored secret behind it. *(Corrected 2026-10-06; see the entry at the bottom.)* **If a v3 release with the fix ever ships, or `file://` stops mattering, upgrade.**
- **Vendored, not CDN:** CDN loading would need internet and would pull code at runtime from a third party. Apache-2.0 licence is copied alongside.

### Parse the "Standard Path" table by text position, not plain text
- Every sample guide (10 of them, Bachelor's and Master's, across IT, business, nursing and education) has a table titled "Standard Path for <program>" with Course / CUs / (Term) columns.
- Long course names wrap onto 2–3 lines, and the numbers sit on their own line, vertically centred between the name lines. Plain text extraction scrambles that, so the parser uses each text item's x/y position and attaches each name fragment to the nearest row of numbers (within 20pt).
- Tolerances (2pt same-line, 20pt fragment, 15pt cell gap) are named constants at the top of `parse-guide.js` with a note on why each has its value.

### Verified against real guides: `setup/test/run-tests.js`
- `expected.json` holds course count, CU total, term-column count and spot-checked names for all 10 sample guides. **All 10 pass**, and every CU total matches the guide's own "Total CUs" line where one exists.
- The PDFs are not committed (they're WGU's documents). Tests take a folder path.

### What the guides do and don't contain (this changed the plan)
- **Most guides DO suggest terms.** The handoff assumed WGU never assigns terms. In fact 7 of 10 sample guides have a Term column. BSNU has two ("Option A" / "Option B"), and 3 of 10 (BSMES, BSSESB, MSCIN) have none. So setup offers "use the guide's terms" when available and "fill terms by CU" otherwise.
- **Course codes are mostly absent.** Only MSCSIA lists codes (in its Prerequisites section), plus a couple of stray ones elsewhere. The tracker now keys saved progress on the code when there is one, otherwise on a slug of the course name. The code column shows only when known.
- **Assessment type (OA/PA) is never in the guide.** Every generated course starts as "Type: unknown" and never as a guess, and a Notes callout says so.
- **Clinicals, student teaching and portfolios are real courses with CUs** in the education guides (e.g. MATELED "Student Teaching I", "Education Portfolio"), so they come through as courses automatically. Names matching Clinical / Student Teaching / Practicum / Field Experience get a note that they're field experience.
- **Non-course requirements exist only as prose sections**: "External Content & Basic Skills Exams" and "State Licensure Requirements" (all 4 education guides). When found, these become pre-ticked items in a new **Program requirements** section: tracked by status, no CUs. Their notes paraphrase the guide only. Students can add their own (background check, etc.).
- **Term 0** in a guide (BSNU "Advanced Standing for RN License", 50 CU) = satisfied before starting → marked as transfer.
- **Certification alignments** ("The course X has alignment with Y") become course notes. They're alignments, not transfer credit, so they don't use the `cert` field (that one means "satisfied by this cert").

### Term bucketing: guide order, "at least N CUs per term"
- Order: keep the guide's order and don't try to detect prerequisites (user decision, 2026-09-24). Prerequisite sections are free prose and differ per program, and a wrong order that looks right is worse than none.
- The default N is the minimum stated in the guide (8 graduate / 12 undergraduate), labelled as such, not a hardcoded "normal pace".
- "At least", not "at most": the guide's number is a *minimum*. Filling only up to it produced terms below the minimum (MSCIN came out at 6 CU/term).
- Known rough edge: big courses can bunch up at the end (BSMES puts Student Teaching I + II in one 19-CU term). The student edits the Term column on the setup page.

### Tracker (`index.html`) fixes
1. **Middle plans dropped courses.** With a 3-term config, the "2-term stretch" hid all term-3 courses. Only the 1-term plan had special handling. Now any plan folds later terms into its last term and says how many courses were pulled forward.
2. **Import could crash the page / silently load another program.** Import now parses and checks the file first, refuses one that matches none of this tracker's courses, asks before a partial or other-program import, and repairs malformed values via the same `mergeState()` used for localStorage. Exports now carry `__meta` (storage key, program name, date).
3. `config.example.js` pointed at a non-existent `setup/README.md` and a Node script. Both now point to `setup/setup.html`.
- Smaller: `charset="utf-8"` (was `utf8`); course names are rendered as text, not HTML; progress bar guards against a 0-CU config.

### `.gitignore`
- Ignores `*.pdf`, `node_modules/`, `*-progress.json`.
- **Does not ignore `config.js`**, because GitHub Pages needs it committed to serve a working tracker. People who want their plan private can keep their fork private or run the tracker locally.

---

## 2026-09-24: Prelicensure nursing guide (BSPNTR)

### Multi-part standard paths
- BSPNTR's standard path is **two tables**, "(Pre-Nursing)" then "(Nursing)", and each numbers its terms from 1. Before this fix, "use the guide's terms" put Pre-Nursing term 1 and Nursing term 1 in the same term.
- The parser now records a section for each "Standard Path for …" heading and offsets each section's terms by the previous section's last term (Nursing = terms 5–8). Each course gets a note naming its part, and a warning says the move between parts may need separate admission. (The guide doesn't say this outright, so the warning phrases it as "may" and points to the mentor.)
- The program title drops the section's parenthetical: "…Nursing - Prelicensure".
- The footer program-code fallback now handles two codes ("BSPNTR/BSNPLTR 202303 ©") and keeps the first.
- Test count: 11/11 guides pass.

### State availability is NOT parsed or tracked
- WGU lists the states where prelicensure nursing is offered on the program web page, not in the Program Guide. The 202303 guide never mentions it.
- It's an enrollment-eligibility fact, not something an enrolled student makes progress on, and the list changes as WGU adds clinical partners. Hardcoding it would go stale silently.
- Plan: the README tells students some programs (prelicensure nursing, teacher licensure) are state-limited and to check the program page before enrolling.

### Clinicals in nursing are inside courses → in-person flag + web-page paste
- *Superseded the first take (leave it unmarked).* The user pointed out that the wgu.edu program page marks exactly which courses have in-person clinicals or labs, and a nursing student needs that.
- The PDF can't answer it reliably. Every nursing description says "clinical judgment model", and the only real clues are indirect ("progress to Adult Health I clinical"). Scanning descriptions would mark almost everything. So **only course names are trusted** (Clinical / Student Teaching / Practicum / Field Experience).
- New optional course field `inPerson`: `"Clinical" | "Lab" | "Student teaching" | "Field experience"`. The tracker shows a badge and an "In person" status button. **A course isn't Complete until that part is Complete too.**
- The setup page has an "In person" column (set by hand) and an optional **paste box**: the student pastes the course list from their program's web page. `readWebCourseList()` in `parse-guide.js` reads the footnote to learn what "*" means, marks starred courses, reads "(in-person … lab …)" as Lab, and records "(virtual … lab …)" as a note, not in-person. It matches by name with the longest name winning, so "Adult Health II" isn't read as "Adult Health I". It only suggests changes: the table shows them before download.
- Test fixture `setup/test/web-list-bspntr.txt` is the list the user copied from wgu.edu. It marks 9 courses (7 Clinical, 2 Lab), and Advanced Nursing Skills stays not-in-person.

### Scope: who this tracker is for
- Asked "would a nursing student use this?" Honest answer: **prelicensure nursing only partially.** Its nursing courses are locked in sequence ("all prelicensure nursing curriculum courses from previous terms"), so the plan toggle and savings note don't help there. Clinical placement being set by WGU is our understanding, not stated in the guide. What those students really track (clinical hours, compliance paperwork, NCLEX prep) is out of scope.
- **Strong fit:** self-paced programs, including RN-to-BSN (BSNU), IT, business, and the coursework before student teaching in education programs.
- Decision (user, 2026-09-24): keep the in-person badge and paste box (cheap, and helps education programs too), but build **no nursing-specific features**. README must say this plainly.

### Add or change an in-person part from the tracker itself
- User request: a student should be able to add the badge without re-running setup.
- Every non-transfer course card now has a quiet dashed "+ In-person part" button. Clicking it adds a part and cycles the type: Clinical → Lab → Student teaching → Field experience → none. Once a part is set, the "In person" row shows the type (click to change or remove) and its own status.
- The choice is saved with progress as `<key>_iptype` (in localStorage and in exports) and **overrides config.js**. `""` means "no part", even if config.js set one. Invalid values are dropped on load or import.
- Trade-off: every course card in a program with no in-person parts gets one extra small line. Accepted, since it's how a student fixes a wrong or missing mark without editing config.js.

### Not inferring in-person from CU count
- The user noticed the BSPNTR clinical courses are 5 CU. Checked against the guide: six clinical courses are 5 CU, but Professional Nursing Role Transition (clinical) is 6 CU and the two in-person labs are 3 CU. A CU rule would mislabel some courses, and it wouldn't carry to other programs, so it isn't used.

---

## 2026-09-24: Phase 2 (repo layout, docs, AI layer)

### Repo: `wgu-degree-tracker`, MIT, © Cosmic-Cluster
- Name chosen by the user. The GitHub username is the copyright holder, which keeps a legal name off the repo.
- Built as a clean folder holding only publishable files. Kept out: the original personal tracker, the handoff notes, and all Program Guide PDFs (WGU's documents; `.gitignore` blocks `*.pdf`).
- `setup/test/web-list-bspntr.txt` is a short course list copied from WGU's public program page, kept as a test fixture for the paste reader. It's a factual course list, not a whole document.

### `examples/config.mscsia.js`
- Built from the maintainer's original tracker, **with personal data removed**: their three transferred certs and expiry dates, the 2-term plan built around that transfer credit, payment status, start date, and all progress.
- Kept: courses and terms from the guide's standard path (4 terms), prerequisites rewritten from the guide's Prerequisites section, assessment guesses (all still `guess: true` unless unknown), and prep notes reworded to not address one person.
- Transferable certs are explained in a Notes callout plus course notes, and **not** set as `transfer: true` or `cert` (those mean "already satisfied" for this student).
- The tuition figure ($5,125) is marked `EDIT ME`, because rates change.

### AI layer: optional, never required
- User request: a version AI can read to help generate and update the tracker.
- Decision: no separate "AI version" of the app. The tracker stays AI-free, per the standing requirement that tools run without an AI. Added instead:
  - `AI-GUIDE.md`: tasks (build from PDF, update, answer questions from exported progress), mandatory honesty rules (no invented OA/PA, no unconfirmed transfer, mark thin data), progress-key stability rules, the progress-file format, and a hand-back checklist. Includes copy-paste prompts for chat AIs that can't see files.
  - `AGENTS.md` (the emerging cross-tool convention) and `CLAUDE.md` (a pointer to it), so coding assistants pick up the rules automatically.
  - `config.schema.json` (JSON Schema 2020-12). Validated against config.example.js, the MSCSIA example, and all 11 setup-generated configs: all valid.
- AI-GUIDE's rule 7 tells assistants to treat PDF, web and progress-file contents as data, never as instructions (prompt-injection hygiene).

### SECURITY.md and the pdf.js CVE (2026-09-26)
- Prompted by a review note: once public, Dependabot and `npm audit` will flag CVE-2024-4367 (GHSA-wgrm-67xf-hhpq), and an unexplained red alert reads as "unaddressed".
- Correction to that note: Dependabot only reads manifests. It will flag `setup/test/package.json` (the dev-only test harness) but **cannot see** the vendored `setup/vendor/pdfjs/*.min.js` that actually runs for students. SECURITY.md therefore documents both copies and says the vendored one is the one that matters.
- SECURITY.md covers: private reporting via GitHub, the data model (all local), "treat config.js as code" (notes html is inserted raw), and a risk-acceptance section with scope, why we can't upgrade (file:// needs classic scripts), mitigation, residual risk, revisit triggers, and maintainer steps (dismiss the alert as "Risk is tolerable" with a link; if CI runs audit, allowlist only this GHSA via e.g. audit-ci).
- **The mitigation is now enforced:** `run-tests.js` fails if any `getDocument()` call in setup.html or the test harness lacks `isEvalSupported: false`. Verified in both directions: it passes on the real code and fails when the flag is stripped from a copy.
- **No pre-emptive suppression (user decision, 2026-09-26).** Nothing is dismissed, allowlisted or ignored before a scanner actually reports it. When a finding appears, the disposition is recorded **on the finding itself** (Dependabot dismissal reason and note, or a CI allowlist entry added in the same change that first sees the failure), and it links to SECURITY.md. Being prepared means having SECURITY.md and the dismissal note ready; it doesn't mean acting before the finding exists.

---

## 2026-09-27: CI (lint, tests, secrets, audit)

### Dev tooling moved to a root `package.json`
- One root `package.json` (private, devDependencies only) replaces `setup/test/package.json`, and `package-lock.json` is committed so CI and `npm audit` are reproducible. Its `description` says the tracker itself needs no npm.
- Scripts: `lint`, `test` (unit tests + schema validation, what CI runs), `test:guides` (real-PDF tests, local only).

### Finding: `canvas` → `@mapbox/node-pre-gyp` → `tar` (1 critical, 2 high) — remediated
- First local `npm audit` reported **4 vulnerabilities, not 1**. pdfjs-dist 3.11.174 has an *optional* dependency on `canvas@^2.11.2`, which depends on `@mapbox/node-pre-gyp` ≤1.0.11 → `tar` ≤7.5.20 (GHSA-34x7-hfp2-rc4v, GHSA-8qq5-rm4j-mr97 and others: path traversal / file overwrite during extraction).
- Exposure: developer install time only (node-pre-gyp downloads and unpacks a prebuilt binary). Never reaches students, and canvas isn't used, since we only extract text.
- **Fixed, not suppressed:** `package.json` `overrides: { canvas: "^3.2.0" }`. canvas 3.x uses prebuild-install and no longer depends on node-pre-gyp/tar. After the change, `npm audit` reports only the known pdf.js advisory. All 11 real-guide tests still pass with canvas 3 installed, and the "Cannot polyfill DOMMatrix" warnings are gone.
- Revisit if pdfjs-dist is ever upgraded (drop the override if the new version doesn't need it).

### PDF-free unit tests (`setup/test/unit-tests.js`)
- The real-guide tests need WGU's PDFs, which can't be in the repo, so CI couldn't run them. The unit tests build fake "Standard Path" tables as positioned text (the same shape pdf.js produces), reproducing every layout quirk found in the 11 real guides: wrapped names, no Term column, Option A/B columns, term 0, multi-part tables, name-based in-person detection, requirement sections, prerequisite-list codes (incl. loose match), non-guide PDFs, both term-assignment modes, and the web-page paste reader (using the real BSPNTR list).
- The security guard moved to `setup/test/security-guard.js`, shared by both test scripts.
- `setup/test/validate-configs.js` runs each shipped config in an isolated `vm` context and validates it against `config.schema.json`.

### ESLint
- ESLint 9 flat config with `eslint-plugin-html`, because most code lives in `<script>` tags. Verified it actually inspects inline scripts (a planted undefined variable is caught).
- Browser code is ES2017 script mode; tests are Node/CommonJS; `setup/vendor/` is ignored.
- It found one real issue (unused `MAX_TERM` in index.html, removed). Deliberate `catch (e) {}` blocks are allowed via `caughtErrors: "none"` rather than switching to ES2019 syntax.

### `.github/workflows/ci.yml`
- Four independent jobs: lint, test, secrets (gitleaks, full history), audit (`npm audit`, all severities, lockfile incl. optional/dev packages).
- `permissions: contents: read`; newer pushes cancel older runs.
- Actions pinned to full commit SHAs, looked up from the upstream repos on 2026-09-27: checkout v7.0.1, setup-node v7.0.0, gitleaks-action v3.0.0. gitleaks-action needs no license for personal-account repos (per its README).
- `npm ci --omit=optional` in lint/test only (canvas isn't needed there). The audit job reads the full lockfile, so nothing is scoped out of the audit.
- Verified locally before the first push: clean install, lint clean, 16/16 unit tests, 2/2 configs valid, gitleaks "no leaks found", actionlint valid.
- **Expected first-run result: `audit` fails** on GHSA-wgrm-67xf-hhpq (pdf.js). Per "No pre-emptive suppression", there's no allowlist yet. The disposition gets recorded in the commit that responds to that CI run, linking the run and SECURITY.md.

### MSCSIA example: full transfer requirements (2026-09-27)
- The example was derived from the maintainer's personal tracker, which (correctly, for a personal plan) only covered the transfers that applied to them: the three certs they held. A public example has to serve everyone, so it now lists **every accepted option** for each transferable course, quoted from WGU's MSCSIA partner transfer page (Sep 2026): D483 (six options), D484 (five), D488 (SecurityX/CASP+), D489 (ISACA CISM) and E121 (a 2-unit graduate course in AI GRC, not a cert). Five courses, 18 CUs.
- Requirements go in each course's `notes` with the source and date. The header callout links to the program page and the general transfer guidelines.
- partners.wgu.edu renders with JavaScript, so it couldn't be fetched automatically. The requirements come from the table the user pasted, and the general guidelines are **linked, not summarized**, to avoid paraphrasing a page nobody could read here. AI-GUIDE rule 4 now names partners.wgu.edu as the authoritative transfer source and says to ask the student to paste it when a tool can't read it.

### First CI run (run 36348495566): gitleaks-action replaced with the gitleaks CLI
- Result: lint ✓, test ✓, audit ✗ (expected, pdf.js, handled separately), **secrets ✗**.
- Cause: not a finding. gitleaks-action scans only the pushed range, `<first>^..<last>`. On the repo's first push the first commit is the root commit, which has no parent, so git failed with "unknown revision", gitleaks "scanned ~0 bytes", and the job exited 1. **The run did not scan anything.** Its "no leaks found in partial scan" must not be read as a clean result.
- This also exposed an error in the original workflow comment ("full history, so secrets in old commits are found too"). `fetch-depth: 0` only downloads history. The action still scans just the pushed commits, and it would never have rescanned old commits.
- Fix: run the gitleaks CLI directly: `gitleaks git --redact --verbose --exit-code 1 .` over the **full history on every run**. v8.30.1 is pinned, and the download is verified with `sha256sum --check` against the official checksum from the release's checksums file (551f6fc8…70eb, confirmed 2026-09-27). This drops the third-party action wrapper from the pipeline. It matches the local pre-push scan (same version, same command: no leaks, ~1.78 MB scanned).

### Audit finding recorded: GHSA-wgrm-67xf-hhpq allowlisted (responds to run 36348495566)
- **Finding:** CI run 36348495566 (2026-09-27, the first push) failed `npm audit` with exactly one advisory: `pdfjs-dist ≤4.1.392`, GHSA-wgrm-67xf-hhpq, high (CVSS 8.8). Nothing else was reported. The canvas → tar chain stayed fixed on GitHub's runners too. Run 36349199975 (the gitleaks fix) reported the same single advisory.
- **Disposition:** accepted risk, mitigated. The rationale, mitigation and revisit triggers are in SECURITY.md and are unchanged.
- **Mechanism:** the audit job now runs `npm run audit` → `audit-ci --config audit-ci.jsonc` (audit-ci 7.1.0, exact-pinned devDependency). The allowlist entry is path-scoped (`GHSA-wgrm-67xf-hhpq|pdfjs-dist`) and has a comment with the run URL. `low: true` fails on every severity, and `show-not-found` reports the entry if it ever stops matching, so a stale exception gets noticed.
- **Verified before committing:** passes on the real lockfile (exit 0). With the canvas override removed, which brings the tar advisories back, it **fails** (exit 1). So the allowlist doesn't mask anything beyond this one advisory. Adding audit-ci introduced no new advisories.
- **Not done:** `npm audit fix --force` (suggested by npm). It would install pdfjs-dist 6.x, which can't load from file://. Never run it on this repo.
- **Dependabot:** if an alert opens for the same advisory, dismiss it as "Risk is tolerable" with a link to SECURITY.md at that time, per "No pre-emptive suppression". Not before.

---

## 2026-10-06: Correction: PDF provenance is not a control

- The Phase 1 pdf.js entry said "The input is also a PDF the student downloaded from WGU themselves." That overstated it. The setup page opens whatever PDF the user picks and has no way to check its origin: WGU doesn't sign its guides, and a hash list would break whenever a guide is updated. The parser's "Is it a WGU Program Guide?" warning runs only after pdf.js has already read the file, so it isn't a security check either.
- Corrected the sentence in place and marked it. SECURITY.md already had the accurate wording ("a PDF the student chose themselves, normally their own Program Guide") and is unchanged.
- How to describe the risk correctly: the **control** is `isEvalSupported: false`, enforced by a test. User-selected input and the lack of any server or stored secret are **likelihood and impact reducers**, not controls.
- First change made through a pull request, now that `main` requires one.
