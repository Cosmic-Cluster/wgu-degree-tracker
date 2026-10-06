// ============================================================================
// Security guards for the bundled pdf.js (see SECURITY.md, CVE-2024-4367).
// Used by unit-tests.js (runs in CI) and run-tests.js.
//
// Guard 1, checkEvalDisabled():
//   This project ships pdf.js 3.11.174 on purpose. The compensating control is
//   passing `isEvalSupported: false` to every pdf.js getDocument() call. This
//   fails if any call site is missing it, so the control can't be removed by
//   accident.
//
// Guard 2, checkVendoredPdfjs():
//   pdf.js exists in two places: the copy bundled in setup/vendor/pdfjs/ (what
//   users actually run) and the pdfjs-dist devDependency (what the tests use,
//   and the ONLY copy Dependabot and npm audit can see). This fails if they
//   ever drift apart. Without it, someone could upgrade the devDependency,
//   watch the scanner alert close as "fixed", and leave the bundled copy
//   vulnerable. It also proves the bundled files are byte-for-byte the official
//   npm release, i.e. nobody has modified them.
// ============================================================================
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const VENDOR = path.join(ROOT, 'setup', 'vendor', 'pdfjs');

// Every file that calls pdf.js. Add new ones here.
const FILES = ['../setup.html', './dump-parse.js'];

function checkEvalDisabled() {
  const results = [];
  for (const f of FILES) {
    const src = fs.readFileSync(path.join(__dirname, f), 'utf8');
    const calls = src.match(/getDocument\(\{[^}]*\}/g) || [];
    const ok = calls.length > 0 && calls.every(c => /isEvalSupported:\s*false/.test(c));
    results.push({ file: f, ok, calls: calls.length });
  }
  return results;
}

// Returns a list of problems. Empty list = all good.
function checkVendoredPdfjs() {
  const problems = [];
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const lock = JSON.parse(fs.readFileSync(path.join(ROOT, 'package-lock.json'), 'utf8'));

  // The devDependency must be pinned to one exact version (no ^ or ~ ranges).
  const declared = (pkg.devDependencies || {})['pdfjs-dist'];
  if (!/^\d+\.\d+\.\d+$/.test(declared || '')) {
    problems.push(`package.json must pin pdfjs-dist to an exact version, found "${declared}"`);
    return problems;
  }

  // Version recorded in each place.
  const versions = { 'package.json': declared };
  versions['package-lock.json'] = ((lock.packages || {})['node_modules/pdfjs-dist'] || {}).version;
  const versionTxt = fs.readFileSync(path.join(VENDOR, 'VERSION.txt'), 'utf8');
  versions['setup/vendor/pdfjs/VERSION.txt'] = (versionTxt.match(/pdfjs-dist (\d+\.\d+\.\d+)/) || [])[1];
  const vendoredMain = fs.readFileSync(path.join(VENDOR, 'pdf.min.js'), 'utf8');
  versions['setup/vendor/pdfjs/pdf.min.js (built-in version string)'] = (vendoredMain.match(/version="(\d+\.\d+\.\d+)"/) || [])[1];

  for (const [where, v] of Object.entries(versions)) {
    if (v !== declared) problems.push(`pdf.js version mismatch: ${where} says "${v}", package.json says "${declared}"`);
  }

  // The bundled files must be byte-identical to the installed npm release.
  const installed = path.join(ROOT, 'node_modules', 'pdfjs-dist');
  if (!fs.existsSync(installed)) {
    problems.push('pdfjs-dist is not installed, so the bundled copy cannot be compared. Run `npm ci` first.');
    return problems;
  }
  const installedVersion = JSON.parse(fs.readFileSync(path.join(installed, 'package.json'), 'utf8')).version;
  if (installedVersion !== declared) problems.push(`installed pdfjs-dist is ${installedVersion}, package.json says ${declared}`);
  for (const f of ['pdf.min.js', 'pdf.worker.min.js']) {
    const bundled = fs.readFileSync(path.join(VENDOR, f));
    const official = fs.readFileSync(path.join(installed, 'legacy', 'build', f));
    if (!bundled.equals(official)) {
      problems.push(`setup/vendor/pdfjs/${f} is not byte-identical to pdfjs-dist@${installedVersion}/legacy/build/${f}`);
    }
  }
  return problems;
}

module.exports = { checkEvalDisabled, checkVendoredPdfjs };
