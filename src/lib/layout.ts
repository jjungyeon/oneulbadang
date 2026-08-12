/**
 * 바텀시트 높이 단계.
 *
 * 시트(자기 높이)와 지도(아래쪽 패딩)가 같은 값을 봐야 섬이 시트 위로 정확히 올라온다.
 * peek은 장소명·상태 문구·캐릭터 위쪽까지, full은 정보 카드까지 한눈에 들어오는 높이다.
 */
export const SHEET_RATIO = {
  peek: 0.4,
  full: 0.88,
} as const;

export type SheetSize = keyof typeof SHEET_RATIO;
