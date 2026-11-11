(() => {
  'use strict';

  const DRAFT_KEY = 'grizzlyjohn:v5:sleep:manualDraft';
  const HISTORY_KEY = 'grizzlyjohn:v3:health:sleepEntries';
  const QUALITY = ['Poor', 'Poor', 'Okay', 'Good', 'Great'];
  const REST = ['Exhausted', 'Still tired', 'Just okay', 'Pretty good', 'Refreshed'];
  const HOURS = /^\d{2}:\d{2}$/;
  const DATE = /^\d{4}-\d{2}-\d{2}$/;
  const makeId = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36);
  const localDate = date => [date.getFullYear(), String(date.getMonth()+1).padStart(2,'0'), String(date.getDate()).padStart(2,'0')].join('-');
  const minutes = (a,b) => Math.round((new Date(b).getTime() - new Date(a).getTime())/60000);
  const hours = mins => Math.round(mins/60*100)/100;
  const escapeHtml = text => String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));

  function parseDateTime(date,time) {
    if (!DATE.test(date) || !HOURS.test(time)) throw new Error('Please enter a valid date and time.');
    const [year, month, day] = date.split('-').map(Number);
    const [h,m] = time.split(':').map(Number);
    if (h > 23 || m > 59) throw new Error('Please check the clock time.');
    const result = new Date(year, month - 1, day, h, m);
    if (localDate(result)!==date || result.getHours()!==h || result.getMinutes()!==m) {
      throw new Error('This clock time is not valid on that date. Check daylight-saving time.');
    }
    return result;
  }

  function createJournal(storage, opts = {}) {
    const idFactory = opts.idFactory || makeId;
    const now = opts.now || (()=>new Date());
    function read(key, expect) {
      const raw = storage.getItem(key);
      if (raw === null) return null;
      let value;
      try { value = JSON.parse(raw); }
      catch { throw new Error('Saved sleep data could not be read. Nothing has been changed.'); }
      if (!expect(value)) throw new Error('Saved sleep records have an unexpected format. Nothing has been changed.');
      return value;
    }
    const draft = () => read(DRAFT_KEY, v=>v && typeof v==='object' && Array.isArray(v.stretches));
    const entries = () => read(HISTORY_KEY, Array.isArray) || [];
    function write(key,value) { storage.setItem(key, JSON.stringify(value)); }
    function addStretch(input) {
      const prior = draft();
      const nightDate = prior?.nightDate || input.nightDate;
      const originalDate = parseDateTime(nightDate, input.startTime);
      if (prior && input.nightDate && nightDate!==input.nightDate) throw new Error('Finish this night before choosing another date.');
      const stretches = prior?.stretches || [];
      const last = stretches[stretches.length-1];
      let start = originalDate;
      if (last) {
        const previousEnd = new Date(last.endedAt).getTime();
        for (let attempts=0; start.getTime()<=previousEnd && attempts<3; attempts++) {
          const nextDay=new Date(start.getFullYear(),start.getMonth(),start.getDate()+1);
          start=parseDateTime(localDate(nextDay),input.startTime);
        }
        if (start.getTime()<=previousEnd || start.getTime()-previousEnd>24*3600000) {
          throw new Error('Sleep stretches must be in order with at most 24 hours awake between them.');
        }
      }
      let end = parseDateTime(localDate(start), input.endTime);
      if (end.getTime()<=start.getTime()) {
        const nextDay=new Date(start.getFullYear(),start.getMonth(),start.getDate()+1);
        end=parseDateTime(localDate(nextDay),input.endTime);
      }
      if (end.getTime()-start.getTime()>18*3600000) throw new Error('A single sleep stretch cannot exceed 18 hours.');
      if (end.getTime()>now().getTime()+10*60000) throw new Error('The wake-up time cannot be in the future.');
      const next = prior || { formatVersion:5, id:idFactory(), nightDate, stretches:[], recordedAt:now().toISOString() };
      const item = { id:idFactory(), startedAt:start.toISOString(), endedAt:end.toISOString(), hours:hours(minutes(start,end)), manuallyEntered:true,
        localStartedAt:localDate(start)+'T'+input.startTime, localEndedAt:localDate(end)+'T'+input.endTime };
      write(DRAFT_KEY, { ...next, stretches:[...stretches,item] });
      return item;
    }
    function undoLastStretch() {
      const record = draft();
      if (!record || !record.stretches.length) throw new Error('Nothing to undo.');
      if (record.stretches.length === 1 && !record.editing) storage.removeItem(DRAFT_KEY);
      else write(DRAFT_KEY, { ...record, stretches:record.stretches.slice(0,-1) });
    }
    function finish(restfulness, note='') {
      const record = draft();
      if (!record?.stretches?.length) throw new Error('Add a sleep stretch before finishing.');
      const score = Number(restfulness);
      if (!Number.isInteger(score) || score<1 || score>5) throw new Error('Please tell GrizzlyJohn how rested you feel.');
      const all = entries();
      const end = record.stretches[record.stretches.length-1].endedAt;
      const date = localDate(new Date(end));
      if (all.some(item=>item.date===date && item.id!==record.id)) {
        throw new Error('A sleep record already exists for '+date+'. That history was preserved. Contact Jen if this night needs correction.');
      }
      const sleepMinutes = record.stretches.reduce((n,s)=>n+minutes(s.startedAt,s.endedAt),0);
      const first = record.stretches[0].startedAt;
      const awakeMinutes = Math.max(0, minutes(first,end)-sleepMinutes);
      const input = {
        id:record.id, date, timestamp:now().toISOString(), formatVersion:5,
        startedAt:first, endedAt:end, stretches:record.stretches, awakeEvents:[],
        hours:hours(sleepMinutes), quality:QUALITY[score-1],
        subjectiveRestfulness:score, subjectiveLabel:REST[score-1],
        subjectiveNote:String(note||'').trim().slice(0,500), awakeMinutes,
        interruptionCount:Math.max(0,record.stretches.length-1), manuallyEntered:true
      };
      const current = all.find(item=>item.id===record.id);
      // The audit trail is flat, so repeated edits cannot exponentially duplicate records.
      const updated = current ? { ...input, revisions:[...(current.revisions||[]),{
        editedAt:now().toISOString(),
        previous:{ ...current, revisions:undefined }
      }] } : input;
      const next = [updated, ...all.filter(item=>item.id!==record.id)];
      write(HISTORY_KEY, next);
      const check = entries().find(item=>item.id===record.id);
      if (!check || check.stretches?.length!==record.stretches.length) throw new Error('Sleep save could not be verified. Draft retained.');
      storage.removeItem(DRAFT_KEY);
      return updated;
    }
    function editNight(id) {
      if (draft()?.stretches?.length) throw new Error('Finish the current draft before editing an earlier night.');
      const previous = entries().find(item=>item.id===id);
      if (!previous || previous.formatVersion!==5) throw new Error('This older record is preserved as read-only.');
      write(DRAFT_KEY,{ formatVersion:5, id:previous.id, nightDate:localDate(new Date(previous.startedAt)), stretches:previous.stretches,
        recordedAt:now().toISOString(), editing:true });
    }
    function latest() { return entries().slice().sort((a,b)=>String(b.endedAt||b.timestamp).localeCompare(String(a.endedAt||a.timestamp)))[0] || null; }
    function overview(days=7) {
      const all=entries();
      const since=now().getTime()-days*86400000;
      const subset=all.filter(e=>Date.parse(e.endedAt||e.timestamp)>=since);
      const v5Rated=subset.filter(e=>Number.isInteger(e.subjectiveRestfulness));
      return {
        nights:subset.length, avgHours:subset.length?Math.round(subset.reduce((s,e)=>s+Number(e.hours||0),0)/subset.length*10)/10:null,
        rated:v5Rated.length, avgFeeling:v5Rated.length?Math.round(v5Rated.reduce((s,e)=>s+e.subjectiveRestfulness,0)/v5Rated.length*10)/10:null,
        fragmented:subset.filter(e=>Number(e.interruptionCount)>0).length
      };
    }
    function moodPattern(days=30) {
      // A same-day association is NOT a causal or medical conclusion.
      let feelings;
      try {feelings=read('grizzlyjohn:v2:feelingCheckIns',Array.isArray)||[];}
      catch {return null;}
      const since=now().getTime()-days*86400000;
      const tired=entries().filter(e=>e.subjectiveRestfulness<=2 && Date.parse(e.endedAt||e.timestamp)>=since);
      if(tired.length<3)return null;
      const records=new Map();
      tired.forEach(e=>records.set(e.date,new Set()));
      feelings.forEach(e=>{
        if(!records.has(e.date)||!Array.isArray(e.feelings))return;
        e.feelings.forEach(f=>{if(f?.word)records.get(e.date).add(String(f.word).trim());});
      });
      const counts=new Map();
      records.forEach(words=>words.forEach(word=>counts.set(word,(counts.get(word)||0)+1)));
      const top=[...counts.entries()].sort((a,b)=>b[1]-a[1])[0];
      return top?.[1]>=3?{feeling:top[0],days:top[1],lowRestDays:tired.length}:null;
    }
    return Object.freeze({draft,entries,addStretch,undoLastStretch,finish,editNight,latest,overview,moodPattern});
  }

  function timeLabel(iso) { return new Date(iso).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'}); }
  function duration(mins) { return Math.floor(mins/60)+'h '+String(mins%60).padStart(2,'0')+'m'; }
  function clockSvg(kind, value) {
    const digits=Array.from({length:12},(_,i)=>{
      const n=i+1, angle=n*Math.PI/6;
      return '<text x="'+(80+56*Math.sin(angle)).toFixed(1)+'" y="'+(85-56*Math.cos(angle)).toFixed(1)+'" text-anchor="middle">'+n+'</text>';
    }).join('');
    return '<svg data-v5-dial="'+kind+'" viewBox="0 0 160 160" role="img" aria-label="Adjust '+kind+' clock; drag the hands or edit the time field">' +
       '<circle cx="80" cy="80" r="74" class="v5-clock-face"/>'+digits+
       '<line data-v5-hand="hour" x1="80" y1="80" x2="80" y2="42" class="v5-hour-hand"/>'+
       '<line data-v5-hand="minute" x1="80" y1="80" x2="80" y2="21" class="v5-minute-hand"/>'+
       '<circle cx="80" cy="80" r="4" class="v5-clock-pin"/></svg>';
  }
  function clockCard(kind,title,value) {
    return '<label class="v5-clock-card"><strong>'+title+'</strong>'+clockSvg(kind,value)+
      '<input type="time" data-v5-time="'+kind+'" value="'+value+'" step="60" aria-label="'+title+' time"/>'+
      '<small>Drag clock hands or set exact time</small></label>';
  }

  function mount(journal, health) {
    let view='entry', rating=0, noteDraft='', message='', isError=false;
    const status=(text,error=false)=>{message=text;isError=error;render();};
    function suggestedTimes(stretches) {
      if (!stretches?.length) return ['21:00','07:00'];
      const last=new Date(stretches[stretches.length-1].endedAt);
      const start=new Date(last.getTime()+3600000), end=new Date(last.getTime()+5*3600000);
      const hm=d=>String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
      return [hm(start),hm(end)];
    }
    function timeline(stretches) {
      if (!stretches.length) return '';
      return '<div class="v5-stretches"><strong>Sleep stretches recorded</strong>'+
        stretches.map((s,i)=>'<div class="v5-stretch"><span>🌙 '+timeLabel(s.startedAt)+' – '+timeLabel(s.endedAt)+'</span><b>'+duration(minutes(s.startedAt,s.endedAt))+'</b></div>').join('')+
        '<button type="button" class="v5-text-button" data-v5-action="undo">↶ Undo last stretch</button></div>';
    }
    function report(entry) {
      if (!entry) return '';
      const historic=entry.formatVersion===5;
      const week=journal.overview(7), month=journal.overview(30), year=journal.overview(365);
      const mood=journal.moodPattern(30);
      const sleepMinutes=Math.round(Number(entry.hours)*60);
      const insight=historic ?
        (entry.subjectiveRestfulness<=2 ? 'You reported feeling tired despite the time logged. That experience matters.' :
        entry.interruptionCount>0 ? 'You logged '+entry.interruptionCount+' interruption(s). Compare how rested you feel across nights.' :
        'You reported feeling '+entry.subjectiveLabel.toLowerCase()+'. Keep tracking to learn what supports your rest.') : 'Earlier sleep records are preserved.';
      return '<div class="v5-report"><h3>🐻 Your Sleep Report</h3>'+
        '<div class="v5-metrics"><div><b>'+duration(sleepMinutes)+'</b><small>Total sleep</small></div>'+
        '<div><b>'+ (historic?duration(entry.awakeMinutes):'—') +'</b><small>Awake between stretches</small></div>'+
        '<div><b>'+ (historic?escapeHtml(entry.subjectiveLabel):escapeHtml(entry.quality||'—'))+'</b><small>Your sleep rating</small></div></div>'+
        '<p>'+escapeHtml(insight)+'</p>'+
        (historic && entry.subjectiveNote?'<p class="v5-user-note">“'+escapeHtml(entry.subjectiveNote)+'”</p>':'')+
        '<div class="v5-trend-grid">'+[
          ['7 DAYS',week],['30 DAYS',month],['365 DAYS',year]
        ].map(item=>'<div class="v5-trend"><strong>'+item[0]+'</strong><b>'+item[1].nights+' nights</b><small>'+
          (item[1].nights?item[1].avgHours+'h avg sleep':'No entries yet')+
          (item[1].rated>=2?' • '+item[1].avgFeeling+'/5 rested':'')+'</small></div>').join('')+'</div>'+
        (mood?'<p class="v5-pattern">On '+mood.days+' days with lower-rated sleep, you also logged “'+escapeHtml(mood.feeling)+'.” This is an association, not proof of a cause.</p>':'')+
        (historic?'<button type="button" class="v5-text-button" data-v5-action="edit" data-v5-edit-id="'+escapeHtml(entry.id)+'">Edit this night</button>':'')+
        '</div>';
    }
    function surface() {
      let current,latest;
      try {current=journal.draft();latest=journal.latest();}
      catch(e){return '<div class="sleep-v5-surface"><h3>Sleep records need attention</h3><p>'+escapeHtml(e.message)+'</p></div>';}
      const today=new Date();
      if (today.getHours()<18)today.setDate(today.getDate()-1);
      const nightDate=current?.nightDate||localDate(today);
      const [start,end]=suggestedTimes(current?.stretches);
      let body='';
      if (view==='rate' && current?.stretches?.length) {
        const sleepMinutes=current.stretches.reduce((sum,s)=>sum+minutes(s.startedAt,s.endedAt),0);
        body='<p class="eyebrow">MORNING CHECK-IN</p><h3>How did you feel about your sleep?</h3>'+
          '<p>You logged '+duration(sleepMinutes)+' asleep across '+current.stretches.length+' stretch(es). But how rested do <em>you</em> feel?</p>'+
          '<div class="v5-rating" role="group" aria-label="How rested you feel">'+REST.map((text,i)=>
            '<button type="button" data-v5-rating="'+(i+1)+'" aria-pressed="'+(rating===i+1)+'">'+
            ['😫','😴','😐','🙂','😃'][i]+' '+text+'</button>').join('')+'</div>'+
          '<label class="v5-notes">Anything you want to remember? (optional)<textarea maxlength="500" rows="3" data-v5-note placeholder="Dreams, medication, interruptions, how you felt…">'+escapeHtml(noteDraft)+'</textarea></label>'+ 
          '<button type="button" class="button button-primary sleep-big-action" data-v5-action="finish">☀️ Finish &amp; See My Sleep Report</button>'+
          '<button type="button" class="v5-text-button" data-v5-action="back">↶ Back to clocks</button>';
      } else {
        const isReport=view==='report' && latest;
        if(isReport) body=report(latest)+'<button type="button" class="button button-secondary sleep-big-action" data-v5-action="new">Log Another Night</button>';
        else {
          body='<p class="eyebrow">SLEEP JOURNAL · V5</p><h3>Let the bear do the remembering.</h3>'+
            '<p>No need to touch your phone at 2 AM. Set the clocks anytime, even tomorrow morning.</p>'+
            '<label class="v5-night-date">Night starting <input type="date" data-v5-date value="'+nightDate+'" '+(current?.stretches?.length?'disabled':'')+'></label>'+
            '<div class="v5-clock-grid">'+clockCard('start','Fell Asleep',start)+clockCard('end','Woke Up',end)+'</div>'+
            '<button type="button" class="button button-primary sleep-big-action" data-v5-action="add">＋ Save This Sleep Stretch</button>'+
            timeline(current?.stretches||[])+
            (current?.stretches?.length?'<button type="button" class="button button-secondary sleep-big-action" data-v5-action="rate">☀️ I’m Up for the Day</button>':'')+
            (!current && latest ? '<details class="v5-last-night"><summary>Last completed night</summary>'+report(latest)+'</details>':'')+
            (!current ? '<details class="v5-last-night"><summary>Browse previous sleep nights</summary><div class="v5-stretches">'+
              journal.entries().slice().sort((a,b)=>String(b.endedAt||b.timestamp).localeCompare(String(a.endedAt||a.timestamp))).slice(0,30).map(entry=>
              '<div class="v5-stretch"><span>'+escapeHtml(entry.date)+' · '+escapeHtml(String(entry.hours||0))+'h'+
              (Number.isInteger(entry.subjectiveRestfulness)?' · '+escapeHtml(entry.subjectiveLabel):'')+'</span>'+
              (entry.formatVersion===5?'<button type="button" class="v5-text-button" data-v5-action="edit" data-v5-edit-id="'+escapeHtml(entry.id)+'">Edit</button>':'<small>Historical</small>')+'</div>').join('')+
              '</div></details>':'');
        }
      }
      return '<div class="sleep-v5-surface">'+body+(message?'<p class="v5-status" data-error="'+isError+'" role="status">'+escapeHtml(message)+'</p>':'')+'</div>';
    }
    function redrawClock(svg) {
      const root=svg.closest('.sleep-v5-surface');
      const input=root?.querySelector('[data-v5-time="'+svg.dataset.v5Dial+'"]');
      if(!input || !/^\d{2}:\d{2}$/.test(input.value))return;
      const [h,m]=input.value.split(':').map(Number);
      const hourAngle=(h%12+m/60)*Math.PI/6,minuteAngle=m*Math.PI/30;
      for(const [name,angle,len] of [['hour',hourAngle,38],['minute',minuteAngle,57]]) {
        const hand=svg.querySelector('[data-v5-hand="'+name+'"]');
        if(hand){hand.setAttribute('x2',String(80+len*Math.sin(angle)));hand.setAttribute('y2',String(80-len*Math.cos(angle)));}
      }
    }
    function render() {
      const healthScreen=document.getElementById('health');
      const snapshot=healthScreen?.querySelector('.health-snapshot-card');
      if(!healthScreen || !snapshot)return;
      let card=document.getElementById('sleepTrackerCard');
      if(!card){snapshot.insertAdjacentHTML('afterend','<article class="card sleep-tracker-card" id="sleepTrackerCard"></article>');card=document.getElementById('sleepTrackerCard');}
      card.innerHTML=surface();
      const form=document.querySelector('[data-health-form="sleep"]');
      if(form){form.innerHTML=surface();}
      document.querySelectorAll('[data-v5-dial]').forEach(redrawClock);
      const choice=document.querySelector('[data-health-log-type="sleep"] small');
      if(choice)choice.textContent='Manual clocks • morning sleep check-in';
    }
    async function action(button) {
      const type=button.dataset.v5Action;
      const root=button.closest('.sleep-v5-surface')||document;
      try {
        if(type==='add'){
          journal.addStretch({nightDate:root.querySelector('[data-v5-date]')?.value,
            startTime:root.querySelector('[data-v5-time="start"]').value,
            endTime:root.querySelector('[data-v5-time="end"]').value});
          view='entry';status('Sleep stretch saved on this device.');
        }else if(type==='undo'){journal.undoLastStretch();status('Last stretch removed from this unfinished draft.');}
        else if(type==='rate'){view='rate';status('Choose how rested you feel. Your experience is part of the data.');}
        else if(type==='back'){view='entry';status('Your clock entries are still saved.');}
        else if(type==='finish'){
          const entry=journal.finish(rating,root.querySelector('[data-v5-note]')?.value||noteDraft||'');
          view='report';
          status('Night saved. Your report is ready.');
          window.GrizzlyJohnHealthUIV3?.render?.();
          render();
          if(window.GrizzlyJohnV5Backup?.enabled())window.GrizzlyJohnV5Backup.upload(true).then(result=>{if(!result.ok)status('Night is saved locally. Cloud backup will retry: '+result.reason,true);});
        }else if(type==='new'){view='entry';rating=0;noteDraft='';message='';render();}
        else if(type==='edit'){
          const id=button.dataset.v5EditId || journal.latest()?.id;
          const previous=journal.entries().find(entry=>entry.id===id);
          if(!previous)throw new Error('That sleep entry was not found.');
          journal.editNight(previous.id);rating=previous.subjectiveRestfulness||0;noteDraft=previous.subjectiveNote||'';
          view='entry';status('Editing your saved V5 night. Original revision will be retained.');
        }
      }catch(e){status(e.message||'Could not save sleep data.',true);}
    }
    document.addEventListener('click',event=>{
      const choice=event.target.closest('[data-v5-rating]');
      if(choice){
        event.preventDefault();
        rating=Number(choice.dataset.v5Rating);
        // Change the selected button without replacing the note text already entered.
        document.querySelectorAll('[data-v5-rating]').forEach(button=>{
          button.setAttribute('aria-pressed',String(Number(button.dataset.v5Rating)===rating));
        });
        return;
      }
      const b=event.target.closest('[data-v5-action]');
      if(b){event.preventDefault();action(b);return;}
      if(event.target.closest('[data-health-log-type="sleep"]')||event.target.closest('[data-nav="health"]'))setTimeout(render,0);
    });
    document.addEventListener('input',event=>{
      if(event.target.matches('[data-v5-note]'))noteDraft=event.target.value;
      if(event.target.matches('[data-v5-time]')) {
        const svg=event.target.closest('.sleep-v5-surface')?.querySelector('[data-v5-dial="'+event.target.dataset.v5Time+'"]');
        if(svg)redrawClock(svg);
      }
    });
    let dragging=null;
    document.addEventListener('pointerdown',event=>{
      const svg=event.target.closest?.('[data-v5-dial]');
      if(!svg)return;
      event.preventDefault();
      const box=svg.getBoundingClientRect(),dx=(event.clientX-box.left)/box.width*160-80,dy=(event.clientY-box.top)/box.height*160-80;
      dragging={svg,pointerId:event.pointerId,hand:Math.hypot(dx,dy)>46?'minute':'hour'};
      try{svg.setPointerCapture(event.pointerId);}catch{}
      moveHand(event);
    });
    function moveHand(event){
      if(!dragging || dragging.pointerId!==event.pointerId)return;
      const {svg,hand}=dragging, rect=svg.getBoundingClientRect();
      const dx=(event.clientX-rect.left)/rect.width*160-80,dy=(event.clientY-rect.top)/rect.height*160-80;
      const angle=(Math.atan2(dx,-dy)+2*Math.PI)%(2*Math.PI);
      const input=svg.closest('.sleep-v5-surface')?.querySelector('[data-v5-time="'+svg.dataset.v5Dial+'"]');
      if(!input)return;
      const [h,m]=input.value.split(':').map(Number);
      if(hand==='minute')input.value=String(h).padStart(2,'0')+':'+String((Math.round(angle/(Math.PI/30)/5)*5)%60).padStart(2,'0');
      else {
        const clockHour=Math.round(angle/(Math.PI/6))%12;
        const adjusted=(h>=12?12:0)+clockHour;
        input.value=String(adjusted).padStart(2,'0')+':'+String(m).padStart(2,'0');
      }
      redrawClock(svg);
    }
    document.addEventListener('pointermove',moveHand);
    document.addEventListener('pointerup',()=>{dragging=null;});
    const form=document.querySelector('[data-health-form="sleep"]');
    if(form && !form.dataset.sleepTrackerBound){
      form.dataset.sleepTrackerBound='true';
      form.addEventListener('submit',event=>{event.preventDefault();event.stopImmediatePropagation();},true);
    }
    render();
    return {render};
  }

  const api={ DRAFT_KEY,HISTORY_KEY,createJournal,parseDateTime,minutes,REST };
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof window!=='undefined')window.GrizzlyJohnSleepV5={
    mount:()=>mount(createJournal(window.localStorage),window.GrizzlyJohnHealthV3),
    createJournal
  };
})();
