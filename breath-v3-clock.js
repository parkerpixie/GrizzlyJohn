(() => {
  'use strict';

  const INHALE_MS = 4000;
  const HOLD_MS = 2000;
  const EXHALE_MS = 6000;
  const BREATHS_PER_SET = 3;
  const TOTAL_SET_MS = (INHALE_MS + HOLD_MS + EXHALE_MS) * BREATHS_PER_SET;

  const $ = (selector, root = document) => root.querySelector(selector);

  function buildClockFace() {
    const ticks = Array.from({ length: 60 }, (_, index) => {
      const major = index % 5 === 0 ? ' is-major' : '';
      return `<i class="breath-clock-tick${major}" style="--tick:${index}"></i>`;
    }).join('');
    return `
      <div class="breath-clock-wrap" aria-hidden="true">
        <div class="breath-clock-face">
          ${ticks}
          <span class="breath-clock-number is-xii">XII</span>
          <span class="breath-clock-number is-iii">III</span>
          <span class="breath-clock-number is-vi">VI</span>
          <span class="breath-clock-number is-ix">IX</span>
          <span class="breath-clock-hand breath-clock-minute" data-breath-minute-hand></span>
          <span class="breath-clock-hand breath-clock-second" data-breath-second-hand></span>
          <span class="breath-clock-pin"></span>
        </div>
        <div class="breath-exact-time"><span>ELAPSED</span><strong data-breath-elapsed>00:00.0</strong></div>
      </div>`;
  }

  function ensureBreathingCard() {
    let card = $('#breathingCard');
    if (card) return { card, created: false };
    const feelings = $('#feelingCheckIn');
    if (!feelings) return null;

    card = document.createElement('section');
    card.className = 'card breathing-card breath-v3-card';
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
    wireBreathingCycle(card);
    return { card, created: true };
  }

  function wireBreathingCycle(card) {
    if (card.dataset.breathCycleOwner) return;
    card.dataset.breathCycleOwner = 'v3';
    const stage = $('#breathingStage', card);
    const orb = $('#breathingOrb', card);
    const center = $('#breathingCenter', card);
    const cue = $('#breathingCue', card);
    const start = $('#startBreathing', card);
    const stop = $('#stopBreathing', card);
    if (!stage || !orb || !center || !cue || !start || !stop) return;

    let breath = 0;
    let session = 0;
    let timers = [];
    const clearTimers = () => { timers.forEach(window.clearTimeout); timers = []; };
    const later = (fn, ms, token) => timers.push(window.setTimeout(() => { if (token === session) fn(); }, ms));
    const setPhase = (name, text) => {
      orb.classList.remove('is-inhaling', 'is-holding', 'is-exhaling', 'is-complete');
      if (name) orb.classList.add(`is-${name}`);
      cue.textContent = text;
    };

    function finish() {
      clearTimers();
      setPhase('complete', 'There you are.');
      center.textContent = '🌿';
      start.hidden = false;
      start.textContent = 'Keep going';
      stop.hidden = false;
    }

    function run(token) {
      setPhase('inhaling', 'Breathe in.');
      later(() => {
        setPhase('holding', 'Stay here.');
        later(() => {
          setPhase('exhaling', 'Let it go.');
          later(() => {
            breath += 1;
            if (breath >= BREATHS_PER_SET) finish();
            else run(token);
          }, EXHALE_MS, token);
        }, HOLD_MS, token);
      }, INHALE_MS, token);
    }

    start.addEventListener('click', () => {
      clearTimers();
      session += 1;
      breath = 0;
      center.textContent = '🐻';
      stage.hidden = false;
      start.hidden = true;
      stop.hidden = false;
      run(session);
    });

    stop.addEventListener('click', () => {
      clearTimers();
      session += 1;
      breath = 0;
      setPhase('', 'Whenever you need it.');
      center.textContent = '🐻';
      stage.hidden = true;
      start.hidden = false;
      start.textContent = 'Take three breaths';
      stop.hidden = true;
    });
  }

  function enhanceClock(card) {
    if (!card || card.querySelector('[data-breath-clock-v3]')) return true;
    const stage = $('#breathingStage', card);
    const start = $('#startBreathing', card);
    const stop = $('#stopBreathing', card);
    const cue = $('#breathingCue', card);
    if (!stage || !start || !stop || !cue) return false;

    const clock = document.createElement('div');
    clock.className = 'breath-v3-clock';
    clock.dataset.breathClockV3 = 'true';
    clock.innerHTML = buildClockFace();
    stage.appendChild(clock);

    const elapsed = $('[data-breath-elapsed]', clock);
    const secondHand = $('[data-breath-second-hand]', clock);
    const minuteHand = $('[data-breath-minute-hand]', clock);
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    let startedAt = null;
    let raf = null;
    let completed = false;

    const formatElapsed = milliseconds => {
      const tenths = Math.max(0, Math.floor(milliseconds / 100));
      const minutes = Math.floor(tenths / 600);
      const seconds = Math.floor((tenths % 600) / 10);
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths % 10}`;
    };

    const paint = milliseconds => {
      elapsed.textContent = formatElapsed(milliseconds);
      if (!reducedMotion) {
        const seconds = milliseconds / 1000;
        secondHand.style.transform = `rotate(${(seconds % 60) * 6}deg)`;
        minuteHand.style.transform = `rotate(${(seconds / 60) * 6}deg)`;
      }
    };

    function stopTimer(finalMilliseconds = null) {
      if (raf) window.cancelAnimationFrame(raf);
      raf = null;
      if (finalMilliseconds !== null) paint(finalMilliseconds);
    }

    function frame(now) {
      if (startedAt === null || completed) return;
      const ms = now - startedAt;
      paint(Math.min(ms, TOTAL_SET_MS));
      if (ms >= TOTAL_SET_MS) {
        completed = true;
        stopTimer(TOTAL_SET_MS);
        return;
      }
      raf = window.requestAnimationFrame(frame);
    }

    function startTimer() {
      if (raf) window.cancelAnimationFrame(raf);
      startedAt = performance.now();
      completed = false;
      paint(0);
      raf = window.requestAnimationFrame(frame);
    }

    function resetTimer() {
      startedAt = null;
      completed = false;
      stopTimer(0);
    }

    start.addEventListener('click', () => window.setTimeout(startTimer, 0));
    stop.addEventListener('click', resetTimer);

    const cueObserver = new MutationObserver(() => {
      if (cue.textContent.trim() === 'There you are.' && startedAt !== null) {
        completed = true;
        stopTimer(Math.min(TOTAL_SET_MS, performance.now() - startedAt));
      }
    });
    cueObserver.observe(cue, { childList: true, characterData: true, subtree: true });
    paint(0);
    return true;
  }

  function init() {
    const result = ensureBreathingCard();
    if (result?.card && enhanceClock(result.card)) return;
    const observer = new MutationObserver(() => {
      const next = ensureBreathingCard();
      if (next?.card && enhanceClock(next.card)) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 15000);
  }

  const api = Object.freeze({ INHALE_MS, HOLD_MS, EXHALE_MS, BREATHS_PER_SET, TOTAL_SET_MS });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    window.GrizzlyJohnBreathClockV3 = api;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
  }
})();
