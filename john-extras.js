(() => {
  const $ = (selector, root = document) => root.querySelector(selector);

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  }

  function ensureStyles() {
    if ($('link[data-john-extras]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'john-extras.css?v=20260819-2';
    link.dataset.johnExtras = 'true';
    document.head.appendChild(link);
  }

  function addJohnSpecificContent() {
    if (!window.GRIZZLY_DATA) return;

    if (Array.isArray(GRIZZLY_DATA.wisdom) && !GRIZZLY_DATA.wisdom.some(card => card.name === 'The Oldtimer')) {
      GRIZZLY_DATA.wisdom.push(
        {
          symbol: '🪑',
          name: 'The Oldtimer',
          headline: 'Yesterday does not get the last word.',
          body: 'You know yourself well enough to laugh at the man you used to be without pretending he never existed. Sobriety gave you time to keep becoming someone better, one ordinary day at a time.',
          quote: 'I can like who I am and still work on who I become next.',
          question: 'What would make today a little more honest, kind, or useful than yesterday?',
          practice: 'Do one small thing the man you are becoming would be proud of.'
        },
        {
          symbol: '❤️',
          name: 'Your Mother Knew',
          headline: 'Somebody saw more in you before you did.',
          body: 'Your mother pushed because she believed there was a better man in there. You tell that story for a reason. Her voice still gets to matter, and so does everything you have done with the chance she fought for you to take.',
          quote: 'The best thank-you is to keep becoming the man she knew was possible.',
          question: 'What part of your life would make her smile today?',
          practice: 'Do one thing today that honors the faith she had in you.'
        },
        {
          symbol: '🐕',
          name: 'Blue',
          headline: 'Loyalty can have four legs and terrible boundaries.',
          body: 'Blue does not need the polished version of you. He needs his person. There is something worth learning from being loved that simply and returning it just as fully.',
          quote: 'Sometimes your ride or die is waiting by the door.',
          question: 'Where could you show up with that kind of uncomplicated loyalty today?',
          practice: 'Give Blue ten minutes that belong completely to him.'
        }
      );
    }

    if (Array.isArray(GRIZZLY_DATA.quests) && !GRIZZLY_DATA.quests.some(quest => quest.title === 'Give Blue the good walk.')) {
      GRIZZLY_DATA.quests.push(
        { emoji: '🐕', category: 'BLUE APPROVED', title: 'Give Blue the good walk.', description: 'Let the golden retriever choose the pace for a while. Sniffing is apparently serious business.' },
        { emoji: '☎️', category: 'OLDTIMER BUSINESS', title: 'Call another Oldtimer.', description: 'No agenda required. Tell a story, check in, talk too long. You people have a reputation to maintain.' },
        { emoji: '🌳', category: 'OUTDOORS', title: 'Go outside and look around.', description: 'There are trees, birds, attractive strangers, and considerably fewer push notifications. Try to notice at least three of those responsibly.' },
        { emoji: '🧠', category: 'OLDTIMER WISDOM', title: 'Use the lesson you already paid for.', description: 'You have survived worse things than this. Some of them were probably your own ideas. Use what they taught you.' }
      );
    }
  }

  function renderWisdomCard(card) {
    if (!card) return;
    const assignments = {
      wisdomSymbol: card.symbol,
      wisdomName: card.name.toUpperCase(),
      wisdomHeadline: card.headline,
      wisdomBody: card.body,
      wisdomQuote: `“${card.quote}”`,
      wisdomQuestion: card.question,
      wisdomPractice: card.practice
    };
    Object.entries(assignments).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    });
  }

  function refreshWisdomLibrary() {
    const grid = $('#wisdomGrid');
    if (!grid || !Array.isArray(window.GRIZZLY_DATA?.wisdom)) return;
    grid.innerHTML = GRIZZLY_DATA.wisdom.map((card, index) => `
      <button class="mini-card" type="button" data-john-wisdom-index="${index}">
        <span class="mini-card-icon">${card.symbol}</span>
        <span class="eyebrow">${escapeHtml(card.name)}</span>
        <strong>${escapeHtml(card.headline)}</strong>
      </button>`).join('');
    grid.querySelectorAll('[data-john-wisdom-index]').forEach(button => {
      button.addEventListener('click', () => {
        renderWisdomCard(GRIZZLY_DATA.wisdom[Number(button.dataset.johnWisdomIndex)]);
        $('#wisdomDetail')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function tuneVisibleCopy() {
    const questIntro = $('#quest .screen-intro');
    if (questIntro) questIntro.innerHTML = '<p class="eyebrow">SIDE QUEST</p><h1>Go do something.</h1><p>The couch will survive. You have stories left to collect.</p>';

    const roamIntro = $('#roam .screen-intro');
    if (roamIntro) roamIntro.innerHTML = '<p class="eyebrow">ROAM</p><h1>John’s roaming record.</h1><p>National parks, campgrounds, state parks, trails, roadside oddities, and the places you still want an excuse to visit.</p>';

    const listenIntro = $('#listen .screen-intro');
    if (listenIntro) listenIntro.innerHTML = '<p class="eyebrow">CAMPFIRE RADIO</p><h1>Something worth talking about.</h1><p>Good stories, strange facts, useful ideas, and enough rabbit holes to give an Oldtimer material for the next conversation.</p>';

    const wisdomIntro = $('#wisdom .wisdom-clean-intro');
    if (wisdomIntro) wisdomIntro.innerHTML = '<p class="eyebrow">WISDOM</p><h1>A little room to notice.</h1><p>Pull a reflection, check in, or reach for a practical tool.</p>';

    const wheelHint = $('#feelingCheckIn .wheel-hint');
    if (wheelHint) wheelHint.textContent = 'Swipe, scroll, or use the arrows. Tap add for each feeling that fits.';

    const meetingCopy = $('#today .meeting-card .card-content > p:not(.eyebrow)');
    if (meetingCopy) meetingCopy.textContent = 'One tap. The Oldtimers are waiting.';

    const about = $('#aboutDialog');
    if (about) {
      about.innerHTML = `
        <button class="dialog-close" id="closeDialog" type="button" aria-label="Close">×</button>
        <p class="eyebrow">ABOUT THIS APP</p>
        <h2>GrizzlyJohn</h2>
        <p>This is for John: Oldtimer, storyteller, feminist, professional side-eye generator, and one of those rare men who can make you say “JOHN!” and then turn around and say something deeply thoughtful five minutes later.</p>
        <p>Sobriety did not remove the life of the party. It gave him more years to know himself, own his history, laugh hard, love people well, and keep working every day to be a better man than he was yesterday.</p>
        <p>His mother helped save his life by refusing to give up on the better man she knew was in there. John still tells that story because gratitude is part of the man he became.</p>
        <p>And then there is Blue, his golden retriever and ride or die. If you are making toys for dogs, Blue is getting one. If they are balls, apparently they had better be blue. We are not unpacking that any further.</p>
        <div class="bear-note">🐻 Keep laughing. Keep showing up. Keep becoming.</div>`;
      $('#closeDialog', about)?.addEventListener('click', () => about.close());
    }
  }

  function ensureBreathingCard() {
    const feelings = $('#feelingCheckIn');
    if (!feelings || $('#breathingCard')) return;

    const card = document.createElement('section');
    card.className = 'card breathing-card';
    card.id = 'breathingCard';
    card.innerHTML = `
      <div class="breathing-intro">
        <p class="eyebrow">TAKE THREE BREATHS</p>
        <h2>Need a minute?</h2>
        <p>No analyzing. No fixing. You do not even have to be in a bad mood.</p>
      </div>
      <div class="breathing-stage" id="breathingStage" hidden>
        <div class="breathing-orb" id="breathingOrb" aria-hidden="true"><div class="breathing-center" id="breathingCenter">🐻</div></div>
        <p class="breathing-cue" id="breathingCue" aria-live="polite">Just breathe.</p>
      </div>
      <div class="breathing-actions">
        <button class="button button-primary" id="startBreathing" type="button">Take three breaths</button>
        <button class="button button-secondary" id="stopBreathing" type="button" hidden>I’m good</button>
      </div>`;
    feelings.insertAdjacentElement('afterend', card);

    const stage = $('#breathingStage', card);
    const orb = $('#breathingOrb', card);
    const center = $('#breathingCenter', card);
    const cue = $('#breathingCue', card);
    const start = $('#startBreathing', card);
    const stop = $('#stopBreathing', card);
    let completedBreaths = 0;
    let session = 0;
    let timers = [];

    const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
    const later = (fn, ms, token) => timers.push(setTimeout(() => { if (token === session) fn(); }, ms));
    const setPhase = (name, text) => {
      orb.classList.remove('is-inhaling', 'is-holding', 'is-exhaling', 'is-complete');
      if (name) orb.classList.add(`is-${name}`);
      cue.textContent = text;
    };

    function finishSet() {
      clearTimers();
      setPhase('complete', 'There you are.');
      center.textContent = '🌿';
      start.hidden = false;
      start.textContent = 'Keep going';
      stop.hidden = false;
    }

    function runBreath(token) {
      setPhase('inhaling', 'Breathe in.');
      later(() => {
        setPhase('holding', 'Stay here.');
        later(() => {
          setPhase('exhaling', 'Let it go.');
          later(() => {
            completedBreaths += 1;
            if (completedBreaths >= 3) finishSet();
            else runBreath(token);
          }, 6000, token);
        }, 2000, token);
      }, 4000, token);
    }

    function startSession() {
      clearTimers();
      session += 1;
      completedBreaths = 0;
      center.textContent = '🐻';
      stage.hidden = false;
      start.hidden = true;
      stop.hidden = false;
      runBreath(session);
    }

    function stopSession() {
      clearTimers();
      session += 1;
      completedBreaths = 0;
      setPhase('', 'Whenever you need it.');
      center.textContent = '🐻';
      stage.hidden = true;
      start.hidden = false;
      start.textContent = 'Take three breaths';
      stop.hidden = true;
    }

    start.addEventListener('click', startSession);
    stop.addEventListener('click', stopSession);
  }

  function ensureBackpackSuggestion() {
    if ($('#backpackSuggestionCard')) return true;
    const backpack = $('#roamBackpack');
    if (!backpack) return false;
    const hero = $('.backpack-hero', backpack);
    if (!hero) return false;

    const title = $('.backpack-copy h2', hero);
    const heroParagraphs = hero.querySelectorAll('.backpack-copy p');
    if (title) title.textContent = 'John’s National Park Passport';
    if (heroParagraphs[1]) heroParagraphs[1].textContent = 'Visited parks unlock their full-color emblems. Everything else stays visible as part of the road still ahead.';

    const card = document.createElement('details');
    card.className = 'backpack-suggestion-card roam-request-details';
    card.id = 'backpackSuggestionCard';
    card.innerHTML = `
      <summary><span><strong>Have something you want added here?</strong><small>Send Jen a place or Side Quest idea</small></span><span aria-hidden="true">＋</span></summary>
      <div class="roam-request-body">
      <p>Send Jen the campground, park, trail, road, destination, or Side Quest you want added.</p>
      <form id="backpackSuggestionForm" class="stack-form" name="john-backpack-idea">
        <input type="hidden" name="form-name" value="john-backpack-idea">
        <input type="hidden" name="from" value="John">
        <input type="hidden" name="submittedFrom" value="GrizzlyJohn Roaming List">
        <p hidden><label>Leave this empty<input name="bot-field"></label></p>
        <label>Name<input name="collectionIdea" type="text" maxlength="120" placeholder="Campground, trail, road, destination, or idea" required></label>
        <label>State / location<input name="location" type="text" maxlength="120" placeholder="Where is it?"></label>
        <label>What kind of place or idea?<input name="kind" type="text" maxlength="120" placeholder="Campground, Side Quest, scenic drive..."></label>
        <label>Anything else John wants Jen to know?<textarea name="details" rows="3" maxlength="500" placeholder="What would make this useful?"></textarea></label>
        <button class="button button-primary" type="submit">Tell Jen →</button>
        <p class="backpack-suggestion-status" id="backpackSuggestionStatus" role="status" aria-live="polite"></p>
      </form>
      </div>`;
    hero.insertAdjacentElement('afterend', card);

    const form = $('#backpackSuggestionForm', card);
    const status = $('#backpackSuggestionStatus', card);
    const submit = $('button[type="submit"]', form);

    form.addEventListener('submit', async event => {
      event.preventDefault();
      const data = new FormData(form);
      if (String(data.get('bot-field') || '').trim()) return;
      submit.disabled = true;
      submit.textContent = 'Sending…';
      status.textContent = '';

      try {
        const body = new URLSearchParams();
        data.forEach((value, key) => body.append(key, String(value)));
        const response = await fetch('/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString()
        });
        if (!response.ok) throw new Error('Form submission failed');
        form.reset();
        status.textContent = 'Sent to Jen. You have successfully assigned her another project. ✓';
      } catch {
        status.textContent = 'That did not send. Try again when the trail has better signal.';
      } finally {
        submit.disabled = false;
        submit.textContent = 'Tell Jen →';
      }
    });

    return true;
  }

  function watchForBackpack() {
    if (ensureBackpackSuggestion()) return;
    const observer = new MutationObserver(() => {
      if (ensureBackpackSuggestion()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 15000);
  }

  function init() {
    ensureStyles();
    addJohnSpecificContent();
    refreshWisdomLibrary();
    tuneVisibleCopy();
    ensureBreathingCard();
    watchForBackpack();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
