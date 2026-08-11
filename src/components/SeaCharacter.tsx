import type { ReactNode } from "react";

import type { PlaceStatus } from "@/types/condition";

/**
 * 여섯 상태의 캐릭터.
 *
 * 비례는 ref/ref_01.png을 따른다 — 머리와 몸통은 작고 팔다리가 굵고 길다.
 * 배경은 투명이다. 하늘·물·파도 띠는 이 그림이 아니라 시트의 배너가 만든다.
 *
 * 여섯이 공유하는 것: 머리·얼굴·몸통·팔다리 모양과 색.
 * 상태마다 바뀌는 것: 팔다리 각도 / 입 / 소품 / 움직임.
 *
 * CLAUDE.md 형태 규칙: stroke 없이 채운 도형만, 끝은 둥글게,
 * 얼굴은 점 두 개와 짧은 선 하나. 코와 눈썹은 없다.
 */

/* ref에서 뽑은 색 */
const SKIN = "#F7A98E"; // 선명한 살구빛
const INK = "#1A1A1A";
const WHITE = "#FFFFFF";
const SUIT = "#FF8FB1"; // 수영복 분홍
const TUBE = "#A8E063"; // 튜브 연두
const BALL = "#FFD64F"; // 공 노랑
const SHELL = "#FF6B5A"; // 조개 빨강

/* 뼈대 좌표. 여섯 상태가 같은 값을 쓴다. */
const HEAD = { x: 85, y: 32, r: 9.5 };
const TORSO = { x: 71, y: 44, w: 28, h: 40, rx: 14 };
const SHOULDER_L = { x: 74, y: 52 };
const SHOULDER_R = { x: 96, y: 52 };
const HIP_L = { x: 78, y: 82 };
const HIP_R = { x: 92, y: 82 };
const ARM_W = 16;
const LEG_W = 17;

/** 굵은 팔다리 하나. 어깨(엉덩이)를 축으로 돌린다. 끝은 둥글다. */
function Limb({
  pivot,
  width,
  length,
  angle,
}: {
  pivot: { x: number; y: number };
  width: number;
  length: number;
  angle: number;
}) {
  const half = width / 2;
  return (
    <rect
      x={pivot.x - half}
      y={pivot.y - half}
      width={width}
      height={length}
      rx={half}
      fill={SKIN}
      transform={`rotate(${angle} ${pivot.x} ${pivot.y})`}
    />
  );
}

/* ── 입 (짧은 선 하나) ────────────────────────────── */

const M_SMILE = <path d="M80.6 38.4 Q85 43 89.4 38.4 Q85 40.6 80.6 38.4 Z" fill={INK} />;
const M_SOFT = <path d="M81.8 38.6 Q85 42 88.2 38.6 Q85 40.3 81.8 38.6 Z" fill={INK} />;
const M_FLAT = <rect x="81.4" y="38.4" width="7.2" height="2" rx="1" fill={INK} />;
const M_SMALL = <rect x="82.8" y="38.4" width="4.4" height="2" rx="1" fill={INK} />;
const M_TILT = (
  <rect x="81.4" y="38.2" width="7.2" height="2" rx="1" fill={INK} transform="rotate(-10 85 39.2)" />
);
const M_FROWN = <path d="M81 41.2 Q85 36.8 89 41.2 Q85 39.2 81 41.2 Z" fill={INK} />;

/* ── 상태별 설정 ──────────────────────────────────── */

interface Look {
  mouth: ReactNode;
  /** 팔 각도. 왼팔은 +가 바깥으로, 오른팔은 -가 바깥으로 간다. */
  armL: number;
  armR: number;
  armLen: number;
  legL: number;
  legR: number;
  /** 팔을 몸 앞으로 모으는 자세일 때만 true */
  armsInFront?: boolean;
  bodyClass: string;
  /** 몸 뒤에 깔리는 소품 */
  behind?: ReactNode;
  /** 몸 앞에 오는 소품 */
  front?: ReactNode;
}

const LOOKS: Record<PlaceStatus, Look> = {
  /* 튜브를 끼고 두 팔을 활짝 */
  SWIMMING: {
    mouth: M_SMILE,
    armL: 142, armR: -142, armLen: 56, legL: 14, legR: -14,
    bodyClass: "badang-bob",
    front: (
      <path
        fillRule="evenodd"
        d="M85 90 m-31 0 a31 31 0 1 0 62 0 a31 31 0 1 0 -62 0 M85 90 m-19 0 a19 19 0 1 1 38 0 a19 19 0 1 1 -38 0"
        fill={TUBE}
      />
    ),
  },

  /* 추워서 두 팔을 몸 앞으로 모았다 */
  COLD: {
    mouth: M_SMALL,
    armL: -66, armR: 66, armLen: 33, legL: 6, legR: -6,
    armsInFront: true,
    bodyClass: "badang-shiver",
    behind: (
      <>
        <rect x="44" y="14" width="5" height="16" rx="2.5" fill={WHITE} opacity="0.9" transform="rotate(-18 46 22)" />
        <rect x="56" y="8" width="5" height="11" rx="2.5" fill={WHITE} opacity="0.7" transform="rotate(-18 58 13)" />
        <rect x="121" y="14" width="5" height="16" rx="2.5" fill={WHITE} opacity="0.9" transform="rotate(18 123 22)" />
        <rect x="109" y="8" width="5" height="11" rx="2.5" fill={WHITE} opacity="0.7" transform="rotate(18 111 13)" />
      </>
    ),
  },

  /* 한 팔을 높이 뻗어 공을 받는다 */
  HOT: {
    mouth: M_SOFT,
    armL: 158, armR: -38, armLen: 56, legL: 12, legR: -16,
    bodyClass: "badang-float",
    /* 비치볼. 노란 공에 흰 띠 하나 */
    behind: (
      <g>
        <circle cx="30" cy="26" r="15" fill={BALL} />
        <path d="M15.6 22 a15 15 0 0 1 28.8 0 a34 34 0 0 0 -28.8 0 z" fill={WHITE} opacity="0.85" />
      </g>
    ),
  },

  /* 바람에 두 팔이 한쪽으로 쏠린다 */
  WINDY: {
    mouth: M_TILT,
    // 두 팔을 다 왼쪽으로 넘기면 팔이 얼굴을 가로지른다. 한쪽만 뻗고 반대는 내린다.
    armL: 100, armR: -24, armLen: 56, legL: 18, legR: -4,
    bodyClass: "badang-lean",
    behind: (
      <>
        <rect className="badang-drift" x="8" y="46" width="38" height="6" rx="3" fill={WHITE} opacity="0.95" />
        <rect className="badang-drift" style={{ animationDelay: "0.5s" }} x="16" y="68" width="28" height="5.4" rx="2.7" fill={WHITE} opacity="0.85" />
        <rect className="badang-drift" style={{ animationDelay: "1.1s" }} x="4" y="88" width="32" height="5" rx="2.5" fill={WHITE} opacity="0.75" />
      </>
    ),
  },

  /* 수영복 차림 그대로 비를 맞는다. 우산은 씌우지 않는다. 팔은 멀뚱하게 벌린 채. */
  RAIN: {
    mouth: M_FLAT,
    armL: 100, armR: -100, armLen: 54, legL: 10, legR: -10,
    bodyClass: "badang-settle",
    behind: (
      <>
        {[
          { x: 22, d: "0s" }, { x: 46, d: "0.45s" }, { x: 62, d: "0.9s" },
          { x: 112, d: "0.2s" }, { x: 132, d: "0.65s" }, { x: 148, d: "1.05s" },
        ].map(({ x, d }) => (
          <rect key={x} className="badang-drop" style={{ animationDelay: d }}
            x={x} y="16" width="5" height="15" rx="2.5" fill={WHITE} opacity="0.95" />
        ))}
      </>
    ),
  },

  /* 물이 빠져 드러난 바닥에 서 있다 */
  LOW_TIDE: {
    mouth: M_FROWN,
    armL: 32, armR: -32, armLen: 56, legL: 10, legR: -10,
    bodyClass: "badang-settle",
    // 드러난 바닥에 놓인 조개. 바닥에 앉도록 밑면을 평평하게 둔다.
    front: (
      <>
        <path d="M39 134 a7 7 0 0 1 14 0 z" fill={SHELL} />
        <path d="M123 136 a5 5 0 0 1 10 0 z" fill={SHELL} opacity="0.85" />
      </>
    ),
  },
};

interface SeaCharacterProps {
  status: PlaceStatus;
  size?: number;
}

export default function SeaCharacter({ status, size = 156 }: SeaCharacterProps) {
  const look = LOOKS[status];

  const arms = (
    <>
      <Limb pivot={SHOULDER_L} width={ARM_W} length={look.armLen} angle={look.armL} />
      <Limb pivot={SHOULDER_R} width={ARM_W} length={look.armLen} angle={look.armR} />
    </>
  );

  return (
    <svg
      width={size}
      height={(size * 150) / 170}
      viewBox="0 0 170 150"
      role="img"
      aria-hidden="true"
      className="shrink-0 overflow-visible"
    >
      {look.behind}

      <g className={`badang-anim ${look.bodyClass}`}>
        {/* 다리 */}
        <Limb pivot={HIP_L} width={LEG_W} length={58} angle={look.legL} />
        <Limb pivot={HIP_R} width={LEG_W} length={58} angle={look.legR} />

        {/* 팔은 보통 몸 뒤, 몸 앞으로 모으는 자세일 때만 앞 */}
        {!look.armsInFront && arms}

        {/* 몸통 = 수영복 */}
        <rect x={TORSO.x} y={TORSO.y} width={TORSO.w} height={TORSO.h} rx={TORSO.rx} fill={SUIT} />

        {look.armsInFront && arms}

        {/* 목 */}
        <rect x={HEAD.x - 4} y={HEAD.y + 4} width="8" height="12" rx="4" fill={SKIN} />
        {/* 머리 */}
        <circle cx={HEAD.x} cy={HEAD.y} r={HEAD.r} fill={SKIN} />
        {/* 머리카락. 머리 위쪽만 덮는다. 반원으로 덮으면 얼굴 자리가 눌려 뭉개진다.
            sweep-flag 1이라야 왼쪽 끝에서 위를 지나 오른쪽 끝으로 간다. */}
        <path
          d={`M${HEAD.x - 9.17} ${HEAD.y - 2.5} A${HEAD.r} ${HEAD.r} 0 0 1 ${HEAD.x + 9.17} ${HEAD.y - 2.5} Z`}
          fill={INK}
        />
        {/* 얼굴 = 점 두 개와 짧은 선 하나 */}
        <circle cx="81.8" cy="34.4" r="1.7" fill={INK} />
        <circle cx="88.2" cy="34.4" r="1.7" fill={INK} />
        {look.mouth}
      </g>

      {look.front}
    </svg>
  );
}
