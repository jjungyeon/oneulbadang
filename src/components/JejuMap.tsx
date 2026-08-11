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

/** 상단 "예시 데이터입니다" 배지가 마커를 가리지 않게 비워 두는 높이 */
const TOP_BADGE_INSET = 72;

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
  const fill = swimming ? "bg-deep" : "bg-mute";
  return L.divIcon({
    className: "",
    html: `<div class="grid h-11 w-11 place-items-center">
             <span class="block h-5 w-5 rounded-full ${fill} shadow-sm"></span>
           </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
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
function FitJeju({ bottomInset }: { bottomInset: number }) {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    let lastWidth = 0;

    const fit = (animate: boolean) => {
      map.invalidateSize({ animate: false });
      map.fitBounds(JEJU_BOUNDS, {
        paddingTopLeft: [36, TOP_BADGE_INSET],
        paddingBottomRight: [36, 36 + bottomInset],
        animate,
        duration: 0.35,
      });
    };

    fit(true);

    const observer = new ResizeObserver(() => {
      const width = container.clientWidth;
      if (width === lastWidth) return;
      lastWidth = width;
      fit(false);
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [map, bottomInset]);

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
  onBackgroundClick: () => void;
}

export default function JejuMap({
  conditions,
  onSelectPlace,
  bottomInset,
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
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        maxZoom={20}
      />
      <FitJeju bottomInset={bottomInset} />
      <MapBackgroundClick onClick={onBackgroundClick} />
      {markers}
    </MapContainer>
  );
}
