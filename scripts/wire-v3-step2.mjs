import fs from 'node:fs';

function requireNeedle(source, needle, label) {
  if (!source.includes(needle)) throw new Error(`Could not find ${label}; refusing to rewrite the file.`);
}

let index = fs.readFileSync('index.html', 'utf8');

if (!index.includes('href="health-v3.css"')) {
  const needle = '  <link rel="stylesheet" href="roam-v2.css">\n';
  requireNeedle(index, needle, 'the Roam stylesheet anchor');
  index = index.replace(needle, `${needle}  <link rel="stylesheet" href="health-v3.css">\n`);
}

if (!index.includes('src="health-v3.js"')) {
  const needle = '  <script src="storage-v2.js"></script>\n';
  requireNeedle(index, needle, 'the V2 storage script anchor');
  index = index.replace(needle, `${needle}  <script src="health-v3.js"></script>\n`);
}

if (!index.includes('src="health-v3-ui.js"')) {
  const needle = '  <script src="roam-v2.js"></script>\n';
  requireNeedle(index, needle, 'the Roam script anchor');
  index = index.replace(needle, `${needle}  <script src="health-v3-ui.js"></script>\n`);
}

index = index.replace('<p><strong>Version 2</strong></p>', '<p><strong>Version 3</strong></p>');
fs.writeFileSync('index.html', index);

let worker = fs.readFileSync('service-worker.js', 'utf8');
worker = worker.replace(/^const CACHE_NAME = .*;$/m, "const CACHE_NAME = 'grizzlyjohn-v30-health-fast-logging';");

if (!worker.includes("'./health-v3.css'")) {
  const needle = "  './roam-v2.css',\n";
  requireNeedle(worker, needle, 'the Roam stylesheet cache anchor');
  worker = worker.replace(needle, `${needle}  './health-v3.css',\n`);
}

if (!worker.includes("'./health-v3.js'")) {
  const needle = "  './storage-v2.js',\n";
  requireNeedle(worker, needle, 'the V2 storage cache anchor');
  worker = worker.replace(needle, `${needle}  './health-v3.js',\n`);
}

if (!worker.includes("'./health-v3-ui.js'")) {
  const needle = "  './roam-v2.js',\n";
  requireNeedle(worker, needle, 'the Roam script cache anchor');
  worker = worker.replace(needle, `${needle}  './health-v3-ui.js',\n`);
}

fs.writeFileSync('service-worker.js', worker);
console.log('V3 Health Step 2 wiring complete.');
