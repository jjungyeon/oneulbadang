import type { Place } from "@/types/place";

/**
 * 공공데이터포털(data.go.kr) 연동 설정.
 *
 * 바다누리(oceangrid) 주소는 종료 예정이라 쓰지 않는다.
 *
 * ENDPOINT는 공공데이터포털 마이페이지 > 개발계정 > 각 API 상세 화면의
 * "END POINT"를 그대로 넣는다. 비어 있으면 그 항목은 호출하지 않고 예시 데이터를 쓴다.
 * 그래서 주소를 채우기 전에도 화면은 정상 동작한다.
 */

/** 1. 조위관측소 최신 관측 데이터 — 관측소명·위경도·관측시각·풍향·풍속·기온·수온·조위 */
export const TIDE_RECENT_ENDPOINT = "";

/** 2. 조위관측소 실측·예측 조위 — 오늘 최저·최고 조위 (ratio 계산용) */
export const TIDE_RANGE_ENDPOINT = "";

/** 3. 기상청 단기예보 조회서비스 — 하늘상태와 강수 */
export const WEATHER_ENDPOINT = "";

/**
 * 인증키 파라미터 이름. data.go.kr은 API마다 serviceKey / ServiceKey가 갈린다.
 * 상세 화면의 요청변수 표기를 그대로 쓴다.
 */
export const SERVICE_KEY_PARAM = "serviceKey";

/**
 * 권역 대표 조위관측소.
 *
 * PRD 11번 매칭은 북부 제주, 동부 성산포, 서부 모슬포, 남부 서귀포다.
 * 실제 코드는 1번 API의 관측소 목록에서 확인해 채운다. 추측해 넣지 않는다.
 * 비어 있으면 조위·수온을 예시 데이터로 둔다.
 */
export const TIDE_STATION_BY_REGION: Record<Place["region"], string> = {
  NORTH: "",
  EAST: "",
  WEST: "",
  SOUTH: "",
};

/**
 * 기상청 단기예보 격자. 권역 안 장소들의 중심 좌표를 기상청 DFS 변환식으로 옮긴 값이다.
 * 변환식은 기상청이 공개한 Lambert Conformal Conic 그대로이고,
 * 공개 예제(서울 37.5665/126.9780 → 60,127)로 검증했다.
 * 예보 조회는 격자 단위라 이 네 값만 있으면 된다.
 */
export const WEATHER_GRID_BY_REGION: Record<
  Place["region"],
  { nx: number; ny: number }
> = {
  NORTH: { nx: 53, ny: 38 }, // 33.5224, 126.5643
  EAST: { nx: 58, ny: 39 }, // 33.5266, 126.8375
  WEST: { nx: 48, ny: 36 }, // 33.4035, 126.2475
  SOUTH: { nx: 53, ny: 32 }, // 33.2402, 126.5242
};

/** 권역 관측소 이름. 화면의 "○○ 관측소 기준입니다" 문구에 쓴다(NF-01). */
export const STATION_NAME_BY_REGION: Record<Place["region"], string> = {
  NORTH: "제주",
  EAST: "성산포",
  WEST: "모슬포",
  SOUTH: "서귀포",
};
