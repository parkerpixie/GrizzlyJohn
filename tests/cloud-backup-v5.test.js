'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const webcrypto = require('node:crypto').webcrypto;

function harness(initial = {}, fetch = async () => { throw new Error('Unexpected network request'); }) {
  const values = new Map(Object.entries(initial));
  const localStorage = {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key,value) => values.set(key,String(value)),
    removeItem: key => values.delete(key)
  };
  const backup = {
    app: 'GrizzlyJohn',
    backupVersion: 1,
    format: 'grizzlyjohn-portable-backup-v1',
    createdAt: '2026-11-11T17:00:00.000Z',
    data: {
      'grizzlyjohn:v3:health:sleepEntries': '[{"id":"old-sleep","hours":6}]',
      'grizzlyjohn:questCount': '19',
      'grizzlyjohn:v5:cloud:recoverySecret': 'private-recovery-code',
      'grizzlyjohn:v5:cloud:enabled': 'yes'
    }
  };
  const window = { crypto: webcrypto, GrizzlyJohnStorageV2: {
    createBackup:()=>({ ok:true, backup: structuredClone(backup) }),
    validateBackup: remote => remote?.app === 'GrizzlyJohn' && remote?.data && typeof remote.data==='object'
      ? {ok:true} : {ok:false,errors:['Invalid backup']},
    importData(payload, opts={}) {
      const imported=[],skipped=[];
      for(const entry of payload.entries){
        if(values.has(entry.key) && opts.conflict !== 'overwrite') {skipped.push({key:entry.key});continue;}
        imported.push(entry.key);
        if(!opts.dryRun)values.set(entry.key,entry.raw);
      }
      return {ok:true,imported,skipped};
    }
  } };
  const doc = { readyState:'loading', addEventListener(){}, getElementById(){return null;} };
  const source=fs.readFileSync(path.join(__dirname,'..','cloud-backup-v5.js'),'utf8');
  const context={window,document:doc,localStorage,crypto:webcrypto,TextEncoder,TextDecoder,btoa,atob,fetch,
    navigator:{clipboard:{writeText:async()=>{}}},setInterval:()=>0,setTimeout:()=>0,confirm:()=>true,console};
  vm.runInNewContext(source,context,{timeout:1000});
  return { api:window.GrizzlyJohnV5Backup, values, backup };
}

test('backup preserves historical entries while excluding encryption secrets and sync metadata',()=>{
  const {api}=harness();
  const clone=api.getBackup();
  assert.equal(clone.data['grizzlyjohn:questCount'],'19');
  assert.equal(clone.data['grizzlyjohn:v3:health:sleepEntries'],'[{"id":"old-sleep","hours":6}]');
  assert.equal(clone.data['grizzlyjohn:v5:cloud:recoverySecret'],undefined);
  assert.equal(clone.data['grizzlyjohn:v5:cloud:enabled'],undefined);
});

test('no user opt-in means no uploads',async()=>{
  let calls=0;
  const {api}=harness({},async()=>{calls++;});
  const result=await api.upload(true);
  assert.equal(result.ok,false);
  assert.equal(calls,0);
});

test('consented uploads are encrypted, verified and do not leak plaintext or secret',async()=>{
  const secret=Buffer.alloc(32,7).toString('base64url');
  let request=null;
  const fetch=async(url,options)=> {
    request={url,options};
    return {ok:true,json:async()=>({ok:true,verified:true})};
  };
  const {api,values}=harness({
    'grizzlyjohn:v5:cloud:recoverySecret':secret,
    'grizzlyjohn:v5:cloud:enabled':'yes'
  },fetch);
  const result=await api.upload(true);
  assert.equal(result.ok,true);
  assert.equal(request.url,'/.netlify/functions/grizzly-backup');
  assert.match(request.options.headers.Authorization,/^Bearer [A-Za-z0-9_-]{43}$/);
  assert.doesNotMatch(request.options.body,/old-sleep|questCount|private-recovery-code|19/);
  const envelope=JSON.parse(request.options.body);
  assert.equal(envelope.version,1);
  assert.equal(envelope.iv.length,16);
  assert.match(envelope.ciphertext,/^[A-Za-z0-9_-]+$/);
  assert.ok(values.get('grizzlyjohn:v5:cloud:lastVerifiedAt'));
});

test('a failed remote verification never marks data as backed up',async()=>{
  const secret=Buffer.alloc(32,9).toString('base64url');
  const {api,values}=harness({
    'grizzlyjohn:v5:cloud:recoverySecret':secret,
    'grizzlyjohn:v5:cloud:enabled':'yes'
  },async()=>({ok:false,json:async()=>({error:'Unavailable'})}));
  const result=await api.upload(true);
  assert.equal(result.ok,false);
  assert.equal(values.has('grizzlyjohn:v5:cloud:lastVerifiedAt'),false);
});


test('recovery fills empty bootstrapped data while leaving meaningful local records untouched',async()=>{
  const secret=Buffer.alloc(32,12).toString('base64url');
  let snapshot;
  const fetch=async(url,options={})=>{
    if(options.method==='POST'){
      snapshot=JSON.parse(options.body);
      return {ok:true,json:async()=>({ok:true,verified:true})};
    }
    return {ok:true,json:async()=>({ok:true,envelope:snapshot})};
  };
  const source=harness({
    'grizzlyjohn:v5:cloud:recoverySecret':secret,
    'grizzlyjohn:v5:cloud:enabled':'yes'
  },fetch);
  assert.equal((await source.api.upload(true)).ok,true);

  const target=harness({
    'grizzlyjohn:v3:health:sleepEntries':'[]', // app's empty starter state
    'grizzlyjohn:questCount':'55' // meaningful newer record must remain
  },fetch);
  const result=await target.api.restore(secret);
  assert.equal(result.ok,true);
  assert.equal(target.values.get('grizzlyjohn:v3:health:sleepEntries'),
    '[{"id":"old-sleep","hours":6}]');
  assert.equal(target.values.get('grizzlyjohn:questCount'),'55');
  assert.equal(target.values.has('grizzlyjohn:v5:cloud:recoverySecret'),false);
});
