"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";

import { buildMockConditions } from "@/data/mock";
import type { Place } from "@/types/place";

// Leaflet은 window에 의존하므로 서버에서 렌더하지 않는다.
const JejuMap = dynamic(() => import("@/components/JejuMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-sea" />,
});

export default function Home() {
  const conditions = useMemo(() => buildMockConditions(), []);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = conditions.find((c) => c.place.id === selectedId) ?? null;
  const anyMock = conditions.some((c) => c.isMock);

  const handleSelect = (place: Place) => setSelectedId(place.id);

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <JejuMap conditions={conditions} onSelectPlace={handleSelect} />

      {/* 임시 확인용. Task 5에서 바텀시트로 교체한다. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex flex-col items-center gap-2 pt-safe">
        <p className="mt-3 rounded-full bg-white px-5 py-3 text-center text-base font-bold text-ink shadow-sm">
          {selected
            ? `${selected.place.name} · ${selected.message}`
            : "마커를 눌러보세요"}
        </p>

        {/* FN-09. 실데이터가 아니면 화면에 계속 보인다. */}
        {anyMock && (
          <p className="rounded-full bg-sun px-4 py-2 text-sm font-bold text-ink">
            예시 데이터입니다
          </p>
        )}
      </div>
    </main>
  );
}
