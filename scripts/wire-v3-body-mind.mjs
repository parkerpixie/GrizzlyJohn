import fs from 'node:fs';

function requireNeedle(source, needle, label) {
  if (!source.includes(needle)) throw new Error(`Could not find ${label}; refusing to rewrite.`);
}

let index = fs.readFileSync('index.html', 'utf8');

if (!index.includes('href="health-v3-body-mind.css"')) {
  const needle = '  <link rel="stylesheet" href="health-v3-history.css">\n';
  requireNeedle(index, needle, 'Health history stylesheet anchor');
  index = index.replace(needle, `${needle}  <link rel="stylesheet" href="health-v3-body-mind.css">\n`);
}

if (!index.includes('src="health-v3-body-mind.js"')) {
  const needle = '  <script src="health-v3-history.js"></script>\n';
  requireNeedle(index, needle, 'Health history script anchor');
  index = index.replace(needle, `${needle}  <script src="health-v3-body-mind.js"></script>\n`);
}

fs.writeFileSync('index.html', index);

let worker = fs.readFileSync('service-worker.js', 'utf8');
if (!worker.includes("'./health-v3-body-mind.css'")) {
  const needle = "  './health-v3-history.css',\n";
  requireNeedle(worker, needle, 'Health history stylesheet cache anchor');
  worker = worker.replace(needle, `${needle}  './health-v3-body-mind.css',\n`);
}
if (!worker.includes("'./health-v3-body-mind.js'")) {
  const needle = "  './health-v3-history.js',\n";
  requireNeedle(worker, needle, 'Health history script cache anchor');
  worker = worker.replace(needle, `${needle}  './health-v3-body-mind.js',\n`);
}
fs.writeFileSync('service-worker.js', worker);
console.log('V3 Body + Mind wired into app shell and offline cache.');