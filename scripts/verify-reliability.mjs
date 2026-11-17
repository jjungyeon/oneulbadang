import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { sourceLoader } from './test-loader.mjs';
const load=sourceLoader();
const {createResponseCache}=load('src/lib/adapters/responseCache.ts');
const {requestJson}=load('src/lib/adapters/client.ts');
const {retainRecentReading}=load('src/lib/readings.ts');
const {PLACES}=load('src/data/places.ts');
const good=(item=[{wtem:22}],code='00')=>({ok:true,status:200,json:{response:{header:{resultCode:code},body:{items:{item}}}}});
const tests=[];
const check=async(name,fn)=>{await fn();tests.push({name,pass:true});};
await check('concurrent-identical-requests-share-one-inflight-call',async()=>{
 const cache=createResponseCache(()=>0,async()=>{});let calls=0,release;
 const request=()=>{calls++;return new Promise(r=>{release=r;});};
 const a=cache('one',request),b=cache('one',request);release(good());
 const [x,y]=await Promise.all([a,b]);assert.equal(calls,1);assert.equal(x,y);
});
await check('transient-server-error-retries-once-and-recovers',async()=>{
 let calls=0;const cache=createResponseCache(()=>0,async()=>{});
 const r=await cache('one',async()=>++calls===1?{ok:false,status:503,json:null}:good());
 assert.equal(calls,2);assert.equal(r.ok,true);assert.equal(r.refreshDelayed,false);
});
await check('repeated-timeouts-have-two-attempt-limit',async()=>{
 let calls=0;const cache=createResponseCache(()=>0,async()=>{});
 assert.equal(await cache('one',async()=>{calls++;return null;}),null);assert.equal(calls,2);
});
await check('recent-response-retained-with-original-receipt-time-and-delay-flag',async()=>{
 let clock=0;const cache=createResponseCache(()=>clock,async()=>{});
 const first=await cache('one',async()=>good(),60000);clock=61000;
 const second=await cache('one',async()=>null,60000);
 assert.equal(second.refreshDelayed,true);assert.equal(second.receivedAt,first.receivedAt);assert.deepEqual(second.json,first.json);
 clock=600000;assert.equal(await cache('one',async()=>null,60000),null);
});
await check('access-denial-does-not-retry-or-reuse-old-success',async()=>{
 let clock=0,calls=0;const cache=createResponseCache(()=>clock,async()=>{});
 await cache('one',async()=>good(),1);clock=2;
 const r=await cache('one',async()=>{calls++;return {ok:false,status:403,json:null};});
 assert.equal(calls,1);assert.equal(r.status,403);assert.equal(r.refreshDelayed,undefined);
 clock=20000;assert.equal(await cache('one',async()=>null),null);
});
await check('provider-error-code-is-not-a-success-or-a-retry',async()=>{
 let calls=0;const cache=createResponseCache(()=>0,async()=>{});
 const r=await cache('one',async()=>{calls++;return good([], '30');});
 assert.equal(calls,1);assert.equal(r.refreshDelayed,undefined);
});
await check('empty-success-rechecks-in-15-seconds-not-five-minutes',async()=>{
 let clock=0,calls=0;const cache=createResponseCache(()=>clock,async()=>{});
 const request=async()=>{calls++;return good([]);};
 await cache('one',request);clock=14000;await cache('one',request);assert.equal(calls,1);
 clock=16000;await cache('one',request);assert.equal(calls,2);
});
await check('new-partial-success-does-not-fill-missing-sensors-from-cache',async()=>{
 let clock=0;const cache=createResponseCache(()=>clock,async()=>{});
 await cache('one',async()=>good(),1);clock=2;
 const r=await cache('one',async()=>good([{wtem:null}]));assert.equal(r.json.response.body.items.item[0].wtem,null);assert.equal(r.refreshDelayed,false);
});
await check('cache-capacity-stays-bounded',async()=>{
 const cache=createResponseCache(()=>0,async()=>{});let calls=0;
 const request=async()=>{calls++;return good();};
 for(let i=0;i<129;i++)await cache(String(i),request);
 await cache('0',request);assert.equal(calls,130);
});
function fakeGet(mode){
 let destroyed=false;
 const get=(_url,callback)=>{
  const req=new EventEmitter();req.destroy=()=>{destroyed=true;return req;};
  if(mode!=='hang')queueMicrotask(()=>{
   const res=new EventEmitter();res.statusCode=mode==='503'?503:200;res.setEncoding=()=>{};res.destroy=()=>{};
   callback(res);
   if(mode==='aborted')res.emit('aborted');
   else{res.emit('data',mode==='503'?'upstream unavailable':JSON.stringify(good().json));res.emit('end');}
  });
  return req;
 };
 return {get,destroyed:()=>destroyed};
}
await check('absolute-deadline-finishes-a-never-connected-request',async()=>{
 const f=fakeGet('hang');assert.equal(await requestJson(new URL('https://example.invalid'),f.get,15),null);assert.equal(f.destroyed(),true);
});
await check('non-json-503-preserves-status-for-retry',async()=>{
 const f=fakeGet('503');const r=await requestJson(new URL('https://example.invalid'),f.get,100);
 assert.equal(r.status,503);assert.equal(r.ok,false);assert.equal(r.json,null);
});
await check('aborted-body-finishes-without-waiting-for-deadline',async()=>{
 assert.equal(await requestJson(new URL('https://example.invalid'),fakeGet('aborted').get,100),null);
});
const now=new Date('2026-11-17T12:00:00+09:00');
const snapshot=()=>({condition:{place:PLACES[0],status:'SWIMMING',message:'test',tideStatus:'RISING',isMock:false},dataStatus:'live',fetchedAt:'2026-11-17T11:59:00+09:00',observation:{
 tide:{currentLevel:150,previousLevel:145,lowLevel:100,highLevel:200,trend:'RISING',stationName:'test',observedAt:'2026-11-17T11:50:00+09:00',forecastDate:'20261117',nextHighTime:'2026-11-17T11:59:00+09:00',nextHighLevel:200},
 water:{temperature:22,observedAt:'2026-11-17T11:50:00+09:00',stationName:'test'},
 weather:{rain:false,sky:'CLEAR',windSpeed:3,airTemperature:20,windKind:'observed',airKind:'observed',observedAt:'2026-11-17T11:50:00+09:00',forecastAt:'2026-11-17T12:00:00+09:00',issuedAt:'2026-11-17T11:00:00+09:00',kind:'forecast'},
}});
await check('client-fallback-preserves-times-and-removes-passed-tide-event',()=>{
 const old=snapshot(),r=retainRecentReading(old,now);
 assert.equal(r.refreshDelayed,true);assert.equal(r.fetchedAt,old.fetchedAt);assert.equal(r.observation.tide.observedAt,old.observation.tide.observedAt);
 assert.equal(r.observation.tide.nextHighTime,undefined);assert.equal(old.observation.tide.nextHighTime,'2026-11-17T11:59:00+09:00');assert.equal(r.dataStatus,'live');
});
await check('client-fallback-expires-in-ten-minutes',()=>{
 const r=retainRecentReading(snapshot(),new Date('2026-11-17T12:09:00+09:00'));
 assert.equal(r.dataStatus,'unavailable');assert.equal(r.observation.water.temperature,undefined);
});
await check('recent-receipt-cannot-resurrect-expired-observations',()=>{
 const old=snapshot();old.observation.tide.observedAt='2026-11-17T09:00:00+09:00';old.observation.water.observedAt='2026-11-17T09:00:00+09:00';old.observation.weather.observedAt='2026-11-17T09:00:00+09:00';
 const r=retainRecentReading(old,now);assert.equal(r.observation.tide.currentLevel,undefined);assert.equal(r.observation.water.temperature,undefined);assert.equal(r.observation.weather.windSpeed,undefined);assert.equal(r.observation.weather.sky,'CLEAR');assert.equal(r.dataStatus,'partial');
});
await check('forecast-expiry-and-calendar-boundary-are-revalidated',()=>{
 const old=snapshot();old.observation.weather.forecastAt='2026-11-17T11:00:00+09:00';old.observation.tide.forecastDate='20261116';
 const r=retainRecentReading(old,now);assert.equal(r.observation.weather.sky,undefined);assert.equal(r.observation.weather.windSpeed,3);assert.equal(r.observation.tide.lowLevel,undefined);assert.equal(r.condition.status,null);
});
await check('client-http-failure-uses-recent-memory-without-changing-fetched-time',async()=>{
 const originalFetch=globalThis.fetch,originalNow=Date.now;let clock=originalNow(),fail=false,calls=0;
 const rows=PLACES.map(place=>({...snapshot(),condition:{...snapshot().condition,place},fetchedAt:new Date(clock).toISOString()}));
 try{
  globalThis.fetch=async()=>{calls++;return {ok:!fail,json:async()=>({readings:rows})};};Date.now=()=>clock;
  const client=sourceLoader()('src/lib/conditions.ts');const a=await client.getAllPlaceConditions();fail=true;clock+=61000;
  const b=await client.getAllPlaceConditions();assert.equal(calls,2);assert.equal(b[0].refreshDelayed,true);assert.equal(b[0].fetchedAt,a[0].fetchedAt);
 }finally{globalThis.fetch=originalFetch;Date.now=originalNow;}
});
const report={kind:'simulated-network-and-cache-regression',liveApiTest:false,count:tests.length,tests};
if(process.argv[2]){fs.mkdirSync(path.dirname(process.argv[2]),{recursive:true});fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report,null,2));
