import Image from "next/image";

import type { PlaceStatus } from "@/types/condition";

/**
 * 상태별 캐릭터 장면.
 *
 * 캐릭터는 public/characters 의 PNG 한 장을 통째로 쓴다. 조각내지 않는다.
 * 그 밖의 것 — 하늘, 물, 파도, 날씨, 모래 — 은 전부 여기서 SVG와 CSS로 그린다.
 * 이미지 파일은 캐릭터 여섯 장이 전부다.
 *
 * 쌓는 순서: 하늘 → 배경 흰 점 → 캐릭터 → 물(캐릭터 앞을 가로지른다) → 날씨.
 */

const BAND_HEIGHT = 220;

/** 물마루 띠의 높이. 물 높이가 변해도 이 띠는 그대로 표면에 얹혀 따라 올라간다. */
const CREST_HEIGHT = 44;

const SKY = "#4FC3E8";
const DEEP = "#1EA7D4";
const WHITE = "#FFFFFF";
const SUN = "#FFD64F";
const WET_SAND = "#D8CDBF";

interface Scene {
  /** 자세별 물 높이 기준값. 영역 높이에 대한 비율. 0이면 물이 없다. */
  waterBase: number;
  /** 물때에 따라 오르내리는 폭. ratio 0에서 기준값 -절반, 1에서 +절반. */
  waterSpan: number;
  /** 파도 진폭 배수 */
  waveScale: number;
  /** 파도가 한 바퀴 도는 시간(초). 뒤 겹이 느리다. */
  waveBackSeconds: number;
  waveFrontSeconds: number;
  /** 캐릭터에 거는 움직임 클래스. 빈 문자열이면 고정. */
  motion: string;
}

/**
 * 자세가 달라서 물에 잠기는 높이가 다르다.
 * swimming은 튜브를 끼고 다리만 아래로 뻗어 있어 상체가 드러나야 하고,
 * hot은 누워 있고, 나머지는 서 있다.
 * 상한을 넘기지 않게 잡아 두어서 어떤 물때에도 얼굴이 잠기지 않는다.
 */
const SCENES: Record<PlaceStatus, Scene> = {
  SWIMMING: { waterBase: 0.28, waterSpan: 0.16, waveScale: 1, waveBackSeconds: 17, waveFrontSeconds: 11, motion: "badang-swim" },
  HOT: { waterBase: 0.34, waterSpan: 0.16, waveScale: 1, waveBackSeconds: 19, waveFrontSeconds: 12, motion: "badang-float" },
  COLD: { waterBase: 0.14, waterSpan: 0.12, waveScale: 1, waveBackSeconds: 18, waveFrontSeconds: 11.5, motion: "badang-shiver" },
  WINDY: { waterBase: 0.11, waterSpan: 0.1, waveScale: 1.5, waveBackSeconds: 9, waveFrontSeconds: 5.5, motion: "badang-tip" },
  RAIN: { waterBase: 0.09, waterSpan: 0.1, waveScale: 1.5, waveBackSeconds: 9.5, waveFrontSeconds: 6, motion: "" },
  LOW_TIDE: { waterBase: 0, waterSpan: 0, waveScale: 1, waveBackSeconds: 0, waveFrontSeconds: 0, motion: "" },
};

const IMAGE_SRC: Record<PlaceStatus, string> = {
  SWIMMING: "/characters/swimming.png",
  COLD: "/characters/cold.png",
  HOT: "/characters/hot.png",
  WINDY: "/characters/windy.png",
  RAIN: "/characters/rain.png",
  LOW_TIDE: "/characters/low_tide.png",
};

/**
 * 물결 한 겹. 폭 800짜리 안에 주기 200의 물결을 네 번 반복한다.
 * 이 조각을 폭 200%로 늘여 절반만큼 밀면 같은 모양이 이어져 끊김 없이 흐른다.
 */
function wavePath(amplitude: number, surface: number) {
  let d = `M0 ${surface}`;
  for (let x = 0; x < 800; x += 200) {
    d += ` q50 ${-amplitude} 100 0 t100 0`;
  }
  return `${d} L800 ${CREST_HEIGHT} L0 ${CREST_HEIGHT} Z`;
}

/** 흐르는 물결 한 겹. 물 표면에 얹히는 고정 높이 띠다. */
function WaveLayer({
  seconds,
  delay = 0,
  children,
}: {
  seconds: number;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <svg
      className="badang-wave absolute bottom-0 left-0 h-full"
      style={{ width: "200%", animationDuration: `${seconds}s`, animationDelay: `${delay}s` }}
      viewBox={`0 0 1600 ${CREST_HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {/* 폭 200%를 채우려면 같은 물결을 두 번 이어 붙인다. */}
      <g>{children}</g>
      <g transform="translate(800 0)">{children}</g>
    </svg>
  );
}

interface SeaCharacterProps {
  status: PlaceStatus;
  /** PRD 11번 물때 ratio. 값이 없으면 중간으로 본다. */
  tideRatio?: number;
}

export default function SeaCharacter({ status, tideRatio }: SeaCharacterProps) {
  const scene = SCENES[status];

  // 물때가 물 높이를 정한다. ratio는 0~1 밖으로 나가지 않게 잘라 쓴다.
  const ratio = Math.min(1, Math.max(0, tideRatio ?? 0.5));
  const waterRatio =
    scene.waterBase > 0 ? scene.waterBase + (ratio - 0.5) * scene.waterSpan : 0;
  const waterHeight = Math.round(BAND_HEIGHT * waterRatio);

  const amplitude = 9 * scene.waveScale;
  const surface = CREST_HEIGHT - amplitude - 4;

  return (
    <div
      className="relative -mx-6 overflow-hidden rounded-b-3xl"
      style={{ height: BAND_HEIGHT, background: SKY }}
    >
      {/* 배경에 흩뿌린 작은 흰 점 */}
      {(status === "SWIMMING" || status === "COLD") && (
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 390 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          {[
            { x: 44, y: 40, r: 5, d: 0 },
            { x: 74, y: 74, r: 3, d: 1.1 },
            { x: 330, y: 34, r: 4.2, d: 0.5 },
            { x: 356, y: 68, r: 2.6, d: 1.7 },
            { x: 300, y: 104, r: 3.4, d: 2.2 },
            { x: 30, y: 118, r: 2.8, d: 1.4 },
          ].map((dot) => (
            <circle
              key={`${dot.x}-${dot.y}`}
              // COLD는 움직임이 없다.
              className={status === "SWIMMING" ? "badang-rise" : undefined}
              style={status === "SWIMMING" ? { animationDelay: `${dot.d}s` } : undefined}
              cx={dot.x}
              cy={dot.y}
              r={dot.r}
              fill={WHITE}
              opacity="0.75"
            />
          ))}
        </svg>
      )}

      {/* 캐릭터. 잘리지 않도록 통째로 영역 안에 넣는다. */}
      <div className={`absolute inset-0 ${scene.motion}`}>
        <Image
          src={IMAGE_SRC[status]}
          alt=""
          aria-hidden="true"
          fill
          priority
          sizes="(max-width: 430px) 100vw, 430px"
          className="object-contain"
        />
      </div>

      {/*
        물. 캐릭터 앞을 가로지르는 층이다.
        높이만 바뀌고 물마루 띠는 그 위에 붙어 있어서, 물때가 달라지면 파도가 함께 오르내린다.
      */}
      {waterHeight > 0 && (
        <div
          className="absolute inset-x-0 bottom-0"
          style={{ height: waterHeight, transition: "height 0.6s ease-in-out" }}
        >
          {/* 물 몸통 */}
          <div className="absolute inset-0" style={{ background: DEEP }} />

          {/* 표면의 물결. 띠의 아래쪽 끝이 물 몸통의 위쪽 끝과 맞물린다. */}
          <div className="absolute inset-x-0 overflow-hidden" style={{ top: -CREST_HEIGHT, height: CREST_HEIGHT }}>
            {/* 뒤 겹 — 느리게 */}
            <WaveLayer seconds={scene.waveBackSeconds}>
              <path d={wavePath(amplitude * 0.8, surface - 3)} fill={DEEP} opacity="0.55" />
            </WaveLayer>

            {/* 앞 겹 — 빠르게. 굵은 흰 띠를 먼저 깔고 그 위를 물이 덮어 마루만 남긴다. */}
            <WaveLayer seconds={scene.waveFrontSeconds} delay={-2}>
              <>
                <path d={wavePath(amplitude, surface - 13)} fill={WHITE} />
                <path d={wavePath(amplitude, surface)} fill={DEEP} />
              </>
            </WaveLayer>
          </div>
        </div>
      )}

      {/* 물이 빠진 바닥. 젖은 모래와 얕은 웅덩이. */}
      {status === "LOW_TIDE" && (
        <svg className="absolute inset-x-0 bottom-0 w-full" height={Math.round(BAND_HEIGHT * 0.15)} viewBox="0 0 390 33" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 6 Q98 0 195 5 T390 3 L390 33 L0 33 Z" fill={WET_SAND} />
          <ellipse cx="70" cy="20" rx="34" ry="6" fill={DEEP} opacity="0.35" />
          <ellipse cx="205" cy="26" rx="26" ry="5" fill={DEEP} opacity="0.3" />
          <ellipse cx="318" cy="18" rx="30" ry="5.5" fill={DEEP} opacity="0.32" />
        </svg>
      )}

      {/* 날씨 요소 */}
      {status === "RAIN" && (
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 390 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          {[
            { x: 24, s: 1.15, d: 0 }, { x: 62, s: 1.5, d: 0.55 }, { x: 104, s: 1.3, d: 1.1 },
            { x: 148, s: 1.6, d: 0.3 }, { x: 196, s: 1.2, d: 0.85 }, { x: 238, s: 1.45, d: 0.15 },
            { x: 284, s: 1.25, d: 0.7 }, { x: 326, s: 1.55, d: 1.25 }, { x: 362, s: 1.35, d: 0.45 },
          ].map((drop) => (
            <rect
              key={drop.x}
              className="badang-drop"
              style={{ animationDuration: `${drop.s}s`, animationDelay: `${drop.d}s` }}
              x={drop.x}
              y="-16"
              width="4"
              height="18"
              rx="2"
              fill={WHITE}
              opacity="0.9"
            />
          ))}
        </svg>
      )}

      {status === "WINDY" && (
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 390 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          {[
            { y: 44, w: 74, t: 0, s: 4.2 },
            { y: 92, w: 56, t: 1.3, s: 3.4 },
            { y: 138, w: 64, t: 2.4, s: 4.8 },
          ].map((line) => (
            <path
              key={line.y}
              className="badang-blow"
              style={{ animationDelay: `${line.t}s`, animationDuration: `${line.s}s` }}
              d={`M0 ${line.y} q${line.w / 4} -9 ${line.w / 2} 0 t${line.w / 2} 0 v6 q-${line.w / 4} 9 -${line.w / 2} 0 t-${line.w / 2} 0 z`}
              fill={WHITE}
              opacity="0.9"
            />
          ))}
        </svg>
      )}

      {status === "HOT" && (
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 390 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <circle cx="330" cy="46" r="24" fill={SUN} />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
            <rect
              key={angle}
              x="328"
              y="10"
              width="4"
              height="11"
              rx="2"
              fill={SUN}
              transform={`rotate(${angle} 330 46)`}
            />
          ))}
        </svg>
      )}
    </div>
  );
}
