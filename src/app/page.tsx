"use client";

// @refresh reset
// Leaflet removes its panes on effect cleanup; refresh must recreate the map instance.

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

import PlaceSearch from "@/components/PlaceSearch";
import PlaceSheet from "@/components/PlaceSheet";
import { PLACES } from "@/data/places";
import { unavailableReadings } from "@/lib/readings";
import { getAllPlaceConditions } from "@/lib/conditions";
import { SHEET_RATIO, type SheetSize } from "@/lib/layout";
import type { Place } from "@/types/place";
import { ADVICE_STYLE } from "@/lib/waterplayAdvice";

// Leaflet은 window에 의존하므로 서버에서 렌더하지 않는다.
const JejuMap = dynamic(() => import("@/components/JejuMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-sea" />,
});

export default function Home() {
  const [readings, setReadings] = useState(unavailableReadings);
  const [loading, setLoading] = useState(true);
  const conditions = useMemo(
    () => readings.map((r) => r.condition),
    [readings],
  );

  useEffect(() => {
    let alive = true;
    const refresh = () => {
      if (document.hidden) return;
      getAllPlaceConditions().then((next) => {
        if (alive) { setReadings(next); setLoading(false); }
      });
    };
    refresh();
    const interval = setInterval(refresh, 60000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      alive = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetSize, setSheetSize] = useState<SheetSize>("full");
  const [visibleSheetHeight, setVisibleSheetHeight] = useState(0);
  const [focus, setFocus] = useState<Place | null>(null);
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    const update = () => setViewportHeight(window.innerHeight);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const selected =
    readings.find((r) => r.condition.place.id === selectedId) ?? null;
  const missingData = readings.some((r) => r.dataStatus !== "live");
  const refreshDelayed = readings.some((r) => r.refreshDelayed);

  const sheetHeight = Math.round(viewportHeight * SHEET_RATIO[sheetSize]);
  // 시트가 가리는 높이만큼 지도를 위로 밀어 올린다. 단계가 바뀌면 섬도 다시 정렬된다.
  const bottomInset = selected ? visibleSheetHeight || sheetHeight : 0;

  // 마커를 직접 누른 경우에는 검색으로 맞춰 둔 위치를 풀고 제주 전체로 돌아간다.
  // 정보를 다 보여주는 게 목적이라 '크게'로 연다.
  const handleSelectMarker = useCallback((place: Place) => {
    setFocus(null);
    setSheetSize("full");
    setSelectedId(place.id);
  }, []);

  // 검색 결과를 고르면 그 위치로 지도를 옮기고 시트를 연다.
  const handleSelectSearch = useCallback((place: Place) => {
    setFocus(place);
    setSheetSize("full");
    setSelectedId(place.id);
  }, []);

  const handleClose = useCallback(() => {
    setFocus(null);
    setSelectedId(null);
  }, []);

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <JejuMap
        conditions={conditions}
        onSelectPlace={handleSelectMarker}
        bottomInset={bottomInset}
        focus={focus}
        onBackgroundClick={handleClose}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex flex-col items-center gap-2 pt-safe">
        {/* FN-09. 실데이터가 아니면 화면에 계속 보인다. */}
        {(loading || missingData || refreshDelayed) && (
          <p className="mt-3 rounded-full bg-sun px-4 py-2 text-[13px] font-bold text-ink shadow-sm">
            {loading ? "바다 정보를 불러오는 중입니다" : readings.every((r) => r.dataStatus === "unavailable") ? "현재 정보를 불러올 수 없습니다" : refreshDelayed ? "갱신 지연 · 최근 수신 정보를 표시합니다" : "일부 정보는 확인되지 않았습니다"}
          </p>
        )}

        {/* 시트가 올라오면 검색창은 비운다. 지도가 보일 자리를 시트와 나눠 쓸 수 없다. */}
        {!selected && (
          <PlaceSearch places={PLACES} onSelect={handleSelectSearch} />
        )}
      </div>

      {!selected && <div aria-label="지도 상태 안내" className="pointer-events-none absolute inset-x-4 bottom-8 z-[1000] mx-auto w-fit rounded-2xl bg-white/95 px-4 py-2 text-[12px] shadow-sm">
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 font-bold">
          <span style={{color:ADVICE_STYLE.caution.color}}>! 주의</span>
          <span style={{color:ADVICE_STYLE.avoid.color}}>× 피하세요</span>
          <span style={{color:ADVICE_STYLE.unknown.color}}>? 입수 전 확인 필요</span>
        </div>
        <p className="mt-1 text-center text-[11px] text-ink/60">장소를 눌러 이유와 현장 확인 사항을 보세요</p>
      </div>}

      <PlaceSheet
        reading={selected}
        size={sheetSize}
        height={sheetHeight}
        expandedHeight={Math.round(viewportHeight * 0.96)}
        onResize={setSheetSize}
        onHeightChange={setVisibleSheetHeight}
        onClose={handleClose}
      />
    </main>
  );
}
