(() => {
  const $ = (selector, root = document) => root.querySelector(selector);

  function ensureStyles() {
    if ($('link[data-john-extras]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'john-extras.css?v=20260819-1';
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
        {
          emoji: '🐕',
          category: 'BLUE APPROVED',
          title: 'Give Blue the good walk.',
          description: 'Let the golden retriever choose the pace for a while. Sniffing is apparently serious business.'
        },
        {
          emoji: '☎️',
          category: 'OLDTIMER BUSINESS',
          title: 'Call another Oldtimer.',
          description: 'No agenda required. Tell a story, check in, talk too long. You people have a reputation to maintain.'
        },
        {
          emoji: '🌳',
          category: 'OUTDOORS',
          title: 'Go outside and look around.',
          description: 'There are trees, birds, attractive strangers, and considerably fewer push notifications. Try to notice at least three of those responsibly.'
        },
        {
          emoji: '🧠',
          category: 'OLDTIMER WISDOM',
          title: 'Use the lesson you already paid for.',
          description: 'You have survived worse things than this. Some of them were probably your own ideas. Use what they taught you.'
        }
      );
    }
  }

  function tuneVisibleCopy() {
    const questIntro = $('#quest .screen-intro');
    if (questIntro) questIntro.innerHTML = '<p class="eyebrow">SIDE QUEST</p><h1>Go do something.</h1><p>The couch will survive. You have stories left to collect.</p>';

    const roamIntro = $('#roam .screen-intro');
    if (roamIntro) roamIntro.innerHTML = '<p class="eyebrow">ROAM</p><h1>John’s roaming record.</h1><p>National parks, campgrounds, state parks, trails, roadside oddities, and the places you still want an excuse to visit.</p>';

    const listenIntro = $('#listen .screen-intro');
    if (listenIntro) listenIntro.innerHTML = '<p class="eyebrow">CAMPFIRE RADIO</p><h1>Something worth talking about.</h1><p>Good stories, strange facts, useful ideas, and enough rabbit holes to give an Oldtimer material for the next conversation.</p>';

    const wisdomIntro = $('#wisdom .wisdom-clean-intro');
    if (wisdomIntro) wisdomIntro.innerHTML = '<p class="eyebrow">WISDOM</p><h1>Pick what you need.</h1><p>You have been doing this long enough to know reflection and a dirty joke can live in the same man.</p>';

    const wheelHint = $('#feelingCheckIn .wheel-hint');
    if (wheelHint) wheelHint.textContent = 'Swipe, scroll, or use the arrows. Pick the word that is actually true, not the one that sounds nicest.';

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
    const home = $('#today');
    const feelings = $('#feelingCheckIn');
    if (!home || !feelings || $('#breathingCard')) return;

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
        <div class="breathing-orb" id="breathingOrb" aria-hidden="true">
          <div class="breathing-center" id="breathingCenter">🐻</div>
        </div>
        <p class="breathing-cue" id="breathingCue" aria-live="polite">Just breathe.</p>
      </div>
      <div class="breathing-actions">
        <button class="button button-primary" id="startBreathing" type="button">Take three breaths</button>
        <button class="button button-secondary" id="stopBreathing" type="button" hidden>I’m good</button>
      </div>`;
    feelings.insertAdjacentElement('beforebegin', card);

    const stage = $('#breathingStage', card);
    const orb = $('#breathingOrb', card);
    const center = $('#breathingCenter', card);
    const cue = $('#breathingCue', card);
    const start = $('#startBreathing', card);
    const stop = $('#stopBreathing', card);

    let completedBreaths = 0;
    let session = 0;
    let timers = [];

    const clearTimers = () => {
      timers.forEach(timer => clearTimeout(timer));
      timers = [];
    };

    const later = (fn, ms, token) => {
      const timer = setTimeout(() => {
        if (token === session) fn();
      }, ms);
      timers.push(timer);
    };

    function setPhase(name, text) {
      orb.classList.remove('is-inhaling', 'is-holding', 'is-exhaling', 'is-complete');
      if (name) orb.classList.add(`is-${name}`);
      cue.textContent = text;
    }

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

    const card = document.createElement('article');
    card.className = 'card backpack-suggestion-card';
    card.id = 'backpackSuggestionCard';
    card.innerHTML = `
      <p class="eyebrow">WHAT ELSE BELONGS IN HERE?</p>
      <h3>John, you know where you wander. Jen does not.</h3>
      <p>Campgrounds? State-park patches? Lighthouses? Roadside nonsense? Tell her what else you want to collect or keep on the bucket list.</p>
      <form id="backpackSuggestionForm" class="stack-form" name="john-backpack-idea">
        <input type="hidden" name="form-name" value="john-backpack-idea">
        <input type="hidden" name="from" value="John">
        <input type="hidden" name="submittedFrom" value="GrizzlyJohn Roaming Backpack">
        <p hidden><label>Leave this empty<input name="bot-field"></label></p>
        <label>What should we collect?<input name="collectionIdea" type="text" maxlength="120" placeholder="Campgrounds, waterfalls, weird giant statues..." required></label>
        <label>Anything Jen should know?<textarea name="details" rows="3" maxlength="500" placeholder="A place you already go, something on the bucket list, what would make this useful..."></textarea></label>
        <button class="button button-primary" type="submit">Tell Jen →</button>
        <p class="backpack-suggestion-status" id="backpackSuggestionStatus" role="status" aria-live="polite"></p>
      </form>
      <div class="john-note">Yes, this really sends Jen another idea to build. Use this power irresponsibly within reason.</div>`;
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
        const response = await fetch('/backpack-suggestion.html', {
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
    tuneVisibleCopy();
    ensureBreathingCard();
    watchForBackpack();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
