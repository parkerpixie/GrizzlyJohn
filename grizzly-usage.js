(() => {
  'use strict';
  // Grizzly Footprints: private developer analytics with John's explicit consent.
  // Never reads journal, medical, location, sleep details, names, notes or field values.
  const API = '/.netlify/functions/grizzly-usage';
  const CONSENT = 'gj-usage:consent';
  const CODE = 'gj-usage:code';
  const LAST_ACTIVITY = 'gj-usage:lastActivity';
  const SESSION_GAP = 30 * 60 * 1000;
  const OPEN_GAP = 2 * 60 * 1000;
  const screens = { today: 'today', wisdom: 'wisdom', quest: 'quest', roam: 'roam', listen: 'campfire' };
  let lastOpenAt = 0;
  let hiddenAt = 0;

  const active = () => localStorage.getItem(CONSENT) === 'yes' &&
    /^[a-f0-9]{48}$/i.test(localStorage.getItem(CODE) || '');
  function localDate(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
      '-' + String(d.getDate()).padStart(2, '0');
  }
  async function send(type, feature) {
    if (!active()) return false;
    const now = new Date();
    try {
      const response = await fetch(API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem(CODE)
        },
        body: JSON.stringify({ type, feature, date: localDate(now), hour: now.getHours() }),
        cache: 'no-store',
        keepalive: true
      });
      return response.ok;
    } catch { return false; }
  }
  function noteActivity() {
    if (!active()) return;
    const now = Date.now();
    const previous = Number(localStorage.getItem(LAST_ACTIVITY) || 0);
    if (!previous || now - previous >= SESSION_GAP) send('session', 'app');
    localStorage.setItem(LAST_ACTIVITY, String(now));
  }
  function foreground() {
    if (!active()) return;
    const now = Date.now();
    const away = hiddenAt ? now - hiddenAt : (lastOpenAt ? now - lastOpenAt : Infinity);
    if (!lastOpenAt || away >= OPEN_GAP) {
      noteActivity();
      send('open', 'app');
      lastOpenAt = now;
      const screen = document.querySelector('[data-screen].is-active');
      if (screen && screens[screen.id]) send('view', screens[screen.id]);
    }
    hiddenAt = 0;
  }

  function status(message, bad = false) {
    const el = document.getElementById('gjUsageStatus');
    if (el) {
      el.textContent = message;
      el.style.color = bad ? '#a83e31' : '#2b6543';
    }
  }
  function render() {
    const section = document.getElementById('gjUsageConsent');
    if (!section) return;
    if (active()) {
      section.innerHTML =
        '<h3>🐾 Share App Usage With Jen</h3>' +
        '<p><strong>Sharing is ON.</strong> Jen can see anonymous counts of app opens, sessions and broad features you use.</p>' +
        '<p>No journal text, reflections, sleep information, medication records, feelings, locations or other personal entries are shared.</p>' +
        '<button class="button button-secondary" type="button" id="gjUsageOff">Stop Sharing Usage</button>' +
        '<p class="settings-status" id="gjUsageStatus" aria-live="polite"></p>';
    } else {
      section.innerHTML =
        '<h3>🐾 Share App Usage With Jen</h3>' +
        '<p>Optional: help Jen see whether GrizzlyJohn is useful and which parts you visit most.</p>' +
        '<p>Only counts of app opens, sessions, feature visits and selected button actions are shared, along with the day and hour. ' +
        '<strong>Your words, health details, sleep data, moods, locations and personal records stay private.</strong></p>' +
        '<label for="gjUsageCode">Private setup code from Jen</label>' +
        '<input id="gjUsageCode" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="48" placeholder="Paste your setup code">' +
        '<label style="display:block;margin:12px 0"><input type="checkbox" id="gjUsageAgree"> ' +
        'I agree to share these anonymous usage counts with Jen. I can stop sharing anytime.</label>' +
        '<button class="button button-secondary" type="button" id="gjUsageOn">Enable Usage Sharing</button>' +
        '<p class="settings-status" id="gjUsageStatus" aria-live="polite"></p>';
    }
  }
  async function enable() {
    const code = (document.getElementById('gjUsageCode')?.value || '').trim();
    if (!/^[a-f0-9]{48}$/i.test(code)) return status('Enter the complete private code from Jen.', true);
    if (!document.getElementById('gjUsageAgree')?.checked) return status('Please confirm that you agree first.', true);
    localStorage.setItem(CODE, code);
    localStorage.setItem(CONSENT, 'yes');
    status('Checking the connection...');
    const ok = await send('open', 'app');
    if (!ok) {
      localStorage.removeItem(CONSENT);
      localStorage.removeItem(CODE);
      return status('That code did not connect. Nothing was enabled.', true);
    }
    lastOpenAt = Date.now();
    noteActivity();
    render();
    status('Usage sharing is on. You can turn it off here anytime.');
  }
  function disable() {
    localStorage.removeItem(CONSENT);
    localStorage.removeItem(CODE);
    localStorage.removeItem(LAST_ACTIVITY);
    lastOpenAt = 0;
    render();
    status('Sharing is off. No new usage data will be sent.');
  }
  function init() {
    const anchor = document.querySelector('.settings-app-info') || document.getElementById('backupData')?.closest('.settings-section');
    if (!anchor || document.getElementById('gjUsageConsent')) return;
    const section = document.createElement('section');
    section.className = 'settings-section';
    section.id = 'gjUsageConsent';
    anchor.before(section);
    render();
    document.addEventListener('click', event => {
      const el = event.target;
      if (el.closest('#gjUsageOn')) { enable(); return; }
      if (el.closest('#gjUsageOff')) { disable(); return; }
      if (!active()) return;
      const nav = el.closest('[data-nav]');
      if (nav && screens[nav.dataset.nav]) {
        noteActivity();
        send('view', screens[nav.dataset.nav]);
        return;
      }
      let feature = null;
      const sleepAction = el.closest('[data-v5-action]');
      if (sleepAction && ['add', 'rate', 'finish'].includes(sleepAction.dataset.v5Action)) feature = 'sleep';
      else if (el.closest('[data-health-log-type="sleep"]')) feature = 'sleep';
      else if (el.closest('[data-health-log-type]')) feature = 'health';
      else if (el.closest('#drawDbtSkill, [data-dbt-skill]')) feature = 'toolbox';
      else if (el.closest('#openDailyOracle, .oracle-daily-image-button')) feature = 'oracle';
      else if (el.closest('#completeTodayQuest, #completeQuest')) feature = 'quest';
      else if (el.closest('#loadWeather, #changeWeatherLocation')) feature = 'weather';
      if (feature) {
        noteActivity();
        send('action', feature);
      }
    }, true);
    document.addEventListener('change', event => {
      if (!active()) return;
      if (event.target.matches('[data-gold-star-id]')) { noteActivity(); send('action', 'gold-stars'); }
    }, true);
    document.addEventListener('submit', event => {
      if (!active()) return;
      if (event.target.id === 'gratitudeForm') { noteActivity(); send('action', 'gratitude'); }
    }, true);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') hiddenAt = Date.now();
      if (document.visibilityState === 'visible') foreground();
    });
    window.addEventListener('focus', () => { if (document.visibilityState === 'visible') foreground(); });
    foreground();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();