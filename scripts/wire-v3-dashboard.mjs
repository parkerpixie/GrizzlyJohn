import fs from 'node:fs';

function requireNeedle(source, needle, label) {
  if (!source.includes(needle)) throw new Error(`Could not find ${label}; refusing to rewrite the file.`);
}

let index = fs.readFileSync('index.html', 'utf8');

if (!index.includes('href="health-v3-dashboard.css"')) {
  const needle = '  <link rel="stylesheet" href="health-v3.css">\n';
  requireNeedle(index, needle, 'the Health stylesheet anchor');
  index = index.replace(needle, `${needle}  <link rel="stylesheet" href="health-v3-dashboard.css">\n`);
}

if (!index.includes('src="health-v3-dashboard.js"')) {
  const needle = '  <script src="health-v3-ui.js"></script>\n';
  requireNeedle(index, needle, 'the Health UI script anchor');
  index = index.replace(needle, `${needle}  <script src="health-v3-dashboard.js"></script>\n`);
}

fs.writeFileSync('index.html', index);

let worker = fs.readFileSync('service-worker.js', 'utf8');
worker = worker.replace(/^const CACHE_NAME = .*;$/m, "const CACHE_NAME = 'grizzlyjohn-v31-health-dashboard-polish';");

if (!worker.includes("'./health-v3-dashboard.css'")) {
  const needle = "  './health-v3.css',\n";
  requireNeedle(worker, needle, 'the Health stylesheet cache anchor');
  worker = worker.replace(needle, `${needle}  './health-v3-dashboard.css',\n`);
}

if (!worker.includes("'./health-v3-dashboard.js'")) {
  const needle = "  './health-v3-ui.js',\n";
  requireNeedle(worker, needle, 'the Health UI cache anchor');
  worker = worker.replace(needle, `${needle}  './health-v3-dashboard.js',\n`);
}

fs.writeFileSync('service-worker.js', worker);
console.log('V3 Health dashboard polish wired into app shell.');
