"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

import type { Place } from "@/types/place";

// Leaflet은 window에 의존하므로 서버에서 렌더하지 않는다.
const JejuMap = dynamic(() => import("@/components/JejuMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-sea" />,
});

export default function Home() {
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <JejuMap onSelectPlace={setSelectedPlace} />

      {/* 임시 확인용. Task 5에서 바텀시트로 교체한다. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex justify-center pt-safe">
        <p className="m-3 rounded-full bg-white px-5 py-3 text-base font-bold text-ink shadow-sm">
          {selectedPlace ? selectedPlace.name : "마커를 눌러보세요"}
        </p>
      </div>
    </main>
  );
}
