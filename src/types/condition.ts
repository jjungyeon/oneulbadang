import type { Place } from "./place";

// PRD 11. 데이터 구조
export interface TideData {
  currentLevel?: number;
  previousLevel?: number;
  lowLevel?: number;
  highLevel?: number;
  nextHighTime?: string;
  nextHighLevel?: number;
  nextLowTime?: string;
  nextLowLevel?: number;
  trend: "RISING" | "FALLING" | "STABLE";
  observedAt: string;
  stationName: string;
}

export interface WaterTemperature {
  temperature?: number;
  observedAt: string;
  stationName: string;
}

export interface WeatherData {
  airTemperature: number;
  sky: "CLEAR" | "CLOUDY" | "OVERCAST";
  rain: boolean;
  windSpeed: number;
}

export type PlaceStatus =
  | "SWIMMING"
  | "COLD"
  | "HOT"
  | "WINDY"
  | "RAIN"
  | "LOW_TIDE";

export type TideStatus = "LOW" | "FALLING" | "MID" | "RISING" | "HIGH";

export interface Condition {
  place: Place;
  status: PlaceStatus;
  message: string;
  tideStatus: TideStatus;
  isMock: boolean;
}

/** 한 장소의 원본 관측값 묶음. 여기서 Condition을 유도한다. */
export interface Observation {
  tide: TideData;
  water: WaterTemperature;
  weather: WeatherData;
}
