import type { Place } from "@/types/place";
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
  COLD: "물에 들어가기엔 조금 추워요",
  // "뜨겁다"로 쓰면 들어가지 말라는 신호로 읽힌다.
  HOT: "따뜻한 바다예요",
  LOW_TIDE: "물이 많이 빠졌어요",
  SWIMMING: "지금 물놀이하기 좋아요",
};

/** 물때 문구. PRD 11번의 구간 이름을 그대로 쓴다. */
export const TIDE_LABEL: Record<TideStatus, string> = {
  LOW: "물이 많이 빠짐",
  FALLING: "빠지는 중",
  MID: "적당함",
  RISING: "차오르는 중",
  HIGH: "물이 많이 참",
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
    highLevel === undefined
  ) {
    return undefined;
  }

  const span = highLevel - lowLevel;
  if (span <= 0) return undefined;

  const ratio = (currentLevel - lowLevel) / span;
  return Math.min(1, Math.max(0, ratio));
}

/** ratio 0~20 / 20~40 / 40~60 / 60~80 / 80~100 % 를 다섯 구간으로 읽는다. */
export function toTideStatus(tide: TideData): TideStatus {
  const ratio = tideRatio(tide);

  // 조위 수치가 없으면 변화 방향만으로 대신 읽는다.
  if (ratio === undefined) {
    if (tide.trend === "RISING") return "RISING";
    if (tide.trend === "FALLING") return "FALLING";
    return "MID";
  }

  if (ratio < 0.2) return "LOW";
  if (ratio < 0.4) return "FALLING";
  if (ratio < 0.6) return "MID";
  if (ratio < 0.8) return "RISING";
  return "HIGH";
}

/**
 * FN-04 판단 우선순위.
 * 비 → 바람 → 추움 → 더움 → 간조 → 그 외 수영.
 * 수온 실측이 없는 관측소가 있으므로(PRD 12번) 수온이 없으면 그 두 단계는 건너뛴다.
 */
export function toStatus(
  observation: Observation,
  tideStatus: TideStatus,
): PlaceStatus {
  const { weather, water } = observation;

  if (weather.rain) return "RAIN";
  if (weather.windSpeed >= THRESHOLD.windSpeed) return "WINDY";

  if (water.temperature !== undefined) {
    if (water.temperature < THRESHOLD.coldWater) return "COLD";
    if (water.temperature >= THRESHOLD.hotWater) return "HOT";
  }

  if (tideStatus === "LOW") return "LOW_TIDE";

  return "SWIMMING";
}

export function evaluateCondition(
  place: Place,
  observation: Observation,
  isMock: boolean,
): Condition {
  const tideStatus = toTideStatus(observation.tide);
  const status = toStatus(observation, tideStatus);

  return {
    place,
    status,
    message: STATUS_MESSAGE[status],
    tideStatus,
    isMock,
  };
}
