import { callDataGoKr } from "./client";
import { WEATHER_ENDPOINT, WEATHER_GRID_BY_REGION } from "./config";
import type { Place } from "@/types/place";

/**
 * 날씨 어댑터. 기상청 단기예보.
 *
 * 1번 API에 없는 값만 여기서 가져온다 — 하늘상태(SKY)와 강수(PTY).
 * 기온·풍속은 조위관측소 실측이 더 가까워서 1번을 쓴다.
 *
 * 격자는 config의 네 권역 값을 그대로 쓴다. 매 호출마다 변환하지 않는다.
 */

export interface WeatherReading {
  sky: "CLEAR" | "CLOUDY" | "OVERCAST";
  rain: boolean;
}

/** 단기예보는 3시간 간격으로 발표된다. 지금 시각에서 가장 최근 발표시각을 고른다. */
export function latestBaseTime(now: Date): {
  baseDate: string;
  baseTime: string;
} {
  const slots = [2, 5, 8, 11, 14, 17, 20, 23];
  const stamp = new Date(now);
  // 발표 후 자료가 올라오기까지 시간이 걸린다. 10분 여유를 둔다.
  stamp.setMinutes(stamp.getMinutes() - 10);

  let hour = slots.filter((h) => h <= stamp.getHours()).pop();
  if (hour === undefined) {
    stamp.setDate(stamp.getDate() - 1);
    hour = 23;
  }

  const yyyy = stamp.getFullYear();
  const mm = String(stamp.getMonth() + 1).padStart(2, "0");
  const dd = String(stamp.getDate()).padStart(2, "0");

  return {
    baseDate: `${yyyy}${mm}${dd}`,
    baseTime: `${String(hour).padStart(2, "0")}00`,
  };
}

export async function fetchWeatherRaw(place: Place, now = new Date()) {
  const grid = WEATHER_GRID_BY_REGION[place.region];
  const { baseDate, baseTime } = latestBaseTime(now);

  return callDataGoKr(WEATHER_ENDPOINT, {
    dataType: "JSON",
    numOfRows: "300",
    pageNo: "1",
    base_date: baseDate,
    base_time: baseTime,
    nx: String(grid.nx),
    ny: String(grid.ny),
  });
}

/* 실제 응답을 확인한 뒤 채운다. 필드명을 추측하지 않는다. */
export function mapWeather(raw: unknown): WeatherReading | null {
  void raw;
  return null;
}

export async function getWeather(place: Place) {
  const raw = await fetchWeatherRaw(place);
  if (!raw?.ok) return null;
  return mapWeather(raw.json ?? raw.text);
}
