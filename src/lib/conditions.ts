import { buildMockReadings } from "@/data/mock";
import type { PlaceReading } from "@/types/condition";

/**
 * 화면이 쓰는 유일한 진입점.
 *
 * 실제 호출은 Route Handler가 대신한다. 여기서는 인증키를 알지 못한다.
 * 응답이 이상하거나 실패하면 예시 데이터로 돌아간다.
 */

let cached: Promise<PlaceReading[]> | null = null;

async function load(): Promise<PlaceReading[]> {
  try {
    const response = await fetch("/api/conditions");
    if (!response.ok) return buildMockReadings();

    const body = (await response.json()) as { readings?: PlaceReading[] };
    if (!Array.isArray(body.readings) || body.readings.length === 0) {
      return buildMockReadings();
    }
    return body.readings;
  } catch {
    return buildMockReadings();
  }
}

/** 지도가 마커 색을 정하려면 17곳이 다 필요하다. 한 번만 부르고 재사용한다. */
export function getAllPlaceConditions(): Promise<PlaceReading[]> {
  cached ??= load();
  return cached;
}

export async function getPlaceConditions(
  placeId: string,
): Promise<PlaceReading | null> {
  const readings = await getAllPlaceConditions();
  return readings.find((r) => r.condition.place.id === placeId) ?? null;
}
