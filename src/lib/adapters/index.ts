import { PLACES } from "@/data/places";
import { evaluateCondition, tideRatio } from "@/lib/condition";
import { emptyObservation } from "@/lib/readings";
import type { PlaceReading } from "@/types/condition";
import type { Place } from "@/types/place";
import { STATION_NAME_BY_REGION } from "./config";
import { getTide } from "./tide";
import { getSafety } from "./safety";
import { getWeather } from "./weather";

/** Live service never starts with mock observations or substitutes sample numbers. */
export async function buildReading(place: Place, now = new Date()): Promise<PlaceReading> {
  const observation = emptyObservation(STATION_NAME_BY_REGION[place.region]);
  const [tide, weather, safety] = await Promise.all([
    getTide(place, now).catch(() => null), getWeather(place, now).catch(() => null), getSafety(place, now).catch(() => undefined),
  ]);
  observation.safety = safety;
  const recent = tide?.recent;
  if (recent) {
    const { currentLevel, previousLevel, previousObservedAt, observedAt, stationName } = recent;
    const difference = currentLevel !== undefined && previousLevel !== undefined ? currentLevel - previousLevel : undefined;
    observation.tide = { ...observation.tide, currentLevel, previousLevel, previousObservedAt, observedAt, stationName,
      trend: difference === undefined ? "UNKNOWN" : difference > 0 ? "RISING" : difference < 0 ? "FALLING" : "STABLE" };
    observation.water = { temperature: recent.waterTemperature, observedAt, stationName };
  }
  if (tide?.range) Object.assign(observation.tide, tide.range);
  if (tide?.extremes) Object.assign(observation.tide, tide.extremes);
  observation.weather = {
    ...weather,
    airTemperature: recent?.airTemperature ?? weather?.airTemperature,
    windSpeed: recent?.windSpeed ?? weather?.windSpeed,
    airKind: recent?.airTemperature !== undefined ? "observed" : weather?.airTemperature !== undefined ? "forecast" : undefined,
    windKind: recent?.windSpeed !== undefined ? "observed" : weather?.windSpeed !== undefined ? "forecast" : undefined,
    observedAt: recent?.observedAt, stationName: recent?.stationName,
  };
  const fields = [observation.tide.currentLevel, observation.water.temperature, observation.weather.airTemperature,
    observation.weather.windSpeed, observation.weather.sky, observation.weather.rain];
  const complete = fields.every((v) => v !== undefined) && tideRatio(observation.tide) !== undefined;
  return {
    refreshDelayed: Boolean(tide?.refreshDelayed || weather?.refreshDelayed),
    condition: evaluateCondition(place, observation, false), observation, fetchedAt: now.toISOString(),
    dataStatus: complete ? "live" : fields.some((v) => v !== undefined) ? "partial" : "unavailable",
  };
}

/** The fixed 17 places share in-flight station/grid requests in the transport cache.
 * Start them together so sequential regional timeouts cannot exceed the client deadline. */
export async function buildAllReadings(): Promise<PlaceReading[]> {
  const now = new Date();
  return Promise.all(PLACES.map((place) => buildReading(place, now)));
}
