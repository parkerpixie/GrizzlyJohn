(() => {
  'use strict';

  const APP_INFO = Object.freeze({ name: 'Grizzly John', version: '2' });

  function activeSection(documentRef) {
    const active = documentRef?.querySelector?.('[data-screen].is-active');
    const heading = active?.querySelector?.('h1')?.textContent?.trim();
    return heading || active?.id || 'Unknown';
  }

  function reportMessage(options = {}) {
    const date = options.date instanceof Date ? options.date : new Date(options.date || Date.now());
    return [
      'Hey Parker — I found a problem in Grizzly John.',
      '',
      'What happened:',
      '',
      `App: ${APP_INFO.name} V${APP_INFO.version}`,
      `Section: ${options.section || 'Unknown'}`,
      `Date: ${date.toLocaleString()}`,
      `Browser: ${options.platform || 'Unknown'}`
    ].join('\n');
  }

  function reportSmsUrl(options = {}) {
    return `sms:?body=${encodeURIComponent(reportMessage(options))}`;
  }

  function initializeSettings(documentRef = document, windowRef = window) {
    const drawer = documentRef.getElementById('settingsDrawer');
    const openButton = documentRef.getElementById('settingsButton');
    const closeButton = documentRef.getElementById('closeSettings');
    const form = documentRef.getElementById('homeLocationForm');
    const input = documentRef.getElementById('homeLocationInput');
    const locationStatus = documentRef.getElementById('homeLocationStatus');
    const reportLink = documentRef.getElementById('reportProblem');
    const backupButton = documentRef.getElementById('backupData');
    const restoreButton = documentRef.getElementById('restoreData');
    const restoreInput = documentRef.getElementById('restoreFile');
    const dataStatus = documentRef.getElementById('backupRestoreStatus');
    const storage = windowRef.GrizzlyJohnStorageV2;
    if (!drawer || !openButton || !storage) return { ok: false };

    function setStatus(element, message, kind = '') {
      if (!element) return;
      element.textContent = message;
      element.dataset.kind = kind;
    }

    function loadSettings() {
      const result = storage.settings.get();
      if (input) input.value = result.value.homeLocation || '';
      if (!result.ok) setStatus(locationStatus, 'Saved settings need recovery. They were left unchanged.', 'error');
      else setStatus(locationStatus, result.value.homeLocation ? 'Saved on this device.' : 'Optional. Weather still asks only when you tap it.');
    }

    function openDrawer() {
      loadSettings();
      openButton.setAttribute('aria-expanded', 'true');
      drawer.showModal();
      closeButton?.focus();
    }

    function closeDrawer() {
      if (drawer.open) drawer.close();
    }

    openButton.addEventListener('click', openDrawer);
    closeButton?.addEventListener('click', closeDrawer);
    drawer.addEventListener('close', () => {
      openButton.setAttribute('aria-expanded', 'false');
      openButton.focus();
    });
    documentRef.addEventListener('keydown', event => {
      if (event.key === 'Escape' && drawer.open) {
        event.preventDefault();
        closeDrawer();
      }
    });
    drawer.addEventListener('click', event => {
      const rect = drawer.getBoundingClientRect();
      const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
      if (!inside) closeDrawer();
    });

    form?.addEventListener('submit', event => {
      event.preventDefault();
      const saved = storage.settings.saveHomeLocation(input?.value || '');
      setStatus(locationStatus, saved.ok ? (saved.value.homeLocation ? 'Home Location saved.' : 'Home Location cleared.') : saved.reason, saved.ok ? 'success' : 'error');
    });

    reportLink?.addEventListener('click', () => {
      reportLink.href = reportSmsUrl({
        section: activeSection(documentRef),
        date: new Date(),
        platform: windowRef.navigator?.userAgent || windowRef.navigator?.platform || 'Unknown'
      });
    });

    backupButton?.addEventListener('click', () => {
      const result = storage.createBackup();
      if (!result.ok) {
        setStatus(dataStatus, `Backup could not be created: ${result.reason}`, 'error');
        return;
      }
      const blob = new Blob([result.json], { type: 'application/json' });
      const url = windowRef.URL.createObjectURL(blob);
      const link = documentRef.createElement('a');
      link.href = url;
      link.download = result.filename;
      documentRef.body.appendChild(link);
      link.click();
      link.remove();
      windowRef.URL.revokeObjectURL(url);
      setStatus(dataStatus, `Backup saved as ${result.filename}.`, 'success');
    });

    restoreButton?.addEventListener('click', () => restoreInput?.click());
    restoreInput?.addEventListener('change', async () => {
      const file = restoreInput.files?.[0];
      if (!file) return;
      let text;
      try { text = await file.text(); }
      catch {
        setStatus(dataStatus, 'That backup file could not be read. Nothing was changed.', 'error');
        restoreInput.value = '';
        return;
      }
      const validation = storage.validateBackup(text);
      if (!validation.ok) {
        setStatus(dataStatus, `${validation.errors[0]} Nothing was changed.`, 'error');
        restoreInput.value = '';
        return;
      }
      const confirmed = windowRef.confirm('Restore this backup? Saved Grizzly John data contained in the backup will be restored. Your unrelated browser data will not be touched.');
      if (!confirmed) {
        setStatus(dataStatus, 'Restore canceled. Nothing was changed.');
        restoreInput.value = '';
        return;
      }
      const restored = storage.restoreBackup(text);
      if (!restored.ok) {
        setStatus(dataStatus, `Restore could not be completed. ${restored.errors?.[0] || 'Nothing was changed.'}`, 'error');
        restoreInput.value = '';
        return;
      }
      setStatus(dataStatus, 'Backup restored. Reloading Grizzly John…', 'success');
      windowRef.setTimeout(() => windowRef.location.reload(), 450);
    });

    loadSettings();
    return { ok: true, openDrawer, closeDrawer };
  }

  const api = { APP_INFO, activeSection, reportMessage, reportSmsUrl, initializeSettings };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    window.GrizzlyJohnSettingsV2 = api;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => initializeSettings(), { once: true });
    else initializeSettings();
  }
})();
