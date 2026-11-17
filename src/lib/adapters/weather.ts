import { callDataGoKr } from "./client";
import { WEATHER_ENDPOINT, weatherGridFor } from "./config";
import { finiteValue, itemsFrom, koreanTimestamp } from "./parse";
import type { Place } from "@/types/place";
import type { WeatherData } from "@/types/condition";

/** Official 02/05/08/11/14/17/20/23 KST releases, available after 10 minutes. */
export function latestBaseTime(now: Date): { baseDate: string; baseTime: string } {
  const stamp = new Date(now.getTime() + 9 * 3600000 - 10 * 60000);
  const slots = [2, 5, 8, 11, 14, 17, 20, 23];
  let hour = slots.filter((h) => h <= stamp.getUTCHours()).pop();
  if (hour === undefined) { stamp.setUTCDate(stamp.getUTCDate() - 1); hour = 23; }
  return { baseDate: stamp.toISOString().slice(0, 10).replaceAll("-", ""), baseTime: `${String(hour).padStart(2, "0")}00` };
}

export function fetchWeatherRaw(place: Place, now = new Date()) {
  const grid = weatherGridFor(place);
  const base = latestBaseTime(now);
  return callDataGoKr(WEATHER_ENDPOINT, {
    dataType: "JSON", numOfRows: "1000", pageNo: "1",
    base_date: base.baseDate, base_time: base.baseTime,
    nx: String(grid.nx), ny: String(grid.ny),
  });
}

/** Select ONE common forecast hour; never merge values belonging to different hours. */
export function mapWeather(raw: unknown, now = new Date(), grid?: { nx: number; ny: number }): WeatherData | null {
  const groups = new Map<string, Record<string, unknown>[]>();
  for (const item of itemsFrom(raw)) {
    if (grid && (Number(item.nx) !== grid.nx || Number(item.ny) !== grid.ny)) continue;
    const time = koreanTimestamp(`${item.fcstDate}${item.fcstTime}`);
    if (!time) continue;
    const delta = Date.parse(time) - now.getTime();
    if (delta <= -3600000 || delta > 3600000) continue;
    const group = groups.get(time) ?? []; group.push(item); groups.set(time, group);
  }
  // Prefer the current hour; otherwise the next available hour, explicitly labelled forecast.
  const entry = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))[0];
  if (!entry) return null;
  const [forecastAt, rows] = entry;
  const values = new Map(rows.map((row) => [row.category, row.fcstValue]));
  const skyCode = finiteValue(values.get("SKY"));
  const pty = finiteValue(values.get("PTY"));
  const sky = skyCode === 1 ? "CLEAR" : skyCode === 3 ? "CLOUDY" : skyCode === 4 ? "OVERCAST" : undefined;
  const rain = pty !== undefined && [0, 1, 2, 3, 4].includes(pty) ? pty !== 0 : undefined;
  const airTemperature = finiteValue(values.get("TMP"), -80, 60);
  const windSpeed = finiteValue(values.get("WSD"), 0, 150);
  const issuedAt = koreanTimestamp(`${rows[0].baseDate}${rows[0].baseTime}`);
  if (!issuedAt || Date.parse(issuedAt) > now.getTime() || now.getTime() - Date.parse(issuedAt) > 6 * 3600000) return null;
  if ([sky, rain, airTemperature, windSpeed].every((v) => v === undefined)) return null;
  return { sky, rain, precipitationCode: rain === undefined ? undefined : pty, airTemperature, windSpeed, forecastAt, issuedAt, grid, kind: "forecast" };
}

export async function getWeather(place: Place, now = new Date()) {
  const raw = await fetchWeatherRaw(place, now);
  const mapped = raw?.ok ? mapWeather(raw.json, now, weatherGridFor(place)) : null;
  return mapped ? { ...mapped, refreshDelayed: raw?.refreshDelayed ?? false } : null;
}
