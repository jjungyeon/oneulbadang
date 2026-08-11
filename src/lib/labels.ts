import type {
  TideData,
  WaterTemperature,
  WeatherData,
} from "@/types/condition";

/**
 * 카드에 쓰는 짧은 상태 문구.
 * FN-06에 따라 이 문구가 숫자보다 크게 보인다. 숫자는 문구를 뒷받침하는 값일 뿐이다.
 */

export function waterLabel(water: WaterTemperature): string {
  if (water.temperature === undefined) return "정보 없음";
  if (water.temperature < 20) return "차가움";
  if (water.temperature >= 28) return "따뜻함";
  return "적당함";
}

export function skyLabel(weather: WeatherData): string {
  if (weather.rain) return "비";
  if (weather.sky === "CLEAR") return "맑음";
  if (weather.sky === "CLOUDY") return "구름 많음";
  return "흐림";
}

export function windLabel(weather: WeatherData): string {
  if (weather.windSpeed >= 10) return "강함";
  if (weather.windSpeed >= 4) return "보통";
  return "약함";
}

export const TREND_LABEL: Record<TideData["trend"], string> = {
  RISING: "차오르는 중",
  FALLING: "빠지는 중",
  STABLE: "변화 적음",
};

/**
 * ISO 문자열에서 시:분만 뽑는다.
 * Date로 파싱하면 기기 시간대에 따라 값이 달라진다. 예시 데이터의 +09:00을 그대로 읽는다.
 */
export function toHourMinute(iso: string | undefined): string | undefined {
  const matched = iso?.match(/T(\d{2}):(\d{2})/);
  return matched ? `${matched[1]}:${matched[2]}` : undefined;
}
