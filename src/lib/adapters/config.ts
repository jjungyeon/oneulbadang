import type { Place } from "@/types/place";

// Official portal schemas and attached guides checked 2026-11-16: docs/sources/api/.
export const TIDE_RECENT_ENDPOINT = "https://apis.data.go.kr/1192136/dtRecent/GetDTRecentApiService";
export const TIDE_RANGE_ENDPOINT = "https://apis.data.go.kr/1192136/surveyTideLevel/GetSurveyTideLevelApiService";
export const TIDE_EXTREMES_ENDPOINT = "https://apis.data.go.kr/1192136/tideFcstHghLw/GetTideFcstHghLwApiService";
export const TIDE_SERIES_ENDPOINT = "https://apis.data.go.kr/1192136/tideFcstTime/GetTideFcstTimeApiService";
export const WEATHER_ENDPOINT = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst";
export const SERVICE_KEY_PARAM = "serviceKey";

// Regional references, not measurements at each beach. Codes from the official survey guide.
export const TIDE_STATION_BY_REGION: Record<Place["region"], string> = {
  NORTH: "DT_0004", EAST: "DT_0022", WEST: "DT_0023", SOUTH: "DT_0010",
};
export const STATION_NAME_BY_REGION: Record<Place["region"], string> = {
  NORTH: "제주", EAST: "성산포", WEST: "모슬포", SOUTH: "서귀포",
};

/** KMA's published DFS Lambert conversion, computed for the selected place. */
export function weatherGridFor(place: Pick<Place, "lat" | "lng">) {
  const rad = Math.PI / 180;
  const re = 6371.00877 / 5;
  const slat1 = 30 * rad, slat2 = 60 * rad;
  const sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) /
    Math.log(Math.tan(Math.PI / 4 + slat2 / 2) / Math.tan(Math.PI / 4 + slat1 / 2));
  const sf = Math.pow(Math.tan(Math.PI / 4 + slat1 / 2), sn) * Math.cos(slat1) / sn;
  const ro = re * sf / Math.pow(Math.tan(Math.PI / 4 + 38 * rad / 2), sn);
  const ra = re * sf / Math.pow(Math.tan(Math.PI / 4 + place.lat * rad / 2), sn);
  let theta = place.lng * rad - 126 * rad;
  if (theta > Math.PI) theta -= 2 * Math.PI;
  if (theta < -Math.PI) theta += 2 * Math.PI;
  theta *= sn;
  return { nx: Math.floor(ra * Math.sin(theta) + 43.5), ny: Math.floor(ro - ra * Math.cos(theta) + 136.5) };
}
export const BEACH_INDEX_ENDPOINT = "https://apis.data.go.kr/1192136/fcstBeachv2/GetFcstBeachApiServicev2";
export const RIP_CURRENT_ENDPOINT = "https://apis.data.go.kr/1192136/ripCurrent/GetRipCurrentApiService";
export const WEATHER_WARNING_ENDPOINT = "https://apis.data.go.kr/1360000/WthrWrnInfoService/getPwnStatus";
