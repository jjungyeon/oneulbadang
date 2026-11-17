import { callDataGoKr } from "./client";
import { TIDE_RANGE_ENDPOINT, TIDE_RECENT_ENDPOINT, TIDE_EXTREMES_ENDPOINT, TIDE_STATION_BY_REGION, STATION_NAME_BY_REGION } from "./config";
import { finiteValue, freshObservation, itemsFrom, koreanDate, koreanTimestamp } from "./parse";
import type { Place } from "@/types/place";
import type { TideData } from "@/types/condition";

export interface TideReading {
  currentLevel?: number; previousLevel?: number; observedAt: string; stationName: string;
  previousObservedAt?: string;
  waterTemperature?: number; airTemperature?: number; windSpeed?: number;
}
export interface TideRange {
  lowLevel: number; highLevel: number; forecastDate: string;
}
export const stationCodeFor = (place: Place) => TIDE_STATION_BY_REGION[place.region];

export function fetchTideRecentRaw(stationCode: string, now = new Date()) {
  return callDataGoKr(TIDE_RECENT_ENDPOINT, {
    obsCode: stationCode, type: "json", reqDate: koreanDate(now), min: "10", pageNo: "1", numOfRows: "300",
  });
}
/** Around midnight, fresh observations may still be on the previous date's page. */
export async function fetchTideRecentWindow(stationCode: string, now = new Date()) {
  const kst = new Date(now.getTime() + 9 * 3600000);
  const nearMidnight = kst.getUTCHours() * 60 + kst.getUTCMinutes() < 90;
  const [current, previous] = await Promise.all([
    fetchTideRecentRaw(stationCode, now),
    nearMidnight ? fetchTideRecentRaw(stationCode, new Date(now.getTime() - 86400000)) : Promise.resolve(null),
  ]);
  return { current, previous };
}
export function fetchTideRangeRaw(stationCode: string, date: string) {
  return callDataGoKr(TIDE_RANGE_ENDPOINT, {
    obsCode: stationCode, reqDate: date, type: "json", min: "5", pageNo: "1", numOfRows: "300",
  });
}
export function fetchTideExtremesRaw(stationCode: string, date: string) {
  return callDataGoKr(TIDE_EXTREMES_ENDPOINT, {
    obsCode: stationCode, reqDate: date, type: "json", pageNo: "1", numOfRows: "20",
  });
}
function namedRows(raw: unknown, expectedName?: string) {
  return itemsFrom(raw).filter((item) => typeof item.obsvtrNm === "string" && (!expectedName || item.obsvtrNm === expectedName));
}

/** Use a fresh complete row, without substituting old values for missing sensors. */
export function mapTideRecent(raw: unknown, now = new Date(), expectedName?: string, previousDayRaw?: unknown): TideReading | null {
  const rows = [...namedRows(raw, expectedName), ...namedRows(previousDayRaw, expectedName)].map((item) => ({ item, time: koreanTimestamp(item.obsrvnDt) }))
    .filter((row): row is { item: Record<string, unknown>; time: string } => Boolean(row.time && freshObservation(row.time, now)))
    .sort((a, b) => b.time.localeCompare(a.time));
  if (!rows.length) return null;
  const { item, time } = rows[0];
  const currentLevel = finiteValue(item.bscTdlvHgt, -1000, 2000);
  // At most two 10-minute sampling intervals; long gaps cannot describe a recent direction.
  const previous = rows.find((r) => r.time < time && Date.parse(time) - Date.parse(r.time) <= 20 * 60000 &&
    r.item.obsvtrNm === item.obsvtrNm && finiteValue(r.item.bscTdlvHgt, -1000, 2000) !== undefined);
  return {
    currentLevel, previousLevel: previous ? finiteValue(previous.item.bscTdlvHgt, -1000, 2000) : undefined,
    previousObservedAt: previous?.time,
    observedAt: time, stationName: String(item.obsvtrNm),
    waterTemperature: finiteValue(item.wtem, -5, 45),
    airTemperature: finiteValue(item.artmp, -80, 60), windSpeed: finiteValue(item.wspd, 0, 150),
  };
}

export function mapTideRange(raw: unknown, date: string, expectedName?: string): TideRange | null {
  const samples = namedRows(raw, expectedName).map((item) => ({ time: koreanTimestamp(item.obsrvnDt), level: finiteValue(item.tdlvHgt, -1000, 2000) }))
    .filter((s): s is { time: string; level: number } => Boolean(s.time && s.level !== undefined && s.time.slice(0, 10).replaceAll("-", "") === date))
    .sort((a, b) => a.time.localeCompare(b.time));
  // Only use a whole day: no min/max of a partial page or only past observations.
  const unique = [...new Map(samples.map((s) => [s.time, s])).values()];
  if (unique.length < 24 || unique[0].time.slice(11, 16) > "00:10" || unique.at(-1)!.time.slice(11, 16) < "23:00") return null;
  for (let i = 1; i < unique.length; i++) if (Date.parse(unique[i].time) - Date.parse(unique[i - 1].time) > 65 * 60000) return null;
  const lowLevel = Math.min(...unique.map((s) => s.level));
  const highLevel = Math.max(...unique.map((s) => s.level));
  return highLevel > lowLevel ? { lowLevel, highLevel, forecastDate: date } : null;
}

export function mapExtremes(raw: unknown, now: Date, expectedName: string): Partial<TideData> {
  const events = namedRows(raw, expectedName).map((item) => ({ time: koreanTimestamp(item.predcDt), level: finiteValue(item.predcTdlvVl, -1000, 2000), type: Number(item.extrSe) }))
    .filter((event): event is { time: string; level: number; type: number } => Boolean(event.time && event.level !== undefined && Date.parse(event.time) >= now.getTime()))
    .sort((a, b) => a.time.localeCompare(b.time));
  const high = events.find((e) => [1, 3].includes(e.type));
  const low = events.find((e) => [2, 4].includes(e.type));
  return { nextHighTime: high?.time, nextHighLevel: high?.level, nextLowTime: low?.time, nextLowLevel: low?.level };
}

export async function getTide(place: Place, now = new Date()) {
  const code = stationCodeFor(place);
  const name = STATION_NAME_BY_REGION[place.region];
  const [recentWindow, rangeRaw, extremeRaw] = await Promise.all([
    fetchTideRecentWindow(code, now), fetchTideRangeRaw(code, koreanDate(now)),
    process.env.KHOA_EXTREMES_ENABLED === "0" ? Promise.resolve([]) :
      Promise.all([0, 1].map((days) => fetchTideExtremesRaw(code, koreanDate(now, days)))),
  ]);
  const recent = mapTideRecent(recentWindow.current?.ok ? recentWindow.current.json : null, now, name,
    recentWindow.previous?.ok ? recentWindow.previous.json : null);
  const range = rangeRaw?.ok ? mapTideRange(rangeRaw.json, koreanDate(now), name) : null;
  let extremes: Partial<TideData> = {};
  // Approved 2026-11-16. Missing/failed predictions stay missing; coarse samples are not extrema.
  if (process.env.KHOA_EXTREMES_ENABLED !== "0") {
    const raw = extremeRaw;
    const today = mapExtremes(raw[0]?.ok ? raw[0].json : null, now, name);
    const tomorrow = mapExtremes(raw[1]?.ok ? raw[1].json : null, now, name);
    extremes = {
      nextHighTime: today.nextHighTime ?? tomorrow.nextHighTime, nextHighLevel: today.nextHighLevel ?? tomorrow.nextHighLevel,
      nextLowTime: today.nextLowTime ?? tomorrow.nextLowTime, nextLowLevel: today.nextLowLevel ?? tomorrow.nextLowLevel,
    };
  }
  const refreshDelayed = [recentWindow.current, recentWindow.previous, rangeRaw, ...extremeRaw].some((raw) => raw?.refreshDelayed);
  return { recent, range, extremes, refreshDelayed };
}
