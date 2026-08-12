"use client";

import { useMemo, useState } from "react";

import { filterPlaces, suggestPlaces } from "@/lib/search";
import type { Place } from "@/types/place";

interface PlaceSearchProps {
  places: Place[];
  onSelect: (place: Place) => void;
}

/** 목록의 한 줄. 터치 영역 48px (NF-05). */
function ResultRow({
  place,
  onSelect,
}: {
  place: Place;
  onSelect: (place: Place) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(place)}
        className="flex h-12 w-full items-center px-5 text-left text-[15px] font-bold text-ink"
      >
        {place.name}
      </button>
    </li>
  );
}

export default function PlaceSearch({ places, onSelect }: PlaceSearchProps) {
  const [query, setQuery] = useState("");
  const trimmed = query.trim();

  const results = useMemo(
    () => filterPlaces(trimmed, places),
    [trimmed, places],
  );

  // 결과가 있을 때는 추천을 계산하지 않는다.
  const suggestions = useMemo(
    () => (trimmed && results.length === 0 ? suggestPlaces(trimmed, places) : []),
    [trimmed, results.length, places],
  );

  const handleSelect = (place: Place) => {
    setQuery("");
    onSelect(place);
  };

  return (
    <div className="pointer-events-auto w-full px-4">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="어디로 갈까요?"
        aria-label="장소 검색"
        className="h-12 w-full rounded-full bg-white px-5 text-[16px] font-bold text-ink shadow-sm outline-none placeholder:font-medium placeholder:text-ink/40"
      />

      {trimmed && (
        <div className="mt-2 overflow-hidden rounded-3xl bg-white py-1 shadow-sm">
          {results.length > 0 ? (
            <ul>
              {results.map((place) => (
                <ResultRow key={place.id} place={place} onSelect={handleSelect} />
              ))}
            </ul>
          ) : (
            <>
              <p className="px-5 py-3 text-[14px] font-bold text-ink/70">
                찾는 곳이 없어요. 혹시 여기인가요?
              </p>
              {/* 겹치는 글자가 없으면 안내 문구만 남는다. */}
              {suggestions.length > 0 && (
                <ul className="pb-1">
                  {suggestions.map((place) => (
                    <ResultRow
                      key={place.id}
                      place={place}
                      onSelect={handleSelect}
                    />
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
