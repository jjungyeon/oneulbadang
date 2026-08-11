import type { ReactNode } from "react";

import type { PlaceStatus } from "@/types/condition";

/**
 * 여섯 상태의 캐릭터.
 *
 * 몸통과 얼굴 뼈대는 여섯이 공유하고, 상태마다 바뀌는 건 네 가지뿐이다.
 * 입 모양 / 수영복 색 / 주변 요소 / 움직임.
 * 파일을 상태별로 나누지 않는 이유가 이것이다 — 몸이 하나여야 여섯이 같은 캐릭터로 보인다.
 *
 * CLAUDE.md 형태 규칙: stroke 없이 채운 도형만, 끝은 둥글게,
 * 얼굴은 점 두 개와 짧은 선 하나. 코와 눈썹은 없다.
 */

const SKIN = "#F7C4A8";
const INK = "#1A1A1A";
const SEA = "#4FC3E8";
const DEEP = "#1EA7D4";
const WHITE = "#FFFFFF";
const LEAF = "#A8E063";
const SUN = "#FFD64F";
const CORAL = "#FF6B5A";
const BLOSSOM = "#FF8FB1";

/* ── 입 (짧은 선 하나) ────────────────────────────── */

const SMILE = <path d="M53.5 50.5 Q60 57 66.5 50.5 Q60 54 53.5 50.5 Z" fill={INK} />;
const SOFT_SMILE = <path d="M55 51 Q60 55.5 65 51 Q60 53.5 55 51 Z" fill={INK} />;
/* 멀뚱한 얼굴 */
const FLAT = <rect x="54.5" y="50.6" width="11" height="2.6" rx="1.3" fill={INK} />;
/* 추워서 오므린 입 */
const SMALL = <rect x="56.8" y="50.6" width="6.4" height="2.6" rx="1.3" fill={INK} />;
/* 바람에 난감한 입 */
const TILTED = (
  <rect x="54.8" y="50.4" width="10.4" height="2.6" rx="1.3" fill={INK} transform="rotate(-9 60 51.7)" />
);
/* 물이 빠져 아쉬운 입 */
const FROWN = <path d="M54 54 Q60 48.5 66 54 Q60 51 54 54 Z" fill={INK} />;

/* ── 주변 요소 ────────────────────────────────────── */

/** 흰 물방울 몇 개 */
function Droplets() {
  return (
    <>
      <circle cx="26" cy="52" r="3.4" fill={WHITE} opacity="0.9" />
      <circle cx="95" cy="46" r="2.6" fill={WHITE} opacity="0.9" />
      <circle cx="88" cy="62" r="2" fill={WHITE} opacity="0.75" />
    </>
  );
}

/**
 * 몸 뒤에 깔리는 요소.
 * 앞에 두면 구름이 머리를 덮고 빗방울이 얼굴 위를 지나가 자국처럼 보인다.
 */
const BEHIND: Record<PlaceStatus, ReactNode> = {
  SWIMMING: <Droplets />,

  /* 덜덜 떠는 표시 두 개 */
  COLD: (
    <>
      <rect x="24" y="30" width="4" height="13" rx="2" fill={WHITE} opacity="0.85" transform="rotate(-18 26 36)" />
      <rect x="33" y="26" width="4" height="9" rx="2" fill={WHITE} opacity="0.7" transform="rotate(-18 35 30)" />
      <rect x="92" y="30" width="4" height="13" rx="2" fill={WHITE} opacity="0.85" transform="rotate(18 94 36)" />
      <rect x="83" y="26" width="4" height="9" rx="2" fill={WHITE} opacity="0.7" transform="rotate(18 85 30)" />
    </>
  ),

  /* 해가 떠 있다 */
  HOT: (
    <>
      <circle cx="96" cy="26" r="13" fill={SUN} />
      <circle cx="24" cy="58" r="2.6" fill={WHITE} opacity="0.8" />
    </>
  ),

  /* 바람이 지나간다 */
  WINDY: (
    <>
      <rect className="badang-drift" x="6" y="36" width="30" height="4.6" rx="2.3" fill={WHITE} opacity="0.9" />
      <rect
        className="badang-drift"
        style={{ animationDelay: "0.5s" }}
        x="12" y="52" width="22" height="4.2" rx="2.1" fill={WHITE} opacity="0.8"
      />
      <rect
        className="badang-drift"
        style={{ animationDelay: "1.1s" }}
        x="4" y="66" width="26" height="4" rx="2" fill={WHITE} opacity="0.7"
      />
    </>
  ),

  /* 수영복 차림 그대로 비를 맞는다. 우산은 씌우지 않는다. */
  RAIN: (
    <>
      <g>
        <circle cx="34" cy="20" r="11" fill={WHITE} opacity="0.95" />
        <circle cx="48" cy="17" r="14" fill={WHITE} opacity="0.95" />
        <circle cx="64" cy="21" r="10" fill={WHITE} opacity="0.95" />
        <rect x="30" y="20" width="40" height="12" rx="6" fill={WHITE} opacity="0.95" />
      </g>
      {[
        { x: 30, d: "0s" },
        { x: 44, d: "0.35s" },
        { x: 58, d: "0.7s" },
        { x: 72, d: "0.15s" },
        { x: 86, d: "0.55s" },
        { x: 96, d: "0.9s" },
      ].map(({ x, d }) => (
        <rect
          key={x}
          className="badang-drop"
          style={{ animationDelay: d }}
          x={x} y="34" width="4" height="11" rx="2"
          fill={WHITE} opacity="0.9"
        />
      ))}
    </>
  ),

  /* 물이 빠져 드러난 바닥과 조개 */
  LOW_TIDE: (
    <>
      <circle cx="26" cy="40" r="2.4" fill={WHITE} opacity="0.7" />
      <circle cx="97" cy="44" r="2" fill={WHITE} opacity="0.6" />
    </>
  ),
};

/** 몸 앞에 오는 요소. 튜브는 몸을 감싸야 하므로 앞이다. */
const FRONT: Partial<Record<PlaceStatus, ReactNode>> = {
  SWIMMING: (
    <g>
      <circle cx="60" cy="80" r="25" fill={BLOSSOM} />
      <circle cx="60" cy="80" r="15.5" fill={SEA} />
    </g>
  ),
};

/** 물이 빠진 바닥. LOW_TIDE에서만 몸 뒤에 깔린다. */
const SAND = (
  <>
    <path d="M0 96 Q30 88 60 94 Q90 100 120 92 L120 120 L0 120 Z" fill={SUN} />
    <circle cx="34" cy="106" r="4.5" fill={BLOSSOM} />
    <circle cx="88" cy="110" r="3.6" fill={CORAL} />
  </>
);

/* ── 상태별 설정 ──────────────────────────────────── */

interface Look {
  suit: string;
  mouth: ReactNode;
  /** 물 표면 높이. 낮을수록 물이 많다. */
  waterY: number;
  bodyClass: string;
}

const LOOKS: Record<PlaceStatus, Look> = {
  SWIMMING: { suit: LEAF, mouth: SMILE, waterY: 88, bodyClass: "badang-bob" },
  COLD: { suit: DEEP, mouth: SMALL, waterY: 82, bodyClass: "badang-shiver" },
  HOT: { suit: CORAL, mouth: SOFT_SMILE, waterY: 92, bodyClass: "badang-float" },
  WINDY: { suit: SUN, mouth: TILTED, waterY: 86, bodyClass: "badang-lean" },
  RAIN: { suit: BLOSSOM, mouth: FLAT, waterY: 88, bodyClass: "badang-settle" },
  LOW_TIDE: { suit: LEAF, mouth: FROWN, waterY: 112, bodyClass: "badang-settle" },
};

interface SeaCharacterProps {
  status: PlaceStatus;
  size?: number;
}

export default function SeaCharacter({ status, size = 104 }: SeaCharacterProps) {
  const look = LOOKS[status];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-hidden="true"
      className="shrink-0"
    >
      <defs>
        <clipPath id="badang-round">
          <circle cx="60" cy="60" r="60" />
        </clipPath>
      </defs>

      <g clipPath="url(#badang-round)">
        <circle cx="60" cy="60" r="60" fill={SEA} />

        {status === "LOW_TIDE" && SAND}
        {BEHIND[status]}

        {/* 공통 몸통과 얼굴 */}
        <g className={`badang-anim ${look.bodyClass}`}>
          {/* 팔 */}
          <rect x="35" y="56" width="9" height="24" rx="4.5" fill={SKIN} />
          <rect x="76" y="56" width="9" height="24" rx="4.5" fill={SKIN} />
          {/* 다리 */}
          <rect x="52" y="80" width="8" height="24" rx="4" fill={SKIN} />
          <rect x="60" y="80" width="8" height="24" rx="4" fill={SKIN} />
          {/* 몸통 = 수영복 */}
          <rect x="47" y="53" width="26" height="32" rx="13" fill={look.suit} />
          {/* 머리 */}
          <circle cx="60" cy="40" r="16" fill={SKIN} />
          {/* 머리카락. sweep-flag 1이라야 왼쪽 끝에서 위를 지나 오른쪽 끝으로 간다. */}
          <path d="M44 40 A16 16 0 0 1 76 40 Z" fill={INK} />
          {/* 얼굴 = 점 두 개와 짧은 선 하나 */}
          <circle cx="53.4" cy="43.5" r="2.3" fill={INK} />
          <circle cx="66.6" cy="43.5" r="2.3" fill={INK} />
          {look.mouth}
        </g>

        {FRONT[status]}

        {/* 물. 몸 앞에 깔려 하반신을 가린다. */}
        <g>
          <path
            d={`M0 ${look.waterY} Q20 ${look.waterY - 6} 40 ${look.waterY} T80 ${look.waterY} T120 ${look.waterY} L120 120 L0 120 Z`}
            fill={DEEP}
          />
          <circle cx="22" cy={look.waterY + 5} r="2.6" fill={WHITE} opacity="0.8" />
          <circle cx="58" cy={look.waterY + 8} r="2" fill={WHITE} opacity="0.7" />
          <circle cx="94" cy={look.waterY + 4} r="2.4" fill={WHITE} opacity="0.75" />
        </g>
      </g>
    </svg>
  );
}
