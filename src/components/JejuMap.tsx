"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvent } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { PLACES } from "@/data/places";
import type { Condition } from "@/types/condition";
import type { Place } from "@/types/place";

const JEJU_CENTER: [number, number] = [33.38, 126.55];
const JEJU_ZOOM = 9;

/** 상단 배지와 검색창이 마커를 가리지 않게 비워 두는 높이 */
const TOP_INSET_WITH_SEARCH = 132; // 시트가 닫혀 있고 검색창이 떠 있을 때
const TOP_INSET_BARE = 72; // 시트가 열려 검색창이 사라졌을 때

/** 검색으로 고른 장소로 옮겨 갈 때의 배율. 이 배율이면 마커가 서로 떨어진다. */
const FOCUS_ZOOM = 12;

/** 시트가 아무리 커져도 지도에 남겨 두는 최소 세로 높이 */
const MIN_MAP_HEIGHT = 96;

/** 마커 17곳을 모두 감싸는 범위. 화면 폭이 320~430 어디든 전부 들어오게 하는 기준이 된다. */
const JEJU_BOUNDS = L.latLngBounds(
  PLACES.map((p) => [p.lat, p.lng] as [number, number]),
);

/**
 * 마커 두 가지. FN-02에 따라 두 갈래로만 나눈다.
 * 물놀이 좋은 곳(SWIMMING)은 색이 찬 마커, 나머지는 회색 마커다.
 * 바깥 44×44는 터치 영역(NF-05), 안쪽 원이 눈에 보이는 점이다.
 */
function createMarkerIcon(swimming: boolean) {
  const fill = swimming ? "#1EA7D4" : "#C9D2DA";
  return L.divIcon({
    className: "",
    // 둥근 물방울. 몸통은 반지름 11의 원이고 아래로만 뾰족하게 모여 실제 위치를 가리킨다.
    // 호의 양 끝은 꼭짓점(12,29)에서 그은 접점이라 원과 뾰족한 끝이 매끄럽게 이어진다.
    html: `<div class="grid h-11 w-11 place-items-center">
             <svg width="24" height="30" viewBox="0 0 24 30" aria-hidden="true">
               <path d="M3.61 19.12 A11 11 0 1 1 20.39 19.12 L12 29 Z" fill="${fill}"/>
               <circle cx="12" cy="12" r="4.2" fill="#FFFFFF"/>
             </svg>
           </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 36],
  });
}

const SWIMMING_ICON = createMarkerIcon(true);
const OTHER_ICON = createMarkerIcon(false);

/**
 * 실제 화면 크기에 맞춰 제주 전체를 담는다. 마커 반지름 + 여백만큼 패딩을 준다.
 *
 * dynamic import + h-dvh 조합이라 Leaflet이 컨테이너 크기를 확정하기 전에 계산할 수 있다.
 * invalidateSize를 먼저 부르지 않으면 배율과 중심이 어긋나 동쪽 마커가 화면 밖으로 나간다.
 *
 * bottomInset은 바텀시트가 가리는 높이다. 그만큼 아래쪽 패딩을 더 줘서
 * 섬이 시트 위 영역으로 올라오게 한다 (NF-06 지도와 바텀시트가 겹치지 않는다).
 * 시트를 펼치고 접어도 섬이 움직이지 않도록 시트의 최대 높이를 기준으로 계산한다.
 *
 * 폭이 바뀔 때(회전)만 다시 맞춘다. 높이는 모바일 주소창이 접힐 때마다 바뀌는데,
 * 거기에 반응하면 사용자가 움직여 둔 지도를 되돌려 버린다.
 */
function MapView({
  bottomInset,
  focus,
}: {
  bottomInset: number;
  focus: Place | null;
}) {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const topInset = bottomInset > 0 ? TOP_INSET_BARE : TOP_INSET_WITH_SEARCH;
    let lastWidth = 0;

    const apply = (animate: boolean) => {
      map.invalidateSize({ animate: false });

      if (focus) {
        // 화면 중심을 시트 높이의 절반만큼 아래로 옮겨야 장소가 보이는 영역 가운데 온다.
        const point = map.project([focus.lat, focus.lng], FOCUS_ZOOM);
        const shifted = map.unproject(
          point.add([0, (bottomInset - topInset) / 2]),
          FOCUS_ZOOM,
        );
        map.setView(shifted, FOCUS_ZOOM, { animate, duration: 0.5 });
        return;
      }

      // 시트를 크게 열면 시트 높이가 화면의 88%까지 간다. 그대로 패딩을 주면
      // 지도에 남는 세로가 0 이하가 되어 배율 계산이 무너진다. 최소 높이를 남긴다.
      const usable = container.clientHeight - topInset - MIN_MAP_HEIGHT;
      const bottomPad = Math.max(0, Math.min(36 + bottomInset, usable));

      map.fitBounds(JEJU_BOUNDS, {
        paddingTopLeft: [36, topInset],
        paddingBottomRight: [36, bottomPad],
        animate,
        duration: 0.35,
      });
    };

    apply(true);

    const observer = new ResizeObserver(() => {
      const width = container.clientWidth;
      if (width === lastWidth) return;
      lastWidth = width;
      apply(false);
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [map, bottomInset, focus]);

  return null;
}

/** 지도 빈 곳을 누르면 시트를 닫는다. 마커 클릭은 Leaflet이 여기까지 전파하지 않는다. */
function MapBackgroundClick({ onClick }: { onClick: () => void }) {
  useMapEvent("click", onClick);
  return null;
}

interface JejuMapProps {
  conditions: Condition[];
  onSelectPlace: (place: Place) => void;
  /** 바텀시트가 아래에서 가리는 높이(px). 0이면 시트가 닫힌 상태다. */
  bottomInset: number;
  /** 검색으로 고른 장소. null이면 제주 전체를 담는다. */
  focus: Place | null;
  onBackgroundClick: () => void;
}

export default function JejuMap({
  conditions,
  onSelectPlace,
  bottomInset,
  focus,
  onBackgroundClick,
}: JejuMapProps) {
  const markers = useMemo(
    () =>
      conditions.map(({ place, status }) => {
        const swimming = status === "SWIMMING";
        return (
          <Marker
            key={place.id}
            position={[place.lat, place.lng]}
            icon={swimming ? SWIMMING_ICON : OTHER_ICON}
            // 마커가 겹치는 구간에서는 색이 찬 쪽이 위로 오게 한다.
            zIndexOffset={swimming ? 1000 : 0}
            eventHandlers={{ click: () => onSelectPlace(place) }}
          />
        );
      }),
    [conditions, onSelectPlace],
  );

  return (
    <MapContainer
      center={JEJU_CENTER}
      zoom={JEJU_ZOOM}
      minZoom={8}
      maxZoom={16}
      zoomSnap={0.25}
      zoomControl={false}
      attributionControl
      className="h-full w-full bg-sea"
    >
      {/* 바다가 파란 타일을 쓴다. CARTO Positron은 바다가 회색이라 여름 느낌이 죽는다. */}
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />
      <MapView bottomInset={bottomInset} focus={focus} />
      <MapBackgroundClick onClick={onBackgroundClick} />
      {markers}
    </MapContainer>
  );
}
