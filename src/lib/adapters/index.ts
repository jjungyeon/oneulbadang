import { PLACES } from "@/data/places";
import { getMockObservation } from "@/data/mock";
import { evaluateCondition } from "@/lib/condition";
import type { Observation, PlaceReading } from "@/types/condition";
import type { Place } from "@/types/place";

import { STATION_NAME_BY_REGION } from "./config";
import { getTide } from "./tide";
import { getWaterTemperature } from "./waterTemperature";
import { getWeather } from "./weather";

/**
 * 한 장소의 관측값을 모은다.
 *
 * 예시 데이터에서 출발해 실제로 받아 온 항목만 덮어쓴다.
 * 조위·수온·날씨 셋이 모두 실데이터일 때만 isMock이 false가 된다.
 * 하나라도 예시면 화면의 "예시 데이터입니다"가 계속 보인다(FN-09).
 */
export async function buildReading(place: Place): Promise<PlaceReading> {
  const observation: Observation = getMockObservation(place);

  // 셋을 동시에 부른다. 어느 하나가 실패해도 나머지는 살린다(NF-03).
  const [tide, water, weather] = await Promise.all([
    getTide(place).catch(() => null),
    getWaterTemperature(place).catch(() => null),
    getWeather(place).catch(() => null),
  ]);

  const stationName = STATION_NAME_BY_REGION[place.region];

  if (tide) {
    observation.tide = {
      ...observation.tide,
      currentLevel: tide.recent.currentLevel,
      previousLevel: tide.recent.previousLevel,
      observedAt: tide.recent.observedAt,
      stationName: tide.recent.stationName || stationName,
      ...(tide.range ?? {}),
    };
  }

  if (water) {
    observation.water = {
      temperature: water.temperature,
      observedAt: water.observedAt,
      stationName: water.stationName || stationName,
    };
  }

  if (weather) {
    observation.weather = {
      ...observation.weather,
      sky: weather.sky,
      rain: weather.rain,
    };
  }

  // 조위는 최저·최고까지 있어야 ratio를 낼 수 있다. 없으면 실데이터로 치지 않는다.
  const tideIsReal = Boolean(tide?.range);
  const isMock = !(tideIsReal && Boolean(water) && Boolean(weather));

  return {
    condition: evaluateCondition(place, observation, isMock),
    observation,
  };
}

/** 지도가 마커 색을 정하려면 17곳이 다 필요하다. */
export async function buildAllReadings(): Promise<PlaceReading[]> {
  return Promise.all(PLACES.map((place) => buildReading(place)));
}
