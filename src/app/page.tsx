"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

import PlaceSheet from "@/components/PlaceSheet";
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

  const handleSelect = useCallback((place: Place) => setSelectedId(place.id), []);
  const handleClose = useCallback(() => setSelectedId(null), []);

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <JejuMap
        conditions={conditions}
        onSelectPlace={handleSelect}
        bottomInset={bottomInset}
        onBackgroundClick={handleClose}
      />

      {/* FN-09. 실데이터가 아니면 화면에 계속 보인다. */}
      {anyMock && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex justify-center pt-safe">
          <p className="mt-3 rounded-full bg-sun px-4 py-2 text-[13px] font-bold text-ink shadow-sm">
            예시 데이터입니다
          </p>
        </div>
      )}

      <PlaceSheet reading={selected} onClose={handleClose} />
    </main>
  );
}
