// ============================================================================
// Security guard for CVE-2024-4367 (see SECURITY.md).
//
// This project ships pdf.js 3.11.174 on purpose. The compensating control is
// passing `isEvalSupported: false` to every pdf.js getDocument() call. This
// check fails if any call site is missing it, so the control can't be removed
// by accident. Used by unit-tests.js (runs in CI) and run-tests.js.
// ============================================================================
const fs = require('fs');
const path = require('path');

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

module.exports = { checkEvalDisabled };
