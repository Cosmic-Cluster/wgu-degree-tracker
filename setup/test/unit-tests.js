// ============================================================================
// Unit tests for setup/parse-guide.js. No PDFs needed, so these run in CI.
//
//   npm test            (from the repo root)
//
// Each test builds a fake "Standard Path" table as positioned text items,
// the same shape pdf.js produces, and checks what the parser makes of it.
// The layouts copy real quirks seen in WGU Program Guides (see DECISIONS.md):
// wrapped course names, two term columns, term 0, multi-part tables, etc.
// The real-PDF tests (run-tests.js) remain the final check before a release.
// ============================================================================
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const parser = require('../parse-guide.js');
const { checkEvalDisabled } = require('./security-guard.js');

// ---- tiny test runner -------------------------------------------------------
let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`ok    ${name}`); }
  catch (e) { failed++; console.log(`FAIL  ${name}\n      ${e.message}`); }
}

// ---- fake-page builder --------------------------------------------------------
// Column x positions roughly match the real guides.
const X_NAME = 40, X_CU = 300, X_TERM = 480, X_TERM2 = 540;

// One text item. Width is approximate (5pt per character), which is all the
// parser needs to tell "touching" tokens from separate words.
function item(str, x, y) { return { str, x, y, width: str.length * 5 }; }

// Words of a phrase as separate items on one line, the way pdf.js splits them.
function words(text, x, y) {
  const out = []; let cx = x;
  for (const w of text.split(' ')) { out.push(item(w, cx, y)); cx += w.length * 5 + 4; }
  return out;
}

// Build a page from rows. Each row: { name, cu, terms: [..] }, where name may
// be an array of lines to simulate wrapping. Wrapped names put the numbers
// halfway between the name lines, exactly like the real guides.
function tablePage(title, rows, opts = {}) {
  const items = [];
  let y = 740;
  items.push(...words('Standard Path for ' + title, 100, y)); y -= 18;
  if (opts.optionHeader) { items.push(item('Option A', X_TERM - 10, y), item('Option B', X_TERM2 - 10, y)); y -= 10; }
  const termCols = opts.termCols === undefined ? 1 : opts.termCols;
  items.push(...words('Course Description', 80, y), item('CUs', X_CU - 5, y));
  for (let t = 0; t < termCols; t++) items.push(item('Term', t ? X_TERM2 : X_TERM, y));
  y -= 25;
  for (const r of rows) {
    const lines = Array.isArray(r.name) ? r.name : [r.name];
    const numbersY = y - (lines.length - 1) * 6;
    lines.forEach((ln, i) => items.push(...words(ln, X_NAME, y - i * 12)));
    items.push(item(String(r.cu), X_CU, numbersY));
    (r.terms || []).forEach((t, i) => items.push(item(String(t), i ? X_TERM2 : X_TERM, numbersY)));
    y -= 38;
  }
  if (opts.total !== undefined) items.push(...words('Total CUs', X_NAME, y), item(String(opts.total), X_CU, y));
  return { items };
}

function textPage(lines) {
  return { items: lines.map((l, i) => item(l, 40, 700 - i * 14)) };
}

// ---- tests --------------------------------------------------------------------

test('security: every pdf.js getDocument() call disables eval (CVE-2024-4367)', () => {
  for (const r of checkEvalDisabled()) assert.ok(r.ok, `${r.file} is missing isEvalSupported: false`);
});

test('basic table: names, CUs, terms, total check', () => {
  const r = parser.parse([
    textPage(['Program Guidebook', 'Program Code: BSEX Catalog Version: 202601 Published Date: 1/1/2026']),
    tablePage('Bachelor of Science, Example', [
      { name: 'Introduction to IT', cu: 3, terms: [1] },
      { name: 'Applied Algebra', cu: 3, terms: [1] },
      { name: 'Capstone', cu: 4, terms: [2] }
    ], { total: 10 })
  ]);
  assert.deepStrictEqual(r.courses.map(c => [c.name, c.cu, c.guideTerms[0]]),
    [['Introduction to IT', 3, 1], ['Applied Algebra', 3, 1], ['Capstone', 4, 2]]);
  assert.strictEqual(r.statedTotalCu, 10);
  assert.strictEqual(r.programCode, 'BSEX');
  assert.strictEqual(r.catalogVersion, '202601');
  assert.strictEqual(r.level, 'undergraduate');
  assert.ok(!r.warnings.some(w => /add up/.test(w)), 'no total-mismatch warning');
});

test('wrapped course names are joined in order', () => {
  const r = parser.parse([tablePage('Master of Science, Example', [
    { name: ['Governance, Risk, and Compliance in', 'the Age of Artificial Intelligence'], cu: 2, terms: [4] },
    { name: ['Business Environment Applications I:', 'Business Structures and Legal', 'Environment'], cu: 2, terms: [5] }
  ], { total: 4 })]);
  assert.deepStrictEqual(r.courses.map(c => c.name), [
    'Governance, Risk, and Compliance in the Age of Artificial Intelligence',
    'Business Environment Applications I: Business Structures and Legal Environment'
  ]);
});

test('CU total mismatch produces a warning', () => {
  const r = parser.parse([tablePage('Bachelor of Science, Example', [
    { name: 'Course One', cu: 3, terms: [1] }
  ], { total: 99 })]);
  assert.ok(r.warnings.some(w => /add up to 3 CUs/.test(w) && /says 99/.test(w)));
});

test('no Total CUs line is flagged as unverified, not guessed', () => {
  const r = parser.parse([tablePage('Bachelor of Science, Example', [{ name: 'Course One', cu: 3, terms: [1] }])]);
  assert.strictEqual(r.statedTotalCu, null);
  assert.ok(r.warnings.some(w => /couldn't be double-checked/.test(w)));
});

test('table with no Term column', () => {
  const r = parser.parse([tablePage('Master of Science, Example', [
    { name: 'Course One', cu: 3 }, { name: 'Course Two', cu: 5 }
  ], { termCols: 0, total: 8 })]);
  assert.deepStrictEqual(r.termColumns, []);
  assert.deepStrictEqual(r.courses.map(c => c.guideTerms), [[], []]);
});

test('two term columns (Option A / Option B) and term 0 = transfer', () => {
  const r = parser.parse([tablePage('Bachelor of Science, Nursing', [
    { name: 'Advanced Standing for RN License', cu: 50, terms: [0, 0] },
    { name: 'Pathophysiology', cu: 3, terms: [4, 2] }
  ], { termCols: 2, optionHeader: true })]);
  assert.deepStrictEqual(r.termColumns, ['Option A', 'Option B']);
  assert.strictEqual(r.courses[0].transfer, true);
  assert.deepStrictEqual(r.courses[1].guideTerms, [4, 2]);
});

test('multi-part standard path: terms renumbered to run on', () => {
  const pre = tablePage('Bachelor of Science, Nursing - Prelicensure (Pre-Nursing)', [
    { name: 'Applied Algebra', cu: 3, terms: [1] },
    { name: 'Foundations of Nursing', cu: 3, terms: [4] }
  ]);
  const nursing = tablePage('Bachelor of Science, Nursing - Prelicensure (Nursing)', [
    { name: 'Basic Nursing Skills', cu: 3, terms: [1] },
    { name: 'Adult Health III', cu: 5, terms: [4] }
  ]);
  const r = parser.parse([pre, nursing]);
  assert.deepStrictEqual(r.sections, ['Pre-Nursing', 'Nursing']);
  assert.deepStrictEqual(r.courses.map(c => c.guideTerms[0]), [1, 4, 5, 8]);
  assert.strictEqual(r.programTitle, 'Bachelor of Science, Nursing - Prelicensure');
  assert.ok(r.warnings.some(w => /splits its standard path into 2 parts/.test(w)));
});

test('in-person detected from course names only', () => {
  const r = parser.parse([tablePage('Master of Arts in Teaching, Example', [
    { name: 'Early Clinical in Elementary Education', cu: 2, terms: [4] },
    { name: 'Student Teaching I in Elementary Education', cu: 4, terms: [7] },
    { name: 'Clinical Reasoning Basics', cu: 3, terms: [1] },  // name says Clinical -> marked
    { name: 'Health Assessment', cu: 3, terms: [1] }
  ])]);
  assert.deepStrictEqual(r.courses.map(c => c.inPerson), ['Clinical', 'Student teaching', 'Clinical', null]);
});

test('requirement sections become requirements', () => {
  const r = parser.parse([
    textPage(['External Content & Basic Skills Exams', 'State Licensure Requirements']),
    tablePage('Bachelor of Science, Example Education', [{ name: 'Course One', cu: 3, terms: [1] }])
  ]);
  assert.deepStrictEqual(r.requirements.map(q => q.id), ['content-basic-skills-exams', 'state-licensure']);
});

test('course codes from a prerequisites list, including a loose match', () => {
  const r = parser.parse([
    tablePage('Master of Science, Example', [
      { name: 'Secure Network Design', cu: 3, terms: [1] },
      { name: 'Cybersecurity Fundamentals', cu: 2, terms: [1] }
    ]),
    textPage(['• D482 Secure Network Design', '• E123 Security Fundamentals'])
  ]);
  assert.strictEqual(r.courses[0].code, 'D482');
  assert.strictEqual(r.courses[1].code, 'E123');
  assert.ok(r.courses[1].notes.some(n => /double-check/.test(n)), 'loose match is flagged');
});

test('not a Program Guide: clear warning, no courses', () => {
  const r = parser.parse([textPage(['Hello', 'This is some other PDF'])]);
  assert.strictEqual(r.courses.length, 0);
  assert.ok(r.warnings.some(w => /Standard Path/.test(w)));
});

test('assignTerms "guide" mode uses the chosen column; transfer goes to term 1', () => {
  const courses = [
    { cu: 50, guideTerms: [0, 0], transfer: true },
    { cu: 3, guideTerms: [4, 2], transfer: false }
  ];
  assert.deepStrictEqual(parser.assignTerms(courses, 'guide', { columnIndex: 0 }), [1, 4]);
  assert.deepStrictEqual(parser.assignTerms(courses, 'guide', { columnIndex: 1 }), [1, 2]);
});

test('assignTerms "target" mode: each term reaches AT LEAST the minimum', () => {
  const courses = [3, 3, 3, 3, 3, 5].map(cu => ({ cu, guideTerms: [], transfer: false }));
  // Minimum 8: 3+3+3=9 | 3+3+5=11. Never a term below 8 except the last.
  assert.deepStrictEqual(parser.assignTerms(courses, 'target', { cuPerTerm: 8 }), [1, 1, 1, 2, 2, 2]);
});

test('web-page list: stars, footnote, labs, virtual labs, longest-name match', () => {
  const names = ['Basic Nursing Skills', 'Health Assessment', 'Adult Health I', 'Adult Health II', 'Adult Health III',
    'Intermediate Nursing Skills', "Women's and Children's Nursing", 'Scholarship in Nursing Practice',
    'Psychiatric and Mental Health Nursing', 'Community Health and Population-Focused Nursing',
    'Information Technology in Nursing Practice', 'Organizational Systems and Healthcare Transformation',
    'Advanced Nursing Skills', 'Professional Nursing Role Transition', 'Intrapersonal Leadership and Professional Growth'];
  const courses = names.map(name => ({ name }));
  const text = fs.readFileSync(path.join(__dirname, 'web-list-bspntr.txt'), 'utf8');
  const w = parser.readWebCourseList(text, courses);
  const got = Object.fromEntries(w.marks.filter(m => m.inPerson).map(m => [courses[m.index].name, m.inPerson]));
  assert.strictEqual(w.starMeaning, 'Clinical');
  assert.strictEqual(w.matchedLines, 15);
  assert.deepStrictEqual(got, {
    'Basic Nursing Skills': 'Lab', 'Adult Health I': 'Clinical', 'Intermediate Nursing Skills': 'Lab',
    'Adult Health II': 'Clinical', "Women's and Children's Nursing": 'Clinical',
    'Psychiatric and Mental Health Nursing': 'Clinical', 'Community Health and Population-Focused Nursing': 'Clinical',
    'Adult Health III': 'Clinical', 'Professional Nursing Role Transition': 'Clinical'
  });
  const virtual = w.marks.find(m => courses[m.index].name === 'Advanced Nursing Skills');
  assert.ok(virtual && !virtual.inPerson && /not in person/.test(virtual.note));
});

test('web-page list: stars with no footnote fall back to "Field experience"', () => {
  const w = parser.readWebCourseList('Course A*\nCourse B', [{ name: 'Course A' }, { name: 'Course B' }]);
  assert.strictEqual(w.starMeaning, null);
  assert.deepStrictEqual(w.marks.map(m => m.inPerson), ['Field experience']);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
