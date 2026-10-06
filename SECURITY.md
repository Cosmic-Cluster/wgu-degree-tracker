# Security Policy

## Reporting a vulnerability

Please **don't open a public issue** for security problems. Use GitHub's private reporting instead: go to the **Security** tab → **Report a vulnerability**. You'll get a response within a week. This is a volunteer project, so there is no bug bounty.

Only the latest version on the `main` branch is supported.

## How this project handles data

- Everything runs in your browser. There's no server, no account, no analytics and no network requests after the page loads.
- Your Program Guide PDF is read locally by the setup page and never uploaded.
- Progress is stored in your browser's `localStorage`, and in files only when you export them.
- **Treat `config.js` as code.** It's JavaScript, and the `notes[].html` field is inserted into the page as HTML. Only use a `config.js` you made yourself or got from a source you trust, just as you would any script.

## Known and accepted: CVE-2024-4367 in pdf.js 3.11.174

**Advisory:** [GHSA-wgrm-67xf-hhpq](https://github.com/advisories/GHSA-wgrm-67xf-hhpq), "Arbitrary JavaScript execution upon opening a malicious PDF". Affects pdf.js / `pdfjs-dist` ≤ 4.1.392; fixed in 4.2.67.

**Status: present on purpose, mitigated, risk accepted.** If you see a Dependabot or `npm audit` alert for it on this repo, this section is the explanation.

**Severity as published:** CVSS 8.8 (high). EPSS was 70.66% (99th percentile) when reviewed on 2026-10-06, so this CVE is being exploited in the wild. Those numbers describe the common case: a website that renders PDFs supplied by strangers, with user sessions and data behind it. The sections below explain why this project's exposure is much narrower. The acceptance was made with both numbers in view.

### Where the vulnerable version exists

| Copy | Used by | Detected by scanners? |
|---|---|---|
| `setup/vendor/pdfjs/pdf.min.js` + `pdf.worker.min.js` (vendored) | `setup/setup.html`, in students' browsers | **No.** It isn't listed in any manifest, so Dependabot and `npm audit` can't see it. |
| `pdfjs-dist@3.11.174` in the root `package.json` / `package-lock.json` (devDependency) | Parser tests, run in Node by developers and CI only | Yes. This is what an alert points at. |

The vendored copy is the one that matters, since it's what runs for end users. It's covered here even though no scanner will flag it.

**The two copies are kept identical by a test.** `setup/test/security-guard.js` fails the build unless the version in `package.json`, `package-lock.json`, `VERSION.txt` and the bundled file itself all match, and the bundled files are byte-for-byte the official npm release. This closes a trap: upgrading only the dev copy (for example by merging a Dependabot security update) would close the scanner alert as "fixed" while the copy users run stayed vulnerable.

### Where pdf.js runs, and for how long

- pdf.js is loaded by **one page only**: `setup/setup.html`. The tracker itself (`index.html`) never loads it.
- Setup is a **one-time step**: a student loads their Program Guide, downloads `config.js`, and is done. It's repeated only for a new catalog version.
- The PDF is read in memory. The setup page makes no network requests and stores nothing.

### Why not upgrade

pdf.js 4.x and later ship only as ES modules. Browsers refuse to load ES modules from `file://` pages, and "double-click `setup.html`, no install, no server" is a core requirement of this project. 3.11.174 is the last release with classic-script builds. Full reasoning is in [DECISIONS.md](DECISIONS.md) ("pdf.js 3.11.174 (legacy build), vendored").

### Mitigation

1. **The documented workaround is applied.** Every `getDocument()` call passes `isEvalSupported: false`, which is the workaround listed in the advisory. This stops pdf.js from compiling font data into JavaScript, which is the path the exploit uses. The setup page also passes `disableFontFace: true`. It only needs text, so fonts are never rendered.
2. **The mitigation is enforced by a test.** `setup/test/run-tests.js` fails if `setup/setup.html` or the test harness ever calls `getDocument` without `isEvalSupported: false`.
3. **Limited exposure (these reduce likelihood and impact; they are not controls).** The page only opens a file the student picks themselves, never one fetched automatically or by URL. Normally that's their own Program Guide from wgu.edu, but the page **cannot verify where a PDF came from**. There is no server-side component and no stored secrets or sessions to steal. It runs from `file://` or a static GitHub Pages site.

### Residual risk

If someone tricked a student into loading a malicious PDF *and* found a way around the eval workaround, script could run in the setup page's context. What that could reach:

- **Saved progress** for that page's origin (course statuses, "term paid" marks). Low sensitivity.
- **The `config.js` download.** The setup page's output is a file the tracker later runs as code, so a compromised setup page could hand over a tampered config. This is the one path that outlives the setup session.
- **Other data on the same origin, if hosted.** All of one account's GitHub Pages sites share an origin, so a hosted copy could see browser storage from that account's other Pages projects. This doesn't apply when the files are opened locally.

We consider this low. Revisit if any of these happen:

- a new pdf.js advisory affecting 3.x that `isEvalSupported: false` doesn't cover
- a 3.x release that includes the fix
- dropping the `file://` requirement (e.g. hosted-only), which would allow moving to 4.x or later

### For maintainers

- **Dependabot alert:** when one appears for this advisory, dismiss it with reason **"Risk is tolerable"** and a note linking this section. Don't leave it open. (Alert #1 was raised for it on this repo.)
- **Do not use "Create Dependabot security update"** for this alert, and keep automatic Dependabot security updates off. It upgrades only the dev copy. The version-match test will fail such a change, which is the intended result.
- **Upgrading pdf.js for real** means replacing both copies together: the files in `setup/vendor/pdfjs/` (plus `VERSION.txt`) and the `pdfjs-dist` devDependency, then running `npm run test:guides` against real Program Guides.
- **CI:** the audit job runs `npm run audit` (audit-ci). Its allowlist in `audit-ci.jsonc` contains exactly this advisory, scoped to `pdfjs-dist`, and links the CI run that first reported it ([run 36348495566](https://github.com/Cosmic-Cluster/wgu-degree-tracker/actions/runs/36348495566)). Any other advisory, or this one on another package, still fails the build. Only add an entry in the commit that responds to the run that reported it.
