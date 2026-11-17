import type { Place } from "@/types/place";
import type { SafetyData, SafetySource } from "@/types/condition";
import { BEACH_INDEX_ENDPOINT, RIP_CURRENT_ENDPOINT, WEATHER_WARNING_ENDPOINT } from "./config";
import { callDataGoKr, type RawResponse } from "./client";
import { finiteValue, freshObservation, itemsFrom, koreanDate, koreanTimestamp, record } from "./parse";

// Official KHOA guides saved in docs/sources/api. Never substitute a nearby beach.
export const BEACH_TARGETS: Record<string, { code: string; name: string }> = {
  hamdeok: { code: "HS20", name: "함덕서우봉해수욕장" },
  hyeopjae: { code: "HS21", name: "협재해수욕장" },
  jungmun: { code: "HS22", name: "중문색달해수욕장" },
  "iho-tewoo": { code: "HS25", name: "이호테우해수욕장" },
};
const missing = (state: SafetySource["state"]): SafetySource => ({ state });
function failure(raw: RawResponse | null, now: Date): SafetySource | undefined {
  if (!raw) return missing("unavailable");
  if ([401, 403].includes(raw.status)) return missing("access-denied");
  if (!raw.ok) return missing("unavailable");
  const root = record(raw.json); const response = record(root?.response) ?? root;
  const code = String(record(response?.header)?.resultCode);
  if (["20", "30", "31", "32"].includes(code)) return missing("access-denied");
  if (["03", "3"].includes(code)) return missing("no-data");
  if (!["00", "0"].includes(code)) return missing("unavailable");
  if (!itemsFrom(raw.json).length) return missing("no-data");
  if (raw.refreshDelayed || !freshObservation(raw.receivedAt, now, 10)) return missing("stale");
}
const totalCount = (raw: RawResponse | null) => {
  const root = record(raw?.json); const response = record(root?.response) ?? root;
  return finiteValue(record(response?.body)?.totalCount, 0);
};

export function mapBeach(raw: RawResponse | null, place: Place, now: Date): SafetySource {
  const target = BEACH_TARGETS[place.id];
  if (!target) return missing("unsupported");
  const error = failure(raw, now); if (error) return error;
  // One code + one request date; reject partial pages and ambiguous duplicate rows.
  const rows = itemsFrom(raw?.json);
  if (totalCount(raw) === undefined || totalCount(raw)! > rows.length) return missing("unavailable");
  const date = koreanDate(now);
  const noon = new Date(now.getTime() + 9 * 3600000).getUTCHours() < 12 ? "오전" : "오후";
  const matches = rows.filter(r => r.bbchNm === target.name && String(r.predcYmd).replaceAll("-", "") === date && r.predcNoonSeCd === noon
    && Math.abs((finiteValue(r.lat) ?? 0) - place.lat) < 0.04 && Math.abs((finiteValue(r.lot) ?? 0) - place.lng) < 0.04);
  if (matches.length !== 1) return missing("no-data");
  const r = matches[0]; const label = String(r.totalIndex).replaceAll(" ", "");
  if (!["매우좋음", "좋음", "보통", "나쁨", "매우나쁨"].includes(label)) return {
    state: "no-data", at: `${String(r.predcYmd)} ${noon}`, checkedAt:raw?.receivedAt,
    waveHeight: finiteValue(r.maxWvhgt, 0, 30),
  };
  return { state: "available", label, at: `${String(r.predcYmd)} ${noon}`, checkedAt: raw?.receivedAt,
    waveHeight: finiteValue(r.maxWvhgt, 0, 30) };
}

export function mapRip(raw: RawResponse | null, now: Date): SafetySource {
  const error = failure(raw, now); if (error) return error;
  const rows = itemsFrom(raw?.json).filter(r => r.obsvtrId === "JUNGMUN")
    .map(r => ({ r, at: koreanTimestamp(r.obsrvnDt) })).filter(x => freshObservation(x.at, now, 10))
    .sort((a,b) => Date.parse(b.at!) - Date.parse(a.at!));
  if (!rows.length) return missing("no-data");
  const { r, at } = rows[0];
  if (new Set(rows.filter(x => x.at === at).map(x => x.r.lastScrCn)).size > 1) return missing("no-data");
  const label = String(r.lastScrCn).trim();
  if (!["관심", "주의", "경계", "위험"].includes(label)) return missing("no-data");
  return { state: "available", label, at, checkedAt: raw?.receivedAt, waveHeight: finiteValue(r.wvhgt, 0, 30) };
}

/** KMA current-status text is regional, never a place-specific entry restriction.
 * Keep the exact Jeju bulletin lines; absence is not proof of safety. */
export function mapWarning(raw: RawResponse | null, now: Date): SafetySource {
  const error = failure(raw, now); if (error) return error;
  const rows = itemsFrom(raw?.json);
  if (totalCount(raw) === undefined || totalCount(raw)! > rows.length) return missing("unavailable");
  const latest = rows.map(r => ({r, at:koreanTimestamp(String(r.tmFc ?? ""))}))
    .filter(x => x.at && Date.parse(x.at) <= now.getTime())
    .sort((a,b) => Date.parse(b.at!) - Date.parse(a.at!))[0];
  if (!latest || !freshObservation(latest.at, now, 7 * 24 * 60)) return missing("no-data");
  const effective = koreanTimestamp(String(latest.r.tmEf ?? ""));
  if (!effective || Date.parse(effective) > now.getTime()) return missing("no-data");
  const lines = String(latest.r.t6 ?? "").split(/\r?\n/).map(s=>s.trim()).filter(s => s.includes("제주") && /주의보|경보/.test(s) && !/해제|예비/.test(s));
  if (!lines.length) return missing("no-data");
  return {state:"available", label:lines.join(" / ").slice(0, 2000), at: effective, checkedAt:raw?.receivedAt};
}

export async function getBeach(place: Place, now: Date): Promise<SafetySource> {
  const target = BEACH_TARGETS[place.id]; if (!target) return missing("unsupported");
  const raw = await callDataGoKr(BEACH_INDEX_ENDPOINT, {type:"json", reqDate:koreanDate(now), placeCode:target.code, pageNo:"1", numOfRows:"300"});
  return mapBeach(raw, place, now);
}
export async function getRip(place: Place, now: Date): Promise<SafetySource> {
  if (place.id !== "jungmun") return missing("unsupported");
  const month = Number(koreanDate(now).slice(4,6));
  if (month < 6 || month > 9) return missing("off-season");
  const params = {type:"json", reqDate:koreanDate(now), beachCode:"JUNGMUN", pageNo:"1", numOfRows:"300"};
  const raw = await callDataGoKr(RIP_CURRENT_ENDPOINT, params);
  if (failure(raw, now)) return mapRip(raw, now);
  const count = totalCount(raw);
  if (count === undefined || count > 3000) return missing("unavailable");
  // Fetch every page: the guide does not guarantee chronological ordering.
  // Never infer a current state from an arbitrary first/last page.
  if (count > 300) {
    const pages = await Promise.all(Array.from({length:Math.ceil(count/300)-1}, (_,i) =>
      callDataGoKr(RIP_CURRENT_ENDPOINT,{...params,pageNo:String(i+2)})));
    if (pages.some(page => failure(page,now) || totalCount(page) !== count)) return missing("unavailable");
    const rows = [raw,...pages].flatMap(page=>itemsFrom(page?.json));
    if (rows.length < count) return missing("unavailable");
    return mapRip({...raw!,json:{response:{header:{resultCode:"00"},body:{totalCount:count,items:{item:rows}}}}},now);
  }
  return mapRip(raw, now);
}
export async function getSafety(place: Place, now: Date): Promise<SafetyData> {
  const fallback = () => missing("unavailable");
  // Optional safety feeds must not exhaust the existing 25-second client budget.
  const bounded = async (task: Promise<SafetySource>) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([task.catch(fallback), new Promise<SafetySource>(resolve => {
        timer = setTimeout(() => resolve(fallback()), 10000);
      })]);
    } finally { clearTimeout(timer); }
  };
  const [beach, rip, warning] = await Promise.all([
    bounded(getBeach(place,now)), bounded(getRip(place,now)),
    bounded(callDataGoKr(WEATHER_WARNING_ENDPOINT,{dataType:"JSON",pageNo:"1",numOfRows:"100"}).then(raw=>mapWarning(raw,now))),
  ]);
  return {beach,rip,warning,control:"unknown"};
}
