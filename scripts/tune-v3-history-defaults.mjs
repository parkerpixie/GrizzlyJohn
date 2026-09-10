import fs from 'node:fs';

const path = 'health-v3-history.js';
let source = fs.readFileSync(path, 'utf8');
const from = "    checkInItems: ['sleep', 'bodyFeel'],";
const to = "    checkInItems: [],";
if (!source.includes(from) && !source.includes(to)) throw new Error('Could not find Health check-in default; refusing to rewrite.');
source = source.replace(from, to);
fs.writeFileSync(path, source);
console.log('Health Check-In now waits for John to choose what counts.');
// Triggered after workflow creation.
