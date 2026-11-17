import { NextResponse } from "next/server";
import { PLACES } from "@/data/places";
import { buildReading } from "@/lib/adapters";
import { fetchTideRecentWindow, fetchTideRangeRaw, fetchTideExtremesRaw, mapTideRecent, mapTideRange, stationCodeFor } from "@/lib/adapters/tide";
import { fetchWeatherRaw, mapWeather } from "@/lib/adapters/weather";
import { itemsFrom, koreanDate, record } from "@/lib/adapters/parse";
import { STATION_NAME_BY_REGION, weatherGridFor } from "@/lib/adapters/config";
import { TIDE_SERIES_ENDPOINT } from "@/lib/adapters/config";
import { BEACH_INDEX_ENDPOINT, RIP_CURRENT_ENDPOINT, WEATHER_WARNING_ENDPOINT } from "@/lib/adapters/config";
import { BEACH_TARGETS } from "@/lib/adapters/safety";
import { callDataGoKr } from "@/lib/adapters/client";

export const runtime = "nodejs";
export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development" || process.env.ONEULBADANG_LIVE_DEV !== "1" ||
    !["127.0.0.1", "localhost"].includes(new URL(request.url).hostname)) return new Response(null, { status: 404 });
  const placeId = new URL(request.url).searchParams.get("place");
  if (new URL(request.url).searchParams.get("extra") === "risk-access") {
    const raws = await Promise.all([
      callDataGoKr(RIP_CURRENT_ENDPOINT, {type:"json", beachCode:"JUNGMUN", pageNo:"1", numOfRows:"1"}),
      callDataGoKr(WEATHER_WARNING_ENDPOINT, {dataType:"JSON", pageNo:"1", numOfRows:"100"}),
    ]);
    return NextResponse.json(raws.map((raw,i) => {
      const root=record(raw?.json); const response=record(root?.response) ?? root;
      const code=String(record(response?.header)?.resultCode);
      const fields=i===0 ? ["obsvtrId","obsvtrNm","obsrvnDt","lastScrCn"] : ["tmFc","tmEf","t6"];
      return {httpStatus:raw?.status ?? null, resultCode:/^\d{1,3}$/.test(code)?code:null, count:itemsFrom(raw?.json).length,
        sample:itemsFrom(raw?.json).map(r=>Object.fromEntries(fields.map(f=>[f,r[f]])))};
    }), {headers:{"Cache-Control":"no-store"}});
  }

  if (new URL(request.url).searchParams.get("extra") === "beach") {
    const target=BEACH_TARGETS[placeId ?? ""];
    const raw = await callDataGoKr(BEACH_INDEX_ENDPOINT, { type: "json", reqDate: koreanDate(new Date()), pageNo: "1", numOfRows: "300", ...(target?{placeCode:target.code}:{}) });
    const root = record(raw?.json); const response = record(root?.response) ?? root;
    const code = String(record(response?.header)?.resultCode);
    const fields = ["bbchNm", "lat", "lot", "predcYmd", "predcNoonSeCd", "totalIndex", "maxWvhgt"];
    return NextResponse.json({ httpStatus: raw?.status ?? null, resultCode: /^\d{1,3}$/.test(code) ? code : null,
      totalCount: record(response?.body)?.totalCount,
      items: itemsFrom(raw?.json).map(item => Object.fromEntries(fields.map(f => [f,item[f]]))) }, { headers: { "Cache-Control": "no-store" } });
  }
  const place = PLACES.find((item) => item.id === placeId) ?? PLACES[0];
  const now = new Date();
  const code = stationCodeFor(place);
  const name = STATION_NAME_BY_REGION[place.region];
  const [recentWindow, range, weather] = await Promise.all([
    fetchTideRecentWindow(code, now), fetchTideRangeRaw(code, koreanDate(now)), fetchWeatherRaw(place, now),
  ]);
  const recent = recentWindow.current;
  const status = (raw: typeof recent) => {
    const root = record(raw?.json);
    const response = record(root?.response) ?? root;
    const resultCode = record(response?.header)?.resultCode;
    return { httpStatus: raw?.status ?? null, resultCode: /^[0-9]{1,3}$/.test(String(resultCode)) ? String(resultCode) : null,
      count: itemsFrom(raw?.json).length, refreshDelayed: raw?.refreshDelayed ?? false, receivedAt: raw?.receivedAt };
  };
  const mappedRecent = mapTideRecent(recent?.ok ? recent.json : null, now, name,
    recentWindow.previous?.ok ? recentWindow.previous.json : null);
  let extraSources;
  let rawExtremes;
  if (new URL(request.url).searchParams.get("extra") === "tides") {
    const [extremes, tomorrow, series] = await Promise.all([
      fetchTideExtremesRaw(code, koreanDate(now)), fetchTideExtremesRaw(code, koreanDate(now, 1)),
      callDataGoKr(TIDE_SERIES_ENDPOINT, {
      obsCode: code, reqDate: koreanDate(now), type: "json", pageNo: "1", numOfRows: "300", min: "5",
    })]);
    extraSources = { extremes: status(extremes), tomorrow: status(tomorrow), series: status(series) };
    const publicFields = ["obsvtrNm", "predcDt", "predcTdlvVl", "extrSe"];
    rawExtremes = [extremes, tomorrow].flatMap((raw) => itemsFrom(raw?.json)
      .map((item) => Object.fromEntries(publicFields.map((field) => [field, item[field]]))));
  }
  const mappedRange = mapTideRange(range?.json, koreanDate(now), name);
  const mappedWeather = mapWeather(weather?.json, now, weatherGridFor(place));
  const reading = await buildReading(place, now);
  // Only public weather/sea fields. No URL, request headers, key or provider error messages.
  const rawSample = [...itemsFrom(recent?.json), ...itemsFrom(recentWindow.previous?.json)].filter((r) => r.obsvtrNm === name)
    .sort((a, b) => String(b.obsrvnDt).localeCompare(String(a.obsrvnDt)))[0];
  const fields = ["obsvtrNm", "obsrvnDt", "bscTdlvHgt", "wtem", "artmp", "wspd"];
  const sample = rawSample ? Object.fromEntries(fields.map((field) => [field, rawSample[field]])) : null;
  return NextResponse.json({
    checkedAt: now.toISOString(), place: place.id, station: code, extraSources, rawExtremes,
    sources: { recent: status(recent), previousDayRecent: status(recentWindow.previous), range: status(range), weather: status(weather) },
    rawRecentSample: sample, recentStationNames: [...new Set(itemsFrom(recent?.json).map((item) => item.obsvtrNm))],
    mapped: { recent: mappedRecent, range: mappedRange, weather: mappedWeather }, reading,
    checks: {
      recentMapped: mappedRecent !== null, rangeMapped: mappedRange !== null, weatherMapped: mappedWeather !== null,
      waterMatches: mappedRecent?.waterTemperature !== undefined && reading.observation.water.temperature === mappedRecent.waterTemperature,
      tideMatches: mappedRecent?.currentLevel !== undefined && reading.observation.tide.currentLevel === mappedRecent.currentLevel,
      noMockFlag: reading.condition.isMock === false,
    },
  }, { headers: { "Cache-Control": "no-store" } });
}
