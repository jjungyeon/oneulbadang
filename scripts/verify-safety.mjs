import assert from "node:assert/strict";
import { sourceLoader } from "./test-loader.mjs";
const load = sourceLoader(new Map([["src/lib/adapters/client.ts", { callDataGoKr:async()=>null }]]));
const {mapBeach,mapRip,mapWarning,getRip}=load("src/lib/adapters/safety.ts");
const {waterplayAdvice}=load("src/lib/waterplayAdvice.ts");
const {PLACES}=load("src/data/places.ts");
const {emptyObservation,retainRecentReading}=load("src/lib/readings.ts");
const {evaluateCondition}=load("src/lib/condition.ts");
const now=new Date("2026-07-17T05:00:00Z");
const place=PLACES.find(p=>p.id==="jungmun");
const raw=(rows,extra={})=>({ok:true,status:200,receivedAt:now.toISOString(),json:{response:{header:{resultCode:"00"},body:{totalCount:rows.length,items:{item:rows}}}},...extra});
const beach={bbchNm:"중문색달해수욕장",predcYmd:"2026-07-17",predcNoonSeCd:"오후",totalIndex:"좋음",lat:place.lat,lot:place.lng,maxWvhgt:0.4};
const rip={obsvtrId:"JUNGMUN",obsrvnDt:"2026-07-17 14:00:00",lastScrCn:"위험"};
const tests=[];
const test=async(name,fn)=>{await fn();tests.push({name,pass:true});};
await test("정확한 장소·날짜·오후 예보만 수용",()=>assert.equal(mapBeach(raw([beach]),place,now).label,"좋음"));
await test("포구에 인근 해수욕지수 전용 금지",()=>assert.equal(mapBeach(raw([beach]),PLACES.find(p=>p.id==="panpo-port"),now).state,"unsupported"));
await test("다른 장소·좌표·미래·오전 자료 제외",()=>{
 for(const change of [{bbchNm:"협재해수욕장"},{lat:35},{predcYmd:"2026-07-18"},{predcNoonSeCd:"오전"}]) assert.notEqual(mapBeach(raw([{...beach,...change}]),place,now).state,"available");
});
await test("지연·낡은 응답은 정상지수로 사용하지 않음",()=>{
 for(const extra of [{refreshDelayed:true},{receivedAt:"2026-07-17T04:00:00Z"}]) assert.equal(mapBeach(raw([beach],extra),place,now).state,"stale");
});
await test("부분 페이지·중복 예보·알 수 없는 등급 제외",()=>{
 const p=raw([beach]);p.json.response.body.totalCount=301;
 assert.equal(mapBeach(p,place,now).state,"unavailable");
 assert.equal(mapBeach(raw([beach,beach]),place,now).state,"no-data");
 assert.equal(mapBeach(raw([{...beach,totalIndex:"새등급"}]),place,now).state,"no-data");
});
await test("403은 승인 필요 상태",()=>assert.equal(mapBeach(raw([],{status:403,ok:false}),place,now).state,"access-denied"));
await test("이안류는 중문 최신 관측만 수용",()=>{
 assert.equal(mapRip(raw([rip]),now).label,"위험");
 for(const change of [{obsvtrId:"HAE"},{obsrvnDt:"2026-07-17 13:00:00"},{obsrvnDt:"2026-07-17 15:00:00"}]) assert.notEqual(mapRip(raw([{...rip,...change}]),now).state,"available");
});
await test("11월 중문은 비수기, 다른 장소는 미지원",async()=>{
 assert.equal((await getRip(place,new Date("2026-11-17T05:00:00Z"))).state,"off-season");
 assert.equal((await getRip(PLACES[0],now)).state,"unsupported");
});
const wrn={tmFc:"202607171300",tmEf:"202607171400",t6:"o 풍랑주의보 : 제주도남부앞바다\no 강풍주의보 : 울릉도.독도"};
await test("제주 특보만 표시하고 타지역 제외",()=>{
 const w=mapWarning(raw([wrn]),now);assert.equal(w.state,"available");assert(!w.label.includes("울릉도"));
});
await test("해제·예비·과거·미래 특보를 현재 발효로 쓰지 않음",()=>{
 for(const change of [{t6:"o 풍랑주의보 해제 : 제주도"},{t6:"o 예비 풍랑주의보 : 제주도"},{tmFc:"202607011300"},{tmFc:"202607171500"},{tmEf:"202607171500"}]) assert.notEqual(mapWarning(raw([{...wrn,...change}]),now).state,"available");
});
await test("최신 특보 해제 뒤 과거 경보 되살리지 않음",()=>{
 const old={...wrn,tmFc:"202607171200",tmEf:"202607171200"};
 assert.notEqual(mapWarning(raw([old,{...wrn,t6:"o 없음"}]),now).state,"available");
});
const observation=emptyObservation();observation.water.temperature=24;observation.weather={windSpeed:2,rain:false,sky:"CLEAR"};
await test("해수욕지수 좋음만으로 초록·안전 판정 금지",()=>{
 observation.safety={beach:mapBeach(raw([beach]),place,now),rip:{state:"available",label:"관심"},warning:{state:"no-data"},control:"unknown"};
 assert.equal(waterplayAdvice(observation).level,"unknown");
});
await test("이안류 위험과 해수욕지수 나쁨은 회피, 입수금지와 구분",()=>{
 for(const kind of ["rip","beach"]){const o=structuredClone(observation);o.safety[kind]={state:"available",label:kind==="rip"?"위험":"나쁨"}; const a=waterplayAdvice(o);assert.equal(a.title,"물놀이 피하세요");assert(!a.title.includes("금지"));}
});
await test("차가운 관측 수온은 주의 + 통제 미확인",()=>{
 const o=structuredClone(observation);o.water.temperature=16.9;const a=waterplayAdvice(o);assert.equal(a.level,"caution");assert(a.reason.includes("16.9"));assert(a.limitation.includes("미확인"));
});
await test("통신 실패 시 이전 공식 위험정보는 현재값으로 재사용하지 않음",()=>{
 const prior={condition:evaluateCondition(place,observation,false),observation,fetchedAt:now.toISOString(),dataStatus:"live"};
 const retained=retainRecentReading(prior,new Date(now.getTime()+60000));assert.equal(retained.observation.safety,undefined);assert.notEqual(retained.condition.advice.level,"good");
});
await test("누락·오류 응답은 0이나 정상으로 해석하지 않음",()=>{
 for(const r of [null,raw([], {ok:false,status:500}),raw([]),raw([beach],{json:{response:{header:{resultCode:"30"}}}})]) assert.notEqual(mapBeach(r,place,now).state,"available");
});
await test("오전/오후와 한국 날짜 경계 검증",()=>{
 const before=new Date("2026-07-17T02:59:59Z"); const after=new Date("2026-07-17T15:00:00Z");
 assert.equal(mapBeach(raw([{...beach,predcNoonSeCd:"오전"}],{receivedAt:before.toISOString()}),place,before).state,"available");
 assert.notEqual(mapBeach(raw([beach],{receivedAt:after.toISOString()}),place,after).state,"available");
});
await test("기상특보 부분 페이지와 지연은 판정에서 제외",()=>{
 const r=raw([wrn]);r.json.response.body.totalCount=200;
 assert.notEqual(mapWarning(r,now).state,"available");
 assert.notEqual(mapWarning(raw([wrn],{refreshDelayed:true}),now).state,"available");
});
await test("이안류 페이지 순서와 무관하게 최신 행 수집",async()=>{
 const pages=[Array.from({length:300},()=>({...rip,obsrvnDt:"2026-07-17 10:00:00",lastScrCn:"관심"})),[rip]];
 const paged=sourceLoader(new Map([["src/lib/adapters/client.ts",{callDataGoKr:async(_endpoint,params)=>{
   const value=raw(pages[Number(params.pageNo)-1]);value.json.response.body.totalCount=301;return value;
 }}]]));
 assert.equal((await paged("src/lib/adapters/safety.ts").getRip(place,now)).label,"위험");
});
await test("같은 관측 시각에 상충하는 이안류 등급은 확정하지 않음",()=>{
 assert.notEqual(mapRip(raw([rip,{...rip,lastScrCn:"관심"}]),now).state,"available");
});
await test("실제 기상청 숫자형 발표시각을 정상 해석",()=>{
 assert.equal(mapWarning(raw([{...wrn,tmFc:202607171300,tmEf:202607171400}]),now).state,"available");
});
await test("지수 null과 유효 파고 예보를 구분",()=>{
 const x=mapBeach(raw([{...beach,totalIndex:null}]),place,now);assert.equal(x.state,"no-data");assert.equal(x.waveHeight,0.4);assert.equal(x.label,undefined);
});
await test("먼바다 특보를 모든 해변의 위험·통제로 확대하지 않음",()=>{
 const o=structuredClone(observation);o.safety.warning=mapWarning(raw([{...wrn,t6:"o 풍랑주의보 : 제주도남쪽바깥먼바다"}]),now);
 assert.equal(o.safety.warning.state,"available");assert.equal(waterplayAdvice(o).level,"unknown");
});
await test("위험정보 서버 무응답은 10초 안팎에 종료",async()=>{
 const stalled=sourceLoader(new Map([["src/lib/adapters/client.ts", {callDataGoKr:()=>new Promise(()=>{})}]]));
 const start=Date.now(); const result=await stalled("src/lib/adapters/safety.ts").getSafety(place,now);
 assert(Date.now()-start<12000);assert.equal(result.beach.state,"unavailable");assert.equal(result.rip.state,"unavailable");assert.equal(result.warning.state,"unavailable");
});
console.log(JSON.stringify({kind:"synthetic-schema-based-regression",liveApiTest:false,passed:tests.length,tests},null,2));
