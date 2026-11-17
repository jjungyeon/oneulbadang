"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import SeaCharacter from "@/components/SeaCharacter";
import { ADVICE_STYLE, safetySourceText, waterplayAdvice } from "@/lib/waterplayAdvice";
import { tideRatio } from "@/lib/condition";
import type { SheetSize } from "@/lib/layout";
import {
  TREND_LABEL,
  skyLabel,
  toKoreanDateTime,
  waterLabel,
  windLabel,
  tideLabel,
} from "@/lib/labels";
import type { PlaceReading } from "@/types/condition";

interface PlaceSheetProps {
  reading: PlaceReading | null;
  /** 시트 높이 단계 */
  size: SheetSize;
  /** 픽셀로 환산한 현재 높이 */
  height: number;
  expandedHeight: number;
  onResize: (size: SheetSize) => void;
  onHeightChange: (height: number) => void;
  onClose: () => void;
}

/** 쓸어올린 것으로 볼 최소 이동 거리(px). 이보다 작으면 그냥 누른 것으로 본다. */
const SWIPE_THRESHOLD = 30;

/** 카드 하나. FN-06에 따라 상태 문구가 숫자보다 크다. */
function InfoCard({
  label,
  status,
  value,
}: {
  label: string;
  status: string;
  value?: string;
}) {
  return (
    <div className="rounded-2xl bg-mist px-4 py-3">
      <p className="text-[12px] font-medium text-ink/60">{label}</p>
      <p className="mt-1 text-[15px] font-bold text-ink">{status}</p>
      {value && <p className="text-[13px] text-ink/60">{value}</p>}
    </div>
  );
}

export default function PlaceSheet({
  reading,
  size,
  height,
  expandedHeight,
  onResize,
  onHeightChange,
  onClose,
}: PlaceSheetProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [shownPlaceId, setShownPlaceId] = useState(reading?.condition.place.id);
  const headerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const placeId = reading?.condition.place.id;
  const heightLimit = size === "full" ? expandedHeight : height;
  const fittedHeight = Math.min(heightLimit, contentHeight ?? heightLimit);

  // Fit the closed sheet to its content; keep overflow usable on short screens.
  useLayoutEffect(() => {
    const header = headerRef.current;
    const content = contentRef.current;
    const scroller = scrollRef.current;
    if (!header || !content || !scroller) return;
    const measure = () => setContentHeight(Math.ceil(
      header.getBoundingClientRect().height + content.getBoundingClientRect().height +
      (parseFloat(getComputedStyle(scroller).paddingBottom) || 0),
    ));
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    observer.observe(content);
    measure();
    return () => observer.disconnect();
  }, [placeId]);

  useEffect(() => {
    onHeightChange(reading ? fittedHeight : 0);
  }, [placeId, reading, fittedHeight, onHeightChange]);

  const alignInformation = useCallback(() => {
    const scroller = scrollRef.current;
    const cards = cardsRef.current;
    const content = contentRef.current;
    if (!scroller || !cards || !content) return;
    // Scroll the illustration above the information, without changing the PNG.
    scroller.scrollTo({ top: detailOpen ? cards.getBoundingClientRect().top - content.getBoundingClientRect().top : 0 });
  }, [detailOpen]);

  useLayoutEffect(() => {
    alignInformation();
  }, [alignInformation, placeId]);

  // 다른 장소를 고르면 상세는 접힌 상태로 돌아간다.
  // effect가 아니라 렌더 중에 맞춘다. effect로 하면 한 번 더 렌더된다.
  if (reading?.condition.place.id !== shownPlaceId) {
    setShownPlaceId(reading?.condition.place.id);
    setDetailOpen(false);
  }

  /**
   * 헤더를 누르면 크게 ↔ 작게, 쓸어올리면 크게, 쓸어내리면 작게.
   *
   * 위로 쓸면 손가락이 헤더 밖 지도 위에서 떨어지는데, 그 pointerup은 유실된다.
   * 그래서 손을 뗄 때가 아니라 문턱을 넘는 순간 판정한다.
   * 닫기 버튼 위에서는 포인터를 붙잡지 않는다. 붙잡으면 그 버튼이 클릭을 못 받는다.
   */
  const gesture = useRef<{ startY: number; handled: boolean } | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("[data-sheet-ignore]")) return;
    gesture.current = { startY: e.clientY, handled: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  // 손을 떼는 순간이 아니라 문턱을 넘는 순간 판정한다.
  // 위로 쓸면 손가락이 지도 위에서 떨어지는데, 그 pointerup은 여기까지 오지 않는다.
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.handled) return;
    const moved = e.clientY - g.startY;
    if (moved < -SWIPE_THRESHOLD) {
      g.handled = true;
      onResize("full");
    } else if (moved > SWIPE_THRESHOLD) {
      g.handled = true;
      onResize("peek");
    }
  };

  // 문턱을 넘지 않고 뗐으면 그냥 누른 것이다.
  const handlePointerUp = () => {
    const g = gesture.current;
    gesture.current = null;
    if (!g || g.handled) return;
    onResize(size === "full" ? "peek" : "full");
  };

  const handleHandleKey = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    onResize(size === "full" ? "peek" : "full");
  };

  useEffect(() => {
    if (!reading) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reading, onClose]);

  const advice = reading?.condition.advice ?? (reading ? waterplayAdvice(reading.observation) : null);
  const adviceStyle = ADVICE_STYLE[advice?.level ?? "unknown"];

  return (
    <AnimatePresence>
      {reading && (
        /* 지도를 덮는 배경막은 두지 않는다. 시트가 올라와도 지도가 그대로 보여야 한다(NF-06).
           지도 빈 곳을 누르면 JejuMap 쪽에서 닫는다. */
        <motion.section
          role="dialog"
          aria-label={`${reading.condition.place.name} 상태`}
          /* 올라오는 transform은 이 요소가, 스크롤은 안쪽 div가 맡는다.
             둘을 한 요소에 걸면 합성 레이어와 둥근 모서리 클립이 얽혀 다루기 어려워진다. */
          className="absolute inset-x-0 bottom-0 z-[1200] flex flex-col overflow-hidden rounded-t-[28px] bg-white shadow-[0_-2px_16px_rgba(0,0,0,0.08)]"
          initial={{ y: "100%", height: fittedHeight }}
          animate={{ y: 0, height: fittedHeight }}
          onAnimationComplete={alignInformation}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 420, damping: 38 }}
        >
          {/* 손잡이와 제목 줄이 높이 조절 손잡이 역할을 한다. */}
          <div
            ref={headerRef}
            className="shrink-0 cursor-pointer px-6 pt-3"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <div
              role="button"
              tabIndex={0}
              aria-label={size === "full" ? "시트 작게" : "시트 크게"}
              aria-expanded={size === "full"}
              onKeyDown={handleHandleKey}
              className="mx-auto h-6 w-16 pt-2"
            >
              <div className="mx-auto h-1.5 w-10 rounded-full bg-ink/20" />
            </div>

            <div className="mt-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-[26px] font-black leading-tight text-ink">
                  {reading.condition.place.name}
                </h2>
                {/* NF-08. 장소명 다음으로 큰 글자이고 숫자보다 크다. */}
                <p className="mt-2 inline-flex items-center gap-2 rounded-xl px-3 py-1 text-[20px] font-bold leading-snug"
                  style={{color:adviceStyle.color, backgroundColor:adviceStyle.background}}>
                  <span aria-hidden="true">{adviceStyle.symbol}</span>{advice?.title}
                </p>
                <p className="mt-2 text-[13px] leading-snug text-ink/80">{advice?.reason}</p>
                <p className="mt-1 text-[11px] leading-snug text-ink/60">{advice?.limitation}</p>
              </div>

              <button
                type="button"
                aria-label="닫기"
                data-sheet-ignore
                onClick={onClose}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-mist text-[18px] font-bold text-ink"
              >
                ✕
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto pb-safe">
            <div ref={contentRef} className="flow-root px-6 pb-3">
              {reading.condition.status && <div className="mt-4 mb-2">
                <SeaCharacter
                  status={reading.condition.status}
                  tideRatio={tideRatio(reading.observation.tide)}
                />
              </div>}

              <section ref={cardsRef} aria-labelledby="data-information-title">
                <h3 id="data-information-title" className="mb-1 text-[14px] font-bold text-ink">데이터로 확인한 정보</h3>
                <div className="grid grid-cols-2 gap-2">
                <InfoCard
                  label="물때"
                  status={tideLabel(reading.observation.tide)}
                  value={
                    reading.observation.tide.currentLevel !== undefined
                      ? `${reading.observation.tide.currentLevel}cm`
                      : undefined
                  }
                />
                  <InfoCard
                    label="수온"
                    status={waterLabel(reading.observation.water)}
                    value={reading.observation.water.temperature !== undefined ? `${reading.observation.water.temperature}℃ · 관측` : undefined}
                  />
                <InfoCard
                  label="날씨 · 예보"
                  status={skyLabel(reading.observation.weather)}
                  value={reading.observation.weather.airTemperature !== undefined ? `${reading.observation.weather.airTemperature}℃ · ${reading.observation.weather.airKind === "observed" ? "관측" : "예보"}` : undefined}
                />
                <InfoCard
                  label="바람"
                  status={windLabel(reading.observation.weather)}
                  value={reading.observation.weather.windSpeed !== undefined ? `${reading.observation.weather.windSpeed}m/s · ${reading.observation.weather.windKind === "observed" ? "관측" : "예보"}` : undefined}
                />
              </div>

              </section>

              <section aria-labelledby="field-check-title" className="mt-3 rounded-2xl border border-ink/10 px-3 py-2 text-[12px] leading-relaxed text-ink/80">
                <h3 id="field-check-title" className="text-[14px] font-bold text-ink">현장에서 추가로 확인</h3>
                {!detailOpen ? <p className="mt-1">통제 안내 · 실제 파도·물살·수심</p> : <>
                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                  <li>입수 통제·금지 표지와 안전요원 안내</li>
                  <li>실제 파도·물살·수심과 발밑 상태</li>
                </ul>
                <p className="mt-1 text-[11px] text-ink/60">이안류는 눈으로 판단하기 어려워요. 안전요원에게 확인하세요.</p>
                </>}
              </section>

              {/* FN-12 */}
              <button
                type="button"
                onClick={() => {
                  if (!detailOpen) onResize("full");
                  setDetailOpen((v) => !v);
                }}
                aria-expanded={detailOpen}
                className="mt-3 flex h-11 w-full items-center justify-center rounded-full bg-mist text-[15px] font-bold text-ink"
              >
                {detailOpen ? "접기" : "자세히 보기"}
              </button>

              {detailOpen && (
                <div className="mt-3 rounded-2xl bg-mist px-4 py-4 text-[13px] leading-relaxed text-ink/80">
                  <div className="mb-3 border-b border-ink/10 pb-3">
                    <p className="font-bold text-ink">공식 데이터 · 확인 상태</p>
                    <p className="text-[12px]">대표 관측소·예보 기준이며, 미확인 항목은 별도로 표시해요.</p>
                    <p className="mt-1">해수욕지수 · {safetySourceText(reading.observation.safety?.beach)}</p>
                    {reading.observation.safety?.beach.at && <p className="text-[12px]">예보 대상 · {reading.observation.safety.beach.at}</p>}
                    {reading.observation.safety?.beach.waveHeight !== undefined && <p className="text-[12px]">최고 파고 예보 · {reading.observation.safety.beach.waveHeight}m</p>}
                    <p className="mt-1">이안류 · {safetySourceText(reading.observation.safety?.rip)}</p>
                    {reading.observation.safety?.rip.at && <p className="text-[12px]">관측 · {toKoreanDateTime(reading.observation.safety.rip.at)}</p>}
                    <p className="mt-1 break-words">제주권 기상특보 · {safetySourceText(reading.observation.safety?.warning)}</p>
                    {reading.observation.safety?.warning.state === "available" && <p className="text-[12px]">지역 참고정보예요. 먼바다 특보를 이 해변의 위험·통제로 판단하지 않아요.</p>}
                    {reading.observation.safety?.warning.at && <p className="text-[12px]">발효 현황 · {toKoreanDateTime(reading.observation.safety.warning.at)}</p>}
                    <p className="mt-2 text-[12px]">‘자료 없음’이나 ‘제공 기간 아님’은 위험이 없다는 뜻이 아니에요.</p>
                    <p className="mt-2 text-[12px]">해수욕지수는 오전·오후 예보이며 입수 허가를 뜻하지 않아요. 물때는 대표 관측소의 상대적인 높이로 실제 수심·물살과 달라요.</p>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] underline">
                      <a href="https://www.data.go.kr/data/15142484/openapi.do" target="_blank" rel="noreferrer">국립해양조사원 해수욕지수</a>
                      <a href="https://www.data.go.kr/data/15156028/openapi.do" target="_blank" rel="noreferrer">이안류 지수</a>
                      <a href="https://www.weather.go.kr/w/special-report/overall.do" target="_blank" rel="noreferrer">기상청 특보 확인</a>
                    </div>
                  </div>
                  <dl className="space-y-1.5">
                    <div className="flex justify-between gap-3">
                      <dt>조위</dt>
                      <dd className="font-bold text-ink">
                        {reading.observation.tide.currentLevel !== undefined
                          ? `${reading.observation.tide.currentLevel}cm`
                          : "정보 없음"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>최근 관측 변화</dt>
                      <dd className="font-bold text-ink">
                        {TREND_LABEL[reading.observation.tide.trend]}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>다음 만조 · 예보</dt>
                      <dd className="font-bold text-ink">
                        {reading.observation.tide.nextHighTime ? toKoreanDateTime(reading.observation.tide.nextHighTime) :
                          "정보 없음"}
                        {reading.observation.tide.nextHighLevel !== undefined &&
                          ` · ${reading.observation.tide.nextHighLevel}cm`}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>다음 간조 · 예보</dt>
                      <dd className="font-bold text-ink">
                        {reading.observation.tide.nextLowTime ? toKoreanDateTime(reading.observation.tide.nextLowTime) :
                          "정보 없음"}
                        {reading.observation.tide.nextLowLevel !== undefined &&
                          ` · ${reading.observation.tide.nextLowLevel}cm`}
                      </dd>
                    </div>
                  </dl>

                  {/* NF-01 */}
                  <p className="mt-3 text-[12px] text-ink/55">
                    {reading.observation.tide.stationName ? `${reading.observation.tide.stationName} 대표 관측소 기준입니다.` : "관측 정보를 확인하지 못했습니다."}
                    해변의 실제 수심과는 다를 수 있어요. 현장 상황은 도착해서
                    직접 확인해 주세요.
                  </p>

                  <p className="mt-2 text-[12px] text-ink/55">
                    {reading.refreshDelayed && <>일부 정보의 갱신이 지연되어 최근 수신 자료를 표시합니다. 아래 기준 시각을 확인해 주세요.<br /></>}
                    바다 관측 · {toKoreanDateTime(reading.observation.tide.observedAt)}<br />
                    수온 관측 · {toKoreanDateTime(reading.observation.water.observedAt)}<br />
                    날씨 예보 대상 · {toKoreanDateTime(reading.observation.weather.forecastAt)}<br />
                    예보 발표 · {toKoreanDateTime(reading.observation.weather.issuedAt)}
                    {reading.observation.weather.grid && <><br />날씨 격자 · {reading.observation.weather.grid.nx}, {reading.observation.weather.grid.ny}</>}
                    {reading.observation.tide.forecastDate && <><br />물높이 범위 · {reading.observation.tide.forecastDate} 예측값 기준</>}
                  </p>

                  {/* NF-07 */}
                  <p className="mt-2 text-[12px] text-ink/55">
                    출처 · 국립해양조사원, 기상청
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
