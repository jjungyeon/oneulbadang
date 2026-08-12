"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

import PlaceSearch from "@/components/PlaceSearch";
import PlaceSheet from "@/components/PlaceSheet";
import { PLACES } from "@/data/places";
import { buildMockReadings } from "@/data/mock";
import { SHEET_MAX_HEIGHT_RATIO } from "@/lib/layout";
import type { Place } from "@/types/place";

// Leaflet은 window에 의존하므로 서버에서 렌더하지 않는다.
const JejuMap = dynamic(() => import("@/components/JejuMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-sea" />,
});

export default function Home() {
  const readings = useMemo(() => buildMockReadings(), []);
  const conditions = useMemo(() => readings.map((r) => r.condition), [readings]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
  const anyMock = readings.some((r) => r.condition.isMock);

  // 시트가 가리는 높이만큼 지도를 위로 밀어 올린다.
  const bottomInset = selected
    ? Math.round(viewportHeight * SHEET_MAX_HEIGHT_RATIO)
    : 0;

  // 마커를 직접 누른 경우에는 검색으로 맞춰 둔 위치를 풀고 제주 전체로 돌아간다.
  const handleSelectMarker = useCallback((place: Place) => {
    setFocus(null);
    setSelectedId(place.id);
  }, []);

  // 검색 결과를 고르면 그 위치로 지도를 옮기고 시트를 연다.
  const handleSelectSearch = useCallback((place: Place) => {
    setFocus(place);
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
        {anyMock && (
          <p className="mt-3 rounded-full bg-sun px-4 py-2 text-[13px] font-bold text-ink shadow-sm">
            예시 데이터입니다
          </p>
        )}

        {/* 시트가 올라오면 검색창은 비운다. 지도가 보일 자리를 시트와 나눠 쓸 수 없다. */}
        {!selected && (
          <PlaceSearch places={PLACES} onSelect={handleSelectSearch} />
        )}
      </div>

      <PlaceSheet reading={selected} onClose={handleClose} />
    </main>
  );
}
