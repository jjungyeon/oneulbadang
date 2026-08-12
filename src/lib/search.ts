import type { Place } from "@/types/place";

/** 이름과 입력에서 공백을 빼고 비교한다. "월 정"으로 쳐도 찾게 한다. */
const squash = (value: string) => value.replace(/\s+/g, "");

/**
 * FN-07. 입력한 글자가 이름에 포함되면 남긴다.
 * 자동완성은 만들지 않는다 — 입력한 것만 가지고 거른다.
 */
export function filterPlaces(query: string, places: Place[]): Place[] {
  const needle = squash(query);
  if (!needle) return [];
  return places.filter((place) => squash(place.name).includes(needle));
}

/**
 * FN-08. 결과가 없을 때 글자가 하나라도 겹치는 장소를 최대 3개 고른다.
 *
 * 겹치는 글자 수만으로 줄을 세우면 "협제"에서 협재해수욕장과 제주항이 똑같이 1점이 된다.
 * 오타는 첫 글자가 맞는 경우가 많아서 첫 글자 일치에 가산점을 준다.
 */
export function suggestPlaces(
  query: string,
  places: Place[],
  limit = 3,
): Place[] {
  const needle = squash(query);
  if (!needle) return [];

  const chars = new Set(needle.split(""));

  const scored: { place: Place; score: number }[] = [];
  for (const place of places) {
    const name = squash(place.name);
    let shared = 0;
    for (const char of chars) {
      if (name.includes(char)) shared += 1;
    }
    if (shared === 0) continue;
    scored.push({
      place,
      score: shared * 2 + (name[0] === needle[0] ? 3 : 0),
    });
  }

  scored.sort(
    (a, b) => b.score - a.score || a.place.name.localeCompare(b.place.name, "ko"),
  );

  return scored.slice(0, limit).map((entry) => entry.place);
}
