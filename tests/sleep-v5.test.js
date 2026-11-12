'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { createJournal, DRAFT_KEY, HISTORY_KEY, parseDateTime } = require('../sleep-v5.js');

class MemoryStorage {
  constructor(initial={}) { this.data=new Map(Object.entries(initial)); }
  getItem(key){ return this.data.has(key)?this.data.get(key):null; }
  setItem(key,value){ this.data.set(key,String(value)); }
  removeItem(key){ this.data.delete(key); }
}
const now = () => new Date('2026-11-12T18:00:00.000Z');
function makeJournal(initial={}) {
  const storage=new MemoryStorage(initial);
  let id=0;
  const journal=createJournal(storage,{now,idFactory:()=> 'test-'+(++id)});
  return {storage,journal};
}

test('retroactive 9 PM–2 AM plus 3 AM–7 AM logs 9h and 60 minutes awake',()=>{
  const {journal}=makeJournal();
  const first=journal.addStretch({nightDate:'2026-11-09',startTime:'21:00',endTime:'02:00',estimated:true,note:'Woke at two'});
  const second=journal.addStretch({nightDate:'2026-11-09',startTime:'03:00',endTime:'07:00'});
  assert.equal(first.hours,5);assert.equal(second.hours,4);
  assert.equal(first.estimated,true);assert.equal(first.note,'Woke at two');
  const result=journal.finish(2,'Felt groggy');
  assert.equal(result.hours,9);
  assert.equal(result.awakeMinutes,60);
  assert.equal(result.interruptionCount,1);
  assert.equal(result.subjectiveRestfulness,2);
  assert.equal(result.subjectiveNote,'Felt groggy');
  assert.equal(result.formatVersion,5);
  assert.equal(journal.draft(),null);
});

test('an unfinished previous-version timer remains exactly as stored',()=>{
  const legacyActive='{"id":"old-timer","status":"sleeping","startedAt":"2026-11-09T03:00:00Z"}';
  const storage=new MemoryStorage({'grizzlyjohn:v3:health:activeSleep':legacyActive});
  const journal=createJournal(storage,{now,idFactory:()=> 'v5-new'});
  journal.addStretch({nightDate:'2026-11-09',startTime:'21:00',endTime:'07:00'});
  journal.finish(3,'Okay sleep');
  assert.equal(storage.getItem('grizzlyjohn:v3:health:activeSleep'),legacyActive);
});

test('older sleep history and unrelated app keys remain unchanged',()=>{
  const legacy={id:'old',date:'2026-11-08',timestamp:'2026-11-08T12:00:00.000Z',hours:6,quality:'Okay'};
  const init={ [HISTORY_KEY]:JSON.stringify([legacy]),'grizzlyjohn:questCount':'19'};
  const {storage,journal}=makeJournal(init);
  journal.addStretch({nightDate:'2026-11-09',startTime:'22:00',endTime:'07:00'});
  journal.finish(4);
  assert.deepEqual(journal.entries().find(x=>x.id==='old'),legacy);
  assert.equal(storage.getItem('grizzlyjohn:questCount'),'19');
  assert.equal(journal.entries().length,2);
});

test('does not overwrite a previously recorded night, and retains the pending draft',()=>{
  const legacy={id:'existing',date:'2026-11-10',timestamp:'2026-11-10T13:00:00.000Z',hours:7,quality:'Good'};
  const {storage,journal}=makeJournal({[HISTORY_KEY]:JSON.stringify([legacy])});
  journal.addStretch({nightDate:'2026-11-09',startTime:'21:00',endTime:'07:00'});
  assert.throws(()=>journal.finish(4),/already exists/);
  assert.deepEqual(journal.entries(),[legacy]);
  assert.ok(storage.getItem(DRAFT_KEY));
});

test('requires John subjective restfulness before finalizing',()=>{
  const {journal}=makeJournal();
  journal.addStretch({nightDate:'2026-11-09',startTime:'21:00',endTime:'07:00'});
  assert.throws(()=>journal.finish(),/rested/);
  assert.equal(journal.entries().length,0);
  assert.ok(journal.draft());
});

test('editing V5 history keeps an audit copy of the original entry',()=>{
  const {journal}=makeJournal();
  journal.addStretch({nightDate:'2026-11-09',startTime:'21:00',endTime:'07:00'});
  const original=journal.finish(5,'First note');
  journal.editNight(original.id);
  journal.undoLastStretch();
  journal.addStretch({nightDate:'2026-11-09',startTime:'22:00',endTime:'07:00'});
  const revision=journal.finish(3,'Corrected');
  assert.equal(journal.entries().length,1);
  assert.equal(revision.hours,9);
  assert.equal(revision.revisions.length,1);
  assert.equal(revision.revisions[0].previous.hours,10);
  assert.equal(revision.revisions[0].previous.subjectiveNote,'First note');
});

test('an accidental first stretch can be undone without deleting historical data',()=>{
  const {journal}=makeJournal();
  journal.addStretch({nightDate:'2026-11-09',startTime:'21:00',endTime:'07:00'});
  journal.undoLastStretch();
  assert.equal(journal.draft(),null);
  assert.equal(journal.entries().length,0);
});

test('rejects future wake times and impossible durations without changing history',()=>{
  const {journal}=makeJournal();
  assert.throws(()=>journal.addStretch({nightDate:'2026-11-15',startTime:'21:00',endTime:'07:00'}),/future/);
  assert.throws(()=>journal.addStretch({nightDate:'2026-11-09',startTime:'21:00',endTime:'21:00'}),/18 hours/);
  assert.equal(journal.draft(),null);
});

test('rejects invalid calendar times rather than normalizing them silently',()=>{
  assert.throws(()=>parseDateTime('2026-02-30','21:00'),/not valid|valid date/);
  assert.throws(()=>parseDateTime('2026-11-09','25:00'),/check/);
});
