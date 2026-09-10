import fs from 'node:fs';

function replaceRequired(source, from, to, label) {
  if (!source.includes(from)) {
    if (source.includes(to)) return source;
    throw new Error(`Could not find ${label}; refusing to rewrite.`);
  }
  return source.replace(from, to);
}

let js = fs.readFileSync('health-v3-body-mind.js', 'utf8');
js = replaceRequired(
  js,
  '<h2 id="healthBodyMindHeading">A few things showing up together.</h2>\n            <p>These are repeated overlaps in John\'s own logs, not explanations, diagnoses, or medical advice.</p>',
  '<h2 id="healthBodyMindHeading">Grizz spotted a pattern. 🐻</h2>\n            <p>A few things have been traveling together often enough to catch his attention. He is observing, not diagnosing.</p>',
  'Body + Mind heading copy'
);
js = replaceRequired(
  js,
  '<div class="health-body-mind-content" id="healthBodyMindContent"></div>`;',
  '<div class="health-body-mind-content" id="healthBodyMindContent"></div>\n        <p class="health-body-mind-disclaimer">Based only on your own check-ins. Not a medical conclusion.</p>`;',
  'Body + Mind disclaimer anchor'
);
fs.writeFileSync('health-v3-body-mind.js', js);

let css = fs.readFileSync('health-v3-body-mind.css', 'utf8');
const cssBlock = `\n.health-body-mind-disclaimer {\n  margin: 8px 2px 0;\n  color: var(--muted);\n  font-size: .61rem;\n  line-height: 1.35;\n  opacity: .82;\n}\n`;
if (!css.includes('.health-body-mind-disclaimer')) css += cssBlock;
fs.writeFileSync('health-v3-body-mind.css', css);

let test = fs.readFileSync('tests/health-v3-body-mind.test.js', 'utf8');
test = replaceRequired(test, 'assert.match(source, /A few things showing up together\\./);', 'assert.match(source, /Grizz spotted a pattern\\. 🐻/);', 'Body + Mind heading test');
test = replaceRequired(test, 'assert.match(source, /not explanations, diagnoses, or medical advice/);', 'assert.match(source, /He is observing, not diagnosing/);\n  assert.match(source, /Based only on your own check-ins\\. Not a medical conclusion\\./);\n  assert.match(css, /\\.health-body-mind-disclaimer/);', 'Body + Mind safety-copy test');
fs.writeFileSync('tests/health-v3-body-mind.test.js', test);

let worker = fs.readFileSync('service-worker.js', 'utf8');
worker = replaceRequired(worker, "const CACHE_NAME = 'grizzlyjohn-v33-health-goal-save-polish';", "const CACHE_NAME = 'grizzlyjohn-v34-body-mind-copy';", 'service-worker cache version');
fs.writeFileSync('service-worker.js', worker);

for (const file of fs.readdirSync('tests').filter(name => name.endsWith('.test.js'))) {
  const path = `tests/${file}`;
  let source = fs.readFileSync(path, 'utf8');
  if (source.includes('grizzlyjohn-v33-health-goal-save-polish')) {
    source = source.replaceAll('grizzlyjohn-v33-health-goal-save-polish', 'grizzlyjohn-v34-body-mind-copy');
    fs.writeFileSync(path, source);
  }
}

console.log('Polished Body + Mind copy and bumped offline cache.');
// Trigger copy-polish workflow after workflow creation.
