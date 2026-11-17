import type { AdviceLevel, Observation, SafetySource, SourceState, WaterplayAdvice } from "@/types/condition";

export const ADVICE_STYLE: Record<AdviceLevel, { color: string; background: string; symbol: string }> = {
  good: { color: "#397021", background: "#EDF7E4", symbol: "✓" },
  caution: { color: "#8A5900", background: "#FFF4CE", symbol: "!" },
  avoid: { color: "#B63C30", background: "#FFEAE6", symbol: "×" },
  unknown: { color: "#5A6872", background: "#EDF1F4", symbol: "?" },
};
export const SOURCE_LABEL: Record<SourceState, string> = {
  available: "확인됨", unavailable: "연결 확인 중", "access-denied": "연결 승인 확인 필요",
  "no-data": "현재 자료 없음", stale: "최신 자료 확인 필요", unsupported: "이 장소는 제공 대상 아님",
  "off-season": "제공 기간 아님 · 6~9월 운영",
};
export const safetySourceText = (source?: SafetySource) => source?.state === "available"
  ? source.label ?? "확인됨" : SOURCE_LABEL[source?.state ?? "unavailable"];

/** Character poses describe conditions; they never grant permission to enter water.
 * Green is deliberately unreachable until verified local controls + hazards exist. */
export function waterplayAdvice(observation: Observation): WaterplayAdvice {
  const { safety, water, weather } = observation;
  const limitation = "입수 통제 여부 미확인 · 현장 안내를 먼저 확인하세요.";
  const result = (level: AdviceLevel, title: string, reason: string) => ({ level, title, reason, limitation });
  if (safety?.rip.state === "available" && ["경계", "위험"].includes(safety.rip.label ?? ""))
    return result("avoid", "물놀이 피하세요", `이안류 지수가 ‘${safety.rip.label}’ 단계예요.`);
  if (safety?.beach.state === "available" && ["나쁨", "매우나쁨"].includes(safety.beach.label ?? ""))
    return result("avoid", "물놀이 피하세요", `현재 시간대의 공식 해수욕지수가 ‘${safety.beach.label}’이에요.`);
  // Regional KMA bulletin text (including offshore seas) is shown as evidence only.
  // Until official warning areas are mapped to each place, it must not recolor all beaches.
  if (safety?.rip.state === "available" && safety.rip.label === "주의")
    return result("caution", "물놀이 주의", "이안류 지수가 ‘주의’ 단계예요.");
  if (Number.isFinite(weather.windSpeed) && weather.windSpeed! >= 10)
    return result("caution", "물놀이 주의", `${weather.windKind === "observed" ? "대표 관측소에서" : "예보에서"} 강한 바람이 확인됐어요.`);
  if (Number.isFinite(water.temperature) && water.temperature! < 20)
    return result("caution", "물놀이 주의", `대표 관측소 수온이 ${water.temperature}℃로 차가운 편이에요.`);
  if (weather.rain) {
    const precipitation = [1, 4].includes(weather.precipitationCode ?? -1) ? "비" : weather.precipitationCode === 3 ? "눈" : "비·눈";
    return result("caution", "물놀이 주의", `${precipitation} 예보가 있어요. 현장 날씨를 확인하세요.`);
  }
  if (safety?.beach.state === "available" && safety.beach.label === "보통")
    return result("caution", "물놀이 주의", "공식 해수욕지수가 ‘보통’이에요. 현장 상태를 확인하세요.");
  return result("unknown", "입수 전 확인 필요", "관측·예보 정보와 함께 현장 상태를 확인해 주세요.");
}
