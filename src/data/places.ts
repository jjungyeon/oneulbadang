import type { Place } from "@/types/place";

/**
 * 제주 해변·포구 17곳.
 *
 * 좌표 출처: OpenStreetMap Nominatim 조회값 (2026-08-12 확인). 추측값 없음.
 * tideStationId는 아직 비워 둔다 — PRD 12번 위험 항목에 따라
 * 국립해양조사원 관측소 목록을 실제로 조회해 코드를 확인한 뒤 Task 10에서 채운다.
 */
export const PLACES: Place[] = [
  // 북부
  {
    id: "iho-tewoo",
    name: "이호테우해변",
    type: "BEACH",
    lat: 33.496234,
    lng: 126.455461,
    region: "NORTH",
  },
  {
    id: "hamdeok",
    name: "함덕해수욕장",
    type: "BEACH",
    lat: 33.5431881,
    lng: 126.6698794,
    region: "NORTH",
  },
  {
    id: "samyang",
    name: "삼양해수욕장",
    type: "BEACH",
    lat: 33.5257142,
    lng: 126.5868986,
    region: "NORTH",
  },
  {
    id: "jeju-port",
    name: "제주항",
    type: "PORT",
    lat: 33.524473,
    lng: 126.5448742,
    region: "NORTH",
  },

  // 동부
  {
    id: "gimnyeong",
    name: "김녕해수욕장",
    type: "BEACH",
    lat: 33.555819,
    lng: 126.760293,
    region: "EAST",
  },
  {
    id: "woljeong",
    name: "월정리해변",
    type: "BEACH",
    lat: 33.555065,
    lng: 126.799177,
    region: "EAST",
  },
  {
    id: "sehwa",
    name: "세화해변",
    type: "BEACH",
    lat: 33.525021,
    lng: 126.8604234,
    region: "EAST",
  },
  {
    id: "seongsan-port",
    name: "성산항",
    type: "PORT",
    lat: 33.470318,
    lng: 126.93008,
    region: "EAST",
  },

  // 서부
  {
    id: "hyeopjae",
    name: "협재해수욕장",
    type: "BEACH",
    lat: 33.3932945,
    lng: 126.238943,
    region: "WEST",
  },
  {
    id: "geumneung",
    name: "금능해수욕장",
    type: "BEACH",
    lat: 33.38954,
    lng: 126.235585,
    region: "WEST",
  },
  {
    id: "gwakji",
    name: "곽지해수욕장",
    type: "BEACH",
    lat: 33.4559612,
    lng: 126.3065032,
    region: "WEST",
  },
  {
    id: "panpo-port",
    name: "판포포구",
    type: "PORT",
    lat: 33.3661103,
    lng: 126.2002318,
    region: "WEST",
  },
  {
    id: "hallim-port",
    name: "한림항",
    type: "PORT",
    lat: 33.4125102,
    lng: 126.2563898,
    region: "WEST",
  },

  // 남부
  {
    id: "jungmun",
    name: "중문색달해변",
    type: "BEACH",
    lat: 33.2448545,
    lng: 126.4090386,
    region: "SOUTH",
  },
  {
    id: "seogwipo-port",
    name: "서귀포항",
    type: "PORT",
    lat: 33.239783,
    lng: 126.563933,
    region: "SOUTH",
  },
  {
    id: "beophwan-port",
    name: "법환포구",
    type: "PORT",
    lat: 33.2371596,
    lng: 126.5160706,
    region: "SOUTH",
  },
  {
    id: "bomok-port",
    name: "보목포구",
    type: "PORT",
    lat: 33.2391235,
    lng: 126.6077209,
    region: "SOUTH",
  },
];
