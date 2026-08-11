import { PLACES } from "@/data/places";
import { evaluateCondition } from "@/lib/condition";
import type { Condition, Observation, PlaceStatus } from "@/types/condition";
import type { Place } from "@/types/place";

/**
 * 예시 데이터.
 *
 * 상태를 직접 박아 넣지 않는다. 관측값만 만들어 두고 상태는 evaluateCondition이 유도한다.
 * 그래야 화면에 보이는 여섯 상태가 판단 로직을 실제로 통과한 결과가 된다.
 *
 * 시각 문자열은 고정값이다. 렌더 시점마다 값이 달라지면 hydration이 어긋난다.
 */

const OBSERVED_AT = "2026-08-12T11:00:00+09:00";

/** PRD 11번 권역 관측소 매칭. 실제 API 코드는 Task 10에서 확인해 붙인다. */
const STATION_BY_REGION: Record<Place["region"], string> = {
  NORTH: "제주",
  EAST: "성산포",
  WEST: "모슬포",
  SOUTH: "서귀포",
};

/** 오늘 최저 40cm, 최고 240cm 기준. ratio = (현재 - 40) / 200 */
const TIDE_MID = {
  currentLevel: 150, // ratio 0.55 → MID
  previousLevel: 143,
  lowLevel: 40,
  highLevel: 240,
  nextHighTime: "2026-08-12T15:40:00+09:00",
  nextHighLevel: 240,
  nextLowTime: "2026-08-12T21:10:00+09:00",
  nextLowLevel: 40,
  trend: "RISING" as const,
};

const TIDE_LOW = {
  currentLevel: 62, // ratio 0.11 → LOW
  previousLevel: 78,
  lowLevel: 40,
  highLevel: 240,
  nextHighTime: "2026-08-12T17:20:00+09:00",
  nextHighLevel: 240,
  nextLowTime: "2026-08-12T11:50:00+09:00",
  nextLowLevel: 40,
  trend: "FALLING" as const,
};

/**
 * 여섯 상태를 하나씩 만들어 내는 관측값 묶음.
 * 판단 우선순위(비 → 바람 → 추움 → 더움 → 간조 → 수영)를 넘어가는 값으로 맞춰 뒀다.
 */
const PROFILES: Record<PlaceStatus, Omit<Observation, "tide"> & { tide: typeof TIDE_MID | typeof TIDE_LOW }> = {
  SWIMMING: {
    tide: TIDE_MID,
    water: { temperature: 24.5, observedAt: OBSERVED_AT, stationName: "" },
    weather: { airTemperature: 29, sky: "CLEAR", rain: false, windSpeed: 3.2 },
  },
  RAIN: {
    tide: TIDE_MID,
    water: { temperature: 23.1, observedAt: OBSERVED_AT, stationName: "" },
    weather: { airTemperature: 26, sky: "OVERCAST", rain: true, windSpeed: 5.4 },
  },
  WINDY: {
    tide: TIDE_MID,
    water: { temperature: 23.6, observedAt: OBSERVED_AT, stationName: "" },
    weather: { airTemperature: 28, sky: "CLOUDY", rain: false, windSpeed: 11.4 },
  },
  COLD: {
    tide: TIDE_MID,
    water: { temperature: 18.2, observedAt: OBSERVED_AT, stationName: "" },
    weather: { airTemperature: 25, sky: "CLOUDY", rain: false, windSpeed: 4.1 },
  },
  HOT: {
    tide: TIDE_MID,
    water: { temperature: 28.6, observedAt: OBSERVED_AT, stationName: "" },
    weather: { airTemperature: 33, sky: "CLEAR", rain: false, windSpeed: 2.5 },
  },
  LOW_TIDE: {
    tide: TIDE_LOW,
    water: { temperature: 24.0, observedAt: OBSERVED_AT, stationName: "" },
    weather: { airTemperature: 30, sky: "CLEAR", rain: false, windSpeed: 3.0 },
  },
};

/**
 * 장소마다 어떤 예시 상황을 쓸지.
 * 여섯 상태가 최소 한 곳씩은 들어가 있어야 캐릭터 여섯 개를 다 확인할 수 있다.
 */
const PROFILE_BY_PLACE: Record<string, PlaceStatus> = {
  // 북부
  "iho-tewoo": "SWIMMING",
  hamdeok: "RAIN",
  samyang: "SWIMMING",
  "jeju-port": "WINDY",
  // 동부
  gimnyeong: "SWIMMING",
  woljeong: "HOT",
  sehwa: "SWIMMING",
  "seongsan-port": "WINDY",
  // 서부
  hyeopjae: "SWIMMING",
  geumneung: "SWIMMING",
  gwakji: "COLD",
  "panpo-port": "LOW_TIDE",
  "hallim-port": "WINDY",
  // 남부
  jungmun: "COLD",
  "seogwipo-port": "LOW_TIDE",
  "beophwan-port": "SWIMMING",
  "bomok-port": "HOT",
};

export function getMockObservation(place: Place): Observation {
  const profile = PROFILES[PROFILE_BY_PLACE[place.id] ?? "SWIMMING"];
  const station = STATION_BY_REGION[place.region];

  return {
    tide: { ...profile.tide, observedAt: OBSERVED_AT, stationName: station },
    water: { ...profile.water, stationName: station },
    weather: { ...profile.weather },
  };
}

/** 예시 데이터 기준 17곳의 상태. isMock은 항상 true다. */
export function buildMockConditions(): Condition[] {
  return PLACES.map((place) =>
    evaluateCondition(place, getMockObservation(place), true),
  );
}
