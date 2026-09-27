// Dev helper: node setup/test/dump-parse.js guide.pdf  -> prints what the parser found.
// Also exports pagesFromPdf() for run-tests.js.
const path = require('path');
const fs = require('fs');
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
const parser = require(path.join(__dirname, '..', 'parse-guide.js'));
async function pagesFromPdf(file) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(file)), isEvalSupported: false, verbosity: 0 }).promise;
  const pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const tc = await (await doc.getPage(p)).getTextContent();
    pages.push({ items: tc.items.map(i => ({ str: i.str, x: i.transform[4], y: i.transform[5], width: i.width })) });
  }
  return pages;
}
module.exports = { pagesFromPdf };
if (require.main === module) (async () => {
  const r = parser.parse(await pagesFromPdf(process.argv[2]));
  const sum = r.courses.reduce((s, c) => s + c.cu, 0);
  console.log(`${r.programCode} ${r.catalogVersion} ${r.level} min=${r.minCuPerTerm} | ${r.programTitle}`);
  console.log(`termCols=${JSON.stringify(r.termColumns)} courses=${r.courses.length} sum=${sum} stated=${r.statedTotalCu}`);
  r.courses.forEach(c => console.log(`  ${c.code.padEnd(5)} ${String(c.cu).padStart(2)} ${JSON.stringify(c.guideTerms).padEnd(7)} ${c.transfer ? 'XFER ' : ''}${c.name}${c.notes.length ? '  // ' + c.notes.join(' | ') : ''}`));
  r.requirements.forEach(q => console.log('  REQ ' + q.name));
  r.warnings.forEach(w => console.log('  WARN ' + w));
})();
