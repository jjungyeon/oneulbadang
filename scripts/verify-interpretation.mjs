import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { sourceLoader } from './test-loader.mjs';
const load = sourceLoader();
const { evaluateCondition, tideRatio, toTideStatus, toStatus } = load('src/lib/condition.ts');
const { tideLabel, waterLabel, skyLabel, windLabel } = load('src/lib/labels.ts');
const { mapTideRecent } = load('src/lib/adapters/tide.ts');
const { mapWeather } = load('src/lib/adapters/weather.ts');
const { PLACES } = load('src/data/places.ts');
const envelope = (item, code='00') => ({response:{header:{resultCode:code},body:{items:{item}}}});
const base = () => ({
 tide:{currentLevel:150,previousLevel:145,lowLevel:100,highLevel:200,trend:'RISING',observedAt:'2026-11-17T00:10:00+09:00',stationName:'제주',forecastDate:'20261117'},
 water:{temperature:22,observedAt:'2026-11-17T00:10:00+09:00',stationName:'제주'},
 weather:{rain:false,sky:'CLEAR',windSpeed:3,windKind:'observed',kind:'forecast',precipitationCode:0},
});
const tests=[];
async function check(name,fn){await fn();tests.push({name,pass:true});}
await check('height-and-direction-can-disagree-without-contradiction',()=>{
 const t=base().tide;
 assert.equal(toTideStatus({...t,currentLevel:110}),'LOW');
 assert.equal(tideLabel({...t,currentLevel:110}),'낮은 편 · 물높이 상승');
 assert.equal(toTideStatus({...t,currentLevel:190,trend:'FALLING'}),'HIGH');
 assert.equal(tideLabel({...t,currentLevel:190,trend:'FALLING'}),'높은 편 · 물높이 하강');
 assert.equal(toTideStatus({...t,currentLevel:120,trend:'FALLING'}),'FALLING');
 assert.equal(toTideStatus({...t,currentLevel:180}),'HIGH');
});
await check('stable-does-not-mean-flow-stopped-or-suitable',()=>{
 const o=base();o.tide.trend='STABLE';o.tide.previousLevel=o.tide.currentLevel;
 assert.equal(tideLabel(o.tide),'중간 높이 · 최근 관측값 같음');
 assert.equal(evaluateCondition(PLACES[0],o,false).message,'최근 두 관측의 물높이가 같아요');
});
await check('unknown-direction-is-explicit-even-with-known-height',()=>{
 const o=base();o.tide.trend='UNKNOWN';
 assert.equal(tideLabel(o.tide),'중간 높이 · 방향 미확인');
 assert.match(evaluateCondition(PLACES[0],o,false).message,/방향은 확인 중/);
 assert.equal(toTideStatus({...o.tide,currentLevel:undefined,trend:'RISING'}),'UNKNOWN');
});
await check('forecast-range-must-match-observation-date-in-KST',()=>{
 const t=base().tide;
 assert.equal(tideRatio({...t,observedAt:'2026-11-16T23:50:00+09:00'}),undefined);
 assert.equal(tideRatio({...t,observedAt:'2026-11-16T15:10:00Z'}),0.5);
 assert.equal(tideRatio({...t,observedAt:''}),undefined);
});
await check('normal-and-high-water-never-assert-bathing-suitability',()=>{
 const o=base();assert.equal(evaluateCondition(PLACES[0],o,false).message,'최근 관측에서 물높이가 올라갔어요');
 o.tide.currentLevel=190;assert.match(evaluateCondition(PLACES[0],o,false).message,/높은 편/);
 o.tide.currentLevel=110;assert.match(evaluateCondition(PLACES[0],o,false).message,/낮은 편/);
});
await check('known-partial-condition-remains-specific',()=>{
 const o=base();o.weather={};o.tide.currentLevel=undefined;o.water.temperature=19;
 const c=evaluateCondition(PLACES[0],o,false);assert.equal(c.status,'COLD');assert.equal(c.message,'관측 수온이 20℃ 미만이에요');
 o.water.temperature=undefined;assert.equal(evaluateCondition(PLACES[0],o,false).status,null);
 const tideOnly=base();tideOnly.weather={};tideOnly.water.temperature=undefined;
 const partial=evaluateCondition(PLACES[0],tideOnly,false);
 assert.equal(partial.status,null);assert.equal(partial.message,'물높이는 상승 중, 일부 정보는 확인 중이에요');
});
await check('invalid-numbers-are-not-normal-or-extreme-conditions',()=>{
 for(const v of [NaN,Infinity,-Infinity]){
  const o=base();o.water.temperature=v;o.weather.windSpeed=v;
  assert.equal(toStatus(o,toTideStatus(o.tide)),null);
  assert.equal(waterLabel(o.water),'정보 없음');assert.equal(windLabel(o.weather),'정보 없음');
 }
 assert.equal(windLabel({windSpeed:-1}),'정보 없음');
});
await check('existing-numeric-thresholds-and-priority-are-preserved',()=>{
 for(const [temp,wind,rain,status] of [[19.9,3,false,'COLD'],[20,3,false,'SWIMMING'],[27.9,3,false,'SWIMMING'],[28,3,false,'HOT'],[19,10,false,'WINDY'],[19,10,true,'RAIN']]){
  const o=base();o.water.temperature=temp;o.weather.windSpeed=wind;o.weather.rain=rain;
  assert.equal(toStatus(o,toTideStatus(o.tide)),status);
 }
});
await check('rain-snow-showers-do-not-require-a-sky-code',()=>{
 for(const [code,label,message] of [[1,'비','비 예보가 있어요'],[2,'비·눈','비 또는 눈 예보가 있어요'],[3,'눈','눈 예보가 있어요'],[4,'소나기','비 예보가 있어요']]){
  const o=base();o.weather={rain:true,precipitationCode:code,kind:'forecast'};
  assert.equal(skyLabel(o.weather),label);assert.equal(evaluateCondition(PLACES[0],o,false).message,message);
 }
 assert.equal(skyLabel({sky:'CLEAR'}),'맑음 · 강수 정보 없음');
 assert.equal(skyLabel({rain:false}),'강수 없음 · 하늘 정보 없음');
});
await check('forecast-wind-is-not-described-as-measured-wind',()=>{
 const o=base();o.weather.windSpeed=12;o.weather.windKind='forecast';
 assert.equal(evaluateCondition(PLACES[0],o,false).message,'강한 바람이 예보됐어요');
 o.weather.windKind='observed';assert.equal(evaluateCondition(PLACES[0],o,false).message,'바람이 꽤 불어요');
});
const row=(time,level=150)=>({obsvtrNm:'제주',obsrvnDt:time,bscTdlvHgt:level,wtem:22,artmp:18,wspd:3});
await check('long-observation-gap-does-not-invent-recent-direction',()=>{
 const r=mapTideRecent(envelope([row('2026-11-17 00:10'),row('2026-11-16 23:40',140)]),new Date('2026-11-17T00:15:00+09:00'),'제주');
 assert.equal(r.currentLevel,150);assert.equal(r.previousLevel,undefined);assert.equal(r.previousObservedAt,undefined);
});
await check('midnight-merges-fresh-previous-day-but-keeps-missing-sensors',()=>{
 const now=new Date('2026-11-17T00:05:00+09:00');
 const prev=envelope([row('2026-11-16 23:50',145),row('2026-11-16 23:40',140)]);
 let r=mapTideRecent(envelope([]),now,'제주',prev);assert.equal(r.currentLevel,145);assert.equal(r.previousLevel,140);
 r=mapTideRecent(envelope([{...row('2026-11-17 00:00'),wtem:null}]),now,'제주',prev);
 assert.equal(r.currentLevel,150);assert.equal(r.previousLevel,145);assert.equal(r.waterTemperature,undefined);
 assert.equal(mapTideRecent(envelope([]),new Date('2026-11-17T01:31:00+09:00'),'제주',prev),null);
});
await check('midnight-fetches-previous-calendar-date-only-within-window',async()=>{
 const requested=[];
 const isolated=sourceLoader(new Map([['src/lib/adapters/client.ts',{callDataGoKr:async(_,p)=>{requested.push(p.reqDate);return null;}}]]));
 const {fetchTideRecentWindow}=isolated('src/lib/adapters/tide.ts');
 await fetchTideRecentWindow('DT_0004',new Date('2027-01-01T00:05:00+09:00'));
 assert.deepEqual(requested,['20270101','20261231']);requested.length=0;
 await fetchTideRecentWindow('DT_0004',new Date('2027-01-01T01:30:00+09:00'));
 assert.deepEqual(requested,['20270101']);
});
await check('exact-hour-selects-current-forecast-not-previous-hour',()=>{
 const rows=['1100','1200'].flatMap(fcstTime=>Object.entries({SKY:fcstTime==='1100'?'1':'4',PTY:'0',TMP:'18',WSD:'3'}).map(([category,fcstValue])=>({category,fcstValue,baseDate:'20261117',baseTime:'1100',fcstDate:'20261117',fcstTime})));
 const r=mapWeather(envelope(rows),new Date('2026-11-17T12:00:00+09:00'));
 assert.equal(r.sky,'OVERCAST');assert.equal(r.forecastAt,'2026-11-17T12:00:00+09:00');
});
const report={kind:'synthetic-interpretation-regression',liveApiTest:false,count:tests.length,tests};
if(process.argv[2]){fs.mkdirSync(path.dirname(process.argv[2]),{recursive:true});fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report,null,2));
