import type { Place } from "./place";

// PRD 11. 데이터 구조
export interface TideData {
  currentLevel?: number;
  previousLevel?: number;
  previousObservedAt?: string;
  lowLevel?: number;
  highLevel?: number;
  nextHighTime?: string;
  nextHighLevel?: number;
  nextLowTime?: string;
  nextLowLevel?: number;
  trend: "RISING" | "FALLING" | "STABLE" | "UNKNOWN";
  observedAt: string;
  stationName: string;
  forecastDate?: string;
}

export interface WaterTemperature {
  temperature?: number;
  observedAt: string;
  stationName: string;
}

export interface WeatherData {
  refreshDelayed?: boolean;
  airTemperature?: number;
  sky?: "CLEAR" | "CLOUDY" | "OVERCAST";
  rain?: boolean;
  precipitationCode?: number;
  windSpeed?: number;
  forecastAt?: string;
  issuedAt?: string;
  observedAt?: string;
  stationName?: string;
  grid?: { nx: number; ny: number };
  kind?: "forecast";
  airKind?: "observed" | "forecast";
  windKind?: "observed" | "forecast";
}

export type PlaceStatus =
  | "SWIMMING"
  | "COLD"
  | "HOT"
  | "WINDY"
  | "RAIN"
  | "LOW_TIDE";

export type TideStatus = "LOW" | "FALLING" | "MID" | "RISING" | "HIGH" | "UNKNOWN";

export interface Condition {
  advice?: WaterplayAdvice;
  place: Place;
  status: PlaceStatus | null;
  message: string;
  tideStatus: TideStatus;
  isMock: boolean;
}

/** 한 장소의 원본 관측값 묶음. 여기서 Condition을 유도한다. */
export interface Observation {
  safety?: SafetyData;
  tide: TideData;
  water: WaterTemperature;
  weather: WeatherData;
}

export type AdviceLevel = "good" | "caution" | "avoid" | "unknown";
export interface WaterplayAdvice {
  level: AdviceLevel;
  title: string;
  reason: string;
  limitation: string;
}
export type SourceState = "available" | "unavailable" | "access-denied" | "no-data" | "stale" | "unsupported" | "off-season";
export interface SafetySource {
  state: SourceState;
  label?: string;
  at?: string;
  checkedAt?: string;
  waveHeight?: number;
}
export interface SafetyData {
  beach: SafetySource;
  rip: SafetySource;
  warning: SafetySource;
  // No verified place-specific control feed yet. An index is not a control order.
  control: "unknown";
}

/**
 * 한 장소의 판단 결과와 그 근거가 된 관측값.
 * 지도는 condition만 쓰고, 바텀시트는 숫자를 보여줘야 해서 observation까지 쓴다.
 */
export interface PlaceReading {
  refreshDelayed?: boolean;
  condition: Condition;
  observation: Observation;
  fetchedAt?: string;
  dataStatus?: "live" | "partial" | "unavailable";
}
