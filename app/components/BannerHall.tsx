"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import type { UserStats } from "@/app/lib/github";

// ===== MC 材质 =====
const ASSETS_BASE =
  "https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.20.4/assets/minecraft/textures/block";

const TEXTURES = {
  stone: `${ASSETS_BASE}/stone.png`,
  spruce_log: `${ASSETS_BASE}/spruce_log.png`,
};

// ===== 成就等级色彩 =====
const TIER_CONFIG: Record<string, { name: string; base: string; text: string; border: string }> = {
  S: { name: "Diamond", base: "#2bcccc", text: "#51ffff", border: "#179e9e" },
  A: { name: "Emerald", base: "#36b041", text: "#55ff55", border: "#22752b" },
  B: { name: "Gold",    base: "#f1b329", text: "#ffff55", border: "#c77f00" },
  C: { name: "Iron",    base: "#e6e6e6", text: "#ffffff", border: "#999999" },
  D: { name: "Stone",   base: "#949494", text: "#aaaaaa", border: "#4d4d4d" },
};

// ===== 图标路径 =====
const ICONS: Record<string, string> = {
  commits:   "M 2 12 L 2 5 L 6 8 L 8 3 L 10 8 L 14 5 L 14 12 Z",
  prs:       "M 4 4 H 7 V 7 H 4 Z M 9 4 H 12 V 7 H 9 Z M 6 7 H 10 V 10 H 11 V 13 H 9 V 11 H 7 V 13 H 5 V 10 H 6 Z",
  stars:     "M 8 1 L 10 6 L 15 6 L 11 9 L 12 14 L 8 11 L 4 14 L 5 9 L 1 6 L 6 6 Z",
  issues:    "M 3 13 L 11 5 L 14 2 L 12 2 L 11 3 L 3 11 Z M 4 14 L 2 12 L 5 9 L 7 11 Z",
  followers: "M 4 6 L 8 11 L 12 6 H 9 V 2 H 7 V 6 Z",
  repos:     "M 3 2 H 13 V 14 H 3 Z M 5 4 H 11 M 5 7 H 11 M 5 10 H 9",
  merged:    "M 4 3 V 13 M 12 3 V 7 Q 12 10 8 10 L 4 10",
};

// ===== 根据数值计算等级 =====
function getTier(id: string, value: number): string {
  const thresholds: Record<string, number[]> = {
    commits:   [5000, 2000, 500, 100],
    prs:       [200, 100, 30, 10],
    stars:     [500, 100, 30, 5],
    issues:    [200, 100, 30, 10],
    followers: [500, 100, 30, 10],
    repos:     [50, 30, 15, 5],
    merged:    [150, 80, 20, 5],
  };
  const t = thresholds[id] || [100, 50, 20, 5];
  if (value >= t[0]) return "S";
  if (value >= t[1]) return "A";
  if (value >= t[2]) return "B";
  if (value >= t[3]) return "C";
  return "D";
}

interface StatItem {
  id: string;
  title: string;
  value: string;
  rawValue: number;
  tier: string;
  icon: string;
}

function buildStats(stats: UserStats, totalContributions: number): StatItem[] {
  const items: { id: string; title: string; raw: number }[] = [
    { id: "commits",   title: "COMMITS",    raw: totalContributions },
    { id: "prs",       title: "PULL REQS",  raw: stats.pullRequests },
    { id: "stars",     title: "STARS",       raw: stats.totalStars },
    { id: "issues",    title: "ISSUES",      raw: stats.issues },
    { id: "followers", title: "FOLLOWERS",   raw: stats.followers },
    { id: "repos",     title: "REPOS",       raw: stats.publicRepos },
    { id: "merged",    title: "MERGED PRs",  raw: stats.mergedPullRequests },
  ];
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    value: item.raw.toLocaleString(),
    rawValue: item.raw,
    tier: getTier(item.id, item.raw),
    icon: ICONS[item.id] || ICONS.commits,
  }));
}

// ===== 投影工具 =====
interface Proj {
  Wx: number; Wy: number;
  Hx: number; Hy: number;
  Dx: number; Dy: number;
  Ox: number; Oy: number;
}

// ===== MC 风格 Slider =====
function McSlider({ min, max, value, onChange }: {
  min: number; max: number; value: number;
  onChange: (v: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const pct = ((value - min) / (max - min)) * 100;

  const calcValue = useCallback((clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const raw = min + ratio * (max - min);
    onChange(Math.round(raw));
  }, [min, max, onChange]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    calcValue(e.clientX);
  }, [calcValue]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    calcValue(e.clientX);
  }, [calcValue]);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <div
      ref={trackRef}
      className="mc-slider-track"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* 已填充部分 */}
      <div className="mc-slider-fill" style={{ width: `${pct}%` }} />
      {/* 滑块 */}
      <div className="mc-slider-thumb" style={{ left: `${pct}%` }} />
    </div>
  );
}

// ===== 单个旗帜 =====
function BannerItem({ stat, proj, getMatrix }: {
  stat: StatItem;
  proj: Proj;
  getMatrix: (plane: string, x: number, y: number, z: number) => string;
}) {
  const config = TIER_CONFIG[stat.tier];
  const swayOrigin = `${proj.Ox + 10 * proj.Wx + 0 * proj.Hx + 1 * proj.Dx}px ${proj.Oy + 10 * proj.Wy + 0 * proj.Hy + 1 * proj.Dy}px`;

  return (
    <div className="flex flex-col items-center group cursor-crosshair">
      <svg
        viewBox="-50 0 400 800"
        className="w-32 h-56 drop-shadow-[0_12px_12px_rgba(0,0,0,0.8)] transition-transform duration-300 group-hover:scale-105"
        style={{ imageRendering: "pixelated" }}
      >
        <defs>
          <linearGradient id={`cloth-shading-${stat.id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#000" stopOpacity={0.3} />
            <stop offset="25%" stopColor="#000" stopOpacity={0} />
            <stop offset="75%" stopColor="#fff" stopOpacity={0} />
            <stop offset="100%" stopColor="#fff" stopOpacity={0.2} />
          </linearGradient>
          <linearGradient id={`top-shadow-${stat.id}`} x1="0" y1="0" x2="0" y2="4" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#000" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#000" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* 旗杆 */}
        <g>
          <g transform={getMatrix("front", 9, 0, 0)}>
            <image href={TEXTURES.spruce_log} width={2} height={80} preserveAspectRatio="none" />
            <polygon points="0,0 2,0 2,80 0,80" fill="#000" opacity={0.3} />
          </g>
          <g transform={getMatrix("right", 11, 0, 0)}>
            <image href={TEXTURES.spruce_log} width={2} height={80} preserveAspectRatio="none" />
            <polygon points="0,0 2,0 2,80 0,80" fill="#000" opacity={0.6} />
          </g>
          <g transform={getMatrix("top", 9, 80, 0)}>
            <image href={TEXTURES.spruce_log} width={2} height={2} preserveAspectRatio="none" />
            <polygon points="0,0 2,0 2,2 0,2" fill="#000" opacity={0.8} />
          </g>
        </g>

        {/* 旗帜布料 */}
        <g
          className={`mc-cloth-sway-${stat.id}`}
          style={{ transformOrigin: swayOrigin }}
        >
          {/* 正面 */}
          <g transform={getMatrix("front", 0, 0, 1)}>
            <polygon points="0,-2 20,-2 20,68 10,58 0,68" fill={config.base} />

            <text x="10" y="14" fontSize="4.2" fontFamily="'Minecraft', VT323, monospace" textAnchor="middle" fill="#1a1108" fontWeight="bold" opacity={0.8}>
              {stat.title}
            </text>

            <g transform="translate(5, 20)">
              <svg width={10} height={10} viewBox="0 0 16 16">
                <path d={stat.icon} fill="#000" opacity={0.5} transform="translate(0, 1.5)" />
                <path d={stat.icon} fill={config.text} stroke={config.border} strokeWidth={1} strokeLinejoin="miter" />
              </svg>
            </g>

            <text x="10.2" y="44.2" fontSize="5.5" fontFamily="'Minecraft', VT323, monospace" textAnchor="middle" fill="#000" fontWeight="bold">
              {stat.value}
            </text>
            <text x="10" y="44" fontSize="5.5" fontFamily="'Minecraft', VT323, monospace" textAnchor="middle" fill={config.text} fontWeight="bold">
              {stat.value}
            </text>

            <text x="10.2" y="55.2" fontSize="3.5" fontFamily="'Minecraft', VT323, monospace" textAnchor="middle" fill="#000" fontWeight="bold">
              RANK: {stat.tier}
            </text>
            <text x="10" y="55" fontSize="3.5" fontFamily="'Minecraft', VT323, monospace" textAnchor="middle" fill="#fff" fontWeight="bold">
              RANK: <tspan fill={config.text}>{stat.tier}</tspan>
            </text>

            <polygon points="0,-2 20,-2 20,68 10,58 0,68" fill={`url(#cloth-shading-${stat.id})`} style={{ pointerEvents: "none" }} />
            <polygon points="0,-2 20,-2 20,4 0,4" fill={`url(#top-shadow-${stat.id})`} style={{ pointerEvents: "none" }} />
          </g>

          {/* 侧面厚度 */}
          <g transform={getMatrix("right", 20, 0, 0)}>
            <polygon points="0,-2 1,-2 1,68 0,68" fill={config.base} />
            <polygon points="0,-2 1,-2 1,68 0,68" fill="#000" opacity={0.4} />
          </g>
        </g>

        {/* 顶部横梁 */}
        <g>
          <g transform={getMatrix("front", -2, -2, 2)}>
            <image href={TEXTURES.spruce_log} width={24} height={2} preserveAspectRatio="none" />
            <polygon points="0,0 24,0 24,2 0,2" fill="#000" opacity={0.1} />
          </g>
          <g transform={getMatrix("top", -2, -2, 0)}>
            <image href={TEXTURES.spruce_log} width={24} height={2} preserveAspectRatio="none" />
            <polygon points="0,0 24,0 24,2 0,2" fill="#fff" opacity={0.1} />
          </g>
          <g transform={getMatrix("right", 22, -2, 0)}>
            <image href={TEXTURES.spruce_log} width={2} height={2} preserveAspectRatio="none" />
            <polygon points="0,0 2,0 2,2 0,2" fill="#000" opacity={0.5} />
          </g>
        </g>
      </svg>
    </div>
  );
}

// ===== 主组件 =====
interface BannerHallProps {
  stats: UserStats;
  totalContributions: number;
}

export default function BannerHall({ stats, totalContributions }: BannerHallProps) {
  const [rotation, setRotation] = useState(0); // 默认正面，支持 -90 ~ 90
  const displayRef = useRef<HTMLDivElement>(null);

  const statItems = useMemo(() => buildStats(stats, totalContributions), [stats, totalContributions]);
  const bannerDelays = useMemo(() => statItems.map(() => ({
    delay: Math.random() * 0.25,
    duration: 4.0 + Math.random() * 1,          // 4~5s 周期
    rotateA: -1 - Math.random() * 1.5,          // -1~-2.5deg
    rotateB: 3 + Math.random() * 2,             // 3~5deg
    skewA: 1.5 + Math.random() * 1,             // 1.5~2.5deg
    skewB: -1.5 - Math.random() * 1,            // -1.5~-2.5deg
  })), [statItems]);

  const proj = useMemo<Proj>(() => {
    const rad = (-rotation * Math.PI) / 180;
    const L = 11.3137;

    const Wx = L * Math.cos(rad);
    const Wy = L * 0.5 * Math.sin(rad);
    const Hx = 0;
    const Hy = 8;

    const zRad = rad - Math.PI / 2;
    const Dx = (L / 2) * Math.cos(zRad);
    const Dy = (L / 2) * 0.5 * Math.sin(zRad);

    const Ox = 150 - 10 * Wx;
    const Oy = 100 - 10 * Wy;

    return { Wx, Wy, Hx, Hy, Dx, Dy, Ox, Oy };
  }, [rotation]);

  const getMatrix = useCallback(
    (plane: string, x: number, y: number, z: number): string => {
      const { Wx, Wy, Hx, Hy, Dx, Dy, Ox, Oy } = proj;
      const tx = Ox + x * Wx + y * Hx + z * Dx;
      const ty = Oy + x * Wy + y * Hy + z * Dy;

      if (plane === "front") return `matrix(${Wx}, ${Wy}, ${Hx}, ${Hy}, ${tx}, ${ty})`;
      if (plane === "right") return `matrix(${Dx}, ${Dy}, ${Hx}, ${Hy}, ${tx}, ${ty})`;
      if (plane === "top")   return `matrix(${Wx}, ${Wy}, ${Dx}, ${Dy}, ${tx}, ${ty})`;
      return `matrix(${Wx}, ${Wy}, ${Hx}, ${Hy}, ${tx}, ${ty})`;
    },
    [proj]
  );

  const handleDownload = useCallback(() => {
    if (!displayRef.current) return;
    const svgs = displayRef.current.querySelectorAll("svg");
    if (svgs.length === 0) return;

    const serializer = new XMLSerializer();
    const cols = 4;
    const gap = 20;
    const parts: { xml: string; w: number; h: number }[] = [];

    svgs.forEach((svg) => {
      const vb = svg.getAttribute("viewBox")?.split(" ").map(Number) || [0, 0, 300, 800];
      parts.push({ xml: serializer.serializeToString(svg), w: vb[2], h: vb[3] });
    });

    const cellW = Math.max(...parts.map((p) => p.w));
    const cellH = Math.max(...parts.map((p) => p.h));
    const rows = Math.ceil(parts.length / cols);
    const totalW = cols * cellW + (cols - 1) * gap;
    const totalH = rows * cellH + (rows - 1) * gap;

    const inner = parts.map((p, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = col * (cellW + gap) + (cellW - p.w) / 2;
      const y = row * (cellH + gap) + (cellH - p.h) / 2;
      return `<g transform="translate(${x},${y})">${p.xml}</g>`;
    }).join("");

    const combined = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${totalH}" width="${totalW}" height="${totalH}">${inner}</svg>`;
    const blob = new Blob([combined], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "banner-hall.svg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div className="w-full mt-8">
      <style dangerouslySetInnerHTML={{ __html: statItems.map((stat, i) => {
        const p = bannerDelays[i];
        return `
          @keyframes banner-sway-${stat.id} {
            0%, 100% { transform: rotate(${p.rotateA}deg) skewX(${p.skewA}deg); }
            50% { transform: rotate(${p.rotateB}deg) skewX(${p.skewB}deg); }
          }
          .mc-cloth-sway-${stat.id} {
            animation: banner-sway-${stat.id} ${p.duration}s ease-in-out ${p.delay}s infinite;
          }
        `;
      }).join('\n') }} />

      {/* 角度控制 */}
      <div className="mc-player-bar mb-3">
        <div className="flex items-center gap-4">
          <span className="text-[#55ff55] text-sm mc-text-shadow whitespace-nowrap">
            VIEW ANGLE: <span className="inline-block w-[3.5ch] text-right">{rotation}</span>°
          </span>
          <McSlider min={-90} max={90} value={rotation} onChange={setRotation} />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRotation(0)}
            className="mc-btn-secondary text-sm"
          >
            RESET
          </button>
          <button
            onClick={handleDownload}
            className="mc-btn-secondary text-sm"
          >
            DOWNLOAD .SVG
          </button>
        </div>
      </div>

      {/* 旗帜展示区 */}
      <div ref={displayRef} className="mc-display !p-4 relative">
        <div className="relative z-10 flex flex-wrap justify-center gap-x-1 gap-y-4 py-4 px-1">
          {statItems.map((stat) => (
            <BannerItem
              key={stat.id}
              stat={stat}
              proj={proj}
              getMatrix={getMatrix}
            />
          ))}
        </div>
      </div>

      <p className="text-[#888] text-xs mt-2 text-center mc-text-shadow-light">
        Drag slider to rotate banners &bull; Ranks based on your GitHub stats
      </p>
    </div>
  );
}
