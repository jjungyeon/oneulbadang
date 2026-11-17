import type {
  TideData,
  WaterTemperature,
  WeatherData,
} from "@/types/condition";
import { THRESHOLD, tideRatio } from "./condition";

/**
 * 카드에 쓰는 짧은 상태 문구.
 * FN-06에 따라 이 문구가 숫자보다 크게 보인다. 숫자는 문구를 뒷받침하는 값일 뿐이다.
 */

export function waterLabel(water: WaterTemperature): string {
  if (water.temperature === undefined || !Number.isFinite(water.temperature)) return "정보 없음";
  if (water.temperature < THRESHOLD.coldWater) return "낮은 수온";
  if (water.temperature >= THRESHOLD.hotWater) return "높은 수온";
  return "20℃ 이상 28℃ 미만";
}

export function skyLabel(weather: WeatherData): string {
  if (weather.rain) {
    if (weather.precipitationCode === 3) return "눈";
    if (weather.precipitationCode === 2) return "비·눈";
    if (weather.precipitationCode === 4) return "소나기";
    return "비";
  }
  const sky = weather.sky === "CLEAR" ? "맑음" : weather.sky === "CLOUDY" ? "구름 많음" : weather.sky === "OVERCAST" ? "흐림" : undefined;
  if (!sky) return weather.rain === false ? "강수 없음 · 하늘 정보 없음" : "정보 없음";
  return weather.rain === undefined ? `${sky} · 강수 정보 없음` : sky;
}

export function windLabel(weather: WeatherData): string {
  if (weather.windSpeed === undefined || !Number.isFinite(weather.windSpeed) || weather.windSpeed < 0) return "정보 없음";
  if (weather.windSpeed >= THRESHOLD.windSpeed) return "강함";
  if (weather.windSpeed >= 4) return "보통";
  return "약함";
}

export const TREND_LABEL: Record<TideData["trend"], string> = {
  RISING: "물높이 상승",
  FALLING: "물높이 하강",
  STABLE: "최근 관측값 같음",
  UNKNOWN: "확인되지 않음",
};

/** Show both height and direction without treating low water as an exact low tide. */
export function tideLabel(tide: TideData): string {
  const ratio = tideRatio(tide);
  const height = ratio === undefined ? undefined : ratio < 0.2 ? "낮은 편" : ratio >= 0.8 ? "높은 편" : "중간 높이";
  const direction = tide.trend === "UNKNOWN" || !Number.isFinite(tide.currentLevel) ? undefined : TREND_LABEL[tide.trend];
  if (height && direction) return `${height} · ${direction}`;
  return height ? `${height} · 방향 미확인` : direction ?? "정보 없음";
}

/**
 * Always format in Korean time, independent of the browser's timezone.
 */
export function toHourMinute(iso: string | undefined): string | undefined {
  if (!iso || !Number.isFinite(Date.parse(iso))) return undefined;
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
}

export function toKoreanDateTime(iso: string | undefined): string {
  if (!iso || !Number.isFinite(Date.parse(iso))) return "정보 없음";
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
}
