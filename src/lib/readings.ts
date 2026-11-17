import { PLACES } from "@/data/places";
import { evaluateCondition, tideRatio } from "./condition";
import { freshObservation, koreanDate } from "./adapters/parse";
import type { Observation, PlaceReading } from "@/types/condition";
import type { Place } from "@/types/place";

export function emptyObservation(stationName = ""): Observation {
  return { tide: { trend: "UNKNOWN", observedAt: "", stationName }, water: { observedAt: "", stationName }, weather: {} };
}
export function unavailableReading(place: Place): PlaceReading {
  const observation = emptyObservation();
  return { condition: evaluateCondition(place, observation, false), observation, dataStatus: "unavailable" };
}
export const unavailableReadings = () => PLACES.map(unavailableReading);

/** Client network failure: retain only an explicitly dated, still-valid recent snapshot. */
export function retainRecentReading(previous: PlaceReading, now = new Date()): PlaceReading {
  const age = now.getTime() - Date.parse(previous.fetchedAt ?? "");
  const place = previous.condition.place;
  if (!Number.isFinite(age) || age < 0 || age >= 600000) return unavailableReading(place);
  const old = previous.observation;
  const observation = emptyObservation(old.tide.stationName);
  if (freshObservation(old.tide.observedAt, now)) observation.tide = { ...old.tide };
  if (old.tide.forecastDate === koreanDate(now)) {
    Object.assign(observation.tide, { lowLevel: old.tide.lowLevel, highLevel: old.tide.highLevel, forecastDate: old.tide.forecastDate });
  } else {
    observation.tide.lowLevel = undefined; observation.tide.highLevel = undefined; observation.tide.forecastDate = undefined;
  }
  for (const [time, level] of [["nextHighTime", "nextHighLevel"], ["nextLowTime", "nextLowLevel"]] as const) {
    const stamp = Date.parse(old.tide[time] ?? "");
    observation.tide[time] = stamp >= now.getTime() ? old.tide[time] : undefined;
    observation.tide[level] = stamp >= now.getTime() ? old.tide[level] : undefined;
  }
  if (freshObservation(old.water.observedAt, now)) observation.water = { ...old.water };
  const w = old.weather;
  const targetAge = now.getTime() - Date.parse(w.forecastAt ?? "");
  const issueAge = now.getTime() - Date.parse(w.issuedAt ?? "");
  const validForecast = targetAge >= -3600000 && targetAge < 3600000 && issueAge >= 0 && issueAge <= 6 * 3600000;
  const validObserved = freshObservation(w.observedAt, now);
  if (validForecast) observation.weather = { ...w };
  for (const [field, kind] of [["airTemperature", "airKind"], ["windSpeed", "windKind"]] as const) {
    const valid = w[kind] === "observed" ? validObserved : w[kind] === "forecast" && validForecast;
    observation.weather[field] = valid ? w[field] : undefined;
    observation.weather[kind] = valid ? w[kind] : undefined;
  }
  observation.weather.observedAt = validObserved ? w.observedAt : undefined;
  observation.weather.stationName = validObserved ? w.stationName : undefined;
  const fields = [observation.tide.currentLevel, observation.water.temperature, observation.weather.airTemperature,
    observation.weather.windSpeed, observation.weather.sky, observation.weather.rain];
  const complete = fields.every((v) => v !== undefined) && tideRatio(observation.tide) !== undefined;
  return { condition: evaluateCondition(place, observation, false), observation, fetchedAt: previous.fetchedAt,
    refreshDelayed: true, dataStatus: complete ? "live" : fields.some((v) => v !== undefined) ? "partial" : "unavailable" };
}
