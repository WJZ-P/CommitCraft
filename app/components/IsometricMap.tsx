"use client";

import { useState, useMemo } from "react";
import type { ContributionCalendar } from "@/app/lib/github";

type MapMode = "color" | "count";

// ===== 等距投影配置 =====
const TILE_W = 14;
const TILE_H =7;

// MC 原版材质 CDN
const TEX_BASE =
  "https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.20.4/assets/minecraft/textures/block/";

const TEXTURES: Record<string, string> = {
  water: `${TEX_BASE}water_still.png`,
  dirt: `${TEX_BASE}dirt.png`,
  grassTop: `${TEX_BASE}grass_block_top.png`,
  grassSide: `${TEX_BASE}grass_block_side.png`,
  stone: `${TEX_BASE}stone.png`,
  diamond_ore: `${TEX_BASE}diamond_ore.png`,
};

// 贡献等级 → 方块类型映射
const LEVELS = [
  { id: "water", top: "water", side: "water", height: 8 },
  { id: "dirt", top: "dirt", side: "dirt", height: 16 },
  { id: "grass", top: "grassTop", side: "grassSide", height: 26 },
  { id: "stone", top: "stone", side: "stone", height: 38 },
  { id: "diamond", top: "diamond_ore", side: "diamond_ore", height: 52 },
];

// GitHub 颜色等级 → 0~4
function colorToLevel(color: string): number {
  const map: Record<string, number> = {
    "#ebedf0": 0,
    "#9be9a8": 1,
    "#40c463": 2,
    "#30a14e": 3,
    "#216e39": 4,
  };
  return map[color] ?? 0;
}

// 贡献数 → 0~4（基于整体数据的分位数）
function countToLevel(count: number, thresholds: number[]): number {
  if (count === 0) return 0;
  if (count <= thresholds[0]) return 1;
  if (count <= thresholds[1]) return 2;
  if (count <= thresholds[2]) return 3;
  return 4;
}

// 计算分位数阈值（排除 0 后的 25%/50%/75%）
function computeThresholds(calendar: ContributionCalendar): number[] {
  const counts: number[] = [];
  calendar.weeks.forEach((week) => {
    week.contributionDays.forEach((day) => {
      if (day.contributionCount > 0) counts.push(day.contributionCount);
    });
  });
  if (counts.length === 0) return [1, 2, 3];
  counts.sort((a, b) => a - b);
  const q = (p: number) => counts[Math.min(Math.floor(p * counts.length), counts.length - 1)];
  return [q(0.25), q(0.5), q(0.75)];
}

interface IsometricMapProps {
  calendar: ContributionCalendar;
  username: string;
  avatarUrl?: string | null;
}

export default function IsometricMap({ calendar, username, avatarUrl }: IsometricMapProps) {
  const [mode, setMode] = useState<MapMode>("color");

  // 预计算分位数阈值（仅 count 模式用到）
  const thresholds = useMemo(() => computeThresholds(calendar), [calendar]);

  // 将 ContributionCalendar 扁平化为 { w, d, level }[]
  const data = useMemo(() => {
    const result: { w: number; d: number; level: number }[] = [];
    calendar.weeks.forEach((week, w) => {
      week.contributionDays.forEach((day, d) => {
        const level =
          mode === "color"
            ? colorToLevel(day.color)
            : countToLevel(day.contributionCount, thresholds);
        result.push({ w, d, level });
      });
    });
    return result;
  }, [calendar, mode, thresholds]);

  const weeks = calendar.weeks.length;

  // 生成完整的 SVG 字符串（用于渲染和下载）
  const svgContent = useMemo(() => {
    if (data.length === 0) return "";

    // SVG 滤镜 + 材质 pattern
    const defs = `
      <filter id="tint-water">
        <feColorMatrix type="matrix" values="
          0.1 0 0 0 0.15
          0.3 0 0 0 0.35
          0.6 0 0 0 0.85
          0   0 0 1 0" />
      </filter>
      <filter id="tint-grass">
        <feColorMatrix type="matrix" values="
          0.569 0 0 0 0.05
          0.741 0 0 0 0.05
          0.349 0 0 0 0.05
          0     0 0 1 0" />
      </filter>
    ${Object.entries(TEXTURES)
      .map(([key, url]) => {
        const getFilter = () => {
          if (key === "water") return 'filter="url(#tint-water)"';
          if (key === "grassTop") return 'filter="url(#tint-grass)"';
          return "";
        };
        return `
        <pattern id="pat-${key}-top" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="matrix(0.875, 0.4375, -0.875, 0.4375, 0, -14)">
          <image href="${url}" width="16" height="16" preserveAspectRatio="none" style="image-rendering: pixelated;" ${getFilter()} />
        </pattern>
        <pattern id="pat-${key}-left" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="matrix(0.875, 0.4375, 0, 1, -14, -7)">
          <image href="${url}" width="16" height="16" preserveAspectRatio="none" style="image-rendering: pixelated;" ${getFilter()} />
        </pattern>
        <pattern id="pat-${key}-right" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="matrix(0.875, -0.4375, 0, 1, 0, 0)">
          <image href="${url}" width="16" height="16" preserveAspectRatio="none" style="image-rendering: pixelated;" ${getFilter()} />
        </pattern>`;
      })
      .join("\n")}`;

    // 辅助：渲染单个方块
    const renderBlock = (
      w: number,
      d: number,
      renderLevel: number,
      isBaseWater: boolean
    ) => {
      const config = LEVELS[renderLevel];
      const h = config.height;
      const isWater = renderLevel === 0;

      const sx = (w - d) * TILE_W;
      const sy = (w + d) * TILE_H;

      const delay = -((w + d) * 0.15);

      const texTop = `url(#pat-${config.top}-top)`;
      const texLeft = `url(#pat-${config.side}-left)`;
      const texRight = `url(#pat-${config.side}-right)`;

      const animationClass = isBaseWater
        ? ""
        : isWater
          ? "animated-water-wave"
          : "animated-wave";

      const interactiveClass = !isBaseWater ? "interactive-block" : "";

      return `
        <g transform="translate(${sx}, ${sy + 14 - h})">
          <g class="${animationClass} ${interactiveClass}" ${!isBaseWater ? `style="animation-delay: ${delay.toFixed(2)}s"` : ""}>
            <polygon points="0,0 0,${h} -14,${h - 7} -14,-7" fill="${texLeft}" />
            <polygon points="0,0 14,-7 14,${h - 7} 0,${h}" fill="${texRight}" />
            <polygon points="0,-14 14,-7 0,0 -14,-7" fill="${texTop}" />
            <polygon points="0,0 0,${h} -14,${h - 7} -14,-7" fill="#000" opacity="${isWater || isBaseWater ? "0.4" : "0.5"}" />
            <polygon points="0,0 14,-7 14,${h - 7} 0,${h}" fill="#000" opacity="0.15" />
            <polygon points="0,-14 14,-7 0,0 -14,-7" fill="#fff" opacity="${isWater || isBaseWater ? "0.1" : "0.05"}" />
          </g>
        </g>`;
    };

    let blocks = "";
    data.forEach(({ w, d, level }) => {
      // 底座水层（静止）
      blocks += renderBlock(w, d, 0, true);
      // 表面方块（动画）
      blocks += renderBlock(w, d, level, false);
    });

    // 动态计算 viewBox — 精确覆盖等距投影的实际边界
    // 等距坐标: sx = (w - d) * TILE_W, sy = (w + d) * TILE_H
    // w: 0 ~ weeks-1, d: 0 ~ 6
    const maxH = LEVELS[LEVELS.length - 1].height; // 最高方块高度
    const minSx = (0 - 6) * TILE_W;           // 左边界: w=0, d=6
    const maxSx = (weeks - 1 - 0) * TILE_W;   // 右边界: w=max, d=0
    const minSy = (0 + 0) * TILE_H;           // 上边界: w=0, d=0
    const maxSy = (weeks - 1 + 6) * TILE_H;   // 下边界: w=max, d=6

    const padding = 20;
    // 方块顶部最高点在 sy + 14 - h - 14 = sy - h
    const vbX = minSx - TILE_W - padding;
    const vbY = minSy - maxH - padding;
    // 方块底部最低点在 sy + 14 - h + h = sy + 14
    const vbW = (maxSx + TILE_W) - vbX + padding * 2;
    const vbH = (maxSy + maxH) - vbY + padding * 2;

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vbX} ${vbY} ${vbW} ${vbH}" width="100%" height="100%">
  <defs>
    ${defs}
    <style>
      .animated-wave {
        animation: float 4s ease-in-out infinite;
      }
      .animated-water-wave {
        animation: water-float 4s ease-in-out infinite;
      }
      .interactive-block {
        transition: filter 0.2s;
        cursor: crosshair;
      }
      .interactive-block:hover {
        filter: brightness(1.5) contrast(1.2);
      }
      @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-8px); }
      }
      @keyframes water-float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-3px); }
      }
    </style>
  </defs>
  <rect x="${vbX}" y="${vbY}" width="${vbW}" height="${vbH}" fill="#09121c" />
  <g>${blocks}</g>
</svg>`;
  }, [data, weeks]);

  const handleDownload = () => {
    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${username}-commitcraft.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!svgContent) return null;

  return (
    <div className="w-full mt-8">
      {/* 用户信息栏 */}
      <div className="mc-player-bar mb-3">
        <div className="flex items-center gap-3">
          {avatarUrl && (
            <div className="mc-avatar-frame">
              <img
                src={avatarUrl}
                alt={username}
                className="w-7 h-7"
              />
            </div>
          )}
          <div className="flex flex-col leading-tight">
            <span className="text-white text-sm font-bold mc-text-shadow">
              {username}
            </span>
            <span className="text-[#FFAA00] text-xs mc-text-shadow-gold">
              {calendar.totalContributions.toLocaleString()} contributions
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode((m) => (m === "color" ? "count" : "color"))}
            className="mc-btn-secondary text-xs"
          >
            MODE: {mode === "color" ? "COLOR" : "COUNT"}
          </button>
          <button onClick={handleDownload} className="mc-btn-secondary text-xs">
            DOWNLOAD .SVG
          </button>
        </div>
      </div>

      {/* SVG 渲染区 */}
      <div
        className="mc-display overflow-auto !p-0"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />

      <p className="text-[#888] text-xs mt-2 text-center mc-text-shadow-light">
        Hover to highlight &bull; water → dirt → grass → stone → diamond
      </p>
    </div>
  );
}
