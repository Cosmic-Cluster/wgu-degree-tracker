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

### Where the vulnerable version exists

| Copy | Used by | Detected by scanners? |
|---|---|---|
| `setup/vendor/pdfjs/pdf.min.js` + `pdf.worker.min.js` (vendored) | `setup/setup.html`, in students' browsers | **No.** It isn't listed in any manifest, so Dependabot and `npm audit` can't see it. |
| `pdfjs-dist@3.11.174` in the root `package.json` / `package-lock.json` (devDependency) | Parser tests, run in Node by developers and CI only | Yes. This is what an alert points at. |

The vendored copy is the one that matters, since it's what runs for end users. It's covered here even though no scanner will flag it.

### Why not upgrade

pdf.js 4.x and later ship only as ES modules. Browsers refuse to load ES modules from `file://` pages, and "double-click `setup.html`, no install, no server" is a core requirement of this project. 3.11.174 is the last release with classic-script builds. Full reasoning is in [DECISIONS.md](DECISIONS.md) ("pdf.js 3.11.174 (legacy build), vendored").

### Mitigation

1. **The documented workaround is applied.** Every `getDocument()` call passes `isEvalSupported: false`, which is the workaround listed in the advisory. This stops pdf.js from compiling font data into JavaScript, which is the path the exploit uses. The setup page also passes `disableFontFace: true`. It only needs text, so fonts are never rendered.
2. **The mitigation is enforced by a test.** `setup/test/run-tests.js` fails if `setup/setup.html` or the test harness ever calls `getDocument` without `isEvalSupported: false`.
3. **Limited exposure.** The input is a PDF the student chose themselves, normally their own Program Guide downloaded from wgu.edu. The page has no server-side component and no stored secrets or sessions to steal. It runs from `file://` or a static GitHub Pages site.

### Residual risk

If someone tricked a student into loading a malicious PDF *and* found a way around the eval workaround, script could run in the setup page's context. There, it could read the progress stored for that page's origin and trigger downloads. We consider this low. Revisit if any of these happen:

- a new pdf.js advisory affecting 3.x that `isEvalSupported: false` doesn't cover
- a 3.x release that includes the fix
- dropping the `file://` requirement (e.g. hosted-only), which would allow moving to 4.x or later

### For maintainers

- **Dependabot alert:** dismiss it with reason **"Risk is tolerable"** and a note linking this section. Don't leave it open.
- **CI:** if you add an `npm audit` job, allowlist exactly this advisory (`GHSA-wgrm-67xf-hhpq`) with a comment linking here, rather than disabling audit. Plain `npm audit` has no per-advisory ignore, so use a wrapper that supports an allowlist (e.g. `audit-ci`). Don't let the job fail on every push for a decision that's already made, and don't silence everything else along with it.
