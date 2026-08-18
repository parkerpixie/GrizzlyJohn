(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const storage = {
    get(key, fallback) {
      try {
        const value = localStorage.getItem(`grizzlyjohn:${key}`);
        return value ? JSON.parse(value) : fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      localStorage.setItem(`grizzlyjohn:${key}`, JSON.stringify(value));
    }
  };

  const state = {
    questCount: storage.get('questCount', 0),
    places: storage.get('places', []),
    listeningLog: storage.get('listeningLog', []),
    todayNote: storage.get('todayNote', ''),
    placeFilter: 'all'
  };

  function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function navigate(screenId) {
    $$('[data-screen]').forEach(screen => screen.classList.toggle('is-active', screen.id === screenId));
    $$('.nav-item').forEach(item => item.classList.toggle('is-active', item.dataset.nav === screenId));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function setupNavigation() {
    $$('[data-nav]').forEach(button => {
      button.addEventListener('click', () => navigate(button.dataset.nav));
    });
  }

  function setupDate() {
    const date = new Date();
    $('#todayDate').textContent = date.toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric'
    }).toUpperCase();
  }

  function renderWisdomCard(card) {
    $('#wisdomSymbol').textContent = card.symbol;
    $('#wisdomName').textContent = card.name.toUpperCase();
    $('#wisdomHeadline').textContent = card.headline;
    $('#wisdomBody').textContent = card.body;
    $('#wisdomQuote').textContent = `“${card.quote}”`;
    $('#wisdomQuestion').textContent = card.question;
    $('#wisdomPractice').textContent = card.practice;
  }

  function setupWisdom() {
    const dailyIndex = Math.floor(new Date().setHours(0,0,0,0) / 86400000) % GRIZZLY_DATA.wisdom.length;
    const daily = GRIZZLY_DATA.wisdom[dailyIndex];
    $('#dailyWisdomTitle').textContent = daily.name;
    $('#dailyWisdomLine').textContent = daily.headline;
    $('#dailyWisdomText').textContent = daily.body;
    renderWisdomCard(daily);

    $('#drawWisdom').addEventListener('click', () => renderWisdomCard(randomItem(GRIZZLY_DATA.wisdom)));

    const grid = $('#wisdomGrid');
    grid.innerHTML = GRIZZLY_DATA.wisdom.map((card, index) => `
      <button class="mini-card" type="button" data-wisdom-index="${index}">
        <span class="mini-card-icon">${card.symbol}</span>
        <span class="eyebrow">${card.name}</span>
        <strong>${card.headline}</strong>
      </button>
    `).join('');

    $$('[data-wisdom-index]').forEach(button => {
      button.addEventListener('click', () => {
        renderWisdomCard(GRIZZLY_DATA.wisdom[Number(button.dataset.wisdomIndex)]);
        $('#wisdomDetail').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function setQuest(quest, prefix = '') {
    $(`#${prefix}questTitle`).textContent = quest.title;
    $(`#${prefix}questDescription`).textContent = quest.description;
    if (!prefix) {
      $('#questEmoji').textContent = quest.emoji;
      $('#questCategory').textContent = quest.category;
    }
  }

  function setupQuests() {
    const dailyIndex = Math.floor(new Date().setHours(0,0,0,0) / 86400000) % GRIZZLY_DATA.quests.length;
    const daily = GRIZZLY_DATA.quests[dailyIndex];
    $('#todayQuest').textContent = daily.title;
    $('#todayQuestDescription').textContent = daily.description;
    setQuest(randomItem(GRIZZLY_DATA.quests));

    $('#newTodayQuest').addEventListener('click', () => {
      const next = randomItem(GRIZZLY_DATA.quests);
      $('#todayQuest').textContent = next.title;
      $('#todayQuestDescription').textContent = next.description;
    });

    $('#newQuest').addEventListener('click', () => setQuest(randomItem(GRIZZLY_DATA.quests)));
    $('#completeQuest').addEventListener('click', completeQuest);
    $('#completeTodayQuest').addEventListener('click', completeQuest);
    renderQuestProgress();
  }

  function completeQuest() {
    state.questCount += 1;
    storage.set('questCount', state.questCount);
    renderQuestProgress();
  }

  function renderQuestProgress() {
    $('#questCount').textContent = state.questCount;
    $('#stampGrid').innerHTML = GRIZZLY_DATA.stamps.map(stamp => {
      const unlocked = state.questCount >= stamp.requirement;
      return `
        <div class="stamp ${unlocked ? 'is-unlocked' : ''}">
          <span>${stamp.icon}</span>
          <strong>${stamp.name}</strong>
          <small>${unlocked ? 'Unlocked' : `${stamp.requirement} quests`}</small>
        </div>
      `;
    }).join('');
  }

  function setupTodayNote() {
    $('#todayNote').value = state.todayNote;
    $('#saveTodayNote').addEventListener('click', () => {
      state.todayNote = $('#todayNote').value.trim();
      storage.set('todayNote', state.todayNote);
      const status = $('#todayNoteStatus');
      status.textContent = 'Saved. The bear remembers.';
      setTimeout(() => status.textContent = 'Saved only on this device.', 2200);
    });
  }

  function setupPlaces() {
    $('#placeForm').addEventListener('submit', event => {
      event.preventDefault();
      const place = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        name: $('#placeName').value.trim(),
        state: $('#placeState').value.trim(),
        status: $('#placeStatus').value,
        memory: $('#placeMemory').value.trim(),
        addedAt: new Date().toISOString()
      };
      state.places.unshift(place);
      storage.set('places', state.places);
      event.target.reset();
      renderPlaces();
    });

    $$('[data-place-filter]').forEach(button => {
      button.addEventListener('click', () => {
        state.placeFilter = button.dataset.placeFilter;
        $$('[data-place-filter]').forEach(b => b.classList.toggle('is-active', b === button));
        renderPlaces();
      });
    });

    renderPlaces();
  }

  function renderPlaces() {
    const filtered = state.placeFilter === 'all'
      ? state.places
      : state.places.filter(place => place.status === state.placeFilter);

    const visited = state.places.filter(place => place.status === 'visited');
    const wishlist = state.places.filter(place => place.status === 'wishlist');
    const states = new Set(visited.map(place => place.state.trim().toLowerCase()).filter(Boolean));

    $('#visitedCount').textContent = visited.length;
    $('#wishlistCount').textContent = wishlist.length;
    $('#stateCount').textContent = states.size;

    $('#placeList').innerHTML = filtered.length ? filtered.map(place => `
      <article class="card place-card">
        <div>
          <span class="status-chip ${place.status}">${place.status === 'visited' ? '✓ Visited' : 'Want to go'}</span>
          <h3>${escapeHtml(place.name)}</h3>
          ${place.state ? `<p class="place-state">${escapeHtml(place.state)}</p>` : ''}
          ${place.memory ? `<p>${escapeHtml(place.memory)}</p>` : ''}
        </div>
        <button class="icon-button danger" type="button" data-delete-place="${place.id}" aria-label="Remove ${escapeHtml(place.name)}">×</button>
      </article>
    `).join('') : `
      <div class="empty-state">
        <span>🏞️</span>
        <h3>No places here yet.</h3>
        <p>John has probably been somewhere. We just haven’t interrogated him properly.</p>
      </div>
    `;

    $$('[data-delete-place]').forEach(button => {
      button.addEventListener('click', () => {
        state.places = state.places.filter(place => place.id !== button.dataset.deletePlace);
        storage.set('places', state.places);
        renderPlaces();
      });
    });
  }

  function setupPodcasts() {
    $('#podcastList').innerHTML = GRIZZLY_DATA.podcasts.map(podcast => `
      <article class="card podcast-card">
        <div class="podcast-art" aria-hidden="true">🎙️</div>
        <div class="podcast-copy">
          <h2>${podcast.title}</h2>
          <p>${podcast.description}</p>
          <div class="podcast-links">
            <a href="${podcast.spotify}" target="_blank" rel="noopener noreferrer">Spotify ↗</a>
            <a href="${podcast.apple}" target="_blank" rel="noopener noreferrer">Apple ↗</a>
            <a href="${podcast.amazon}" target="_blank" rel="noopener noreferrer">Amazon ↗</a>
          </div>
          <button class="button button-secondary" type="button" data-log-podcast="${podcast.id}">I listened to something</button>
        </div>
      </article>
    `).join('');

    $$('[data-log-podcast]').forEach(button => {
      button.addEventListener('click', () => {
        const podcast = GRIZZLY_DATA.podcasts.find(item => item.id === button.dataset.logPodcast);
        const thought = window.prompt(`What stuck with you from ${podcast.title}?\n\nLeave it blank if you just want to mark it listened.`);
        if (thought === null) return;
        state.listeningLog.unshift({
          id: String(Date.now()),
          podcast: podcast.title,
          thought: thought.trim(),
          date: new Date().toISOString()
        });
        storage.set('listeningLog', state.listeningLog);
        renderListeningLog();
      });
    });

    renderListeningLog();
  }

  function renderListeningLog() {
    $('#listeningLog').innerHTML = state.listeningLog.length ? state.listeningLog.map(entry => `
      <article class="card log-card">
        <p class="eyebrow">${new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
        <h3>${escapeHtml(entry.podcast)}</h3>
        <p>${entry.thought ? escapeHtml(entry.thought) : 'Listened. No notes. Sometimes a man just consumes audio.'}</p>
        <button class="text-button danger-text" type="button" data-delete-log="${entry.id}">Remove</button>
      </article>
    `).join('') : `
      <div class="empty-state compact">
        <span>🔥</span>
        <h3>Nothing logged yet.</h3>
        <p>When something makes you stop and think, save it here.</p>
      </div>
    `;

    $$('[data-delete-log]').forEach(button => {
      button.addEventListener('click', () => {
        state.listeningLog = state.listeningLog.filter(entry => entry.id !== button.dataset.deleteLog);
        storage.set('listeningLog', state.listeningLog);
        renderListeningLog();
      });
    });
  }

  function setupAbout() {
    const dialog = $('#aboutDialog');
    $('#settingsButton').addEventListener('click', () => dialog.showModal());
    $('#closeDialog').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      const rect = dialog.getBoundingClientRect();
      const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
      if (!inside) dialog.close();
    });
  }

  function escapeHtml(value = '') {
    return value.replace(/[&<>'"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[char]);
  }

  setupNavigation();
  setupDate();
  setupWisdom();
  setupQuests();
  setupTodayNote();
  setupPlaces();
  setupPodcasts();
  setupAbout();
})();
