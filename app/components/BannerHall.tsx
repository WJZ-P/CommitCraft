"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import type { UserStats } from "@/app/lib/github";

// ===== MC 材质与贴图 CDN =====
const BLOCK_BASE = "https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.20.4/assets/minecraft/textures/block";
const ITEM_BASE = "https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.20.4/assets/minecraft/textures/item";

const TEXTURES = {
  stone: `${BLOCK_BASE}/stone.png`,
  spruce_log: `${BLOCK_BASE}/spruce_log.png`,
};

// ===== 成就等级色彩 (对标 MC 原版羊毛/旗帜染料色号) =====
const TIER_CONFIG: Record<string, { name: string; base: string; text: string }> = {
  S: { name: "Diamond", base: "#158991", text: "#55FFFF" },
  A: { name: "Emerald", base: "#70B919", text: "#55FF55" },
  B: { name: "Gold",    base: "#F8C527", text: "#FFFF55" },
  C: { name: "Iron",    base: "#D8D8D8", text: "#FFFFFF" },
  D: { name: "Stone",   base: "#474F52", text: "#AAAAAA" },
};

// ===== 图标 (原版物品贴图) =====
const ICONS: Record<string, string> = {
  commits:   `${ITEM_BASE}/diamond_pickaxe.png`,
  prs:       `${ITEM_BASE}/writable_book.png`,
  stars:     `${ITEM_BASE}/nether_star.png`,
  issues:    `${ITEM_BASE}/spider_eye.png`,
  followers: `${ITEM_BASE}/emerald.png`,
  repos:     `${ITEM_BASE}/book.png`,
  merged:    `${ITEM_BASE}/gold_ingot.png`,
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
      <div className="mc-slider-fill" style={{ width: `${pct}%` }} />
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

  // 摆动圆心：X=12中心, Y=0挂点, Z=1.25厚度中点
  const swayOrigin = `${proj.Ox + 12 * proj.Wx + 0 * proj.Hx + 1.25 * proj.Dx}px ${proj.Oy + 12 * proj.Wy + 0 * proj.Hy + 1.25 * proj.Dy}px`;

  return (
    <div className="flex flex-col items-center group cursor-crosshair">
      <svg
        viewBox="-50 0 400 800"
        className="w-40 h-[280px] drop-shadow-[0_12px_12px_rgba(0,0,0,0.8)] transition-transform duration-300 group-hover:scale-105"
        style={{ imageRendering: "pixelated" }}
      >
        <defs>
          <linearGradient id={`cloth-shading-${stat.id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#000" stopOpacity={0.3} />
            <stop offset="25%" stopColor="#000" stopOpacity={0} />
            <stop offset="75%" stopColor="#fff" stopOpacity={0} />
            <stop offset="100%" stopColor="#fff" stopOpacity={0.2} />
          </linearGradient>
          <linearGradient id={`top-shadow-${stat.id}`} x1="0" y1="-2" x2="0" y2="4" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#000" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#000" stopOpacity={0} />
          </linearGradient>
          <filter id="icon-darken">
            <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0   0 0 0 0.6 0" />
          </filter>
        </defs>

        {/* 旗杆 Z:0~1 */}
        <g>
          <g transform={getMatrix("front", 10.5, 0, 1)}>
            <image href={TEXTURES.spruce_log} width={3} height={80} preserveAspectRatio="none" />
            <polygon points="0,0 3,0 3,80 0,80" fill="#000" opacity={0.3} />
          </g>
          <g transform={getMatrix("right", 13.5, 0, 0)}>
            <image href={TEXTURES.spruce_log} width={1} height={80} preserveAspectRatio="none" />
            <polygon points="0,0 1,0 1,80 0,80" fill="#000" opacity={0.6} />
          </g>
          <g transform={getMatrix("top", 10.5, 80, 0)}>
            <image href={TEXTURES.spruce_log} width={3} height={1} preserveAspectRatio="none" />
            <polygon points="0,0 3,0 3,1 0,1" fill="#000" opacity={0.8} />
          </g>
        </g>

        {/* 旗帜布料 Z:1~1.5 */}
        <g
          className={`mc-cloth-sway-${stat.id}`}
          style={{ transformOrigin: swayOrigin }}
        >
          {/* 布料正面 Z=1.5 */}
          <g transform={getMatrix("front", 0, 0, 1.5)}>
            <polygon points="0,-2 24,-2 24,68 12,58 0,68" fill={config.base} />

            {/* 标题：白字黑影 */}
            <text x="12.2" y="12.2" fontSize="3.5" fontFamily="'Minecraft', VT323, monospace" textAnchor="middle" fill="#000" fontWeight="bold">
              {stat.title}
            </text>
            <text x="12" y="12" fontSize="3.5" fontFamily="'Minecraft', VT323, monospace" textAnchor="middle" fill="#E0E0E0" fontWeight="bold">
              {stat.title}
            </text>

            {/* 原版物品图标 + 像素阴影 */}
            <g transform="translate(5, 17)">
              <image href={stat.icon} x="0.5" y="1.5" width="14" height="14" filter="url(#icon-darken)" />
              <image href={stat.icon} x="0" y="0" width="14" height="14" />
            </g>

            {/* 数值 */}
            <text x="12.2" y="42.2" fontSize="6" fontFamily="'Minecraft', VT323, monospace" textAnchor="middle" fill="#000" fontWeight="bold">
              {stat.value}
            </text>
            <text x="12" y="42" fontSize="6" fontFamily="'Minecraft', VT323, monospace" textAnchor="middle" fill={config.text} fontWeight="bold">
              {stat.value}
            </text>

            {/* 等级 */}
            <text x="12.2" y="52.2" fontSize="3.5" fontFamily="'Minecraft', VT323, monospace" textAnchor="middle" fill="#000" fontWeight="bold">
              RANK: {stat.tier}
            </text>
            <text x="12" y="52" fontSize="3.5" fontFamily="'Minecraft', VT323, monospace" textAnchor="middle" fill="#E0E0E0" fontWeight="bold">
              RANK: <tspan fill={config.text}>{stat.tier}</tspan>
            </text>

            <polygon points="0,-2 24,-2 24,68 12,58 0,68" fill={`url(#cloth-shading-${stat.id})`} style={{ pointerEvents: "none" }} />
            <polygon points="0,-2 24,-2 24,68 12,58 0,68" fill={`url(#top-shadow-${stat.id})`} style={{ pointerEvents: "none" }} />
          </g>

          {/* 布料侧面厚度 X=24, Z:1~1.5 */}
          <g transform={getMatrix("right", 24, 0, 1)}>
            <polygon points="0,-2 3,-2 3,68 0,68" fill={config.base} />
            <polygon points="0,-2 3,-2 3,68 0,68" fill="#000" opacity={0.35} />
          </g>
          {/* 布料顶面厚度 Y=-2, Z:1~1.5 */}
          <g transform={getMatrix("top", 0, -2, 1)}>
            <polygon points="0,0 24,0 24,1 0,1" fill={config.base} />
            <polygon points="0,0 24,0 24,1 0,1" fill="#fff" opacity={0.15} />
          </g>
        </g>

        {/* 顶部横梁 Z:1~3，完美遮盖接缝 */}
        <g>
          <g transform={getMatrix("front", -2, -3, 3)}>
            <image href={TEXTURES.spruce_log} width={28} height={3} preserveAspectRatio="none" />
            <polygon points="0,0 28,0 28,3 0,3" fill="#000" opacity={0.1} />
          </g>
          <g transform={getMatrix("top", -2, -3, 1)}>
            <image href={TEXTURES.spruce_log} width={28} height={2} preserveAspectRatio="none" />
            <polygon points="0,0 28,0 28,2 0,2" fill="#fff" opacity={0.1} />
          </g>
          <g transform={getMatrix("right", 26, -3, 1)}>
            <image href={TEXTURES.spruce_log} width={2} height={3} preserveAspectRatio="none" />
            <polygon points="0,0 2,0 2,3 0,3" fill="#000" opacity={0.5} />
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
  const [rotation, setRotation] = useState(0);
  const displayRef = useRef<HTMLDivElement>(null);

  const statItems = useMemo(() => buildStats(stats, totalContributions), [stats, totalContributions]);
  const bannerDelays = useMemo(() => statItems.map(() => ({
    delay: Math.random() * 0.25,
    duration: 4.0 + Math.random() * 1,          // 4~5s 周期
    rotateA: -0.6 - Math.random() * 0.9,        // -0.6~-1.5deg
    rotateB: 1.8 + Math.random() * 1.2,         // 1.8~3deg
    skewA: 0.9 + Math.random() * 0.6,           // 0.9~1.5deg
    skewB: -0.9 - Math.random() * 0.6,          // -0.9~-1.5deg
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
