"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { PlaceStatus } from "@/types/condition";
import styles from "./WaterplayScene.module.css";

interface Props { status: PlaceStatus; tideRatio?: number; paused?: boolean }
const descriptions: Record<PlaceStatus, string> = {
  SWIMMING: "투명한 물속에 잠겨 헤엄치는 캐릭터와 수면 위로 나온 스노클",
  HOT: "튜브 가운데에 엉덩이를 넣고 뒤로 기대어 앉아 있는 캐릭터",
  COLD: "몸을 움츠리고 떨고 있는 캐릭터와 잔물결",
  WINDY: "바람을 맞는 캐릭터와 흩날리는 나뭇잎, 물거품",
  RAIN: "머리 위로 떨어져 있는 구름과 빗방울 아래 몸을 움츠린 캐릭터",
  LOW_TIDE: "물이 빠진 모래밭에서 웅덩이를 보는 캐릭터와 조개",
};

function Sprite({ name, x, y, width, height, className, stretch = false, opacity }: {
  name: string; x: number; y: number; width: number; height: number; className?: string; stretch?: boolean; opacity?: number;
}) {
  return <image href={`/characters/waterplay/${name}.png`} x={x} y={y} width={width} height={height}
    preserveAspectRatio={stretch ? "none" : "xMidYMid meet"} className={className} opacity={opacity} />;
}

/** Decorative composition of the supplied artwork; water is not measured depth or wave height. */
export default function WaterplayScene({ status, tideRatio, paused = false }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [suspended, setSuspended] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState(390);
  const id = useId().replace(/:/g, "");
  useEffect(() => {
    let visible = true;
    const update = () => setSuspended(!visible || document.hidden);
    const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); });
    // Change the drawing area, not the character's proportions. Backgrounds reach both edges.
    const resize = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setCanvasWidth(Math.round(width / height * 240));
    });
    if (root.current) { visibility.observe(root.current); resize.observe(root.current); }
    document.addEventListener("visibilitychange", update);
    update();
    return () => { visibility.disconnect(); resize.disconnect(); document.removeEventListener("visibilitychange", update); };
  }, []);
  const ratio = Number.isFinite(tideRatio) ? Math.max(0, Math.min(1, tideRatio!)) : 0.5;
  const swimming = status === "SWIMMING";
  const low = status === "LOW_TIDE";
  const windy = status === "WINDY";
  const offset = low ? 0 : (0.5 - ratio) * 12;
  const center = (canvasWidth - 390) / 2;
  // A narrow card scales the subject down uniformly, without cropping it.
  const subjectScale = Math.min(1, canvasWidth / 390);
  const subjectX = subjectScale < 1 ? 0 : center;
  const subjectY = (240 - 240 * subjectScale) / 2;
  const surface = swimming ? subjectY + (74 + offset) * subjectScale : (low ? 146 : 151) + offset;
  const fullWidth = canvasWidth + 48;

  return (
    <div ref={root} className={styles.scene} data-waterplay-scene={status} data-paused={paused || suspended}>
      <svg viewBox={`0 0 ${canvasWidth} 240`} preserveAspectRatio="none" role="img" aria-label={descriptions[status]}>
        <defs>
          <clipPath id={`${id}-tube-front`}><rect x="75" y="160" width="245" height="75" /></clipPath>
          <clipPath id={`${id}-legs`}><path d="M204 144 Q238 135 264 165 L335 222 L234 231 Q198 198 188 178Z" /></clipPath>
          <clipPath id={`${id}-underwater`}><rect y={surface} width={canvasWidth} height={260 - surface} /></clipPath>
        </defs>
        <rect width={canvasWidth} height="240" fill="#eff7fc" />
        <Sprite name="cloud" x={-12} y={swimming ? 8 : 26} width={112} height={43} className={styles.cloud} />
        <Sprite name="cloud" x={canvasWidth - 109} y={swimming ? 15 : 43} width={122} height={47} className={styles.cloudBack} />
        {canvasWidth > 620 && <>
          <Sprite name="cloud" x={canvasWidth * .22} y={17} width={106} height={41} className={styles.cloudBack} />
          <Sprite name="cloud" x={canvasWidth * .72} y={20} width={100} height={39} className={styles.cloud} />
        </>}

        {/* Background ocean and sand span the measured viewport, not a centered fixed-width picture. */}
        {swimming ? <rect y={surface} width={canvasWidth} height={260 - surface} fill="#d0f2fa" /> :
          <Sprite name="wave_ocean" x={-24} y={surface - 9} width={fullWidth} height={260 - surface} stretch />}
        {!swimming && <Sprite name="wave_swell" x={-24} y={surface - 17} width={fullWidth} height={25} className={styles.waveBack} stretch />}
        {low && <>
          <Sprite name="sand_ground" x={-2} y={167} width={canvasWidth + 4} height={76} stretch />
          <Sprite name="puddle" x={-17} y={193} width={110} height={36} />
          <Sprite name="puddle" x={canvasWidth - 100} y={207} width={120} height={37} />
        </>}

        <g transform={`translate(${subjectX} ${subjectY}) scale(${subjectScale})`}>
          {swimming && <>
            <Sprite name="water_current" x={8} y={180} width={165} height={48} className={styles.current} />
            <g className={styles.swim}>
              <Sprite name="female_snorkel" x={45} y={88} width={300} height={96.77} />
              {/* Reuse only the original snorkel's upright section; extend it to the surface. */}
              <svg x={129.7} y={53} width={9.7} height={71} viewBox="70 7 8 22" preserveAspectRatio="none" overflow="hidden">
                <image href="/characters/waterplay/female_snorkel.png" width={248} height={80} />
              </svg>
            </g>
            <Sprite name="water_droplets" x={69} y={119} width={27} height={45} className={styles.bubbles} />
            <Sprite name="water_current" x={218} y={195} width={148} height={37} className={styles.current} />
          </>}
          {status === "HOT" && <>
            <g className={styles.float}>
              <Sprite name="float_green" x={82} y={99} width={220} height={121.24} />
              <Sprite name="male_float" x={60} y={61} width={265} height={159} />
              <g clipPath={`url(#${id}-tube-front)`}>
                <Sprite name="float_green" x={82} y={99} width={220} height={121.24} />
              </g>
              {/* Legs come over the near rim while the pelvis stays inside the opening. */}
              <g clipPath={`url(#${id}-legs)`}>
                <Sprite name="male_float" x={60} y={61} width={265} height={159} />
              </g>
            </g>
            <Sprite name="water_ripple" x={56} y={215} width={278} height={25} className={styles.ripple} />
          </>}
          {status === "COLD" && <>
            <Sprite name="female_cold" x={124} y={48} width={142} height={176} className={styles.shiver} />
            <Sprite name="shiver_lines" x={87} y={105} width={30} height={64} className={styles.shiverMark} />
            <Sprite name="shiver_lines" x={276} y={99} width={30} height={64} className={styles.shiverMark} />
            <Sprite name="water_ripple" x={92} y={210} width={206} height={29} className={styles.ripple} />
          </>}
          {windy && <>
            <Sprite name="male_wind" x={77} y={38} width={236} height={181} className={styles.brace} />
            <Sprite name="wind_gust" x={8} y={70} width={135} height={42} className={styles.gust} />
            <Sprite name="wind_gust" x={247} y={124} width={135} height={40} className={styles.gustBack} />
            <Sprite name="leaf" x={24} y={129} width={33} height={29} className={styles.leaf} />
            <Sprite name="leaf" x={326} y={69} width={28} height={25} className={styles.leafBack} />
          </>}
          {status === "RAIN" && <>
            <Sprite name="cloud" x={105} y={8} width={180} height={48} />
            {[35, 83, 288, 339].map((x, i) => <g key={x} className={styles.rain} style={{ animationDelay: `${i * -.6}s` }}>
              <Sprite name="water_droplets" x={x} y={88} width={24} height={46} />
            </g>)}
            <Sprite name="male_cold" x={132} y={72} width={126} height={164} className={styles.shiver} />
            <Sprite name="water_ripple" x={101} y={216} width={188} height={23} className={styles.ripple} />
          </>}
          {low && <>
            <Sprite name="sand_pebbles" x={102} y={219} width={180} height={19} />
            <Sprite name="float_pink" x={282} y={178} width={96} height={53} />
            <Sprite name="female_lowtide" x={119} y={57} width={159} height={157} className={styles.look} />
            <Sprite name="surprise_marks" x={87} y={80} width={27} height={32} />
            <Sprite name="seashell_pink" x={62} y={211} width={31} height={27} />
            <Sprite name="seashell_white" x={270} y={211} width={28} height={25} />
            <Sprite name="starfish" x={103} y={200} width={29} height={33} />
          </>}
        </g>

        {swimming ? <>
          {/* The foreground water is translucent so the original skin/clothing colours remain visible. */}
          <g clipPath={`url(#${id}-underwater)`}>
            <Sprite name="wave_ocean" x={-24} y={surface - 8} width={fullWidth} height={266 - surface} opacity={.13} stretch />
          </g>
          <Sprite name="wave_swell" x={-24} y={surface - 8} width={fullWidth} height={18} className={styles.waveBack} stretch />
          <Sprite name="wave_white" x={-24} y={222} width={fullWidth} height={13} className={styles.waveFront} stretch />
        </> : !low && <>
          <Sprite name="wave_white" x={-24} y={227} width={fullWidth} height={12} className={styles.waveFront} stretch />
          {windy && <>
            <Sprite name="foam_cluster" x={-4} y={194} width={130} height={43} className={styles.foam} />
            <Sprite name="foam_cluster" x={canvasWidth - 125} y={201} width={130} height={36} className={styles.foamBack} />
          </>}
        </>}
      </svg>
    </div>
  );
}
