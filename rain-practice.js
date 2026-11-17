(() => {
  'use strict';

  const STEPS = [
    {
      letter: 'R',
      name: 'Recognize',
      title: 'Notice what is here.',
      description: 'Name what is happening inside you right now. A feeling, a thought, or a body sensation is enough.',
      prompt: 'What am I noticing right now?',
      placeholder: 'I notice that I feel…'
    },
    {
      letter: 'A',
      name: 'Allow',
      title: 'Let this moment be here.',
      description: 'You do not have to like the feeling or act on it. For this moment, see if you can let it exist without fighting it.',
      prompt: 'What could I say to make room for this experience?',
      placeholder: 'For now, I can let this be here…'
    },
    {
      letter: 'I',
      name: 'Investigate',
      title: 'Get curious, gently.',
      description: 'What does this feeling need? Where do you sense it in your body? If looking closer is too much right now, skip this step.',
      prompt: 'What might this feeling be asking for?',
      placeholder: 'I wonder whether I need…'
    },
    {
      letter: 'N',
      name: 'Nurture',
      title: 'Offer yourself some kindness.',
      description: 'Try speaking to yourself as you would to someone you care about. What small kindness would help right now?',
      prompt: 'What can I offer myself in this moment?',
      placeholder: 'Right now, I can be kind to myself by…'
    }
  ];

  const toolbox = document.getElementById('dbtToolbox');
  if (!toolbox || document.getElementById('rainEntry')) return;

  const style = document.createElement('style');
  style.id = 'rainPracticeStyles';
  style.textContent = [
    '.rain-entry{margin:1rem 0;padding:1rem 1.1rem;background:linear-gradient(145deg,#f2f6ee,#fffdf5);border:1px solid rgba(47,70,54,.2);border-radius:18px;display:flex;align-items:center;justify-content:space-between;gap:.8rem;flex-wrap:wrap}',
    '.rain-entry-copy{flex:1 1 220px}.rain-entry h3{margin:.18rem 0 .3rem;color:var(--pine-dark,#2f4636)}.rain-entry p{margin:0;line-height:1.5}',
    '.rain-entry .eyebrow{font-size:.75rem;letter-spacing:.08em;font-weight:800;color:#54725d}',
    '.rain-entry .button{white-space:nowrap}.rain-entry-status{margin-top:.35rem!important;font-size:.85rem;font-weight:700;color:#37624a}',
    '.rain-dialog{border:0;padding:0;width:min(94vw,560px);max-height:min(90dvh,780px);overflow-y:auto;border-radius:22px;background:#fffdf7;color:#26392c;box-shadow:0 24px 80px rgba(15,30,20,.28)}',
    '.rain-dialog::backdrop{background:rgba(18,32,25,.62)}.rain-shell{padding:clamp(1.15rem,4vw,2rem)}',
    '.rain-head{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem}.rain-kicker{color:#55715e;font-size:.77rem;letter-spacing:.1em;font-weight:850;text-transform:uppercase;margin:0 0 .4rem}',
    '.rain-close{appearance:none;border:0;background:transparent;font-size:1.8rem;color:#36503f;line-height:1;cursor:pointer;padding:.15rem .35rem}',
    '.rain-progress{display:flex;gap:.5rem;margin:1.2rem 0 1.3rem}.rain-dot{flex:1;text-align:center;padding:.55rem 0;border-radius:999px;background:#e8ede4;color:#58715d;font-weight:850}',
    '.rain-dot.active{background:#365d45;color:#fff}.rain-dot.done{background:#c7deca;color:#234734}',
    '.rain-dialog h2{font-size:1.5rem;margin:.15rem 0 .55rem;color:#25402e}.rain-help{line-height:1.55;margin:0 0 1.3rem;color:#405247}',
    '.rain-label{display:block;font-weight:800;margin:0 0 .5rem}.rain-input{width:100%;box-sizing:border-box;min-height:120px;resize:vertical;border-radius:13px;border:1px solid #a9b9a9;background:#fff;color:#24382b;padding:.85rem;font:inherit;line-height:1.5}',
    '.rain-input:focus-visible,.rain-close:focus-visible,.rain-actions button:focus-visible{outline:3px solid #779b80;outline-offset:2px}',
    '.rain-private{color:#607365;font-size:.8rem;line-height:1.45;margin:.6rem 0 0}',
    '.rain-actions{display:flex;justify-content:flex-end;align-items:center;gap:.6rem;flex-wrap:wrap;margin-top:1.4rem}',
    '.rain-actions button{font:inherit;cursor:pointer;border-radius:999px;padding:.7rem 1rem;border:1px solid #8ba28d;background:#fff;color:#2b4e39;font-weight:750}',
    '.rain-actions .rain-primary{border-color:#315d40;background:#315d40;color:#fff}',
    '.rain-save-status{min-height:1.1rem;color:#995029;font-size:.85rem;font-weight:750;margin:.7rem 0 0}',
    '@media(max-width:480px){.rain-entry .button{width:100%}.rain-actions{justify-content:stretch}.rain-actions button{flex:1 1 auto}.rain-actions .rain-private-finish{flex-basis:100%}}'
  ].join('\n');
  document.head.appendChild(style);

  const entry = document.createElement('section');
  entry.id = 'rainEntry';
  entry.className = 'rain-entry';
  entry.setAttribute('aria-labelledby', 'rainEntryHeading');
  entry.innerHTML = [
    '<div class="rain-entry-copy">',
    '<p class="eyebrow">MINDFULNESS + SELF-COMPASSION</p>',
    '<h3 id="rainEntryHeading">🌧️ RAIN: Give yourself a little room.</h3>',
    '<p>Recognize · Allow · Investigate · Nurture. Four gentle steps, at your own pace.</p>',
    '<p class="rain-entry-status" id="rainEntryStatus" role="status" aria-live="polite"></p>',
    '</div>',
    '<button class="button button-primary" type="button" id="rainOpen">Try RAIN →</button>'
  ].join('');
  const grid = document.getElementById('dbtCardGrid');
  if (grid && grid.parentElement === toolbox) toolbox.insertBefore(entry, grid);
  else toolbox.appendChild(entry);

  const header = toolbox.querySelector('.dbt-toolbox-header');
  const heading = header && header.querySelector('h2');
  const copy = header && header.querySelector('p:not(.eyebrow)');
  if (heading) heading.textContent = 'HALT, RAIN + DBT Trail Tools';
  if (copy) copy.textContent = 'Check the basics with HALT, practice compassion with RAIN, or explore the DBT cards. Choose what helps.';

  const dialog = document.createElement('dialog');
  dialog.className = 'rain-dialog';
  dialog.id = 'rainDialog';
  dialog.setAttribute('aria-labelledby', 'rainStepTitle');
  dialog.innerHTML = [
    '<div class="rain-shell">',
      '<div class="rain-head"><p class="rain-kicker">RAIN • A practice of radical compassion</p>',
      '<button class="rain-close" type="button" aria-label="Close RAIN practice">×</button></div>',
      '<div class="rain-progress" id="rainProgress" aria-label="RAIN progress"></div>',
      '<p class="rain-kicker" id="rainStepName"></p>',
      '<h2 id="rainStepTitle"></h2>',
      '<p class="rain-help" id="rainStepDescription"></p>',
      '<label class="rain-label" for="rainInput" id="rainStepPrompt"></label>',
      '<textarea id="rainInput" class="rain-input" rows="4"></textarea>',
      '<p class="rain-private">Writing is optional. You can do this quietly, skip a question, or leave without saving.</p>',
      '<div class="rain-actions">',
        '<button type="button" id="rainBack">← Back</button>',
        '<button type="button" class="rain-private-finish" id="rainFinishPrivate">Finish privately</button>',
        '<button type="button" class="rain-primary" id="rainNext">Continue →</button>',
      '</div>',
      '<p class="rain-save-status" id="rainSaveStatus" role="status" aria-live="polite"></p>',
    '</div>'
  ].join('');
  document.body.appendChild(dialog);

  const input = dialog.querySelector('#rainInput');
  const back = dialog.querySelector('#rainBack');
  const next = dialog.querySelector('#rainNext');
  const status = dialog.querySelector('#rainSaveStatus');
  const entryStatus = entry.querySelector('#rainEntryStatus');
  const drafts = ['', '', '', ''];
  let stepIndex = 0;

  function saveDraft() { drafts[stepIndex] = input.value; }
  function resetDrafts() {
    drafts.fill('');
    stepIndex = 0;
  }
  function renderStep() {
    const step = STEPS[stepIndex];
    dialog.querySelector('#rainProgress').innerHTML = STEPS.map((item, i) => {
      const state = i === stepIndex ? ' active' : i < stepIndex ? ' done' : '';
      return '<span class="rain-dot' + state + '"' + (i === stepIndex ? ' aria-current="step"' : '') + '>' + item.letter + '</span>';
    }).join('');
    dialog.querySelector('#rainStepName').textContent = 'Step ' + (stepIndex + 1) + ' of 4 · ' + step.name;
    dialog.querySelector('#rainStepTitle').textContent = step.title;
    dialog.querySelector('#rainStepDescription').textContent = step.description;
    dialog.querySelector('#rainStepPrompt').textContent = step.prompt;
    input.placeholder = step.placeholder;
    input.value = drafts[stepIndex];
    back.disabled = stepIndex === 0;
    back.hidden = stepIndex === 0;
    next.textContent = stepIndex === STEPS.length - 1 ? 'Save to My Days ✓' : 'Continue →';
    status.textContent = '';
    input.focus();
  }

  entry.querySelector('#rainOpen').addEventListener('click', () => {
    resetDrafts();
    renderStep();
    dialog.showModal();
  });
  dialog.querySelector('.rain-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  back.addEventListener('click', () => {
    saveDraft();
    if (stepIndex > 0) stepIndex--;
    renderStep();
  });
  next.addEventListener('click', () => {
    saveDraft();
    if (stepIndex < STEPS.length - 1) {
      stepIndex++;
      renderStep();
      return;
    }
    const api = window.GrizzlyJohnStorageV2;
    if (!api || !api.guidedSkillSessions || !api.guidedSkillSessions.add) {
      status.textContent = 'This reflection could not be saved safely. You can finish privately instead.';
      return;
    }
    const date = api.localDateKey(new Date());
    const responses = STEPS.map((step, i) => ({
      prompt: step.name + ': ' + step.prompt,
      response: drafts[i].trim() || 'Practiced quietly'
    }));
    const result = api.guidedSkillSessions.add({
      feeling: 'RAIN reflection',
      skill: 'RAIN',
      responses
    }, { date });
    if (!result || !result.ok) {
      status.textContent = (result && result.reason) || 'Could not save. Your answers are still here.';
      return;
    }
    entryStatus.textContent = 'RAIN saved in My Days ✓';
    if (window.GrizzlyJohnMyDays && window.GrizzlyJohnMyDays.refresh) window.GrizzlyJohnMyDays.refresh(date);
    document.dispatchEvent(new CustomEvent('grizzly-guided-skill-saved', {
      detail: { skill: 'RAIN', session: result.session }
    }));
    dialog.close();
    resetDrafts();
  });
  dialog.querySelector('#rainFinishPrivate').addEventListener('click', () => {
    entryStatus.textContent = 'RAIN completed privately. Nothing was saved.';
    dialog.close();
    resetDrafts();
  });
})();
