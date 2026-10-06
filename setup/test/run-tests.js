// ============================================================================
// Parser regression tests against REAL Program Guide PDFs (local only).
//
//   npm install                      (once, in the repo root)
//   npm run test:guides -- "/path/to/folder/of/Program Guide PDFs"
//
// The PDFs are WGU's documents and aren't in the repo, so CI can't run this.
// CI runs unit-tests.js instead (no PDFs needed). Run this before merging any
// change to parse-guide.js. End users never need it.
// For each PDF named in expected.json that exists in the folder, checks
// course count, CU total, term-column count and a few course names.
// ============================================================================
const fs = require('fs');
const path = require('path');
const parser = require('../parse-guide.js');
const { pagesFromPdf } = require('./dump-parse.js');
const expected = require('./expected.json');

(async () => {
  const dir = process.argv[2];
  if (!dir) { console.error('usage: node run-tests.js <folder of PDFs>'); process.exit(2); }
  let failures = 0, ran = 0;

  // Security guard (see SECURITY.md, CVE-2024-4367). Same check as unit-tests.js.
  for (const r of require('./security-guard.js').checkEvalDisabled()) {
    if (!r.ok) { failures++; console.log(`FAIL  security: ${r.file} calls pdf.js getDocument() without isEvalSupported: false (CVE-2024-4367 mitigation)`); }
    else console.log(`ok    security: ${r.file} (eval disabled on ${r.calls} getDocument call(s))`);
  }

  const vendorProblems = require('./security-guard.js').checkVendoredPdfjs();
  if (vendorProblems.length) { failures++; vendorProblems.forEach(m => console.log(`FAIL  security: ${m}`)); }
  else console.log('ok    security: bundled pdf.js matches the pinned devDependency, byte for byte');

  for (const [file, exp] of Object.entries(expected)) {
    if (file.startsWith('_')) continue;
    const full = path.join(dir, file);
    if (!fs.existsSync(full)) { console.log(`skip  ${file} (not in folder)`); continue; }
    ran++;
    const r = parser.parse(await pagesFromPdf(full));
    const sum = r.courses.reduce((s, c) => s + c.cu, 0);
    const names = new Set(r.courses.map(c => c.name));
    const problems = [];
    if (r.courses.length !== exp.courses) problems.push(`courses ${r.courses.length} != ${exp.courses}`);
    if (sum !== exp.cu) problems.push(`CU total ${sum} != ${exp.cu}`);
    if (r.termColumns.length !== exp.termColumns) problems.push(`term columns ${r.termColumns.length} != ${exp.termColumns}`);
    if (r.programCode !== exp.code) problems.push(`program code ${r.programCode} != ${exp.code}`);
    if (exp.requirements !== undefined && r.requirements.length !== exp.requirements) problems.push(`requirements ${r.requirements.length} != ${exp.requirements}`);
    if (exp.transfer !== undefined && r.courses.filter(c => c.transfer).length !== exp.transfer) problems.push('transfer count');
    if (exp.codes !== undefined && r.courses.filter(c => c.code).length !== exp.codes) problems.push('course code count');
    if (exp.sections !== undefined && r.sections.length !== exp.sections) problems.push(`sections ${r.sections.length} != ${exp.sections}`);
    if (exp.maxGuideTerm !== undefined) {
      const mx = Math.max(...r.courses.map(c => c.guideTerms[0] || 0));
      if (mx !== exp.maxGuideTerm) problems.push(`last guide term ${mx} != ${exp.maxGuideTerm}`);
    }
    if (exp.inPerson !== undefined) {
      // exactly these courses (by name) should be detected as in-person from their names
      const got = Object.fromEntries(r.courses.filter(c => c.inPerson).map(c => [c.name, c.inPerson]));
      if (JSON.stringify(got) !== JSON.stringify(exp.inPerson)) problems.push(`in-person from names: got ${JSON.stringify(got)}`);
    }
    if (exp.webList) {
      // pasted program-web-page list -> which courses get marked in-person
      const w = parser.readWebCourseList(fs.readFileSync(path.join(__dirname, exp.webList.file), 'utf8'), r.courses);
      const got = Object.fromEntries(w.marks.filter(m => m.inPerson).map(m => [r.courses[m.index].name, m.inPerson]));
      if (w.matchedLines !== exp.webList.matched) problems.push(`web list matched ${w.matchedLines} != ${exp.webList.matched}`);
      for (const [n, t] of Object.entries(exp.webList.marks)) if (got[n] !== t) problems.push(`web list: "${n}" -> ${got[n]} (want ${t})`);
      for (const n of exp.webList.notInPerson) if (got[n]) problems.push(`web list wrongly marked "${n}"`);
      if (Object.keys(got).length !== Object.keys(exp.webList.marks).length) problems.push(`web list marked ${Object.keys(got).length} courses`);
    }
    (exp.has || []).forEach(n => { if (!names.has(n)) problems.push(`missing "${n}"`); });
    if (r.courses.some(c => /\s-\s\w|\s{2}/.test(c.name) && !/ - (Applications|Foundations)/.test(c.name))) problems.push('suspicious spacing in a name');
    if (problems.length) { failures++; console.log(`FAIL  ${file}: ${problems.join('; ')}`); }
    else console.log(`ok    ${file}  ${r.courses.length} courses, ${sum} CU`);
  }
  console.log(`\n${ran - failures}/${ran} guides passed`);
  process.exit(failures ? 1 : 0);
})();
