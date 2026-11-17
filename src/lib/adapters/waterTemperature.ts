import { mapTideRecent } from "./tide";

/** Kept as a pure mapper for tests. Production reuses the already-fetched recent row. */
export function mapWaterTemperature(raw: unknown, now = new Date(), expectedName?: string) {
  const recent = mapTideRecent(raw, now, expectedName);
  return recent?.waterTemperature === undefined ? null : {
    temperature: recent.waterTemperature, observedAt: recent.observedAt, stationName: recent.stationName,
  };
}
