(() => {
  const KEY = 'grizzlyjohn:campfireLibrary';
  const LEGACY = 'grizzlyjohn:listenShelf';
  const CATS = ['Mind & Life','Resilience & Growth','Spirituality & Meaning','Relationships & Connection','Recovery','Science & Curiosity','Strange & Mysterious','History & Stories','Audiobooks',"John's Picks"];
  const $ = (s,r=document) => r.querySelector(s);
  const $$ = (s,r=document) => [...r.querySelectorAll(s)];
  const esc = v => String(v ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  function read(key,fallback=[]){try{const v=JSON.parse(localStorage.getItem(key)||'null');return v??fallback}catch{return fallback}}
  function write(v){try{localStorage.setItem(KEY,JSON.stringify(v))}catch{}}
  function items(){const v=read(KEY,[]);return Array.isArray(v)?v:[]}
  function uid(){return crypto.randomUUID?crypto.randomUUID():String(Date.now())}
  function validUrl(v){try{return /^https?:$/.test(new URL(v).protocol)}catch{return false}}
  function source(url=''){try{const h=new URL(url).hostname.replace(/^www\./,'');if(h.includes('spotify'))return['Spotify','🎧'];if(h==='podcasts.apple.com')return['Apple Podcasts','🎙️'];if(h.includes('youtube')||h==='youtu.be')return['YouTube','▶️'];if(h.includes('audible'))return['Audible','📚'];if(h.includes('amazon'))return['Amazon','🎧'];return[h,'🔗']}catch{return['Link','🔗']}}

  function migrate(){
    if(localStorage.getItem(KEY)) return;
    const old=read(LEGACY,[]);
    const migrated=Array.isArray(old)?old.map(x=>({id:x.id||uid(),kind:'stream',title:x.title||'Saved listen',url:x.url||'',category:x.category||"John's Picks",image:x.image||'',source:x.source||source(x.url)[0],addedAt:x.addedAt||new Date().toISOString()})):[];
    write(migrated);
  }

  function ensureStyles(){if($('link[data-listen-upgrades]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href='listen-upgrades.css?v=20260820-4';l.dataset.listenUpgrades='true';document.head.appendChild(l)}

  function categorizeRecommended(){
    const map={'The Mel Robbins Podcast':'Mind & Life','How to Be a Better Human':'Mind & Life','Ologies with Alie Ward':'Science & Curiosity','Stuff You Should Know':'Science & Curiosity','MrBallen Podcast: Strange, Dark & Mysterious Stories':'Strange & Mysterious'};
    $$('.podcast-card').forEach(card=>{const title=$('h2',card)?.textContent.trim();const cat=map[title]||"John's Picks";const copy=$('.podcast-copy',card);if(copy&&!$('.listen-category-chip',copy)){const chip=document.createElement('span');chip.className='listen-category-chip';chip.textContent=cat;copy.prepend(chip)}});
  }

  function markup(){
    const listen=$('#listen'), list=$('#podcastList');
    if(!listen||!list||$('#campfireLibrary'))return false;
    const intro=$('.screen-intro',listen);if(intro)intro.innerHTML='<p class="eyebrow">CAMPFIRE RADIO & REFLECTIONS</p><h1>Stuff worth coming back to.</h1><p>Listen to something, save a link, or keep a full reflection. John gets to build this shelf himself.</p>';
    const section=document.createElement('section');section.id='campfireLibrary';section.className='campfire-library-section';
    section.innerHTML=`
      <article class="card campfire-add-card">
        <p class="eyebrow">ADD TO MY CAMPFIRE</p><h2>What did you find, John?</h2>
        <div class="campfire-kind-picker"><button class="campfire-kind-button is-active" data-kind="stream" type="button"><span>🎧</span>Stream / listen</button><button class="campfire-kind-button" data-kind="reflection" type="button"><span>📖</span>Reflection</button></div>
        <form id="campfireForm" class="stack-form">
          <div id="streamFields" class="campfire-fields"><label>Paste the link<input id="campfireUrl" type="url" inputmode="url" placeholder="Spotify, YouTube, Audible, Apple Podcasts…"></label><label>Name it<input id="campfireStreamTitle" maxlength="180" placeholder="Optional"></label></div>
          <div id="reflectionFields" class="campfire-fields" hidden><label>Title<input id="reflectionTitle" maxlength="180" placeholder="What Makes Up Resilience?"></label><label>Source<input id="reflectionSource" maxlength="220" placeholder="Inspirations · author · book"></label><label>Source URL<input id="reflectionUrl" type="url" inputmode="url" placeholder="https://..."></label><label>Full reflection<textarea id="reflectionBody" rows="12" placeholder="Paste the complete reflection here"></textarea></label></div>
          <label>Category<select id="campfireCategory">${CATS.map(c=>`<option>${esc(c)}</option>`).join('')}</select></label>
          <button class="button button-primary" type="submit">Save to my campfire</button><p class="campfire-local-note">Saved only on this device.</p><p id="campfireStatus" class="listen-preview-status" aria-live="polite"></p>
        </form>
      </article>
      <article class="card campfire-search-card"><label>Search my campfire<input id="campfireSearch" type="search" placeholder="resilience, recovery, podcast…"></label></article>
      <section class="campfire-section-block"><div class="campfire-section-heading"><div><p class="eyebrow">STREAMING SHELF</p><h2>Watch & listen</h2></div><span class="campfire-count-pill" id="streamCount">0</span></div><div id="streamShelf" class="campfire-stream-grid"></div></section>
      <section class="campfire-section-block"><div class="campfire-section-heading"><div><p class="eyebrow">REFLECTIONS</p><h2>Things worth sitting with</h2></div><span class="campfire-count-pill" id="reflectionCount">0</span></div><div id="reflectionShelf" class="campfire-reflection-grid"></div></section>`;
    list.insertAdjacentElement('afterend',section);setup(section);render();return true;
  }

  let kind='stream', query='';
  function setup(section){
    $$('[data-kind]',section).forEach(b=>b.addEventListener('click',()=>{kind=b.dataset.kind;$$('[data-kind]',section).forEach(x=>x.classList.toggle('is-active',x===b));$('#streamFields',section).hidden=kind!=='stream';$('#reflectionFields',section).hidden=kind!=='reflection'}));
    $('#campfireSearch',section).addEventListener('input',e=>{query=e.target.value.trim().toLowerCase();render()});
    $('#campfireForm',section).addEventListener('submit',async e=>{
      e.preventDefault();const status=$('#campfireStatus',section);let entry;
      if(kind==='stream'){
        const url=$('#campfireUrl',section).value.trim();if(!validUrl(url)){status.textContent='Paste a complete link first.';return}const s=source(url);let title=$('#campfireStreamTitle',section).value.trim();let image='';
        if(!title){try{const r=await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);if(r.ok){const d=await r.json();title=d.title||'';image=d.image||''}}catch{}}
        entry={id:uid(),kind:'stream',title:title||`${s[0]} link`,url,category:$('#campfireCategory',section).value,image,source:s[0],addedAt:new Date().toISOString()};
      }else{
        const title=$('#reflectionTitle',section).value.trim(),body=$('#reflectionBody',section).value.trim();if(!title||!body){status.textContent='Add a title and the full reflection first.';return}
        entry={id:uid(),kind:'reflection',title,body,source:$('#reflectionSource',section).value.trim(),sourceUrl:$('#reflectionUrl',section).value.trim(),category:$('#campfireCategory',section).value,addedAt:new Date().toISOString()};
      }
      const all=items();all.unshift(entry);write(all.slice(0,250));e.target.reset();kind='stream';$$('[data-kind]',section).forEach(b=>b.classList.toggle('is-active',b.dataset.kind==='stream'));$('#streamFields',section).hidden=false;$('#reflectionFields',section).hidden=true;status.textContent='Saved ✓';render();
    });
  }

  function filtered(type){return items().filter(x=>x.kind===type).filter(x=>!query||`${x.title||''} ${x.category||''} ${x.source||''} ${x.body||''}`.toLowerCase().includes(query))}
  function render(){
    const streams=filtered('stream'),refs=filtered('reflection');const sc=$('#streamCount'),rc=$('#reflectionCount');if(sc)sc.textContent=streams.length;if(rc)rc.textContent=refs.length;
    const ss=$('#streamShelf');if(ss)ss.innerHTML=streams.length?streams.map(x=>{const s=source(x.url);return `<article class="card campfire-stream-card"><div class="campfire-stream-art">${x.image?`<img src="${esc(x.image)}" alt="" loading="lazy">`:s[1]}</div><div><div class="campfire-card-meta"><span>${esc(x.category||"John's Picks")}</span><span>${esc(x.source||s[0])}</span></div><h3>${esc(x.title)}</h3><div class="campfire-card-actions"><a class="button button-primary" href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">Open →</a><button class="text-button danger-text" data-remove="${esc(x.id)}" type="button">Remove</button></div></div></article>`}).join(''):'<div class="campfire-empty">No saved streams yet.</div>';
    const rs=$('#reflectionShelf');if(rs)rs.innerHTML=refs.length?refs.map(x=>`<article class="card campfire-reflection-card"><div class="campfire-reflection-head"><div class="campfire-card-meta"><span>${esc(x.category||"John's Picks")}</span></div><h3>${esc(x.title)}</h3>${x.source?`<p class="campfire-reflection-source">${esc(x.source)}</p>`:''}</div><details><summary>Read full reflection</summary><div class="campfire-reflection-body">${esc(x.body)}</div></details><div class="campfire-reflection-footer"><div class="campfire-card-actions">${validUrl(x.sourceUrl)?`<a class="text-button" href="${esc(x.sourceUrl)}" target="_blank" rel="noopener noreferrer">Open source ↗</a>`:''}<button class="text-button danger-text" data-remove="${esc(x.id)}" type="button">Remove</button></div></div></article>`).join(''):'<div class="campfire-empty">No saved reflections yet.</div>';
    $$('[data-remove]').forEach(b=>b.addEventListener('click',()=>{write(items().filter(x=>x.id!==b.dataset.remove));render()}));
  }

  function start(){ensureStyles();migrate();categorizeRecommended();if(markup())return;const o=new MutationObserver(()=>{categorizeRecommended();if(markup())o.disconnect()});o.observe(document.body,{childList:true,subtree:true});setTimeout(()=>o.disconnect(),15000)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
