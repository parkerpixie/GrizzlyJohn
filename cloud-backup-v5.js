(() => {
  'use strict';
  // GrizzlyJohn V5 encrypted cloud backups. Never uploads personal data without opt-in.
  const PREFIX = 'grizzlyjohn:v5:cloud:';
  const SECRET = PREFIX + 'recoverySecret';
  const ENABLED = PREFIX + 'enabled';
  const LAST_HASH = PREFIX + 'lastVerifiedHash';
  const LAST_AT = PREFIX + 'lastVerifiedAt';
  const API = '/.netlify/functions/grizzly-backup';
  const utf8 = new TextEncoder();
  let busy = false;

  const b64 = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  function unb64(value) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(value)) throw new Error('That recovery code is not valid.');
    const str = atob(value.replace(/-/g, '+').replace(/_/g, '/') + '=');
    return Uint8Array.from(str, char => char.charCodeAt(0));
  }
  const enabled = () => localStorage.getItem(ENABLED) === 'yes' && !!localStorage.getItem(SECRET);
  const formatDate = date => date ? new Date(date).toLocaleString() : 'Not yet backed up';

  async function keys(secret) {
    const base = await crypto.subtle.importKey('raw', unb64(secret), 'HKDF', false, ['deriveKey', 'deriveBits']);
    const salt = new Uint8Array(32);
    const derive = info => ({ name: 'HKDF', hash: 'SHA-256', salt, info: utf8.encode(info) });
    const encryption = await crypto.subtle.deriveKey(derive('grizzlyjohn-v5-encryption'), base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    const tokenBytes = await crypto.subtle.deriveBits(derive('grizzlyjohn-v5-access'), base, 256);
    return { encryption, access: b64(new Uint8Array(tokenBytes)) };
  }

  function getBackup() {
    const storage = window.GrizzlyJohnStorageV2;
    if (!storage?.createBackup) throw new Error('The app backup system is not ready.');
    const result = storage.createBackup();
    if (!result.ok) throw new Error(result.reason || 'Could not read GrizzlyJohn data.');
    // Never place recovery secrets or backup status in the data snapshot.
    const backup = result.backup;
    Object.keys(backup.data).forEach(key => { if (key.startsWith(PREFIX)) delete backup.data[key]; });
    return backup;
  }

  async function digest(data) {
    const buf = await crypto.subtle.digest('SHA-256', utf8.encode(JSON.stringify(data)));
    return b64(new Uint8Array(buf));
  }

  async function upload(force = false) {
    if (!enabled() || busy) return { ok: false, reason: 'Cloud backup is disabled or already running.' };
    if (!window.crypto?.subtle) return { ok: false, reason: 'Secure encryption is not supported on this device.' };
    busy = true;
    try {
      const backup = getBackup();
      const hash = await digest(backup.data);
      const last = Date.parse(localStorage.getItem(LAST_AT) || '') || 0;
      if (!force && hash === localStorage.getItem(LAST_HASH) && Date.now() - last < 24 * 3600 * 1000) {
        return { ok: true, unchanged: true, at: new Date(last).toISOString() };
      }
      const derived = await keys(localStorage.getItem(SECRET));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, derived.encryption, utf8.encode(JSON.stringify(backup)));
      const envelope = { version: 1, iv: b64(iv), ciphertext: b64(new Uint8Array(encrypted)) };
      const response = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + derived.access }, body: JSON.stringify(envelope), cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.verified) throw new Error(result.error || 'Cloud storage did not verify this backup.');
      const at = new Date().toISOString();
      localStorage.setItem(LAST_HASH, hash);
      localStorage.setItem(LAST_AT, at);
      return { ok: true, at, count: Object.keys(backup.data).length };
    } catch (error) {
      return { ok: false, reason: String(error?.message || error) };
    } finally {
      busy = false;
      render();
    }
  }

  async function downloadAndValidate(code) {
    const derived = await keys(code);
    const response = await fetch(API, { headers: { Authorization: 'Bearer ' + derived.access }, cache: 'no-store' });
    const answer = await response.json();
    if (!response.ok || !answer.ok) throw new Error(answer.error || 'Cloud backup could not be retrieved.');
    const envelope = answer.envelope;
    if (envelope?.version !== 1) throw new Error('Unsupported encrypted backup format.');
    const iv = unb64Iv(envelope.iv);
    const cipher = fromBase64(envelope.ciphertext);
    const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, derived.encryption, cipher);
    const backup = JSON.parse(new TextDecoder().decode(clear));
    const layer = window.GrizzlyJohnStorageV2;
    const validation = layer?.validateBackup?.(backup);
    if (!validation?.ok) throw new Error('Cloud backup failed data validation.');
    return { backup, count: Object.keys(backup.data).length };
  }
  function fromBase64(value) {
    if (!/^[A-Za-z0-9_-]+$/.test(value || '')) throw new Error('Invalid encrypted data.');
    const fixed = value.replace(/-/g, '+').replace(/_/g, '/');
    return Uint8Array.from(atob(fixed.padEnd(Math.ceil(fixed.length / 4) * 4, '=')), c => c.charCodeAt(0));
  }
  function unb64Iv(value) {
    if (typeof value !== 'string' || value.length !== 16) throw new Error('Invalid encryption nonce.');
    const iv = fromBase64(value);
    if (iv.length !== 12) throw new Error('Invalid encryption nonce.');
    return iv;
  }

  async function restore(code) {
    const restored = await downloadAndValidate(code);
    const entries = Object.entries(restored.backup.data).map(([key, raw]) => ({ key, raw }));
    const data = { format: 'grizzlyjohn-localstorage-export-v1', exportedAt: restored.backup.createdAt, entries };
    const layer = window.GrizzlyJohnStorageV2;
    const preview = layer.importData(data, { conflict: 'skip', dryRun: true });
    if (!preview.ok) throw new Error(preview.errors?.[0] || 'Restore validation failed.');
    if (!preview.imported.length) return { ok: true, imported: 0, skipped: preview.skipped.length };
    if (!confirm('Found ' + preview.imported.length + ' missing GrizzlyJohn data items. Restore them? Existing data will NOT be overwritten.')) {
      return { ok: false, reason: 'Restore canceled. Nothing changed.' };
    }
    const actual = layer.importData(data, { conflict: 'skip' });
    if (!actual.ok) throw new Error(actual.errors?.[0] || 'Restore failed.');
    return { ok: true, imported: actual.imported.length, skipped: actual.skipped.length };
  }

  function notice(message, error = false) {
    const node = document.getElementById('v5BackupStatus');
    if (node) { node.textContent = message; node.dataset.error = error ? 'true' : 'false'; }
  }

  function render() {
    const section = document.getElementById('v5CloudBackup');
    if (!section) return;
    const isOn = enabled();
    const secret = localStorage.getItem(SECRET) || '';
    section.innerHTML = '<h3>Secure Cloud Backup <small>V5</small></h3>' +
      '<p>Your personal GrizzlyJohn history stays on this phone, with optional encrypted safety copies on Netlify. No Supabase, no JSON downloads.</p>' +
      (isOn ?
        '<p class="v5-backup-good">✓ Cloud backup enabled</p><p>Last verified: <strong>' + formatDate(localStorage.getItem(LAST_AT)) + '</strong></p>' +
        '<div class="v5-backup-actions"><button type="button" class="button button-primary" data-v5-backup="now">Back Up Now</button>' +
        '<button type="button" class="button button-secondary" data-v5-backup="show-code">Show Recovery Code</button></div>' +
        '<div id="v5RecoveryCode" hidden><p>Keep this code somewhere safe. Without it, a new phone cannot decrypt your history.</p><textarea readonly rows="3">' + secret + '</textarea>' +
        '<button type="button" class="button button-secondary" data-v5-backup="copy">Copy Code</button></div>'
        :
        '<p><strong>Important:</strong> Encryption happens on your phone. Netlify receives only encrypted data. You must keep your recovery code to restore on a new phone.</p>' +
        (secret ?
          '<div class="v5-backup-code"><strong>Save this recovery code before enabling:</strong><textarea readonly rows="3">' + secret + '</textarea>' +
          '<button type="button" class="button button-secondary" data-v5-backup="copy">Copy Code</button>' +
          '<label><input type="checkbox" id="v5CodeSaved"> I have saved this recovery code.</label>' +
          '<button type="button" class="button button-primary" data-v5-backup="confirm">Enable &amp; Verify Backup</button></div>'
        :
          '<label class="v5-backup-consent"><input type="checkbox" id="v5CloudConsent"> I agree to store encrypted copies of my personal GrizzlyJohn data on Netlify.</label>' +
          '<button type="button" class="button button-primary" data-v5-backup="begin">Set Up Secure Backup</button>')) +
      '<details class="v5-recovery"><summary>Restore missing data from a backup</summary>' +
      '<p>Paste your recovery code. Existing information on this device will not be replaced.</p>' +
      '<input type="text" autocomplete="off" spellcheck="false" id="v5RecoveryInput" placeholder="Recovery code">' +
      '<button type="button" class="button button-secondary" data-v5-backup="restore">Restore Missing Data</button></details>' +
      '<p class="v5-backup-status" id="v5BackupStatus" aria-live="polite"></p>';
  }

  async function handleClick(action) {
    if (action === 'begin') {
      if (!document.getElementById('v5CloudConsent')?.checked) return notice('Please confirm consent first.', true);
      if (!window.crypto?.getRandomValues || !window.crypto?.subtle) return notice('This device does not support secure backup.', true);
      localStorage.setItem(SECRET, b64(crypto.getRandomValues(new Uint8Array(32))));
      render();
      notice('Copy and save your recovery code before continuing.');
    }
    if (action === 'copy') {
      const code = localStorage.getItem(SECRET);
      try { await navigator.clipboard.writeText(code); notice('Recovery code copied. Save it somewhere private.'); }
      catch { notice('Select and copy the code above.', true); }
    }
    if (action === 'confirm') {
      if (!document.getElementById('v5CodeSaved')?.checked) return notice('Please save your recovery code first.', true);
      localStorage.setItem(ENABLED, 'yes');
      notice('Encrypting and verifying your first backup…');
      const result = await upload(true);
      if (!result.ok) {
        // Keep the secret and consent, but do not claim that a backup exists.
        notice('Not yet backed up: ' + result.reason, true);
      } else notice('✓ Your first encrypted backup was verified.');
    }
    if (action === 'show-code') {
      const code = document.getElementById('v5RecoveryCode');
      if (code) code.hidden = !code.hidden;
    }
    if (action === 'now') {
      notice('Encrypting and verifying…');
      const result = await upload(true);
      notice(result.ok ? '✓ Backup verified. ' + formatDate(result.at) : result.reason, !result.ok);
    }
    if (action === 'restore') {
      const code = document.getElementById('v5RecoveryInput')?.value?.trim();
      if (!code) return notice('Enter your recovery code first.', true);
      notice('Checking encrypted backup…');
      try {
        const result = await restore(code);
        notice(result.ok ? 'Restored ' + result.imported + ' missing items, preserved ' + result.skipped + ' existing items. Reload to view them.' : result.reason, !result.ok);
      } catch (error) { notice(String(error.message || error), true); }
    }
  }

  function init() {
    const anchor = document.getElementById('backupData')?.closest('.settings-section');
    if (!anchor || document.getElementById('v5CloudBackup')) return;
    const section = document.createElement('section');
    section.id = 'v5CloudBackup';
    section.className = 'settings-section v5-cloud-backup';
    anchor.after(section);
    render();
    document.addEventListener('click', event => {
      const button = event.target.closest('[data-v5-backup]');
      if (button) handleClick(button.dataset.v5Backup);
    });
    // Update when returning to the app. No data leaves the device until explicitly enabled.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && enabled()) upload(false);
    });
    window.addEventListener('focus', () => { if (enabled()) upload(false); });
    setInterval(() => { if (enabled() && document.visibilityState === 'visible') upload(false); }, 15 * 60 * 1000);
    if (enabled()) setTimeout(() => upload(false), 1500);
  }
  window.GrizzlyJohnV5Backup = { enabled, upload, restore, getBackup };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
