import { unavailableReadings, retainRecentReading } from "./readings";
import { PLACES } from "@/data/places";
import type { PlaceReading } from "@/types/condition";

let cached: Promise<PlaceReading[]> | null = null;
let expiresAt = 0;
let previous: PlaceReading[] | null = null;
const onFailure = () => previous ? previous.map((r) => retainRecentReading(r)) : unavailableReadings();
async function load(): Promise<PlaceReading[]> {
  try {
    const response = await fetch("/api/conditions", { cache: "no-store", signal: AbortSignal.timeout(25000) });
    if (!response.ok) return onFailure();
    const body = await response.json();
    if (!Array.isArray(body.readings) || body.readings.length !== PLACES.length) return onFailure();
    const valid = body.readings.every((r: PlaceReading, i: number) =>
      r?.condition?.place?.id === PLACES[i].id && typeof r?.condition?.message === "string" &&
      r.observation?.tide && r.observation?.water && r.observation?.weather && r.condition.isMock === false);
    if (!valid) return onFailure();
    previous = body.readings;
    return body.readings;
  } catch { return onFailure(); }
}
export function getAllPlaceConditions(): Promise<PlaceReading[]> {
  if (!cached || Date.now() >= expiresAt) {
    expiresAt = Date.now() + 60000;
    cached = load().then((readings) => {
      if (readings.some((r) => r.refreshDelayed) || readings.every((r) => r.dataStatus === "unavailable")) expiresAt = Date.now() + 15000;
      return readings;
    });
  }
  return cached;
}
export async function getPlaceConditions(placeId: string): Promise<PlaceReading | null> {
  return (await getAllPlaceConditions()).find((r) => r.condition.place.id === placeId) ?? null;
}
