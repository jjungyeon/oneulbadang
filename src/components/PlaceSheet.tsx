"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import SeaCharacter from "@/components/SeaCharacter";
import { TIDE_LABEL, tideRatio } from "@/lib/condition";
import type { SheetSize } from "@/lib/layout";
import {
  TREND_LABEL,
  skyLabel,
  toHourMinute,
  waterLabel,
  windLabel,
} from "@/lib/labels";
import type { PlaceReading } from "@/types/condition";

interface PlaceSheetProps {
  reading: PlaceReading | null;
  /** 시트 높이 단계 */
  size: SheetSize;
  /** 픽셀로 환산한 현재 높이 */
  height: number;
  onResize: (size: SheetSize) => void;
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
  onResize,
  onClose,
}: PlaceSheetProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [shownPlaceId, setShownPlaceId] = useState(reading?.condition.place.id);

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
          initial={{ y: "100%", height }}
          animate={{ y: 0, height }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 420, damping: 38 }}
        >
          {/* 손잡이와 제목 줄이 높이 조절 손잡이 역할을 한다. */}
          <div
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
                <p className="mt-1 text-[20px] font-bold leading-snug text-deep">
                  {reading.condition.message}
                </p>
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

          <div className="min-h-0 flex-1 overflow-y-auto pb-safe">
            <div className="px-6 pb-6">
              <div className="mt-4">
                <SeaCharacter
                  status={reading.condition.status}
                  tideRatio={tideRatio(reading.observation.tide)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <InfoCard
                  label="물때"
                  status={TIDE_LABEL[reading.condition.tideStatus]}
                  value={
                    reading.observation.tide.currentLevel !== undefined
                      ? `${reading.observation.tide.currentLevel}cm`
                      : undefined
                  }
                />
                {/* 수온 실측이 없는 관측소가 있다(PRD 12번). 값이 없으면 카드를 뺀다. */}
                {reading.observation.water.temperature !== undefined && (
                  <InfoCard
                    label="수온"
                    status={waterLabel(reading.observation.water)}
                    value={`${reading.observation.water.temperature}℃`}
                  />
                )}
                <InfoCard
                  label="날씨"
                  status={skyLabel(reading.observation.weather)}
                  value={`${reading.observation.weather.airTemperature}℃`}
                />
                <InfoCard
                  label="바람"
                  status={windLabel(reading.observation.weather)}
                  value={`${reading.observation.weather.windSpeed}m/s`}
                />
              </div>

              {/* FN-12 */}
              <button
                type="button"
                onClick={() => setDetailOpen((v) => !v)}
                aria-expanded={detailOpen}
                className="mt-3 flex h-11 w-full items-center justify-center rounded-full bg-mist text-[15px] font-bold text-ink"
              >
                {detailOpen ? "접기" : "자세히 보기"}
              </button>

              {detailOpen && (
                <div className="mt-3 rounded-2xl bg-mist px-4 py-4 text-[13px] leading-relaxed text-ink/80">
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
                      <dt>변화 방향</dt>
                      <dd className="font-bold text-ink">
                        {TREND_LABEL[reading.observation.tide.trend]}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>다음 만조</dt>
                      <dd className="font-bold text-ink">
                        {toHourMinute(reading.observation.tide.nextHighTime) ??
                          "정보 없음"}
                        {reading.observation.tide.nextHighLevel !== undefined &&
                          ` · ${reading.observation.tide.nextHighLevel}cm`}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>다음 간조</dt>
                      <dd className="font-bold text-ink">
                        {toHourMinute(reading.observation.tide.nextLowTime) ??
                          "정보 없음"}
                        {reading.observation.tide.nextLowLevel !== undefined &&
                          ` · ${reading.observation.tide.nextLowLevel}cm`}
                      </dd>
                    </div>
                  </dl>

                  {/* NF-01 */}
                  <p className="mt-3 text-[12px] text-ink/55">
                    {reading.observation.tide.stationName} 관측소 기준입니다.
                    해변의 실제 수심과는 다를 수 있어요. 현장 상황은 도착해서
                    직접 확인해 주세요.
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
