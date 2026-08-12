import { callDataGoKr } from "./client";
import {
  TIDE_RANGE_ENDPOINT,
  TIDE_RECENT_ENDPOINT,
  TIDE_STATION_BY_REGION,
} from "./config";
import type { Place } from "@/types/place";

/**
 * 조위 어댑터.
 *
 * 1번 API(최신 관측)에서 현재 조위·관측시각·관측소명을,
 * 2번 API(실측·예측 조위)에서 오늘 최저·최고를 얻어 PRD 11번의 ratio 재료를 만든다.
 *
 * 응답 필드명은 추측하지 않는다. 실제 응답을 확인한 뒤 아래 map 함수를 채운다.
 * 채우기 전에는 null을 돌려주고 화면은 예시 데이터를 쓴다.
 */

export interface TideReading {
  currentLevel: number;
  previousLevel?: number;
  observedAt: string;
  stationName: string;
}

export interface TideRange {
  lowLevel: number;
  highLevel: number;
  nextHighTime?: string;
  nextHighLevel?: number;
  nextLowTime?: string;
  nextLowLevel?: number;
}

export function stationCodeFor(place: Place): string | null {
  return TIDE_STATION_BY_REGION[place.region] || null;
}

/** 1번 API 원문 */
export async function fetchTideRecentRaw(stationCode: string) {
  return callDataGoKr(TIDE_RECENT_ENDPOINT, {
    ObsCode: stationCode,
    ResultType: "json",
  });
}

/** 2번 API 원문. date는 YYYYMMDD. */
export async function fetchTideRangeRaw(stationCode: string, date: string) {
  return callDataGoKr(TIDE_RANGE_ENDPOINT, {
    ObsCode: stationCode,
    Date: date,
    ResultType: "json",
  });
}

/* ── 매핑 ────────────────────────────────────────────
   실제 응답을 한 번 찍어 본 뒤 여기를 채운다.
   지금은 필드명을 모르므로 null을 돌려준다. 추측해서 넣지 않는다.
   ─────────────────────────────────────────────────── */

export function mapTideRecent(raw: unknown): TideReading | null {
  void raw;
  return null;
}

export function mapTideRange(raw: unknown): TideRange | null {
  void raw;
  return null;
}

export async function getTide(place: Place) {
  const code = stationCodeFor(place);
  if (!code) return null;

  const recentRaw = await fetchTideRecentRaw(code);
  if (!recentRaw?.ok) return null;

  const recent = mapTideRecent(recentRaw.json ?? recentRaw.text);
  if (!recent) return null;

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rangeRaw = await fetchTideRangeRaw(code, today);
  const range = rangeRaw?.ok
    ? mapTideRange(rangeRaw.json ?? rangeRaw.text)
    : null;

  return { recent, range };
}
