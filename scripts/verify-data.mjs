import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { sourceLoader } from "./test-loader.mjs";

const load = sourceLoader();
const { itemsFrom, finiteValue, koreanDate, koreanTimestamp } = load("src/lib/adapters/parse.ts");
const { mapTideRecent, mapTideRange, mapExtremes } = load("src/lib/adapters/tide.ts");
const { mapWeather, latestBaseTime } = load("src/lib/adapters/weather.ts");
const { weatherGridFor } = load("src/lib/adapters/config.ts");
const { tideRatio, toTideStatus, toStatus } = load("src/lib/condition.ts");
const { emptyObservation } = load("src/lib/readings.ts");
const { PLACES } = load("src/data/places.ts");
const tests = [];
const check = async (name, fn) => { await fn(); tests.push({ name, pass: true }); };
const now = new Date("2026-11-16T12:30:00+09:00");
const envelope = (item, code = "00") => ({ response: { header: { resultCode: code }, body: { items: { item } } } });
const recentRows = [
  { obsvtrNm: "제주", obsrvnDt: "2026-11-16 12:10", bscTdlvHgt: 140, wtem: 21, artmp: 19, wspd: 3 },
  { obsvtrNm: "제주", obsrvnDt: "2026-11-16 12:20", bscTdlvHgt: "145", wtem: "21.5", artmp: "19.5", wspd: "0" },
];
await check("provider-errors-and-single-item", () => {
  assert.equal(itemsFrom(envelope(recentRows, "30")).length, 0);
  assert.equal(itemsFrom(envelope(recentRows[0])).length, 1);
  assert.equal(itemsFrom({ body: { items: { item: recentRows } } }).length, 0);
});
await check("numbers-reject-missing-and-sentinels-but-keep-zero", () => {
  for (const v of [null, undefined, "", " ", "NaN", "-999", -9999, Infinity]) assert.equal(finiteValue(v), undefined);
  assert.equal(finiteValue("0"), 0);
});
await check("KST-date-year-boundary-and-strict-timestamps", () => {
  assert.equal(koreanDate(new Date("2026-12-31T15:01:00Z")), "20270101");
  assert.equal(koreanTimestamp("2026-11-16 12:30"), "2026-11-16T12:30:00+09:00");
  assert.equal(koreanTimestamp("2026-02-30 12:30"), undefined);
});
await check("KMA-release-boundary", () => {
  assert.deepEqual(latestBaseTime(new Date("2026-11-16T02:09:00+09:00")), { baseDate: "20261115", baseTime: "2300" });
  assert.deepEqual(latestBaseTime(new Date("2026-11-16T02:10:00+09:00")), { baseDate: "20261116", baseTime: "0200" });
});
await check("KMA-grid-known-Seoul-reference", () => assert.deepEqual(weatherGridFor({ lat: 37.5665, lng: 126.9780 }), { nx: 60, ny: 127 }));
await check("recent-values-units-time-sort-and-calm-wind", () => {
  const r = mapTideRecent(envelope([...recentRows].reverse()), now, "제주");
  assert.equal(r.currentLevel, 145); assert.equal(r.previousLevel, 140);
  assert.equal(r.waterTemperature, 21.5); assert.equal(r.windSpeed, 0);
  assert.equal(r.observedAt, "2026-11-16T12:20:00+09:00");
});
await check("reject-stale-future-wrong-station", () => {
  assert.equal(mapTideRecent(envelope(recentRows), new Date("2026-11-16T15:00:00+09:00"), "제주"), null);
  assert.equal(mapTideRecent(envelope(recentRows), new Date("2026-11-16T11:00:00+09:00"), "제주"), null);
  assert.equal(mapTideRecent(envelope(recentRows), now, "서귀포"), null);
});
const rangeRows = Array.from({ length: 24 }, (_, h) => ({ obsvtrNm: "제주", obsrvnDt: `2026-11-16 ${String(h).padStart(2, "0")}:00`, tdlvHgt: 120 + 60 * Math.cos(h * Math.PI / 6) }));
await check("range-requires-entire-day-and-prediction-field", () => {
  const r = mapTideRange(envelope(rangeRows), "20261116", "제주");
  assert.equal(r.lowLevel, 60); assert.equal(r.highLevel, 180);
  assert.equal(mapTideRange(envelope(rangeRows.slice(0, 12)), "20261116", "제주"), null);
  assert.equal(mapTideRange(envelope(rangeRows.map(({ tdlvHgt, ...r }) => ({ ...r, bscTdlvHgt: tdlvHgt }))), "20261116", "제주"), null);
});
await check("extrema-uses-official-type-and-future-events", () => {
  const r = mapExtremes(envelope([
    { obsvtrNm: "제주", predcDt: "2026-11-16 10:00", predcTdlvVl: 200, extrSe: 1 },
    { obsvtrNm: "제주", predcDt: "2026-11-16 16:00", predcTdlvVl: 190, extrSe: 3 },
    { obsvtrNm: "제주", predcDt: "2026-11-16 22:00", predcTdlvVl: 80, extrSe: 4 },
  ]), now, "제주");
  assert.equal(r.nextHighTime, "2026-11-16T16:00:00+09:00"); assert.equal(r.nextLowLevel, 80);
});
const weatherRows = Object.entries({ SKY: "1", PTY: "0", TMP: "18", WSD: "2" }).map(([category, fcstValue]) => ({ category, fcstValue, baseDate: "20261116", baseTime: "1100", fcstDate: "20261116", fcstTime: "1200", nx: 53, ny: 38 }));
await check("next-day-extrema-and-failed-response-stay-separate", async () => {
  const dates = [];
  let failed = false;
  const isolated = sourceLoader(new Map([["src/lib/adapters/client.ts", {
    callDataGoKr: async (endpoint, params) => {
      if (!endpoint.includes("tideFcstHghLw")) return null;
      dates.push(params.reqDate);
      return { ok: !failed, status: failed ? 403 : 200, json: envelope([
        { obsvtrNm: "제주", predcDt: `${params.reqDate}0332`, predcTdlvVl: 174, extrSe: "1" },
        { obsvtrNm: "제주", predcDt: `${params.reqDate}0950`, predcTdlvVl: 117, extrSe: "2" },
      ]) };
    },
  }]]));
  const { getTide } = isolated("src/lib/adapters/tide.ts");
  const night = new Date("2026-12-31T23:55:00+09:00");
  let r = await getTide(PLACES[0], night);
  assert.deepEqual(dates, ["20261231", "20270101"]);
  assert.equal(r.extremes.nextHighTime, "2027-01-01T03:32:00+09:00");
  assert.equal(r.extremes.nextLowLevel, 117);
  failed = true;
  r = await getTide(PLACES[0], night);
  assert.equal(r.extremes.nextHighTime, undefined);
  assert.equal(r.extremes.nextLowTime, undefined);
});
await check("weather-selects-common-hour-and-grid", () => {
  const r = mapWeather(envelope(weatherRows), now, { nx: 53, ny: 38 });
  assert.equal(r.sky, "CLEAR"); assert.equal(r.rain, false); assert.equal(r.airTemperature, 18);
  assert.equal(r.forecastAt, "2026-11-16T12:00:00+09:00");
  assert.equal(mapWeather(envelope(weatherRows), now, { nx: 1, ny: 1 }), null);
  const mixed = weatherRows.map((r) => r.category === "WSD" ? { ...r, fcstTime: "1300" } : r);
  assert.equal(mapWeather(envelope(mixed), now).windSpeed, undefined);
});
await check("weather-invalid-codes-and-old-release", () => {
  assert.equal(mapWeather(envelope(weatherRows.map((r) => ({ ...r, baseTime: "0200" }))), now), null);
  const r = mapWeather(envelope(weatherRows.map((r) => ["SKY", "PTY"].includes(r.category) ? { ...r, fcstValue: "-999" } : r)), now);
  assert.equal(r.sky, undefined); assert.equal(r.rain, undefined);
});
await check("height-does-not-invent-direction", () => {
  const tide = { ...emptyObservation().tide, currentLevel: 100, lowLevel: 40, highLevel: 240 };
  assert.equal(toTideStatus({ ...tide, trend: "RISING" }), "RISING");
  assert.equal(toTideStatus({ ...tide, trend: "FALLING" }), "FALLING");
  assert.equal(tideRatio({ ...tide, currentLevel: NaN }), undefined);
  assert.equal(toStatus(emptyObservation(), "UNKNOWN"), null);
});
await check("assembly-no-mocks-missing-sensors-or-sources", async () => {
  let incoming = { recent: mapTideRecent(envelope(recentRows), now, "제주"), range: mapTideRange(envelope(rangeRows), "20261116", "제주"), extremes: {} };
  let weather = mapWeather(envelope(weatherRows), now);
  const isolated = sourceLoader(new Map([
    ["src/lib/adapters/tide.ts", { getTide: async () => incoming }],
    ["src/lib/adapters/weather.ts", { getWeather: async () => weather }],
  ]));
  const { buildReading } = isolated("src/lib/adapters/index.ts");
  let r = await buildReading(PLACES[0], now);
  assert.equal(r.dataStatus, "live"); assert.equal(r.observation.weather.windSpeed, 0);
  assert.equal(r.observation.weather.windKind, "observed"); assert.equal(r.condition.isMock, false);
  assert.equal(r.observation.tide.nextHighTime, undefined);
  incoming.recent.waterTemperature = undefined;
  r = await buildReading(PLACES[0], now);
  assert.equal(r.observation.water.temperature, undefined); assert.equal(r.dataStatus, "partial"); assert.equal(r.condition.status, null);
  incoming = null; weather = null;
  r = await buildReading(PLACES[0], now);
  assert.equal(r.dataStatus, "unavailable"); assert.equal(r.condition.status, null);
  assert.equal(r.observation.weather.windSpeed, undefined);
});
const report = { kind: "synthetic-schema-based-regression", liveApiTest: false, count: tests.length, tests };
if (process.argv[2]) { fs.mkdirSync(path.dirname(process.argv[2]), { recursive: true }); fs.writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + "\n"); }
console.log(JSON.stringify(report, null, 2));
