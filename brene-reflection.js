(() => {
  const IMAGE = 'graphics/Brene%20Brown%20Quote.png';

  function addStyles() {
    if (document.getElementById('breneReflectionStyles')) return;
    const style = document.createElement('style');
    style.id = 'breneReflectionStyles';
    style.textContent = `
      .reflection-pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem;align-items:stretch;margin-bottom:1rem}
      .reflection-pair>.card{margin:0;height:100%;box-sizing:border-box}
      .brene-reflection-card{display:flex;gap:1rem;align-items:center}
      .brene-reflection-thumb{width:92px;max-width:28%;border-radius:14px;box-shadow:0 4px 14px rgba(47,70,54,.12);flex:0 0 auto}
      .brene-reflection-card .card-content{min-width:0}
      .brene-reflection-dialog{border:0;border-radius:22px;padding:0;max-width:min(94vw,760px);max-height:92vh;background:#f7f0e4;box-shadow:0 20px 70px rgba(0,0,0,.3)}
      .brene-reflection-dialog::backdrop{background:rgba(25,34,27,.72)}
      .brene-reflection-dialog-inner{position:relative;padding:1rem;overflow:auto;max-height:92vh;box-sizing:border-box}
      .brene-reflection-dialog img{display:block;width:100%;height:auto;border-radius:16px}
      .brene-reflection-close{position:sticky;top:0;float:right;z-index:2;border:0;border-radius:999px;background:#fff;color:#2f4636;width:42px;height:42px;font-size:1.5rem;font-weight:800;box-shadow:0 3px 12px rgba(0,0,0,.18);cursor:pointer;margin:0 0 -42px auto}
      @media(max-width:720px){.reflection-pair{grid-template-columns:1fr}.brene-reflection-card{align-items:flex-start}.brene-reflection-thumb{width:82px}}
    `;
    document.head.appendChild(style);
  }

  function init() {
    const aaCard = document.querySelector('#today .reflection-card');
    if (!aaCard || document.getElementById('breneReflectionCard')) return;
    addStyles();

    const pair = document.createElement('div');
    pair.className = 'reflection-pair';
    aaCard.parentNode.insertBefore(pair, aaCard);
    pair.appendChild(aaCard);

    const card = document.createElement('article');
    card.className = 'card brene-reflection-card';
    card.id = 'breneReflectionCard';
    card.innerHTML = `
      <img class="brene-reflection-thumb" src="${IMAGE}" alt="What Makes Up Resilience reflection graphic based on Brené Brown's writing">
      <div class="card-content">
        <p class="eyebrow">REFLECTION FOR THE TRAIL</p>
        <h3>What makes up resilience?</h3>
        <p>A Brené Brown reflection on resilience, connection, meaning, and spirit.</p>
        <button class="button button-secondary" id="openBreneReflection" type="button">Read the reflection →</button>
      </div>`;
    pair.appendChild(card);

    const dialog = document.createElement('dialog');
    dialog.className = 'brene-reflection-dialog';
    dialog.id = 'breneReflectionDialog';
    dialog.innerHTML = `<div class="brene-reflection-dialog-inner"><button class="brene-reflection-close" type="button" aria-label="Close reflection">×</button><img src="${IMAGE}" alt="What Makes Up Resilience reflection graphic based on Brené Brown's writing"></div>`;
    document.body.appendChild(dialog);

    document.getElementById('openBreneReflection')?.addEventListener('click', () => dialog.showModal());
    dialog.querySelector('.brene-reflection-close')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
