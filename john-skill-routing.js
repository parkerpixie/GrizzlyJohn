(() => {
  'use strict';

  const WORD_RULES = Object.freeze({
    Panicked: 'TIPP',
    Flooded: 'TIPP',
    Dysregulated: 'TIPP',
    Furious: 'STOP',
    Enraged: 'STOP',
    Frustrated: 'STOP',
    Resentful: 'Radical Acceptance',
    Betrayed: 'Radical Acceptance',
    Worried: 'Check The Facts',
    Overthinking: 'Check The Facts',
    Dread: 'Cope Ahead',
    Uncertain: 'Cope Ahead',
    Disrespected: 'DEAR MAN',
    Defensive: 'FAST',
    Guilty: 'Check The Facts',
    Ashamed: 'Opposite Action',
    Lonely: 'Opposite Action',
    Hopeless: 'Opposite Action',
    Vulnerable: 'Self Soothe',
    Trapped: 'IMPROVE',
    Stuck: 'Problem Solving',
    Conflicted: 'WISE MIND',
    Ambivalent: 'WISE MIND'
  });

  const GROUP_RULES = Object.freeze({
    neutral: 'ABC Please',
    sad: 'Self Soothe',
    fear: 'Check The Facts',
    anger: 'STOP',
    shame: 'Check The Facts',
    overwhelmed: 'TIPP'
  });

  const BODY_FIRST = new Set(['panicked', 'flooded', 'dysregulated', 'overwhelmed', 'scattered', 'shut down', 'numb', 'burned out', 'helpless', 'trapped', 'powerless']);
  const HALT_DIRECT = new Set(['tired', 'lonely']);
  const POSITIVE_GROUPS = new Set(['bright', 'calm']);

  const REASONS = Object.freeze({
    HALT: 'Check the foundation first: hungry, angry, lonely, or tired.',
    TIPP: 'Bring the nervous system down before asking for a complicated decision.',
    STOP: 'Create a clean pause before the feeling chooses the next move.',
    'Check The Facts': 'Separate what is known from what the mind is predicting or assuming.',
    'Cope Ahead': 'Rehearse how you want to meet what is coming instead of only bracing for it.',
    'Opposite Action': 'Notice the action urge and choose a small move that helps rather than deepens it.',
    'Self Soothe': 'Use gentleness and the senses to make the moment easier to carry.',
    'Radical Acceptance': 'Stop fighting the fact that the situation exists before deciding what comes next.',
    'DEAR MAN': 'Turn the feeling into a clear request or boundary instead of a pileup.',
    FAST: 'Protect self-respect while staying fair and truthful.',
    'ABC Please': 'Check body basics and the routines that make emotional regulation easier.',
    IMPROVE: 'Make the next few minutes more bearable when the whole situation cannot change yet.',
    'Problem Solving': 'Shrink an influenceable problem to one concrete next step.',
    'WISE MIND': 'Let emotion and reason both have a seat before choosing what fits.'
  });

  function normalizeFeeling(input, familyApi) {
    const word = String(typeof input === 'string' ? input : input?.word || '').trim();
    let groupId = String(typeof input === 'object' ? input?.groupId || '' : '').trim().toLowerCase();
    if (!groupId && familyApi?.familyIdForFeeling) groupId = familyApi.familyIdForFeeling(input) || familyApi.familyIdForFeeling(word) || '';
    return { word, groupId };
  }

  function uniquePush(list, entry) {
    if (!entry?.skill || list.some(item => item.skill === entry.skill)) return;
    list.push(entry);
  }

  function routeForFeeling(feeling) {
    const skill = WORD_RULES[feeling.word] || GROUP_RULES[feeling.groupId] || null;
    return skill ? { skill, feeling: feeling.word, reason: REASONS[skill] || '' } : null;
  }

  function recommendSkills(feelings = [], options = {}) {
    const familyApi = options.familyApi || (typeof window !== 'undefined' ? window.GrizzlyJohnFeelingFamilies : null);
    const normalized = (Array.isArray(feelings) ? feelings : []).map(item => normalizeFeeling(item, familyApi)).filter(item => item.word);
    const actionable = normalized.filter(item => !POSITIVE_GROUPS.has(item.groupId));
    if (!actionable.length) return [];

    const result = [];
    const bodyFirst = actionable.find(item => BODY_FIRST.has(item.word.toLowerCase()));
    const anger = actionable.find(item => item.groupId === 'anger');
    const directHalt = actionable.find(item => HALT_DIRECT.has(item.word.toLowerCase()));
    const lowEnergy = actionable.find(item => item.groupId === 'neutral');

    if (bodyFirst) uniquePush(result, { skill: 'TIPP', feeling: bodyFirst.word, role: 'start', reason: REASONS.TIPP });

    if (anger || directHalt || lowEnergy || bodyFirst) {
      const haltFeeling = anger?.word || directHalt?.word || lowEnergy?.word || bodyFirst?.word || actionable[0].word;
      uniquePush(result, { skill: 'HALT', feeling: haltFeeling, role: result.length ? 'foundation' : 'start', reason: REASONS.HALT });
    }

    actionable.forEach(feeling => {
      const route = routeForFeeling(feeling);
      if (route) uniquePush(result, { ...route, role: result.length ? 'next' : 'start' });
    });

    if (result.length < 3) {
      const groupFallbacks = {
        overwhelmed: ['IMPROVE', 'STOP'],
        anger: ['STOP', 'Check The Facts'],
        sad: ['Self Soothe', 'Opposite Action'],
        fear: ['Check The Facts', 'Cope Ahead'],
        shame: ['Check The Facts', 'Self Soothe'],
        neutral: ['ABC Please', 'Self Soothe']
      };
      actionable.forEach(feeling => {
        (groupFallbacks[feeling.groupId] || []).forEach(skill => uniquePush(result, { skill, feeling: feeling.word, role: 'next', reason: REASONS[skill] || '' }));
      });
    }

    return result.slice(0, Number(options.limit) > 0 ? Number(options.limit) : 3);
  }

  function patternSkills(observation = {}) {
    const family = observation.familyId || '';
    const detail = String(observation.detail || '').toLowerCase();
    if (family === 'bright' || family === 'calm') return [];
    if (family === 'anger') return ['HALT', 'STOP', 'Check The Facts'];
    if (family === 'overwhelmed') return ['TIPP', 'HALT', 'IMPROVE'];
    if (family === 'neutral') return ['HALT', 'ABC Please'];
    if (family === 'sad') return detail.includes('lonely') ? ['HALT', 'Opposite Action', 'Self Soothe'] : ['Self Soothe', 'Opposite Action'];
    if (family === 'fear') return ['Check The Facts', 'Cope Ahead', 'HALT'];
    if (family === 'shame') return ['Check The Facts', 'Self Soothe', 'Opposite Action'];
    return [];
  }

  function haltNextMoves(selected = []) {
    const needs = new Set((Array.isArray(selected) ? selected : []).map(item => String(item).trim()).filter(Boolean));
    const moves = [];
    if (needs.has('Hungry')) moves.push({ need: 'Hungry', text: 'Fuel first. Eat something substantial and have some water, then reassess.', skill: 'ABC Please' });
    if (needs.has('Angry')) moves.push({ need: 'Angry', text: 'Put a pause between the feeling and the action. No big text, email, or decision yet.', skill: 'STOP' });
    if (needs.has('Lonely')) moves.push({ need: 'Lonely', text: 'Choose one low-pressure connection: a meeting, a text, a call, or time with someone safe.', skill: 'Opposite Action' });
    if (needs.has('Tired')) moves.push({ need: 'Tired', text: 'Lower the bar and address rest and body basics before demanding more from yourself.', skill: 'ABC Please' });
    return moves;
  }

  function injectStyles() {
    if (document.getElementById('johnSkillRoutingStyles')) return;
    const style = document.createElement('style');
    style.id = 'johnSkillRoutingStyles';
    style.textContent = `
      .john-routing-note{display:block;margin:.35rem 0 0;font-size:.76rem;line-height:1.35;color:rgba(47,70,54,.72);font-weight:600}
      .skill-suggestion-button.is-routing-start{outline:2px solid #d59b35;outline-offset:2px}
      .routing-positive-note{margin-top:.75rem;padding:.75rem .85rem;border-radius:14px;background:#eef5ee;color:#2f4636;font-weight:700}
      .pattern-tool-row{display:flex;gap:.4rem;flex-wrap:wrap;margin:.45rem 0 .8rem}
      .pattern-tool-row button,.john-halt-next button{border:1px solid rgba(47,70,54,.18);border-radius:999px;background:#fff;color:#2f4636;padding:.45rem .65rem;font:inherit;font-size:.76rem;font-weight:800;cursor:pointer}
      .pattern-tool-row button:first-child,.john-halt-next button:first-of-type{background:#f8ead0;border-color:#d59b35;color:#6c4910}
      .john-halt-next{margin:.7rem 0 0;padding:.8rem;border-radius:14px;background:#fff8e9;border:1px solid rgba(213,155,53,.35)}
      .john-halt-next strong{display:block;margin-bottom:.35rem;color:#6c4910}
      .john-halt-next p{margin:.25rem 0 .55rem!important;font-size:.84rem}
      .john-halt-next-actions{display:flex;gap:.4rem;flex-wrap:wrap}
    `;
    document.head.appendChild(style);
  }

  function parseSavedFeelings(holder) {
    const text = holder.querySelector('.check-in-saved span')?.textContent || '';
    return text.split('·').map(word => word.trim()).filter(Boolean);
  }

  function enhanceFeelingSuggestions() {
    const holder = document.getElementById('feelingResult');
    if (!holder || holder.hidden || !holder.querySelector('.check-in-saved')) return;
    const stamp = holder.querySelector('.check-in-saved span')?.textContent || '';
    if (holder.dataset.routingStamp === stamp) return;
    holder.dataset.routingStamp = stamp;

    const feelings = parseSavedFeelings(holder);
    const routes = recommendSkills(feelings);
    const suggestion = holder.querySelector('.check-in-suggestions');
    if (!suggestion) return;

    if (!routes.length) {
      suggestion.hidden = true;
      if (!holder.querySelector('.routing-positive-note')) {
        const note = document.createElement('div');
        note.className = 'routing-positive-note';
        note.textContent = 'No repair tool needed here. Notice what is working and keep some of it.';
        suggestion.insertAdjacentElement('afterend', note);
      }
      return;
    }

    suggestion.hidden = false;
    const eyebrow = suggestion.querySelector('.eyebrow');
    if (eyebrow) eyebrow.textContent = 'TOOLS THAT FIT THIS CHECK-IN';
    const buttons = [...suggestion.querySelectorAll('.skill-suggestion-button')];
    buttons.forEach((button, index) => {
      const route = routes[index];
      if (!route) {
        button.hidden = true;
        return;
      }
      button.hidden = false;
      button.dataset.guidedSkill = route.skill;
      button.dataset.routingFeeling = route.feeling || '';
      button.classList.toggle('is-routing-start', index === 0);
      button.innerHTML = `<strong>${index === 0 ? 'Start here: ' : ''}${route.skill}</strong><span>Try this tool →</span><small class="john-routing-note">${route.reason}</small>`;
      if (button.dataset.routingCaptureReady !== 'true') {
        button.dataset.routingCaptureReady = 'true';
        button.addEventListener('click', () => {
          const all = parseSavedFeelings(holder);
          setTimeout(() => {
            const label = document.getElementById('guidedSkillFeeling');
            const dialog = document.getElementById('guidedSkillDialog');
            if (label && dialog?.open) label.textContent = `A short ${button.dataset.guidedSkill} exercise for this check-in: ${all.join(' · ')}.`;
          }, 0);
        }, true);
      }
    });
  }

  function openReferenceSkill(skill) {
    document.querySelector('[data-nav="wisdom"]')?.click();
    setTimeout(() => {
      const opener = document.querySelector('#johnToolboxLink [data-open-recovery-toolbox]') || document.querySelector('[data-open-recovery-toolbox]');
      if (opener) opener.click();
      else {
        const toolbox = document.getElementById('dbtToolbox');
        if (toolbox) toolbox.hidden = false;
      }
      setTimeout(() => {
        const target = [...document.querySelectorAll('#dbtCardGrid .dbt-card-button')].find(button => button.querySelector('strong')?.textContent?.trim().toLowerCase() === skill.toLowerCase());
        target?.click();
      }, 160);
    }, 120);
  }

  function deriveCurrentObservations() {
    const api = window.GrizzlyJohnStorageV2;
    const patterns = window.GrizzlyJohnWisdomPatterns;
    const checkIns = api?.feelingCheckIns?.all();
    const sessions = api?.guidedSkillSessions?.all();
    const gratitude = api?.gratitude?.all();
    if (!api || !patterns || !checkIns?.ok || !sessions?.ok || !gratitude?.ok) return [];
    return patterns.derivePatternObservations(checkIns.entries, sessions.sessions, {
      now: new Date(), localDateKey: api.localDateKey, gratitudeEntries: gratitude.entries
    }).slice(0, 5);
  }

  function enhancePatterns() {
    const holder = document.getElementById('patternObservation');
    if (!holder || !holder.querySelector('.pattern-observations')) return;
    const observations = deriveCurrentObservations();
    const sections = [...holder.querySelectorAll('.pattern-observations section')];
    sections.forEach(section => {
      const category = section.querySelector('h3')?.textContent?.trim();
      const matches = observations.filter(item => item.category === category);
      const paragraphs = [...section.querySelectorAll(':scope > p')];
      paragraphs.forEach((paragraph, index) => {
        if (paragraph.dataset.routingPatternReady === 'true') return;
        const observation = matches[index];
        const skills = patternSkills(observation);
        paragraph.dataset.routingPatternReady = 'true';
        if (!skills.length) return;
        const row = document.createElement('div');
        row.className = 'pattern-tool-row';
        row.setAttribute('aria-label', 'Tools that may fit this pattern');
        row.innerHTML = skills.map(skill => `<button type="button" data-pattern-skill="${skill}">${skill}</button>`).join('');
        const detail = paragraph.nextElementSibling?.classList.contains('pattern-detail') ? paragraph.nextElementSibling : null;
        (detail || paragraph).insertAdjacentElement('afterend', row);
        row.querySelectorAll('[data-pattern-skill]').forEach(button => button.addEventListener('click', () => openReferenceSkill(button.dataset.patternSkill)));
      });
    });
  }

  function showHaltNextMove(event) {
    if (event?.detail?.skill !== 'HALT') return;
    const response = event.detail.session?.responses?.[0]?.response || '';
    const selected = response === 'None selected' ? [] : response.split('·').map(item => item.trim()).filter(Boolean);
    const card = document.getElementById('johnHaltQuickCheck');
    if (!card) return;
    card.querySelector('#johnHaltNextMove')?.remove();
    const panel = document.createElement('div');
    panel.id = 'johnHaltNextMove';
    panel.className = 'john-halt-next';
    const moves = haltNextMoves(selected);
    if (!moves.length) {
      panel.innerHTML = '<strong>HALT is clear.</strong><p>None of the four basics is shouting right now. Use the feeling itself to choose the next tool rather than forcing a HALT answer.</p>';
    } else {
      const skills = [...new Set(moves.map(move => move.skill).filter(Boolean))];
      panel.innerHTML = `<strong>Do the basic thing first.</strong>${moves.map(move => `<p><b>${move.need}:</b> ${move.text}</p>`).join('')}<div class="john-halt-next-actions">${skills.map(skill => `<button type="button" data-halt-next-skill="${skill}">Open ${skill}</button>`).join('')}</div>`;
      panel.querySelectorAll('[data-halt-next-skill]').forEach(button => button.addEventListener('click', () => openReferenceSkill(button.dataset.haltNextSkill)));
    }
    card.appendChild(panel);
  }

  function initBrowser() {
    injectStyles();
    const feelingResult = document.getElementById('feelingResult');
    if (feelingResult) new MutationObserver(() => setTimeout(enhanceFeelingSuggestions, 0)).observe(feelingResult, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
    const patternHolder = document.getElementById('patternObservation');
    if (patternHolder) new MutationObserver(() => setTimeout(enhancePatterns, 0)).observe(patternHolder, { childList: true, subtree: true });
    document.addEventListener('grizzly-guided-skill-saved', showHaltNextMove);
    enhanceFeelingSuggestions();
    enhancePatterns();
  }

  const api = Object.freeze({ recommendSkills, patternSkills, haltNextMoves, routeForFeeling, normalizeFeeling, REASONS });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') {
    window.GrizzlyJohnSkillRouting = api;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initBrowser, { once: true });
    else initBrowser();
  }
})();
