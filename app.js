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
    placeTypeFilter: 'all',
    checkIns: storage.get('checkIns', []),
    feelingIndex: 0,
    touchStartY: null,
    selectedFeelings: [],
    historyDate: null,
    guidedSessionIds: []
  };

  const GOLD_STAR_IDEAS = [
    'Fill in blank item', 'Make Bed', 'Take Meds', 'Throw Ball for Blue', 'Tell Heidi I Love Her',
    'Call or Text a Friend', 'Go to a Meeting', 'Go to the No Judgement Zone - Planet Fitness',
    'Take Blue to Dog Park', 'Call or Text One of My Kids', 'Complete a House Project',
    'Complete a Trailer Project', 'Read Today’s Daily Reflection'
  ];

  const GUIDED_SKILLS = {
    'WISE MIND': ['What is Emotion Mind saying?', 'What is Reasonable Mind saying?', 'What does Wise Mind say when both are allowed to be true?'],
    STOP: ['What is happening right now?', 'What can you pause before acting on?', 'What is the next effective move?'],
    'Self Soothe': ['Which sense could use some gentleness?', 'What is one soothing thing available right now?', 'What will you do for the next five minutes?'],
    HALT: ['Are you hungry, angry, lonely, or tired?', 'Which need is loudest?', 'What small action would address that need?'],
    TIPP: ['How intense is this from 0–10?', 'Which body-first reset will you try?', 'What changed after one minute?'],
    'Opposite Action': ['What action urge is this feeling creating?', 'Does that urge fit the facts and help?', 'What small opposite action could you take?'],
    'Radical Acceptance': ['What reality are you fighting?', 'What does accepting the fact—not approving it—sound like?', 'How can you soften the fight for this moment?'],
    'DEAR MAN': ['What do you need to describe without judgment?', 'What do you want to ask for?', 'How can you stay mindful and reinforce the request?'],
    FAST: ['What would protect your self-respect here?', 'What apology are you tempted to make that is not needed?', 'What truthful, fair response fits?'],
    'Cope Ahead': ['What situation are you preparing for?', 'What skillful response do you want to rehearse?', 'What is your first step when it begins?'],
    'Problem Solving': ['What is the specific problem you can influence?', 'What are two possible next steps?', 'Which smallest step will you try first?'],
    'Check The Facts': ['What facts do you know for certain?', 'What story or prediction is your mind adding?', 'What response fits the facts you actually have?'],
    'ABC Please': ['Which body or routine basic needs attention?', 'What positive or meaningful activity is available?', 'What is one small action for today?'],
    IMPROVE: ['What part of this moment cannot change immediately?', 'What could make the next few minutes more bearable?', 'Which small improvement will you try?']
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
      <section class="home-greeting home-hero-v2" aria-live="polite">
        <div><p class="eyebrow" id="todayDate">TODAY</p><h1 id="dynamicGreeting">Good morning, John.</h1><p id="dynamicGreetingSub">Let’s see what today has in it.</p></div>
        <img src="graphics/GrizzlyJohn%20Blue%2001.png" alt="GrizzlyJohn and Blue camping beside the lake">
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

      <section class="keep-close-section" aria-labelledby="keepCloseHeading">
        <div class="today-supporting-heading"><p class="eyebrow">KEEP CLOSE</p><h2 id="keepCloseHeading">Good things already on the trail</h2></div>
        <div class="keep-close-grid">
          <article class="card reflection-card compact-home-card"><div class="card-icon">📖</div><div class="card-content"><p class="eyebrow">TODAY’S AA READING</p><h3>One day. One reflection.</h3><a class="button button-primary" href="https://www.aa.org/daily-reflections" target="_blank" rel="noopener noreferrer">Read today’s reflection ↗</a></div></article>
        </div>
      </section>

      <section class="daily-meetings" aria-labelledby="dailyMeetingsHeading">
        <div class="today-supporting-heading"><p class="eyebrow">TODAY’S AA MEETINGS</p><h2 id="dailyMeetingsHeading">A meeting is one tap away</h2></div>
        <div class="meeting-list">
          <article class="card meeting-card compact-home-card" data-meeting-hour="6.5"><div class="card-icon">🌅</div><div class="card-content"><p class="eyebrow">SUNRISE SERENITY · EVERY DAY</p><h3>6:30 AM</h3><a class="button button-accent meeting-button" href="https://us06web.zoom.us/j/83478453844?pwd=MkkBvOglPO7bmFQvHaxa6iyIWiCQC.1" target="_blank" rel="noopener noreferrer">JOIN ZOOM</a><details class="meeting-details"><summary>Meeting details</summary><p>Meeting ID: 834 7845 3844<br>Passcode: 403856</p></details></div></article>
          <article class="card meeting-card compact-home-card" data-meeting-hour="7.5"><div class="card-icon">☀️</div><div class="card-content"><p class="eyebrow">SUNRISERS · EVERY DAY</p><h3>7:30 AM</h3><a class="button button-accent meeting-button" href="https://us02web.zoom.us/j/8269797361" target="_blank" rel="noopener noreferrer">JOIN ZOOM</a><details class="meeting-details"><summary>Meeting details</summary><p>Meeting ID: 826 979 7361<br>Password: 54321<br>Zoom phone: <a href="tel:+13126266799">312-626-6799</a></p></details></div></article>
        </div>
      </section>

      <section class="card today-v2-card gratitude-card" aria-labelledby="gratitudeHeading">
        <div class="today-v2-heading">
          <div><p class="eyebrow">WHAT WOULD MAKE TODAY A GOOD DAY?</p><h2 id="gratitudeHeading">Today’s Gratitude</h2></div>
          <span class="today-v2-icon" aria-hidden="true">🌲</span>
        </div>
        <form class="today-inline-form" id="gratitudeForm">
          <label class="visually-hidden" for="gratitudeText">Add something you are grateful for today</label>
          <input id="gratitudeText" maxlength="500" autocomplete="off" placeholder="Something worth noticing…" required>
          <button class="button button-primary" type="submit">Add</button>
        </form>
        <p class="today-form-status" id="gratitudeStatus" role="status" aria-live="polite"></p>
        <div class="gratitude-list" id="gratitudeList"></div>
      </section>

      <section class="card today-v2-card gold-stars-card" aria-labelledby="goldStarsHeading">
        <div class="today-v2-heading">
          <div><p class="eyebrow">EASY WINS COUNT</p><h2 id="goldStarsHeading">Easy Gold Stars ⭐️</h2></div>
          <button class="text-button" id="editGoldStars" type="button">Edit Stars</button>
        </div>
        <div id="goldStarBadgeState" class="gold-star-badge-state" hidden aria-live="polite"></div>
        <div id="goldStarChecklist" class="gold-star-checklist"></div>
        <details class="gold-star-ideas" id="goldStarIdeas"><summary>Need an idea?</summary><form id="goldStarIdeaForm"><fieldset><legend>Pick from today’s ideas</legend><div class="gold-star-idea-list">${GOLD_STAR_IDEAS.map((idea, index) => `<label><input type="checkbox" name="goldStarIdea" value="${escapeHtml(idea)}"><span>${escapeHtml(idea)}</span></label>`).join('')}</div></fieldset><button class="button button-secondary" type="submit">Add selected ideas</button><p class="today-form-status" id="goldStarIdeaStatus" role="status" aria-live="polite"></p></form></details>
      </section>

      <section class="today-so-far" aria-labelledby="todaySoFarHeading">
        <div class="today-snapshot-heading"><p class="eyebrow">A QUICK GLANCE</p><h2 id="todaySoFarHeading">Today So Far</h2></div>
        <div class="today-snapshot-grid">
          <div class="today-snapshot-item"><span aria-hidden="true">🌲</span><strong id="todayGratitudeCount">0</strong><small>Gratitudes</small></div>
          <div class="today-snapshot-item"><span aria-hidden="true">⭐️</span><strong id="todayGoldStarCount">0 / 0</strong><small>Gold Stars</small></div>
          <div class="today-snapshot-item"><span aria-hidden="true">💭</span><strong id="todayCheckInCount">0</strong><small>Check-ins</small></div>
        </div>
        <button class="text-button today-history-link" type="button" data-nav="wisdom" data-focus-history>View check-in history →</button>
      </section>

      <dialog class="gold-star-editor" id="goldStarEditor">
        <div class="gold-star-editor-shell">
          <div class="gold-star-editor-heading"><div><p class="eyebrow">MAKE THEM YOURS</p><h2>Edit Easy Gold Stars</h2><p>Keep the small things that make a day feel like yours. Archived Stars keep their old history.</p></div><button class="dialog-close" id="closeGoldStarEditor" type="button" aria-label="Close">×</button></div>
          <form class="today-inline-form" id="addGoldStarForm"><label class="visually-hidden" for="newGoldStarLabel">New Gold Star</label><input id="newGoldStarLabel" maxlength="120" placeholder="What counts as an easy win?" required><button class="button button-primary" type="submit">Add Star</button></form>
          <p class="today-form-status" id="goldStarEditorStatus" role="status" aria-live="polite"></p>
          <div id="goldStarEditorList"></div>
        </div>
      </dialog>`;
  }

  function rebuildWisdom() {
    const wisdom = $('#wisdom');
    if (!wisdom) return;
    wisdom.innerHTML = `
      <div class="screen-intro wisdom-clean-intro"><p class="eyebrow">WISDOM</p><h1>A little room to notice.</h1><p>Pull a reflection, check in, or reach for a practical tool.</p></div>
      <section class="wisdom-reflection" aria-labelledby="reflectionHeading">
        <div class="card reflection-pull-prompt" id="reflectionPullPrompt"><p class="eyebrow">TODAY’S REFLECTION</p><h2 id="reflectionHeading">Pull today’s reflection card</h2><p>The card stays with today once it is revealed.</p><button class="button button-primary" id="pullReflectionCard" type="button">Pull today’s reflection card</button></div>
        <article class="card oracle-daily-card" id="dailyOracleCard" hidden><button class="oracle-daily-image-button" type="button"><img class="oracle-daily-image" id="dailyOracleImage" alt=""></button><div class="oracle-daily-copy"><p class="eyebrow">TODAY’S REFLECTION</p><h3 id="dailyOracleTitle">Today’s card</h3><button class="text-button" id="openDailyOracle" type="button">Open reflection →</button></div></article>
        <div id="oracleLibrary" hidden><span id="oracleLibraryCount"></span><div id="oracleCardGrid"></div></div>
      </section>
      <article class="card thought-card"><p class="eyebrow">THOUGHT TO PONDER</p><h2 id="thoughtToPonder">What deserves a little less struggle today?</h2><p>Nothing to solve. Just something to carry for a while.</p></article>
      <section class="card feeling-card wisdom-check-in" id="feelingCheckIn">
        <div class="feeling-header"><div><p class="eyebrow">CHECK IN</p><h2>How are you feeling?</h2><p>More than one thing can be true. Add everything that fits.</p></div></div>
        <div class="selected-feelings" id="selectedFeelings" aria-live="polite"></div>
        <div class="feeling-family-row"><span id="feelingFamilyIcon" aria-hidden="true">☀️</span><strong id="feelingFamily">BRIGHT / GOOD</strong></div>
        <div class="feeling-wheel" id="feelingWheel" aria-label="Feeling picker. Swipe up or down to change the selected feeling."><button class="wheel-arrow" id="feelingPrev" type="button" aria-label="Previous feeling">▲</button><div class="wheel-window" id="wheelWindow" aria-live="polite"></div><button class="wheel-arrow" id="feelingNext" type="button" aria-label="Next feeling">▼</button></div>
        <p class="wheel-hint">Swipe, scroll, or use the arrows. Tap add for each feeling that fits.</p>
        <div class="feeling-check-in-actions"><button class="button button-secondary" id="addFeeling" type="button">Add this feeling</button><button class="button button-primary" id="saveFeelingCheckIn" type="button" disabled>Save check-in</button></div>
        <div class="feeling-result" id="feelingResult" hidden aria-live="polite"></div>
      </section>
      <dialog class="guided-skill-dialog" id="guidedSkillDialog" aria-labelledby="guidedSkillTitle"><form class="guided-skill-shell" id="guidedSkillForm"><div class="guided-skill-heading"><div><p class="eyebrow">A PRACTICAL NEXT STEP</p><h2 id="guidedSkillTitle">Guided skill</h2><p id="guidedSkillFeeling"></p></div><button class="dialog-close" id="closeGuidedSkill" type="button" aria-label="Close guided skill">×</button></div><div id="guidedSkillSteps"></div><p class="guided-skill-status" id="guidedSkillStatus" role="status" aria-live="polite"></p><div class="guided-skill-actions"><button class="button button-primary" type="submit">Save guided reflection</button></div></form></dialog>
      <section class="card pattern-card"><p class="eyebrow">RECENT HISTORY</p><h2>Patterns worth noticing</h2><div id="patternObservation"></div></section>
      <section class="card check-in-history" id="checkInHistory" hidden><div class="history-heading"><div><p class="eyebrow">CHECK-IN CALENDAR</p><h2>Your days, one check-in at a time</h2></div></div><div class="check-in-calendar" id="checkInCalendar"></div><h3 id="checkInHistoryDate">Today</h3><div class="check-in-history-list" id="checkInHistoryList"></div></section>
      <section class="wisdom-toolbox-access" id="johnToolboxLink"><div><p class="eyebrow">RECOVERY TOOLBOX</p><h2>More tools when you want them</h2><p>The full HALT and DBT reference collection stays here when you want to browse.</p></div><button class="button button-secondary" type="button" data-open-recovery-toolbox>Browse all recovery tools</button></section>
      <section class="dbt-toolbox" id="dbtToolbox" hidden><div class="dbt-toolbox-header"><div><p class="eyebrow">DBT TOOLBOX</p><h2>Practical skills for right now</h2></div><span class="count-pill" id="dbtCount">skills</span></div><button class="button button-primary" id="drawDbtSkill" type="button">Surprise me with a tool</button><div class="dbt-grid" id="dbtCardGrid"></div></section>`;
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
      if (button.hasAttribute('data-focus-history')) setTimeout(() => $('#checkInHistory')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 260);
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
    const base = hour < 12 ? 'Good morning, John.' : hour < 17 ? 'Good afternoon, John.' : 'Good evening, John.';
    let line = hour < 12 ? 'Let’s see what today has in it.' : hour < 17 ? 'A few good things are already on the trail.' : 'Let’s keep close what mattered today.';
    if (weather) {
      const code = Number(weather.code), temp = Number(weather.temp), rainChance = Number(weather.rainChance);
      if ([95, 96, 99].includes(code)) line = 'Nature is being dramatic. We do not have to join her.';
      else if ([63, 65, 80, 81, 82].includes(code) || rainChance >= 70) line = 'A wet trail still counts. Keep the good things close.';
      else if ([71, 73, 75, 77, 85, 86].includes(code)) line = 'Warm socks remain an underrated life strategy.';
      else if (temp >= 90) line = 'Hydrate accordingly and avoid arguing with the sun.';
      else if (temp <= 10) line = 'Indoor plans have submitted a strong application.';
      else if ([0, 1].includes(code) && temp >= 55 && temp <= 82) line = 'The weather may be worth stepping into for a while.';
    }
    title.textContent = base; sub.textContent = line;
  }

  function todayLocalDate() {
    return window.GrizzlyJohnStorageV2?.localDateKey(new Date()) || new Date().toLocaleDateString('en-CA');
  }

  function countTodayCheckIns(date) {
    const result = window.GrizzlyJohnStorageV2?.feelingCheckIns.forDate(date);
    return result?.ok ? result.entries.length : 0;
  }

  function renderTodayGratitude() {
    const list = $('#gratitudeList');
    if (!list) return;
    const result = window.GrizzlyJohnStorageV2?.gratitude.forDate(todayLocalDate());
    if (!result?.ok) {
      list.innerHTML = '<div class="today-v2-empty">Your gratitude history is being preserved, but it could not be read right now.</div>';
      return;
    }
    list.innerHTML = result.entries.length ? result.entries.map(entry => `
      <article class="gratitude-entry">
        <span aria-hidden="true">✦</span>
        <p>${escapeHtml(entry.text)}</p>
        <button class="gratitude-remove" type="button" data-remove-gratitude="${escapeHtml(entry.id)}" aria-label="Remove this gratitude">Remove</button>
      </article>`).join('') : '<div class="today-v2-empty"><strong>Nothing written yet.</strong><span>One ordinary good thing is enough to start.</span></div>';
  }

  function renderGoldStarEditor() {
    const holder = $('#goldStarEditorList');
    if (!holder) return;
    const result = window.GrizzlyJohnStorageV2?.goldStars.list({ includeInactive: true });
    if (!result?.ok) {
      holder.innerHTML = '<div class="today-v2-empty">The Star list could not be read without risking its stored data.</div>';
      return;
    }
    const active = result.definitions.filter(item => item.active);
    const archived = result.definitions.filter(item => !item.active);
    const rows = active.map((star, index) => `
      <div class="gold-star-editor-row" data-star-editor-id="${escapeHtml(star.id)}">
        <input value="${escapeHtml(star.label)}" maxlength="120" aria-label="Gold Star label">
        <div class="gold-star-editor-actions">
          <button type="button" data-star-move="up" ${index === 0 ? 'disabled' : ''} aria-label="Move ${escapeHtml(star.label)} up">↑</button>
          <button type="button" data-star-move="down" ${index === active.length - 1 ? 'disabled' : ''} aria-label="Move ${escapeHtml(star.label)} down">↓</button>
          <button type="button" data-star-save>Save</button>
          <button type="button" data-star-active="false">Archive</button>
        </div>
      </div>`).join('');
    const archivedRows = archived.length ? `<details class="archived-stars"><summary>Archived Stars (${archived.length})</summary>${archived.map(star => `<div class="archived-star-row"><span>${escapeHtml(star.label)}</span><button class="text-button" type="button" data-reactivate-star="${escapeHtml(star.id)}">Reactivate</button></div>`).join('')}</details>` : '';
    holder.innerHTML = rows || '<div class="today-v2-empty"><strong>No active Stars yet.</strong><span>Add one above. John decides what counts.</span></div>';
    holder.insertAdjacentHTML('beforeend', archivedRows);
  }

  function renderTodayGoldStars() {
    const holder = $('#goldStarChecklist');
    if (!holder) return;
    const api = window.GrizzlyJohnStorageV2;
    const definitions = api?.goldStars.list();
    const dayResult = api?.goldStarDays.get(todayLocalDate(), { syncActiveDefinitions: true });
    if (!definitions?.ok || !dayResult?.ok) {
      holder.innerHTML = '<div class="today-v2-empty">Your Stars are safely stored, but the checklist could not be read right now.</div>';
      return;
    }
    const completed = new Set(dayResult.day.completedStarIds || []);
    holder.innerHTML = definitions.definitions.length ? definitions.definitions.map(star => `
      <label class="gold-star-item ${completed.has(star.id) ? 'is-complete' : ''}">
        <input type="checkbox" data-gold-star-id="${escapeHtml(star.id)}" ${completed.has(star.id) ? 'checked' : ''}>
        <span class="gold-star-mark" aria-hidden="true">★</span>
        <span>${escapeHtml(star.label)}</span>
      </label>`).join('') : '<div class="today-v2-empty"><strong>No Stars yet.</strong><span>Create the small things that count as an easy win for you.</span><button class="button button-secondary" type="button" data-open-star-editor>Create my Stars</button></div>';

    const badge = api.goldStarDays.evaluateBadge(todayLocalDate());
    const badgeState = $('#goldStarBadgeState');
    if (badgeState) {
      badgeState.hidden = !badge?.earned;
      badgeState.innerHTML = badge?.earned ? '<span aria-hidden="true">⭐️</span><div><strong>Gold Star Trail Day earned!</strong><small>You finished more than half of today’s Easy Gold Stars.</small></div>' : '';
    }
  }

  function renderTodaySnapshot() {
    const api = window.GrizzlyJohnStorageV2;
    if (!api) return;
    const date = todayLocalDate();
    const gratitudeCount = api.gratitude.forDate(date);
    const day = api.goldStarDays.get(date);
    const activeIds = day?.ok && Array.isArray(day.day.activeStarIds) ? day.day.activeStarIds : [];
    const completeIds = new Set(day?.ok && Array.isArray(day.day.completedStarIds) ? day.day.completedStarIds : []);
    const completedCount = activeIds.filter(id => completeIds.has(id)).length;
    if ($('#todayGratitudeCount')) $('#todayGratitudeCount').textContent = gratitudeCount?.ok ? gratitudeCount.entries.length : '—';
    if ($('#todayGoldStarCount')) $('#todayGoldStarCount').textContent = `${completedCount} / ${activeIds.length}`;
    if ($('#todayCheckInCount')) $('#todayCheckInCount').textContent = countTodayCheckIns(date);
  }

  function renderTodayV2() {
    renderTodayGratitude();
    renderTodayGoldStars();
    renderTodaySnapshot();
  }

  function setupTodayV2() {
    const api = window.GrizzlyJohnStorageV2;
    if (!api || !$('#gratitudeForm')) return;
    api.goldStarDays.get(todayLocalDate(), { syncActiveDefinitions: true });
    renderTodayV2();

    $('#gratitudeForm').addEventListener('submit', event => {
      event.preventDefault();
      const input = $('#gratitudeText');
      const result = api.gratitude.add(input.value, { date: todayLocalDate() });
      $('#gratitudeStatus').textContent = result.ok ? 'Added to today. ✓' : result.reason;
      if (result.ok) { event.target.reset(); renderTodayGratitude(); renderTodaySnapshot(); }
    });

    $('#gratitudeList').addEventListener('click', event => {
      const button = event.target.closest('[data-remove-gratitude]');
      if (!button || !window.confirm('Remove this gratitude from today?')) return;
      const result = api.gratitude.remove(button.dataset.removeGratitude);
      $('#gratitudeStatus').textContent = result.ok ? 'Removed.' : result.reason;
      if (result.ok) { renderTodayGratitude(); renderTodaySnapshot(); }
    });

    const editor = $('#goldStarEditor');
    const openEditor = () => { renderGoldStarEditor(); if (!editor.open) editor.showModal(); };
    $('#editGoldStars').addEventListener('click', openEditor);
    $('#goldStarChecklist').addEventListener('click', event => { if (event.target.closest('[data-open-star-editor]')) openEditor(); });
    $('#closeGoldStarEditor').addEventListener('click', () => editor.close());
    editor.addEventListener('click', event => { if (event.target === editor) editor.close(); });

    $('#goldStarChecklist').addEventListener('change', event => {
      const checkbox = event.target.closest('[data-gold-star-id]');
      if (!checkbox) return;
      const result = api.goldStarDays.toggle(todayLocalDate(), checkbox.dataset.goldStarId, checkbox.checked);
      if (!result.ok) checkbox.checked = !checkbox.checked;
      renderTodayGoldStars(); renderTodaySnapshot();
    });

    $('#goldStarIdeaForm')?.addEventListener('submit', event => {
      event.preventDefault();
      const chosen = [...event.currentTarget.querySelectorAll('input[name="goldStarIdea"]:checked')].map(input => input.value);
      if (!chosen.length) { $('#goldStarIdeaStatus').textContent = 'Choose at least one idea.'; return; }
      const all = api.goldStars.list({ includeInactive: true });
      if (!all.ok) { $('#goldStarIdeaStatus').textContent = all.reason; return; }
      let added = 0;
      chosen.forEach(label => {
        const existing = all.definitions.find(item => item?.label?.toLowerCase() === label.toLowerCase());
        const result = existing ? (existing.active ? { ok: true } : api.goldStars.setActive(existing.id, true)) : api.goldStars.add(label);
        if (result.ok) added += 1;
      });
      api.goldStarDays.get(todayLocalDate(), { syncActiveDefinitions: true });
      $('#goldStarIdeaStatus').textContent = `${added} idea${added === 1 ? '' : 's'} added for today.`;
      event.currentTarget.reset();
      renderTodayV2();
    });

    $('#addGoldStarForm').addEventListener('submit', event => {
      event.preventDefault();
      const input = $('#newGoldStarLabel');
      const result = api.goldStars.add(input.value);
      $('#goldStarEditorStatus').textContent = result.ok ? 'Star added. ✓' : result.reason;
      if (result.ok) { event.target.reset(); api.goldStarDays.get(todayLocalDate(), { syncActiveDefinitions: true }); renderGoldStarEditor(); renderTodayV2(); }
    });

    $('#goldStarEditorList').addEventListener('click', event => {
      const row = event.target.closest('[data-star-editor-id]');
      const reactivate = event.target.closest('[data-reactivate-star]');
      let result;
      if (reactivate) result = api.goldStars.setActive(reactivate.dataset.reactivateStar, true);
      else if (row && event.target.closest('[data-star-save]')) result = api.goldStars.rename(row.dataset.starEditorId, $('input', row).value);
      else if (row && event.target.closest('[data-star-active]')) result = api.goldStars.setActive(row.dataset.starEditorId, false);
      else if (row && event.target.closest('[data-star-move]')) {
        const active = api.goldStars.list().definitions;
        const index = active.findIndex(item => item.id === row.dataset.starEditorId);
        const direction = event.target.closest('[data-star-move]').dataset.starMove === 'up' ? -1 : 1;
        const swap = index + direction;
        if (index >= 0 && swap >= 0 && swap < active.length) {
          [active[index], active[swap]] = [active[swap], active[index]];
          result = api.goldStars.reorder(active.map(item => item.id));
        }
      }
      if (!result) return;
      $('#goldStarEditorStatus').textContent = result.ok ? 'Stars updated. ✓' : result.reason;
      if (result.ok) { api.goldStarDays.get(todayLocalDate(), { syncActiveDefinitions: true }); renderGoldStarEditor(); renderTodayV2(); }
    });
  }

  function setupWisdom() {
    const thoughts = ['What deserves a little less struggle today?', 'What is already working that you could notice on purpose?', 'Where would a clean pause make the next choice easier?', 'What can be true without needing to be fixed today?', 'What would kindness toward future John look like?'];
    const dayNumber = Math.floor(new Date().setHours(0, 0, 0, 0) / 86400000);
    if ($('#thoughtToPonder')) $('#thoughtToPonder').textContent = thoughts[Math.abs(dayNumber) % thoughts.length];
    if (window.GrizzlyJohnMyDays?.refresh) window.GrizzlyJohnMyDays.refresh(todayLocalDate());
    else renderCheckInHistory(todayLocalDate());
    renderPatterns();
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
    renderSelectedFeelings();
    $('#feelingPrev')?.addEventListener('click', () => moveFeeling(-1)); $('#feelingNext')?.addEventListener('click', () => moveFeeling(1));
    const wheel = $('#feelingWheel');
    wheel?.addEventListener('wheel', event => { event.preventDefault(); moveFeeling(event.deltaY > 0 ? 1 : -1); }, { passive: false });
    wheel?.addEventListener('touchstart', event => { state.touchStartY = event.changedTouches[0]?.screenY ?? null; }, { passive: true });
    wheel?.addEventListener('touchend', event => { if (state.touchStartY === null) return; const endY = event.changedTouches[0]?.screenY ?? state.touchStartY; const delta = endY - state.touchStartY; state.touchStartY = null; if (Math.abs(delta) >= 24) moveFeeling(delta < 0 ? 1 : -1); }, { passive: true });
    $('#addFeeling')?.addEventListener('click', () => {
      const feeling = FEELINGS[state.feelingIndex];
      if (!state.selectedFeelings.some(item => item.word === feeling.word)) state.selectedFeelings.push(feeling);
      renderSelectedFeelings();
      openGuidedSkill(feeling);
    });
    $('#selectedFeelings')?.addEventListener('click', event => {
      const button = event.target.closest('[data-remove-selected-feeling]');
      if (!button) return;
      state.selectedFeelings = state.selectedFeelings.filter(item => item.word !== button.dataset.removeSelectedFeeling);
      renderSelectedFeelings();
    });
    $('#saveFeelingCheckIn')?.addEventListener('click', saveFeelingCheckIn);
    $('#guidedSkillForm')?.addEventListener('submit', saveGuidedSkill);
    $('#closeGuidedSkill')?.addEventListener('click', () => $('#guidedSkillDialog').close());
  }

  function guidedSkillFor(feeling) {
    const suggested = getFeelingGuidance(feeling)?.skill || 'WISE MIND';
    return GUIDED_SKILLS[suggested] ? suggested : 'WISE MIND';
  }

  function openGuidedSkill(feeling, requestedSkill = null) {
    const dialog = $('#guidedSkillDialog');
    if (!dialog) return;
    const skill = requestedSkill && GUIDED_SKILLS[requestedSkill] ? requestedSkill : guidedSkillFor(feeling);
    dialog.dataset.feeling = feeling.word;
    dialog.dataset.skill = skill;
    $('#guidedSkillTitle').textContent = skill;
    $('#guidedSkillFeeling').textContent = `A short ${skill} exercise for feeling ${feeling.word.toLowerCase()}.`;
    $('#guidedSkillSteps').innerHTML = GUIDED_SKILLS[skill].map((prompt, index) => `<label class="guided-skill-step"><span class="guided-step-label">STEP ${index + 1}</span><span class="guided-step-prompt">${escapeHtml(prompt)}</span><textarea name="guidedResponse" rows="2" aria-label="Step ${index + 1}: ${escapeHtml(prompt)}"></textarea></label>`).join('');
    $('#guidedSkillStatus').textContent = '';
    if (!dialog.open) dialog.showModal();
    setTimeout(() => $('#guidedSkillSteps textarea')?.focus(), 0);
  }

  function saveGuidedSkill(event) {
    event.preventDefault();
    const dialog = $('#guidedSkillDialog');
    const prompts = GUIDED_SKILLS[dialog.dataset.skill] || [];
    const inputs = [...event.currentTarget.querySelectorAll('[name="guidedResponse"]')];
    const missing = inputs.find(input => !input.value.trim());
    if (missing) { $('#guidedSkillStatus').textContent = 'Add a response for each step before saving.'; missing.focus(); return; }
    const responses = inputs.map((input, index) => ({ prompt: prompts[index], response: input.value }));
    const result = window.GrizzlyJohnStorageV2?.guidedSkillSessions.add({ feeling: dialog.dataset.feeling, skill: dialog.dataset.skill, responses }, { date: todayLocalDate() });
    if (!result?.ok) { $('#guidedSkillStatus').textContent = result?.reason || 'This reflection could not be saved safely.'; return; }
    state.guidedSessionIds.push(result.session.id);
    dialog.close();
    const holder = $('#feelingResult');
    holder.hidden = false;
    const alternatives = Object.keys(GUIDED_SKILLS).filter(skill => skill !== result.session.skill);
    holder.innerHTML = `<div class="guided-saved-note"><strong>${escapeHtml(result.session.skill)} reflection saved.</strong><span>You can save this check-in, try another practical tool, or open the reference card.</span><div class="guided-next-actions"><label>Try another tool<select data-another-guided-skill>${alternatives.map(skill => `<option value="${escapeHtml(skill)}">${escapeHtml(skill)}</option>`).join('')}</select></label><button class="button button-secondary" type="button" data-start-another-guided>Start another tool</button><button class="text-button" type="button" data-learn-skill="${escapeHtml(result.session.skill)}">Learn more about ${escapeHtml(result.session.skill)}</button></div></div>`;
    $('[data-learn-skill]', holder)?.addEventListener('click', () => openSkillCard(result.session.skill));
    $('[data-start-another-guided]', holder)?.addEventListener('click', () => {
      const feeling = state.selectedFeelings.find(item => item.word === result.session.feeling) || state.selectedFeelings[0];
      if (feeling) openGuidedSkill(feeling, $('[data-another-guided-skill]', holder).value);
    });
  }

  function renderSelectedFeelings() {
    const holder = $('#selectedFeelings');
    if (!holder) return;
    holder.innerHTML = state.selectedFeelings.length ? state.selectedFeelings.map(feeling => `<button class="selected-feeling-chip" type="button" data-remove-selected-feeling="${escapeHtml(feeling.word)}"><span>${feeling.group.icon}</span>${escapeHtml(feeling.word)}<span aria-hidden="true">×</span></button>`).join('') : '<p>Choose one or more feelings below.</p>';
    if ($('#saveFeelingCheckIn')) $('#saveFeelingCheckIn').disabled = !state.selectedFeelings.length;
  }

  function suggestedSkills(feelings) {
    const names = [];
    feelings.forEach(feeling => {
      const guidance = getFeelingGuidance(feeling);
      if (guidance.skill && !names.includes(guidance.skill)) names.push(guidance.skill);
    });
    ['STOP', 'WISE MIND', 'Self Soothe'].forEach(name => { if (names.length < 3 && !names.includes(name)) names.push(name); });
    return names.slice(0, 3);
  }

  function saveFeelingCheckIn() {
    if (!state.selectedFeelings.length) return;
    const api = window.GrizzlyJohnStorageV2;
    const result = api?.feelingCheckIns.add(state.selectedFeelings.map(feeling => ({ word: feeling.word, group: feeling.group.label, groupId: feeling.group.id, icon: feeling.group.icon })), { date: todayLocalDate() });
    const holder = $('#feelingResult');
    if (!result?.ok) {
      holder.hidden = false;
      holder.textContent = result?.reason || 'This check-in could not be saved without risking stored data.';
      return;
    }
    const skills = suggestedSkills(state.selectedFeelings);
    if (state.guidedSessionIds.length) api.guidedSkillSessions.associate(state.guidedSessionIds, result.entry.id);
    holder.innerHTML = `<div class="check-in-saved"><strong>Check-in saved.</strong><span>${state.selectedFeelings.map(item => escapeHtml(item.word)).join(' · ')}</span></div><div class="check-in-suggestions"><p class="eyebrow">OPTIONAL REFERENCE</p>${skills.map(skill => `<button type="button" class="skill-suggestion-button" data-learn-skill="${escapeHtml(skill)}"><strong>Learn more about ${escapeHtml(skill)}</strong><span>Open reference card →</span></button>`).join('')}</div>`;
    holder.hidden = false;
    $$('[data-learn-skill]', holder).forEach(button => button.addEventListener('click', () => openSkillCard(button.dataset.learnSkill)));
    state.selectedFeelings = [];
    state.guidedSessionIds = [];
    renderSelectedFeelings();
    renderCheckInHistory(todayLocalDate());
    renderPatterns();
    renderTodaySnapshot();
  }

  function openSkillCard(skillName) {
    navigate('wisdom');
    const toolbox = $('#dbtToolbox'); if (toolbox) toolbox.hidden = false;
    const tryOpen = (attempt = 0) => { const target = $$('.dbt-card-button').find(button => button.textContent.trim().toLowerCase().startsWith(skillName.toLowerCase())); if (target) { target.click(); return; } if (attempt < 10) setTimeout(() => tryOpen(attempt + 1), 250); };
    setTimeout(() => tryOpen(), 120);
  }

  function parseCheckInTime(entry) {
    const value = entry?.timestamp || entry?.date;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  function renderCheckInHistory(selectedDate) {
    const api = window.GrizzlyJohnStorageV2;
    const all = api?.feelingCheckIns.all();
    if (!all?.ok || !$('#checkInCalendar')) return;
    state.historyDate = selectedDate || state.historyDate || todayLocalDate();
    const current = new Date();
    const year = current.getFullYear(), month = current.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    const groupsByDate = new Map();
    all.entries.forEach(entry => {
      if (!entry?.date) return;
      const groups = groupsByDate.get(entry.date) || new Set();
      (Array.isArray(entry.feelings) ? entry.feelings : []).forEach(feeling => { if (feeling?.groupId) groups.add(feeling.groupId); });
      groupsByDate.set(entry.date, groups);
    });
    const blanks = Array.from({ length: firstDay }, () => '<span></span>').join('');
    const buttons = Array.from({ length: days }, (_, index) => {
      const day = index + 1;
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const groups = [...(groupsByDate.get(date) || [])].slice(0, 5);
      const markers = groups.length ? `<span class="calendar-feeling-markers" aria-hidden="true">${groups.map(group => `<i class="family-${escapeHtml(group)}"></i>`).join('')}</span>` : '';
      const context = groups.length ? `, feelings recorded across ${groups.length} ${groups.length === 1 ? 'family' : 'families'}` : '';
      return `<button type="button" class="calendar-day ${date === state.historyDate ? 'is-selected' : ''} ${groups.length ? 'has-check-in' : ''}" data-history-date="${date}" aria-label="${day}${context}"><span>${day}</span>${markers}</button>`;
    }).join('');
    $('#checkInCalendar').innerHTML = `<div class="calendar-month">${current.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div><div class="calendar-weekdays"><span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span></div><div class="calendar-days">${blanks}${buttons}</div>`;
    $('#checkInCalendar').onclick = event => { const button = event.target.closest('[data-history-date]'); if (button) renderCheckInHistory(button.dataset.historyDate); };
    const entries = all.entries.filter(entry => entry?.date === state.historyDate).sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
    const chosen = new Date(`${state.historyDate}T12:00:00`);
    $('#checkInHistoryDate').textContent = state.historyDate === todayLocalDate() ? 'Today' : chosen.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    $('#checkInHistoryList').innerHTML = entries.length ? entries.map(entry => `<article class="history-entry"><time>${escapeHtml(parseCheckInTime(entry))}</time><div>${(Array.isArray(entry.feelings) ? entry.feelings : []).map(feeling => `<span>${escapeHtml(feeling.icon || '')} ${escapeHtml(feeling.word || feeling)}</span>`).join('')}</div></article>`).join('') : '<p class="history-empty">No check-ins saved for this day.</p>';
  }

  function renderPatterns() {
    const holder = $('#patternObservation'), api = window.GrizzlyJohnStorageV2;
    const checkIns = api?.feelingCheckIns.all(), sessions = api?.guidedSkillSessions.all();
    if (!holder || !checkIns?.ok || !sessions?.ok || !window.GrizzlyJohnWisdomPatterns) return;
    const observations = window.GrizzlyJohnWisdomPatterns.derivePatternObservations(checkIns.entries, sessions.sessions, { now: new Date(), localDateKey: api.localDateKey });
    holder.innerHTML = observations.length
      ? `<div class="pattern-observations">${observations.map(item => `<section><h3>${escapeHtml(item.category)}</h3><p>${escapeHtml(item.text)}</p></section>`).join('')}</div><small>These are simple observations from your saved history, not a diagnosis.</small>`
      : '<p>No pattern needs a label yet. A few more check-ins will make this easier to read.</p><small>Nothing is inferred from one or two isolated records.</small>';
  }

  function setQuest(quest) { if (!quest) return; $('#questTitle').textContent = quest.title; $('#questDescription').textContent = quest.description; $('#questEmoji').textContent = quest.emoji; $('#questCategory').textContent = quest.category; }
  function setupQuests() { if (!window.GRIZZLY_DATA?.quests?.length || !$('#questTitle')) return; setQuest(randomItem(GRIZZLY_DATA.quests)); $('#newQuest')?.addEventListener('click', () => setQuest(randomItem(GRIZZLY_DATA.quests))); $('#completeQuest')?.addEventListener('click', completeQuest); renderQuestProgress(); }
  function completeQuest() { state.questCount += 1; storage.set('questCount', state.questCount); renderQuestProgress(); }
  function renderQuestProgress() { if (!$('#questCount') || !$('#stampGrid')) return; $('#questCount').textContent = state.questCount; $('#stampGrid').innerHTML = GRIZZLY_DATA.stamps.map(stamp => { const unlocked = state.questCount >= stamp.requirement; return `<div class="stamp ${unlocked ? 'is-unlocked' : ''}"><span>${stamp.icon}</span><strong>${escapeHtml(stamp.name)}</strong><small>${unlocked ? 'Unlocked' : `${stamp.requirement} quests`}</small></div>`; }).join(''); }

  function setupPlaces() {
    const form = $('#placeForm'); if (!form) return;
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!Array.isArray(state.places)) return;
      const existingId = $('#placeId').value;
      const existingIndex = state.places.findIndex(place => String(place?.id) === existingId);
      const fields = { name: $('#placeName').value.trim(), state: $('#placeState').value.trim(), type: $('#placeType').value, status: $('#placeStatus').value, memory: $('#placeMemory').value.trim() };
      if (existingId && existingIndex >= 0) state.places[existingIndex] = { ...state.places[existingIndex], ...fields, updatedAt: new Date().toISOString() };
      else state.places.unshift({ id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), ...fields, addedAt: new Date().toISOString() });
      storage.set('places', state.places);
      resetPlaceForm();
      renderPlaces();
    });
    $$('[data-place-filter]').forEach(button => button.addEventListener('click', () => { state.placeFilter = button.dataset.placeFilter; $$('[data-place-filter]').forEach(b => b.classList.toggle('is-active', b === button)); renderPlaces(); })); renderPlaces();
    $('#placeTypeFilter')?.addEventListener('change', event => { state.placeTypeFilter = event.currentTarget.value; renderPlaces(); });
    $('#cancelPlaceEdit')?.addEventListener('click', resetPlaceForm);
  }

  const PLACE_STATUS_LABELS = { visited: '✓ Visited', wishlist: 'Want to Go', favorite: '★ Favorite', revisit: '↻ Revisit' };

  function resetPlaceForm() {
    const form = $('#placeForm');
    if (!form) return;
    form.reset();
    $('#placeId').value = '';
    $('#placeFormHeading').textContent = 'Put another pin in the story.';
    $('#savePlace').textContent = 'Save place';
    $('#cancelPlaceEdit').hidden = true;
    const editor = $('#placeEditorDetails');
    if (editor) editor.open = false;
  }

  function editPlace(id) {
    if (!Array.isArray(state.places)) return;
    const place = state.places.find(item => String(item?.id) === String(id));
    if (!place) return;
    $('#placeId').value = String(place.id);
    $('#placeName').value = place.name || '';
    $('#placeState').value = place.state || '';
    $('#placeType').value = [...$('#placeType').options].some(option => option.value === place.type) ? place.type : 'Other';
    $('#placeStatus').value = [...$('#placeStatus').options].some(option => option.value === place.status) ? place.status : 'wishlist';
    $('#placeMemory').value = place.memory || place.note || '';
    $('#placeFormHeading').textContent = `Edit ${place.name || 'saved place'}`;
    $('#savePlace').textContent = 'Save changes';
    $('#cancelPlaceEdit').hidden = false;
    const editor = $('#placeEditorDetails');
    if (editor) editor.open = true;
    $('#placeName').focus();
  }

  function renderPlaces() {
    const list = $('#placeList');
    if (!list) return;
    if (!Array.isArray(state.places)) {
      ($('#roamingListStats') || $('#roam .stats-grid'))?.setAttribute('hidden', '');
      list.innerHTML = '<div class="empty-state compact"><span>⚠️</span><h3>Your saved-place data needs attention.</h3><p>The original data has been left untouched. New entries are paused until it can be recovered safely.</p></div>';
      return;
    }
    const filtered = state.places.filter(place => (state.placeFilter === 'all' || place?.status === state.placeFilter) && (state.placeTypeFilter === 'all' || (place?.type || 'Other') === state.placeTypeFilter));
    const visited = state.places.filter(place => place?.status === 'visited');
    const states = new Set(state.places.map(place => String(place?.state || '').trim().toLowerCase()).filter(Boolean));
    const stats = $('#roamingListStats') || $('#roam .stats-grid');
    if (stats) stats.hidden = state.places.length === 0;
    if ($('#savedCount')) $('#savedCount').textContent = state.places.length;
    if ($('#visitedCount')) $('#visitedCount').textContent = visited.length;
    if ($('#stateCount')) $('#stateCount').textContent = states.size;
    list.innerHTML = filtered.length ? filtered.map(place => { const status = PLACE_STATUS_LABELS[place?.status] || String(place?.status || 'Saved'); const type = place?.type || 'Other'; const location = [place?.state, type].filter(Boolean).map(escapeHtml).join(' · '); const note = place?.memory || place?.note || ''; return `<article class="card place-card"><div><span class="status-chip ${escapeHtml(place?.status || '')}">${escapeHtml(status)}</span><h3>${escapeHtml(place?.name || 'Unnamed place')}</h3>${location ? `<p class="place-state">${location}</p>` : ''}${note ? `<details class="place-note"><summary>Note</summary><p>${escapeHtml(note)}</p></details>` : ''}</div><div class="place-row-actions"><button class="text-button" type="button" data-edit-place="${escapeHtml(place?.id)}">Edit</button><button class="icon-button danger" type="button" data-delete-place="${escapeHtml(place?.id)}" aria-label="Remove ${escapeHtml(place?.name || 'saved place')}">×</button></div></article>`; }).join('') : state.places.length ? '<div class="empty-state compact"><span>🧭</span><h3>No places match these filters.</h3><p>Try another status or type.</p></div>' : '<div class="empty-state compact"><span>🏞️</span><h3>John’s Roaming List is ready.</h3><p>Save a campground, trail, road, town, restaurant, or stop worth remembering.</p></div>';
    $$('[data-edit-place]').forEach(button => button.addEventListener('click', () => editPlace(button.dataset.editPlace)));
    $$('[data-delete-place]').forEach(button => button.addEventListener('click', () => { state.places = state.places.filter(place => String(place?.id) !== button.dataset.deletePlace); storage.set('places', state.places); renderPlaces(); }));
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

  rebuildHome(); rebuildWisdom(); setupNavigation(); setupDateAndGreeting(); setupTodayV2(); setupWisdom(); setupFeelings(); setupQuests(); setupPlaces(); setupPodcasts();
})();
