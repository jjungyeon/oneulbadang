import type { Place } from "@/types/place";
import { waterplayAdvice } from "./waterplayAdvice";
import type {
  Condition,
  Observation,
  PlaceStatus,
  TideData,
  TideStatus,
} from "@/types/condition";

/** 판단 기준값. 바꿀 일이 있으면 여기만 고친다. */
export const THRESHOLD = {
  windSpeed: 10, // m/s 이상이면 바람
  coldWater: 20, // ℃ 미만이면 추움
  hotWater: 28, // ℃ 이상이면 더움
} as const;

/**
 * 상태 문구.
 * NF-02에 따라 "수영 안전", "안전합니다", "수영해도 됩니다"는 쓰지 않는다.
 */
export const STATUS_MESSAGE: Record<PlaceStatus, string> = {
  RAIN: "비가 오고 있어요",
  WINDY: "바람이 꽤 불어요",
  COLD: "관측 수온이 20℃ 미만이에요",
  HOT: "관측 수온이 28℃ 이상이에요",
  LOW_TIDE: "물높이가 오늘 범위에서 낮은 편이에요",
  SWIMMING: "관측된 바다 정보를 확인해 주세요",
};

/** Height and observed direction are separate; neither establishes bathing suitability. */
export const TIDE_LABEL: Record<TideStatus, string> = {
  LOW: "낮은 편",
  FALLING: "물높이 하강 중",
  MID: "중간 높이",
  RISING: "물높이 상승 중",
  HIGH: "높은 편",
  UNKNOWN: "정보 없음",
};

/**
 * PRD 11번 물때 해석.
 * ratio = (현재 - 오늘 최저) / (오늘 최고 - 오늘 최저)
 * 이 값은 해당 해변의 실제 수심이 아니다.
 */
export function tideRatio(tide: TideData): number | undefined {
  const { currentLevel, lowLevel, highLevel } = tide;
  if (
    currentLevel === undefined ||
    lowLevel === undefined ||
    highLevel === undefined ||
    ![currentLevel, lowLevel, highLevel].every(Number.isFinite)
  ) {
    return undefined;
  }

  const span = highLevel - lowLevel;
  if (span <= 0) return undefined;
  // Do not compare yesterday's last observation with today's predicted range.
  if (tide.forecastDate) {
    const stamp = Date.parse(tide.observedAt);
    if (!Number.isFinite(stamp) || new Date(stamp + 9 * 3600000).toISOString().slice(0, 10).replaceAll("-", "") !== tide.forecastDate) return undefined;
  }

  const ratio = (currentLevel - lowLevel) / span;
  return Math.min(1, Math.max(0, ratio));
}

/** Low/high describe the daily range; rising/falling require an observed change. */
export function toTideStatus(tide: TideData): TideStatus {
  if (!Number.isFinite(tide.currentLevel)) return "UNKNOWN";
  const ratio = tideRatio(tide);

  // 조위 수치가 없으면 변화 방향만으로 대신 읽는다.
  if (ratio === undefined) {
    if (tide.trend === "RISING") return "RISING";
    if (tide.trend === "FALLING") return "FALLING";
    return "UNKNOWN";
  }

  if (ratio < 0.2) return "LOW";
  if (ratio >= 0.8) return "HIGH";
  if (tide.trend === "RISING") return "RISING";
  if (tide.trend === "FALLING") return "FALLING";
  return "MID";
}

/**
 * FN-04 판단 우선순위.
 * 비 → 바람 → 추움 → 더움 → 낮은 조위 → 기본 상태.
 * Known individual conditions can be described with partial data. Missing data never implies suitability.
 */
export function toStatus(
  observation: Observation,
  tideStatus: TideStatus,
): PlaceStatus | null {
  const { weather, water } = observation;

  if (weather.rain) return "RAIN";
  if (Number.isFinite(weather.windSpeed) && weather.windSpeed! >= THRESHOLD.windSpeed) return "WINDY";

  if (water.temperature !== undefined && Number.isFinite(water.temperature)) {
    if (water.temperature < THRESHOLD.coldWater) return "COLD";
    if (water.temperature >= THRESHOLD.hotWater) return "HOT";
  }

  if (tideStatus === "LOW") return "LOW_TIDE";

  if (weather.rain === undefined || weather.sky === undefined ||
    weather.windSpeed === undefined || !Number.isFinite(weather.windSpeed) || weather.windSpeed < 0 ||
    water.temperature === undefined || !Number.isFinite(water.temperature) ||
    tideRatio(observation.tide) === undefined) return null;

  return "SWIMMING";
}

export function evaluateCondition(
  place: Place,
  observation: Observation,
  isMock: boolean,
): Condition {
  const tideStatus = toTideStatus(observation.tide);
  const status = toStatus(observation, tideStatus);
  const hasInformation = [observation.tide.currentLevel, observation.water.temperature,
    observation.weather.sky, observation.weather.rain, observation.weather.windSpeed].some((value) => value !== undefined);
  let message = status ? STATUS_MESSAGE[status] : hasInformation ? "일부 정보만 확인됐어요" : "현재 정보를 확인하지 못했어요";
  if (status === "RAIN" && observation.weather.kind === "forecast") {
    message = observation.weather.precipitationCode === 3 ? "눈 예보가 있어요" : "비 또는 눈 예보가 있어요";
    if ([1, 4].includes(observation.weather.precipitationCode ?? -1)) message = "비 예보가 있어요";
  }
  if (status === "WINDY" && observation.weather.windKind === "forecast") message = "강한 바람이 예보됐어요";
  if (status === null && Number.isFinite(observation.tide.currentLevel)) {
    if (observation.tide.trend === "RISING") message = "물높이는 상승 중, 일부 정보는 확인 중이에요";
    else if (observation.tide.trend === "FALLING") message = "물높이는 하강 중, 일부 정보는 확인 중이에요";
  }
  if (status === "SWIMMING") {
    if (tideStatus === "HIGH") message = "물높이가 오늘 범위에서 높은 편이에요";
    else if (observation.tide.trend === "RISING") message = "최근 관측에서 물높이가 올라갔어요";
    else if (observation.tide.trend === "FALLING") message = "최근 관측에서 물높이가 내려갔어요";
    else if (observation.tide.trend === "STABLE") message = "최근 두 관측의 물높이가 같아요";
    else message = "물높이는 중간, 변화 방향은 확인 중이에요";
  }

  return {
    advice: waterplayAdvice(observation),
    place,
    status,
    message,
    tideStatus,
    isMock,
  };
}
