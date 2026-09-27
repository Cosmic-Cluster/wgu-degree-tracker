// ============================================================================
// Validates every config shipped in the repo against config.schema.json:
// config.example.js and everything in examples/. Runs in CI via `npm test`.
//
// config files are JavaScript (`window.WGU_TRACKER_CONFIG = {...}`), so each
// one is run in an isolated vm context with a fake `window`, and the object it
// assigns is checked. Nothing in the file can reach the real environment.
// ============================================================================
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const Ajv2020 = require('ajv/dist/2020');
const addFormats = require('ajv-formats');

const ROOT = path.join(__dirname, '..', '..');
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(JSON.parse(fs.readFileSync(path.join(ROOT, 'config.schema.json'), 'utf8')));

const files = ['config.example.js']
  .concat(fs.readdirSync(path.join(ROOT, 'examples')).filter(f => f.endsWith('.js')).map(f => path.join('examples', f)));

let bad = 0;
for (const rel of files) {
  const sandbox = { window: {} };
  try {
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { timeout: 1000 });
  } catch (e) { bad++; console.log(`FAIL  ${rel}: doesn't run: ${e.message}`); continue; }
  const cfg = sandbox.window.WGU_TRACKER_CONFIG;
  if (!cfg) { bad++; console.log(`FAIL  ${rel}: doesn't set window.WGU_TRACKER_CONFIG`); continue; }
  if (!validate(cfg)) {
    bad++;
    console.log(`FAIL  ${rel}:`);
    validate.errors.slice(0, 10).forEach(e => console.log(`        ${e.instancePath || '(root)'} ${e.message}`));
    continue;
  }
  // One check the schema can't express: CU total must be positive.
  const cu = cfg.courses.reduce((s, c) => s + c.cu, 0);
  if (cu <= 0) { bad++; console.log(`FAIL  ${rel}: total CUs is ${cu}`); continue; }
  console.log(`ok    ${rel}  (${cfg.courses.length} courses, ${cu} CU)`);
}
console.log(`\n${files.length - bad}/${files.length} configs valid`);
process.exit(bad ? 1 : 0);
