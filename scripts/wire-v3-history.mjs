import fs from 'node:fs';

function requireNeedle(source, needle, label) {
  if (!source.includes(needle)) throw new Error(`Could not find ${label}; refusing to rewrite the file.`);
}

let index = fs.readFileSync('index.html', 'utf8');

if (!index.includes('href="health-v3-history.css"')) {
  const needle = '  <link rel="stylesheet" href="health-v3-dashboard.css">\n';
  requireNeedle(index, needle, 'the Health dashboard stylesheet anchor');
  index = index.replace(needle, `${needle}  <link rel="stylesheet" href="health-v3-history.css">\n`);
}

if (!index.includes('src="health-v3-history.js"')) {
  const needle = '  <script src="health-v3-dashboard.js"></script>\n';
  requireNeedle(index, needle, 'the Health dashboard script anchor');
  index = index.replace(needle, `${needle}  <script src="health-v3-history.js"></script>\n`);
}

fs.writeFileSync('index.html', index);

let worker = fs.readFileSync('service-worker.js', 'utf8');
worker = worker.replace(/^const CACHE_NAME = .*;$/m, "const CACHE_NAME = 'grizzlyjohn-v32-health-history-goals';");

if (!worker.includes("'./health-v3-history.css'")) {
  const needle = "  './health-v3-dashboard.css',\n";
  requireNeedle(worker, needle, 'the Health dashboard stylesheet cache anchor');
  worker = worker.replace(needle, `${needle}  './health-v3-history.css',\n`);
}

if (!worker.includes("'./health-v3-history.js'")) {
  const needle = "  './health-v3-dashboard.js',\n";
  requireNeedle(worker, needle, 'the Health dashboard script cache anchor');
  worker = worker.replace(needle, `${needle}  './health-v3-history.js',\n`);
}

fs.writeFileSync('service-worker.js', worker);
console.log('V3 Health history + goals wired into app shell.');
