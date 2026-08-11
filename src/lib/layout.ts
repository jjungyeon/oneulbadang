/**
 * 바텀시트가 차지하는 최대 높이.
 *
 * 시트(높이 제한)와 지도(아래쪽 패딩)가 같은 값을 봐야 섬이 시트 위로 정확히 올라온다.
 * 비율은 펼침/접힘과 무관하게 고정이다. 상세를 펼칠 때마다 지도가 움직이면 어지럽다.
 */
export const SHEET_MAX_HEIGHT_RATIO = 0.64;

export const SHEET_MAX_HEIGHT = `${SHEET_MAX_HEIGHT_RATIO * 100}dvh`;
