(() => {
  'use strict';

  const TILES = Object.freeze([
    { valueId: 'healthSnapshotVitals', type: 'vitals', label: 'Vitals', action: 'Add reading' },
    { valueId: 'healthSnapshotWeight', type: 'weight', label: 'Weight', action: 'Log weight' },
    { valueId: 'healthSnapshotActivity', type: 'activity', label: 'Activity', action: 'Add activity' },
    { valueId: 'healthSnapshotMedication', type: 'medication', label: 'Medication', action: 'Update windows' },
    { valueId: 'healthSnapshotSleep', type: 'sleep', label: 'Sleep', action: 'Update sleep' },
    { valueId: 'healthSnapshotNotes', type: 'note', label: 'Notes and symptoms', action: 'Add note' },
    { valueId: 'healthSnapshotBodyFeel', type: 'bodyFeel', label: 'Body feel', action: 'Update body feel' }
  ]);

  function ui() {
    return window.GrizzlyJohnHealthUIV3 || null;
  }

  function openTile(type) {
    const healthUi = ui();
    if (!healthUi?.openDialog) return;
    healthUi.openDialog(type);
  }

  function enhanceSnapshot() {
    const heading = document.getElementById('healthSnapshotHeading');
    if (heading) heading.textContent = 'Today at a glance.';

    const snapshotHeading = document.querySelector('.health-snapshot-heading > div');
    if (snapshotHeading && !snapshotHeading.querySelector('.health-dashboard-helper')) {
      snapshotHeading.insertAdjacentHTML('beforeend', '<p class="health-dashboard-helper">Tap any tile to log or update it.</p>');
    }

    TILES.forEach(({ valueId, type, label, action }) => {
      const value = document.getElementById(valueId);
      const tile = value?.closest('.health-snapshot-item');
      if (!tile) return;

      tile.classList.add('health-dashboard-tile');
      tile.dataset.healthDashboardType = type;
      tile.setAttribute('role', 'button');
      tile.setAttribute('tabindex', '0');
      tile.setAttribute('aria-label', `${label}. ${action}.`);

      let actionNode = tile.querySelector('.health-snapshot-action');
      if (!actionNode) {
        actionNode = document.createElement('span');
        actionNode.className = 'health-snapshot-action';
        tile.append(actionNode);
      }
      actionNode.textContent = `${action} →`;
    });

    const bodyFeel = document.getElementById('healthSnapshotBodyFeel')?.closest('.health-snapshot-item');
    bodyFeel?.classList.add('health-dashboard-body-feel');

    const catchAll = document.getElementById('openHealthLog');
    if (catchAll) {
      catchAll.textContent = '+ Log something else';
      catchAll.classList.remove('button-primary');
      catchAll.classList.add('button-secondary', 'health-dashboard-catchall');
    }
  }

  function entryCountLabel(list) {
    const count = list?.querySelectorAll('.health-log-entry').length || 0;
    if (count === 0) return 'Nothing logged yet';
    return `${count} ${count === 1 ? 'entry' : 'entries'} today`;
  }

  function updateEntryCount() {
    const list = document.getElementById('healthTodayLog');
    const count = document.getElementById('healthDashboardEntryCount');
    if (count) count.textContent = entryCountLabel(list);
  }

  function compactTodayLog() {
    const section = document.querySelector('.health-today-section');
    const list = document.getElementById('healthTodayLog');
    if (!section || !list || section.dataset.dashboardReady === 'true') return;
    section.dataset.dashboardReady = 'true';
    section.classList.add('health-dashboard-details');

    const heading = section.querySelector('.health-section-heading');
    if (heading) {
      heading.innerHTML = `
        <p class="eyebrow">TODAY'S DETAILS</p>
        <h2>More detail when you want it</h2>
        <p>The dashboard keeps the summary up top. The full record can stay tucked away until you need it.</p>`;
    }

    const details = document.createElement('details');
    details.className = 'health-log-details';
    const summary = document.createElement('summary');
    summary.innerHTML = `
      <span class="health-log-details-copy">
        <strong>View today's entries</strong>
        <small id="healthDashboardEntryCount">${entryCountLabel(list)}</small>
      </span>
      <span class="health-log-details-chevron" aria-hidden="true">⌄</span>`;

    list.before(details);
    details.append(summary, list);

    const observer = new MutationObserver(updateEntryCount);
    observer.observe(list, { childList: true, subtree: true });
    updateEntryCount();
  }

  function bindInteractions() {
    document.addEventListener('click', event => {
      const tile = event.target.closest('[data-health-dashboard-type]');
      if (!tile) return;
      event.preventDefault();
      openTile(tile.dataset.healthDashboardType);
    });

    document.addEventListener('keydown', event => {
      const tile = event.target.closest('[data-health-dashboard-type]');
      if (!tile || !['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      openTile(tile.dataset.healthDashboardType);
    });
  }

  function init() {
    if (!document.getElementById('health')) return;
    enhanceSnapshot();
    compactTodayLog();
    bindInteractions();
  }

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(init, 0), { once: true });
    else setTimeout(init, 0);
  }
})();
