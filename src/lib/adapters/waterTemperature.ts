import { fetchTideRecentRaw, stationCodeFor } from "./tide";
import type { Place } from "@/types/place";

/**
 * 수온 어댑터.
 *
 * 1번 API(조위관측소 최신 관측)가 수온을 같이 준다. 따로 부르지 않는다.
 * 수온 실측이 없는 관측소가 있어서(PRD 12번) 값이 없으면 null로 두고,
 * 화면은 수온 카드를 숨긴 채 물때·바람으로 판단한다.
 */

export interface WaterReading {
  temperature: number;
  observedAt: string;
  stationName: string;
}

/* 실제 응답을 확인한 뒤 채운다. 필드명을 추측하지 않는다. */
export function mapWaterTemperature(raw: unknown): WaterReading | null {
  void raw;
  return null;
}

export async function getWaterTemperature(place: Place) {
  const code = stationCodeFor(place);
  if (!code) return null;

  const raw = await fetchTideRecentRaw(code);
  if (!raw?.ok) return null;

  return mapWaterTemperature(raw.json ?? raw.text);
}
