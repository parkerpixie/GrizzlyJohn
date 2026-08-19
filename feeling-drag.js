(() => {
  function initFeelingDrag() {
    const wheel = document.getElementById('feelingWheel');
    const windowEl = document.getElementById('wheelWindow');
    const prev = document.getElementById('feelingPrev');
    const next = document.getElementById('feelingNext');
    if (!wheel || !windowEl || !prev || !next || wheel.dataset.fastDragReady === 'true') return Boolean(wheel);

    wheel.dataset.fastDragReady = 'true';
    wheel.classList.add('fast-feeling-wheel');

    const STEP_PX = 24;
    let startY = 0;
    let lastY = 0;
    let lastTime = 0;
    let appliedSteps = 0;
    let velocity = 0;
    let dragging = false;

    function clickSteps(count) {
      if (!count) return;
      const button = count > 0 ? next : prev;
      const total = Math.min(Math.abs(count), 10);
      for (let i = 0; i < total; i += 1) button.click();
    }

    function start(y) {
      dragging = true;
      startY = y;
      lastY = y;
      lastTime = performance.now();
      appliedSteps = 0;
      velocity = 0;
      wheel.classList.add('is-thumb-dragging');
    }

    function move(y, event) {
      if (!dragging) return;
      if (event?.cancelable) event.preventDefault();

      const now = performance.now();
      const dt = Math.max(now - lastTime, 1);
      velocity = (lastY - y) / dt;
      lastY = y;
      lastTime = now;

      const delta = startY - y;
      const desiredSteps = Math.trunc(delta / STEP_PX);
      const difference = desiredSteps - appliedSteps;
      if (difference) {
        clickSteps(difference);
        appliedSteps = desiredSteps;
      }

      const remainder = delta - (appliedSteps * STEP_PX);
      windowEl.style.transform = `translateY(${-remainder}px)`;
    }

    function end() {
      if (!dragging) return;
      dragging = false;
      wheel.classList.remove('is-thumb-dragging');
      windowEl.style.transform = '';

      const speed = Math.abs(velocity);
      if (speed > 0.45) {
        const extra = Math.min(4, Math.max(1, Math.round(speed * 2.4)));
        clickSteps(velocity > 0 ? extra : -extra);
      }
    }

    wheel.addEventListener('touchstart', event => {
      if (!event.target.closest('#wheelWindow')) return;
      const touch = event.changedTouches[0];
      if (!touch) return;
      event.stopImmediatePropagation();
      start(touch.clientY);
    }, { passive: true, capture: true });

    wheel.addEventListener('touchmove', event => {
      if (!dragging) return;
      event.stopImmediatePropagation();
      const touch = event.changedTouches[0];
      if (touch) move(touch.clientY, event);
    }, { passive: false, capture: true });

    wheel.addEventListener('touchend', event => {
      if (!dragging) return;
      event.stopImmediatePropagation();
      end();
    }, { passive: true, capture: true });

    wheel.addEventListener('touchcancel', event => {
      if (!dragging) return;
      event.stopImmediatePropagation();
      end();
    }, { passive: true, capture: true });

    wheel.addEventListener('pointerdown', event => {
      if (event.pointerType === 'touch' || !event.target.closest('#wheelWindow')) return;
      start(event.clientY);
      wheel.setPointerCapture?.(event.pointerId);
    });
    wheel.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch') return;
      move(event.clientY, event);
    });
    wheel.addEventListener('pointerup', end);
    wheel.addEventListener('pointercancel', end);

    return true;
  }

  function start() {
    if (initFeelingDrag()) return;
    const observer = new MutationObserver(() => {
      if (initFeelingDrag()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 15000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
