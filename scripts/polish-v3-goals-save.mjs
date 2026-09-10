import fs from 'node:fs';

function requireReplace(source, from, to, label) {
  if (!source.includes(from)) throw new Error(`Could not find ${label}; refusing to rewrite.`);
  return source.replace(from, to);
}

let js = fs.readFileSync('health-v3-history.js', 'utf8');

js = requireReplace(
  js,
  '          </div>\n          <article class="health-checkin-card" id="healthCheckInCard"></article>',
  '          </div>\n          <div class="health-goals-confirmation" id="healthGoalsConfirmation" role="status" aria-live="polite" hidden><span aria-hidden="true">✓</span><strong>Health goals updated.</strong></div>\n          <article class="health-checkin-card" id="healthCheckInCard"></article>',
  'Health goals dashboard confirmation anchor'
);

js = requireReplace(
  js,
  "      } else {\n        grid.innerHTML = cards.join('');\n        manage.textContent = 'Edit goals';\n      }\n    }\n\n    function collectCalendarMap",
  "      } else {\n        grid.innerHTML = cards.join('');\n        manage.textContent = 'Edit goals';\n      }\n      const configured = (prefs.checkInItems || []).length > 0 || Object.values(goals).some(goal => Boolean(goal?.enabled));\n      manage.textContent = configured ? 'Edit goals' : 'Set goals';\n      manage.classList.toggle('is-compact', configured);\n    }\n\n    function collectCalendarMap",
  'goal manager compact-state anchor'
);

js = requireReplace(
  js,
  '    function openGoals() {',
  `    function showGoalsSaved() {\n      const notice = document.getElementById('healthGoalsConfirmation');\n      if (!notice) return;\n      notice.hidden = false;\n      notice.classList.add('is-visible');\n      window.clearTimeout(showGoalsSaved.timeoutId);\n      showGoalsSaved.timeoutId = window.setTimeout(() => {\n        notice.classList.remove('is-visible');\n        notice.hidden = true;\n      }, 4200);\n    }\n\n    function openGoals() {`,
  'openGoals function anchor'
);

js = requireReplace(
  js,
  "    function closeGoals() {\n      const dialog = document.getElementById('healthGoalsDialog');\n      if (dialog?.open && typeof dialog.close === 'function') dialog.close(); else dialog?.removeAttribute('open');\n    }",
  "    function closeGoals() {\n      const dialog = document.getElementById('healthGoalsDialog');\n      if (!dialog) return;\n      try { if (dialog.open && typeof dialog.close === 'function') dialog.close(); } catch {}\n      dialog.removeAttribute('open');\n    }",
  'closeGoals function'
);

js = requireReplace(
  js,
  '      prefs = next; closeGoals(); renderAll();',
  "      prefs = next; closeGoals();\n      requestAnimationFrame(() => { renderAll(); showGoalsSaved(); });",
  'saved goals close/render sequence'
);

fs.writeFileSync('health-v3-history.js', js);

let css = fs.readFileSync('health-v3-history.css', 'utf8');
const cssBlock = `\n\n.health-goals-confirmation {\n  display: inline-flex;\n  align-items: center;\n  gap: 7px;\n  margin: -2px 0 12px;\n  padding: 8px 11px;\n  border: 1px solid rgba(47, 70, 54, .16);\n  border-radius: 999px;\n  background: rgba(47, 70, 54, .08);\n  color: var(--pine-dark);\n  font-size: .74rem;\n  font-weight: 800;\n}\n\n.health-goals-confirmation[hidden] {\n  display: none;\n}\n\n.health-manage-goals.is-compact {\n  min-height: 0;\n  padding: 5px 2px;\n  border: 0;\n  background: transparent;\n  box-shadow: none;\n  color: var(--pine-dark);\n  font-size: .72rem;\n  text-decoration: underline;\n  text-underline-offset: 3px;\n}\n`;
if (!css.includes('.health-goals-confirmation')) css += cssBlock;
fs.writeFileSync('health-v3-history.css', css);

let worker = fs.readFileSync('service-worker.js', 'utf8');
worker = worker.replace("const CACHE_NAME = 'grizzlyjohn-v32-health-history-goals';", "const CACHE_NAME = 'grizzlyjohn-v33-health-goal-save-polish';");
fs.writeFileSync('service-worker.js', worker);

for (const path of ['tests/health-v3-history.test.js', 'tests/health-v3-dashboard.test.js', 'tests/health-v3-ui.test.js']) {
  let source = fs.readFileSync(path, 'utf8');
  source = source.replaceAll('grizzlyjohn-v32-health-history-goals', 'grizzlyjohn-v33-health-goal-save-polish');
  fs.writeFileSync(path, source);
}

let historyTest = fs.readFileSync('tests/health-v3-history.test.js', 'utf8');
if (!historyTest.includes('saved goals close the dialog')) {
  historyTest += `\n\ntest('saved goals close the dialog, confirm the update, and collapse the edit control', () => {\n  const source = read('health-v3-history.js');\n  const css = read('health-v3-history.css');\n  assert.match(source, /Health goals updated\\./);\n  assert.match(source, /requestAnimationFrame\\(\\(\\) => \\{ renderAll\\(\\); showGoalsSaved\\(\\); \\}\\)/);\n  assert.match(source, /manage\\.classList\\.toggle\\('is-compact', configured\\)/);\n  assert.match(css, /\\.health-manage-goals\\.is-compact/);\n  assert.match(css, /\\.health-goals-confirmation/);\n});\n`;
}
fs.writeFileSync('tests/health-v3-history.test.js', historyTest);

console.log('Health goal save experience polished.');
