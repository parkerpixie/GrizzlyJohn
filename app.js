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
      try { localStorage.setItem(`grizzlyjohn:${key}`, JSON.stringify(value)); } catch {}
    }
  };

  const state = {
    questCount: storage.get('questCount', 0),
    places: storage.get('places', []),
    listeningLog: storage.get('listeningLog', []),
    placeFilter: 'all',
    checkIns: storage.get('checkIns', []),
    feelingIndex: 0,
    touchStartY: null
  };

  const FEELING_GROUPS = [
    { id: 'bright', label: 'BRIGHT / GOOD', icon: '☀️', words: ['Great', 'Joyful', 'Happy', 'Content', 'Grateful', 'Hopeful', 'Proud', 'Playful', 'Excited', 'Energized', 'Inspired', 'Curious', 'Connected', 'Loved', 'Confident', 'Accomplished', 'Relieved'] },
    { id: 'calm', label: 'CALM / GROUNDED', icon: '🌲', words: ['Peaceful', 'Grounded', 'Centered', 'Safe', 'Comfortable', 'Relaxed', 'Patient', 'Open', 'Present', 'Steady', 'Trusting'] },
    { id: 'neutral', label: 'NEUTRAL / LOW ENERGY', icon: '🌥️', words: ['Okay', 'Fine', 'Neutral', 'Indifferent', 'Bored', 'Tired', 'Flat', 'Detached', 'Distracted', 'Unmotivated', 'Restless'] },
    { id: 'sad', label: 'SAD / HURT', icon: '🌧️', words: ['Disappointed', 'Discouraged', 'Lonely', 'Hurt', 'Rejected', 'Unseen', 'Grieving', 'Heavy', 'Empty', 'Hopeless', 'Devastated', 'Vulnerable'] },
    { id: 'fear', label: 'FEAR / ANXIETY', icon: '🌫️', words: ['Worried', 'Nervous', 'Uneasy', 'Apprehensive', 'Afraid', 'Panicked', 'Insecure', 'Dread', 'On edge', 'Overthinking', 'Pressured', 'Uncertain', 'Powerless'] },
    { id: 'anger', label: 'ANGER', icon: '🔥', words: ['Annoyed', 'Irritated', 'Frustrated', 'Resentful', 'Bitter', 'Defensive', 'Disrespected', 'Betrayed', 'Jealous', 'Provoked', 'Furious', 'Enraged'] },
    { id: 'shame', label: 'SHAME / SELF-CONSCIOUS', icon: '🪞', words: ['Embarrassed', 'Ashamed', 'Guilty', 'Inadequate', 'Exposed', 'Self-conscious', 'Regretful', 'Invalidated'] },
    { id: 'overwhelmed', label: 'OVERWHELMED / DYSREGULATED', icon: '🌪️', words: ['Overwhelmed', 'Flooded', 'Dysregulated', 'Scattered', 'Trapped', 'Stuck', 'Conflicted', 'Ambivalent', 'Shut down', 'Numb', 'Burned out', 'Helpless'] }
  ];

  const FEELINGS = FEELING_GROUPS.flatMap(group => group.words.map(word => ({ word, group })));

  const skillOverrides = {
    Panicked: ['TIPP', 'Your nervous system is running the meeting right now. Start with the body before asking the brain for a TED Talk.'],
    Flooded: ['TIPP', 'Bring the intensity down first. Decisions can wait until your nervous system stops throwing furniture.'],
    Dysregulated: ['TIPP', 'Start with the body. You do not need to reason your way out of a nervous-system fire drill.'],
    Furious: ['STOP', 'Create one clean pause before anger gets voting rights.'],
    Enraged: ['STOP', 'Do not hand the steering wheel to the hottest five minutes of the day.'],
    Frustrated: ['STOP', 'A short pause can keep frustration from choosing the next move for you.'],
    Resentful: ['Radical Acceptance', 'You do not have to approve of reality to stop wrestling with the fact that it exists.'],
    Betrayed: ['Radical Acceptance', 'Start with what is true now. Acceptance is not approval, forgiveness, or pretending it did not hurt.'],
    Worried: ['Check The Facts', 'Separate what you know from what anxiety is drafting as fan fiction.'],
    Overthinking: ['Check The Facts', 'Give the facts one microphone and the prediction machine considerably less airtime.'],
    Dread: ['Cope Ahead', 'Your brain is already visiting the future. Give it a useful itinerary.'],
    Uncertain: ['Cope Ahead', 'You cannot control the outcome, but you can decide how you want to meet it.'],
    Disrespected: ['DEAR MAN', 'If something needs to be said, say it clearly without making the conversation carry every old grievance too.'],
    Defensive: ['FAST', 'Protect your self-respect without turning the interaction into a courtroom drama.'],
    Guilty: ['Check The Facts', 'Figure out whether guilt fits the facts before sentencing yourself.'],
    Ashamed: ['Opposite Action', 'Shame wants hiding and shrinking. A small move toward safe connection can loosen its grip.'],
    Lonely: ['Opposite Action', 'Loneliness often asks for withdrawal while needing safe connection.'],
    Hopeless: ['Opposite Action', 'Do one small thing that moves against the shutdown impulse. Tiny counts.'],
    Vulnerable: ['Self Soothe', 'Gentleness is allowed here. You do not need to tough-guy your way through every exposed feeling.'],
    Trapped: ['IMPROVE', 'If the situation cannot change right this second, make the next few minutes more survivable.'],
    Stuck: ['Problem Solving', 'If there is an actual problem you can influence, shrink it to one next step.'],
    Conflicted: ['WISE MIND', 'Two things can be true. Let emotion and reason both submit their paperwork.'],
    Ambivalent: ['WISE MIND', 'You do not have to force certainty. Notice what emotion knows and what reason knows.']
  };

  const groupGuidance = {
    bright: { title: 'Keep some of this.', body: 'Good feelings count too. Notice what is working before your brain files the day under “nothing happened.”', skill: null },
    calm: { title: 'This is useful information.', body: 'Something is helping you feel steady. Notice the conditions around it so future John has a clue.', skill: null },
    neutral: { title: 'Neutral is still a real check-in.', body: 'No crisis. No fireworks. Just information. If your energy is low, basics like food, water, movement, rest, and connection are worth checking.', skill: 'ABC Please' },
    sad: { title: 'Be kind to the tender part.', body: 'Sadness often points toward loss, disappointment, disconnection, or something that mattered.', skill: 'Self Soothe' },
    fear: { title: 'Let’s separate danger from alarm.', body: 'Fear can be useful, but the nervous system occasionally hits the siren before checking the address.', skill: 'Check The Facts' },
    anger: { title: 'Anger has information. It does not need executive access.', body: 'Notice what feels blocked, unfair, threatened, or unresolved before deciding what deserves action.', skill: 'STOP' },
    shame: { title: 'Check the verdict before accepting the sentence.', body: 'Shame is very convincing and not always accurate. Separate what happened from what you are saying it means about you.', skill: 'Check The Facts' },
    overwhelmed: { title: 'Reduce the volume before solving the plot.', body: 'When everything is loud, the first job is getting your system back into a range where choices are possible.', skill: 'TIPP' }
  };

  function randomItem(items) { return items[Math.floor(Math.random() * items.length)]; }
  function escapeHtml(value = '') {
    return String(value).replace(/[&<>'\"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  }

  function rebuildHome() {
    const home = $('#today');
    if (!home) return;
    home.innerHTML = `
      <section class="home-greeting" aria-live="polite">
        <p class="eyebrow" id="todayDate">TODAY</p>
        <h1 id="dynamicGreeting">Good day, John.</h1>
        <p id="dynamicGreetingSub">Let’s see what today has in it.</p>
      </section>

      <article class="card weather-card home-weather" id="weatherCard">
        <div class="weather-top">
          <div class="weather-heading">
            <div class="weather-icon" id="weatherIcon" aria-hidden="true">🌤️</div>
            <div><p class="eyebrow">RIGHT NOW</p><h2 id="weatherCondition">What’s it doing out there?</h2><p class="weather-location" id="weatherLocation">Weather can follow John wherever he wanders.</p></div>
          </div>
          <div class="weather-temp" id="weatherTemp">--°</div>
        </div>
        <div class="weather-details" id="weatherDetails" hidden>
          <div class="weather-stat"><span>Feels</span><strong id="weatherFeels">—</strong></div>
          <div class="weather-stat"><span>High / Low</span><strong id="weatherHighLow">—</strong></div>
          <div class="weather-stat"><span>Rain</span><strong id="weatherRain">—</strong></div>
          <div class="weather-stat"><span>Wind</span><strong id="weatherWind">—</strong></div>
        </div>
        <div class="weather-actions"><p class="weather-status" id="weatherStatus">Tap once to let GrizzlyJohn use this device’s location for local weather.</p><button class="button button-secondary" id="loadWeather" type="button">Use my location</button></div>
      </article>

      <article class="card reflection-card compact-home-card">
        <div class="card-icon">📖</div>
        <div class="card-content"><p class="eyebrow">TODAY’S AA READING</p><h3>One day. One reflection.</h3><a class="button button-primary" href="https://www.aa.org/daily-reflections" target="_blank" rel="noopener noreferrer">Read today’s reflection ↗</a></div>
      </article>

      <article class="card meeting-card compact-home-card">
        <div class="card-icon">☀️</div>
        <div class="card-content">
          <p class="eyebrow">SUNRISERS · EVERY DAY</p><h3>Morning AA · 7:30 AM</h3><p>One tap. No hunting through old texts for the Zoom link.</p>
          <a class="button button-accent meeting-button" href="https://us02web.zoom.us/j/8269797361" target="_blank" rel="noopener noreferrer">Join morning meeting →</a>
          <small class="meeting-details">Meeting ID 826 979 7361 · Password 54321</small>
        </div>
      </article>

      <section class="card feeling-card" id="feelingCheckIn">
        <div class="feeling-header"><div><p class="eyebrow">QUICK CHECK-IN</p><h2>Where are you at, John?</h2><p>No essay required. Spin until one feels right.</p></div><button class="journey-link" id="openJourney" type="button">My journey →</button></div>
        <div class="feeling-family-row"><span id="feelingFamilyIcon" aria-hidden="true">☀️</span><strong id="feelingFamily">BRIGHT / GOOD</strong></div>
        <div class="feeling-wheel" id="feelingWheel" aria-label="Feeling picker. Swipe up or down to change the selected feeling.">
          <button class="wheel-arrow" id="feelingPrev" type="button" aria-label="Previous feeling">▲</button>
          <div class="wheel-window" id="wheelWindow" aria-live="polite"></div>
          <button class="wheel-arrow" id="feelingNext" type="button" aria-label="Next feeling">▼</button>
        </div>
        <p class="wheel-hint">Swipe, scroll, or use the arrows. Feelings stay grouped instead of alphabetical because humans are not filing cabinets.</p>
        <button class="button button-primary feeling-confirm" id="confirmFeeling" type="button">Yep, that’s it →</button>
        <div class="feeling-result" id="feelingResult" hidden aria-live="polite"></div>
        <div class="journey-panel" id="journeyPanel" hidden></div>
      </section>`;
  }

  function rebuildWisdom() {
    const wisdom = $('#wisdom');
    if (!wisdom) return;
    wisdom.innerHTML = `
      <div class="screen-intro wisdom-clean-intro"><p class="eyebrow">WISDOM</p><h1>Pick what you need.</h1><p>Three doors. No spiritual junk drawer.</p></div>
      <div class="wisdom-paths" role="tablist" aria-label="Wisdom choices">
        <button class="wisdom-path is-active" type="button" data-wisdom-panel="drawPanel"><span>🐻</span><strong>Draw Wisdom</strong><small>Give me a thought</small></button>
        <button class="wisdom-path" type="button" data-wisdom-panel="animalPanel"><span>🦉</span><strong>Spirit Animal</strong><small>Meet today’s guide</small></button>
        <button class="wisdom-path" type="button" data-wisdom-panel="skillsPanel"><span>🧠</span><strong>Skills for Right Now</strong><small>DBT, minus the homework vibe</small></button>
      </div>
      <section class="wisdom-panel is-active" id="drawPanel">
        <div class="card card-dark draw-card"><div><p class="eyebrow">NEED A THOUGHT?</p><h2>Ask the bear.</h2><p>No incense required.</p></div><button class="button button-light" id="drawWisdom" type="button">Draw wisdom</button></div>
        <article class="card wisdom-detail" id="wisdomDetail" aria-live="polite">
          <div class="wisdom-symbol" id="wisdomSymbol">🐻</div><p class="eyebrow" id="wisdomName">THE GRIZZLY</p><h2 id="wisdomHeadline">Know your own strength.</h2><p id="wisdomBody">Sometimes wisdom is knowing exactly where the fence belongs.</p><blockquote id="wisdomQuote">“I don’t need to test every boundary just because I could cross it.”</blockquote>
          <div class="wisdom-question"><strong>For today</strong><p id="wisdomQuestion">Where would knowing yourself save you trouble?</p></div><div class="wisdom-practice"><strong>Tiny practice</strong><p id="wisdomPractice">Name one thing you don’t need to negotiate with yourself today.</p></div>
        </article>
        <details class="wisdom-library-details"><summary>Browse more bear wisdom</summary><div class="card-grid" id="wisdomGrid"></div></details>
      </section>
      <section class="wisdom-panel" id="animalPanel">
        <div class="card spirit-intro-card"><p class="eyebrow">SPIRIT ANIMAL</p><h2>Meet your guide for right now.</h2><p>Draw one at random, or browse the whole animal deck when a particular creature is calling your name.</p><button class="button button-primary" id="drawOracleCard" type="button">Draw a spirit animal</button></div>
        <section class="oracle-library" id="oracleLibrary" hidden><div class="oracle-library-intro"><div><p class="eyebrow">THE ANIMAL DECK</p><h2>Choose deliberately</h2><p>Tap a card to read it. Turn the phone sideways if the words get tiny.</p></div><span class="count-pill" id="oracleLibraryCount">0 cards</span></div><div class="oracle-card-grid" id="oracleCardGrid"></div></section>
      </section>
      <section class="wisdom-panel" id="skillsPanel">
        <div class="card skills-intro-card"><p class="eyebrow">DBT SKILLS</p><h2>Use a feeling to find the tool.</h2><p>The easiest route starts with the check-in on Home. Pick the detailed feeling, get one practical suggestion, and only open the education card if you actually want the deeper explanation.</p><button class="button button-secondary" type="button" data-nav="today" data-focus-feelings>Take me to the feelings picker →</button></div>
        <section class="dbt-toolbox" id="dbtToolbox"><div class="dbt-toolbox-header"><div><p class="eyebrow">OR BROWSE THE TOOLBOX</p><h2>I already know what I’m looking for.</h2><p>All of the detailed cards are still here. They just stopped yelling from the Home screen.</p></div><span class="count-pill" id="dbtCount">skills</span></div><button class="button button-primary" id="drawDbtSkill" type="button">Surprise me with a tool</button><div class="dbt-grid" id="dbtCardGrid"></div></section>
      </section>
      <article class="card oracle-daily-card compatibility-oracle" id="dailyOracleCard" hidden aria-hidden="true"><button class="oracle-daily-image-button" type="button"><img class="oracle-daily-image" id="dailyOracleImage" alt=""></button><div class="oracle-daily-copy"><h3 id="dailyOracleTitle">Today’s card</h3><button class="text-button" id="openDailyOracle" type="button">Open</button></div></article>`;
  }

  function navigate(screenId) {
    $$('[data-screen]').forEach(screen => screen.classList.toggle('is-active', screen.id === screenId));
    $$('.nav-item').forEach(item => item.classList.toggle('is-active', item.dataset.nav === screenId));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function setupNavigation() {
    document.addEventListener('click', event => {
      const button = event.target.closest('[data-nav]');
      if (!button) return;
      navigate(button.dataset.nav);
      if (button.hasAttribute('data-focus-feelings')) setTimeout(() => $('#feelingCheckIn')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 260);
    });
  }

  function setupDateAndGreeting() {
    const date = new Date();
    if ($('#todayDate')) $('#todayDate').textContent = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();
    updateGreeting();
    window.addEventListener('grizzly-weather-updated', event => updateGreeting(event.detail));
  }

  function updateGreeting(weather = null) {
    const title = $('#dynamicGreeting');
    const sub = $('#dynamicGreetingSub');
    if (!title || !sub) return;
    const hour = new Date().getHours();
    let base = hour < 12 ? 'Good morning, John.' : hour < 17 ? 'Good afternoon, John.' : hour < 22 ? 'Good evening, John.' : 'It’s getting late, John.';
    let line = hour < 12 ? 'Let’s see what today has in it.' : hour < 17 ? 'How’s the day treating you?' : hour < 22 ? 'Let’s see what is worth keeping from today.' : 'The world can wait until tomorrow.';
    if (weather) {
      const code = Number(weather.code), temp = Number(weather.temp), rainChance = Number(weather.rainChance);
      if ([95, 96, 99].includes(code)) { base = 'Nature is being dramatic today. ⛈️'; line = 'We do not have to join her.'; }
      else if ([63, 65, 80, 81, 82].includes(code) || rainChance >= 70) { base = hour < 12 ? 'Well, the weather is shit. 🌧️' : 'Still gross out there. 🌧️'; line = 'Let’s find a better way to enjoy the day anyway.'; }
      else if ([71, 73, 75, 77, 85, 86].includes(code)) { base = 'It’s doing the Wisconsin thing again. ❄️'; line = 'Warm socks remain an underrated life strategy.'; }
      else if (temp >= 90) { base = 'It’s offensively hot outside. 🥵'; line = 'Hydrate accordingly and avoid arguing with the sun.'; }
      else if (temp <= 10) { base = 'Cold as hell out there. 🥶'; line = 'Indoor activities have submitted a very strong application.'; }
      else if ([0, 1].includes(code) && temp >= 55 && temp <= 82) { base = hour < 12 ? 'Morning, John. The sun showed up for work. ☀️' : 'Okay, John. It’s gorgeous outside. ☀️'; line = 'This one may be worth stepping into for a while.'; }
    }
    title.textContent = base; sub.textContent = line;
  }

  function renderWisdomCard(card) {
    if (!card) return;
    $('#wisdomSymbol').textContent = card.symbol; $('#wisdomName').textContent = card.name.toUpperCase(); $('#wisdomHeadline').textContent = card.headline; $('#wisdomBody').textContent = card.body; $('#wisdomQuote').textContent = `“${card.quote}”`; $('#wisdomQuestion').textContent = card.question; $('#wisdomPractice').textContent = card.practice;
  }

  function setupWisdom() {
    if (!window.GRIZZLY_DATA?.wisdom?.length) return;
    const dailyIndex = Math.floor(new Date().setHours(0, 0, 0, 0) / 86400000) % GRIZZLY_DATA.wisdom.length;
    renderWisdomCard(GRIZZLY_DATA.wisdom[dailyIndex]);
    $('#drawWisdom')?.addEventListener('click', () => renderWisdomCard(randomItem(GRIZZLY_DATA.wisdom)));
    const grid = $('#wisdomGrid');
    if (grid) {
      grid.innerHTML = GRIZZLY_DATA.wisdom.map((card, index) => `<button class="mini-card" type="button" data-wisdom-index="${index}"><span class="mini-card-icon">${card.symbol}</span><span class="eyebrow">${escapeHtml(card.name)}</span><strong>${escapeHtml(card.headline)}</strong></button>`).join('');
      $$('[data-wisdom-index]', grid).forEach(button => button.addEventListener('click', () => { renderWisdomCard(GRIZZLY_DATA.wisdom[Number(button.dataset.wisdomIndex)]); $('#wisdomDetail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
    }
    $$('[data-wisdom-panel]').forEach(button => button.addEventListener('click', () => { $$('[data-wisdom-panel]').forEach(item => item.classList.toggle('is-active', item === button)); $$('.wisdom-panel').forEach(panel => panel.classList.toggle('is-active', panel.id === button.dataset.wisdomPanel)); }));
  }

  function renderFeelingWheel() {
    const windowEl = $('#wheelWindow');
    if (!windowEl) return;
    const count = FEELINGS.length;
    windowEl.innerHTML = [-2, -1, 0, 1, 2].map(offset => {
      const index = (state.feelingIndex + offset + count) % count, feeling = FEELINGS[index], klass = offset === 0 ? 'is-selected' : Math.abs(offset) === 1 ? 'is-near' : 'is-far';
      return `<button class="wheel-word ${klass}" type="button" data-feeling-index="${index}" aria-label="Choose ${escapeHtml(feeling.word)}">${escapeHtml(feeling.word)}</button>`;
    }).join('');
    const selected = FEELINGS[state.feelingIndex];
    $('#feelingFamily').textContent = selected.group.label; $('#feelingFamilyIcon').textContent = selected.group.icon;
    $$('.wheel-word', windowEl).forEach(button => button.addEventListener('click', () => { state.feelingIndex = Number(button.dataset.feelingIndex); renderFeelingWheel(); }));
  }

  function moveFeeling(delta) { state.feelingIndex = (state.feelingIndex + delta + FEELINGS.length) % FEELINGS.length; renderFeelingWheel(); }
  function getFeelingGuidance(feeling) { const override = skillOverrides[feeling.word], base = groupGuidance[feeling.group.id]; return override ? { ...base, skill: override[0], body: override[1] } : base; }

  function setupFeelings() {
    renderFeelingWheel();
    $('#feelingPrev')?.addEventListener('click', () => moveFeeling(-1)); $('#feelingNext')?.addEventListener('click', () => moveFeeling(1));
    const wheel = $('#feelingWheel');
    wheel?.addEventListener('wheel', event => { event.preventDefault(); moveFeeling(event.deltaY > 0 ? 1 : -1); }, { passive: false });
    wheel?.addEventListener('touchstart', event => { state.touchStartY = event.changedTouches[0]?.screenY ?? null; }, { passive: true });
    wheel?.addEventListener('touchend', event => { if (state.touchStartY === null) return; const endY = event.changedTouches[0]?.screenY ?? state.touchStartY; const delta = endY - state.touchStartY; state.touchStartY = null; if (Math.abs(delta) >= 24) moveFeeling(delta < 0 ? 1 : -1); }, { passive: true });
    $('#confirmFeeling')?.addEventListener('click', () => showFeelingResult(FEELINGS[state.feelingIndex])); $('#openJourney')?.addEventListener('click', toggleJourney);
  }

  function showFeelingResult(feeling) {
    const result = $('#feelingResult'), guidance = getFeelingGuidance(feeling);
    if (!result) return;
    const skillBlock = guidance.skill ? `<div class="skill-suggestion"><p class="eyebrow">THIS MIGHT HELP</p><h3>${escapeHtml(guidance.skill)}</h3><p>${escapeHtml(guidance.body)}</p><div class="feeling-actions"><button class="button button-secondary" type="button" data-save-feeling="${escapeHtml(feeling.word)}">Save to my journey</button><button class="button button-primary" type="button" data-learn-skill="${escapeHtml(guidance.skill)}">Fine, teach me the thing →</button></div></div>` : `<div class="skill-suggestion positive-suggestion"><h3>${escapeHtml(guidance.title)}</h3><p>${escapeHtml(guidance.body)}</p><div class="feeling-actions"><button class="button button-primary" type="button" data-save-feeling="${escapeHtml(feeling.word)}">Keep this one →</button></div></div>`;
    result.innerHTML = `<div class="selected-feeling-summary"><span>${feeling.group.icon}</span><div><p class="eyebrow">YOU PICKED</p><h2>${escapeHtml(feeling.word)}</h2><small>${escapeHtml(feeling.group.label)}</small></div></div>${skillBlock}`;
    result.hidden = false; result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    result.querySelector('[data-save-feeling]')?.addEventListener('click', () => saveCheckIn(feeling, guidance.skill));
    result.querySelector('[data-learn-skill]')?.addEventListener('click', event => openSkillCard(event.currentTarget.dataset.learnSkill));
  }

  function saveCheckIn(feeling, skill) {
    state.checkIns.unshift({ id: String(Date.now()), date: new Date().toISOString(), feeling: feeling.word, group: feeling.group.label, icon: feeling.group.icon, skill: skill || null });
    state.checkIns = state.checkIns.slice(0, 120); storage.set('checkIns', state.checkIns);
    const button = $('#feelingResult [data-save-feeling]'); if (button) { button.textContent = 'Saved ✓'; button.disabled = true; }
    renderJourney();
  }

  function toggleJourney() { const panel = $('#journeyPanel'); if (!panel) return; panel.hidden = !panel.hidden; if (!panel.hidden) renderJourney(); }
  function renderJourney() {
    const panel = $('#journeyPanel'); if (!panel) return;
    if (!state.checkIns.length) { panel.innerHTML = '<div class="journey-empty"><h3>Your journey starts whenever you want it to.</h3><p>Good days belong here too.</p></div>'; return; }
    const recent = state.checkIns.slice(0, 12);
    panel.innerHTML = `<div class="journey-heading"><div><p class="eyebrow">MY JOURNEY</p><h3>Recent check-ins</h3></div><button class="text-button" type="button" id="closeJourney">Close</button></div><div class="journey-list">${recent.map(entry => `<div class="journey-entry"><span>${entry.icon || '•'}</span><div><strong>${escapeHtml(entry.feeling)}</strong><small>${new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${new Date(entry.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}${entry.skill ? ` · ${escapeHtml(entry.skill)}` : ''}</small></div></div>`).join('')}</div>`;
    $('#closeJourney')?.addEventListener('click', () => { panel.hidden = true; });
  }

  function openSkillCard(skillName) {
    navigate('wisdom'); $('[data-wisdom-panel="skillsPanel"]')?.click();
    const tryOpen = (attempt = 0) => { const target = $$('.dbt-card-button').find(button => button.textContent.trim().toLowerCase().startsWith(skillName.toLowerCase())); if (target) { target.click(); return; } if (attempt < 10) setTimeout(() => tryOpen(attempt + 1), 250); };
    setTimeout(() => tryOpen(), 120);
  }

  function setQuest(quest) { if (!quest) return; $('#questTitle').textContent = quest.title; $('#questDescription').textContent = quest.description; $('#questEmoji').textContent = quest.emoji; $('#questCategory').textContent = quest.category; }
  function setupQuests() { if (!window.GRIZZLY_DATA?.quests?.length || !$('#questTitle')) return; setQuest(randomItem(GRIZZLY_DATA.quests)); $('#newQuest')?.addEventListener('click', () => setQuest(randomItem(GRIZZLY_DATA.quests))); $('#completeQuest')?.addEventListener('click', completeQuest); renderQuestProgress(); }
  function completeQuest() { state.questCount += 1; storage.set('questCount', state.questCount); renderQuestProgress(); }
  function renderQuestProgress() { if (!$('#questCount') || !$('#stampGrid')) return; $('#questCount').textContent = state.questCount; $('#stampGrid').innerHTML = GRIZZLY_DATA.stamps.map(stamp => { const unlocked = state.questCount >= stamp.requirement; return `<div class="stamp ${unlocked ? 'is-unlocked' : ''}"><span>${stamp.icon}</span><strong>${escapeHtml(stamp.name)}</strong><small>${unlocked ? 'Unlocked' : `${stamp.requirement} quests`}</small></div>`; }).join(''); }

  function setupPlaces() {
    const form = $('#placeForm'); if (!form) return;
    form.addEventListener('submit', event => { event.preventDefault(); const place = { id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), name: $('#placeName').value.trim(), state: $('#placeState').value.trim(), status: $('#placeStatus').value, memory: $('#placeMemory').value.trim(), addedAt: new Date().toISOString() }; state.places.unshift(place); storage.set('places', state.places); event.target.reset(); renderPlaces(); });
    $$('[data-place-filter]').forEach(button => button.addEventListener('click', () => { state.placeFilter = button.dataset.placeFilter; $$('[data-place-filter]').forEach(b => b.classList.toggle('is-active', b === button)); renderPlaces(); })); renderPlaces();
  }
  function renderPlaces() {
    const filtered = state.placeFilter === 'all' ? state.places : state.places.filter(place => place.status === state.placeFilter), visited = state.places.filter(place => place.status === 'visited'), wishlist = state.places.filter(place => place.status === 'wishlist'), states = new Set(visited.map(place => place.state.trim().toLowerCase()).filter(Boolean));
    $('#visitedCount').textContent = visited.length; $('#wishlistCount').textContent = wishlist.length; $('#stateCount').textContent = states.size;
    $('#placeList').innerHTML = filtered.length ? filtered.map(place => `<article class="card place-card"><div><span class="status-chip ${place.status}">${place.status === 'visited' ? '✓ Visited' : 'Want to go'}</span><h3>${escapeHtml(place.name)}</h3>${place.state ? `<p class="place-state">${escapeHtml(place.state)}</p>` : ''}${place.memory ? `<p>${escapeHtml(place.memory)}</p>` : ''}</div><button class="icon-button danger" type="button" data-delete-place="${place.id}" aria-label="Remove ${escapeHtml(place.name)}">×</button></article>`).join('') : '<div class="empty-state"><span>🏞️</span><h3>No places here yet.</h3><p>John has probably been somewhere. We just haven’t interrogated him properly.</p></div>';
    $$('[data-delete-place]').forEach(button => button.addEventListener('click', () => { state.places = state.places.filter(place => place.id !== button.dataset.deletePlace); storage.set('places', state.places); renderPlaces(); }));
  }

  function setupPodcasts() {
    if (!$('#podcastList') || !window.GRIZZLY_DATA?.podcasts) return;
    $('#podcastList').innerHTML = GRIZZLY_DATA.podcasts.map(podcast => `<article class="card podcast-card"><div class="podcast-art" aria-hidden="true">🎙️</div><div class="podcast-copy"><h2>${escapeHtml(podcast.title)}</h2><p>${escapeHtml(podcast.description)}</p><div class="podcast-links"><a href="${podcast.spotify}" target="_blank" rel="noopener noreferrer">Spotify ↗</a><a href="${podcast.apple}" target="_blank" rel="noopener noreferrer">Apple ↗</a><a href="${podcast.amazon}" target="_blank" rel="noopener noreferrer">Amazon ↗</a></div><button class="button button-secondary" type="button" data-log-podcast="${podcast.id}">I listened to something</button></div></article>`).join('');
    $$('[data-log-podcast]').forEach(button => button.addEventListener('click', () => { const podcast = GRIZZLY_DATA.podcasts.find(item => item.id === button.dataset.logPodcast); const thought = window.prompt(`What stuck with you from ${podcast.title}?\n\nLeave it blank if you just want to mark it listened.`); if (thought === null) return; state.listeningLog.unshift({ id: String(Date.now()), podcast: podcast.title, thought: thought.trim(), date: new Date().toISOString() }); storage.set('listeningLog', state.listeningLog); renderListeningLog(); })); renderListeningLog();
  }
  function renderListeningLog() {
    if (!$('#listeningLog')) return;
    $('#listeningLog').innerHTML = state.listeningLog.length ? state.listeningLog.map(entry => `<article class="card log-card"><p class="eyebrow">${new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p><h3>${escapeHtml(entry.podcast)}</h3><p>${entry.thought ? escapeHtml(entry.thought) : 'Listened. No notes. Sometimes a man just consumes audio.'}</p><button class="text-button danger-text" type="button" data-delete-log="${entry.id}">Remove</button></article>`).join('') : '<div class="empty-state compact"><span>🔥</span><h3>Nothing logged yet.</h3><p>When something makes you stop and think, save it here.</p></div>';
    $$('[data-delete-log]').forEach(button => button.addEventListener('click', () => { state.listeningLog = state.listeningLog.filter(entry => entry.id !== button.dataset.deleteLog); storage.set('listeningLog', state.listeningLog); renderListeningLog(); }));
  }

  function setupAbout() {
    const dialog = $('#aboutDialog'); if (!dialog) return;
    $('#settingsButton')?.addEventListener('click', () => dialog.showModal()); $('#closeDialog')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { const rect = dialog.getBoundingClientRect(); const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom; if (!inside) dialog.close(); });
  }

  rebuildHome(); rebuildWisdom(); setupNavigation(); setupDateAndGreeting(); setupWisdom(); setupFeelings(); setupQuests(); setupPlaces(); setupPodcasts(); setupAbout();
})();