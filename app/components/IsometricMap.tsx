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

// 贡献等级 → 方块类型映射（每层固定高度 14，堆叠式）
const BLOCK_H = 14; // 每层方块的固定高度

const BLOCK_TYPES = {
  waterDeep: { top: "water", side: "water" },
  water:     { top: "water", side: "water" },
  dirt:      { top: "dirt", side: "dirt" },
  grass:     { top: "grassTop", side: "grassSide" },
  stone:     { top: "stone", side: "stone" },
  diamond:   { top: "diamond_ore", side: "diamond_ore" },
};

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

  // 将 ContributionCalendar 扁平化为 { w, d, level, count, date }[]
  const data = useMemo(() => {
    const result: { w: number; d: number; level: number; count: number; date: string }[] = [];
    calendar.weeks.forEach((week, w) => {
      week.contributionDays.forEach((day, d) => {
        const level =
          mode === "color"
            ? colorToLevel(day.color)
            : countToLevel(day.contributionCount, thresholds);
        result.push({ w, d, level, count: day.contributionCount, date: day.date });
      });
    });
    return result;
  }, [calendar, mode, thresholds]);

  const weeks = calendar.weeks.length;

  // 生成完整的 SVG 字符串（用于渲染和下载）
  const svgContent = useMemo(() => {
    if (data.length === 0) return "";

    // SVG 滤镜 + 材质 pattern
    // 水面染色参数与 Gemini Canvas 引擎对齐：
    // waterSurface = tintImage(water, '#4a82ff') 清透蔚蓝
    // waterDeep    = tintImage(water, '#203c80') 深邃暗蓝

    // feColorMatrix的值永远是四行五列，每行是计算后的新颜色通道RGBA。五列分别代表原图的RGBA和偏移常量1。
    const defs = `
      <filter id="tint-water-surface">
        <feColorMatrix type="matrix" values="
          0.29 0 0 0 0
          0.51 0 0 0 0
          1.0  0 0 0 0
          0    0 0 1 0" />
      </filter>
      <filter id="tint-water-deep">
        <feColorMatrix type="matrix" values="
          0.125 0 0 0 0
          0.235 0 0 0 0
          0.5   0 0 0 0
          0     0 0 1 0" />
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
          if (key === "grassTop") return 'filter="url(#tint-grass)"';
          return "";
        };
        // 水的贴图需要两套 pattern（surface 和 deep）
        if (key === "water") {
          return `
        <pattern id="pat-waterSurface-top" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="matrix(0.875, 0.4375, -0.875, 0.4375, 0, -14)">
          <image href="${url}" width="16" height="16" preserveAspectRatio="none" style="image-rendering: pixelated;" filter="url(#tint-water-surface)" />
        </pattern>
        <pattern id="pat-waterSurface-left" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="matrix(0.875, 0.4375, 0, 1, -14, -7)">
          <image href="${url}" width="16" height="16" preserveAspectRatio="none" style="image-rendering: pixelated;" filter="url(#tint-water-surface)" />
        </pattern>
        <pattern id="pat-waterSurface-right" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="matrix(0.875, -0.4375, 0, 1, 0, 0)">
          <image href="${url}" width="16" height="16" preserveAspectRatio="none" style="image-rendering: pixelated;" filter="url(#tint-water-surface)" />
        </pattern>
        <pattern id="pat-waterDeep-top" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="matrix(0.875, 0.4375, -0.875, 0.4375, 0, -14)">
          <image href="${url}" width="16" height="16" preserveAspectRatio="none" style="image-rendering: pixelated;" filter="url(#tint-water-deep)" />
        </pattern>
        <pattern id="pat-waterDeep-left" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="matrix(0.875, 0.4375, 0, 1, -14, -7)">
          <image href="${url}" width="16" height="16" preserveAspectRatio="none" style="image-rendering: pixelated;" filter="url(#tint-water-deep)" />
        </pattern>
        <pattern id="pat-waterDeep-right" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="matrix(0.875, -0.4375, 0, 1, 0, 0)">
          <image href="${url}" width="16" height="16" preserveAspectRatio="none" style="image-rendering: pixelated;" filter="url(#tint-water-deep)" />
        </pattern>`;
        }
        return `
        <pattern id="pat-${key}-top" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="matrix(0.875, 0.4375, -0.875, 0.4375, 0, -14)">
          <image href="${url}" width="16" height="16" preserveAspectRatio="none" style="image-rendering: pixelated;" ${getFilter()} />
        </pattern>
        <pattern id="pat-${key}-left" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="matrix(0.875, 0.4375, 0, 1, -14, -7)">
          <image href="${url}" width="16" height="16" preserveAspectRatio="none" style="image-rendering: pixelated;" ${getFilter()} />
        </pattern>
        <pattern id="pat-${key}-right" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="matrix(0.875, -0.4375, 0, 0.875, 0, 0)">
          <image href="${url}" width="16" height="16" preserveAspectRatio="none" style="image-rendering: pixelated;" ${getFilter()} />
        </pattern>`;
      })
      .join("\n")}`;

    // 根据 level 确定每层用什么方块类型
    function getBlockType(level: number, z: number): keyof typeof BLOCK_TYPES {
      if (level === 1) return "dirt";
      if (level === 2) return z === level ? "grass" : "dirt";
      if (level === 3) return "stone";
      // level === 4
      return z === level ? "diamond" : "stone";
    }

    // 渲染水方块（蔚蓝，有浮动动画+扫光，光照：左0.2 右0.05 顶shimmer白色）
    const renderWater = (sx: number, sy: number, delay: number) => {
      const h = BLOCK_H;
      return `
        <g transform="translate(${sx}, ${sy})">
          <g class="animated-water-wave" style="animation-delay: ${delay.toFixed(2)}s">
            <polygon points="0,0 0,${h} -14,${h - 7} -14,-7" fill="url(#pat-waterSurface-left)" />
            <polygon points="0,0 14,-7 14,${h - 7} 0,${h}" fill="url(#pat-waterSurface-right)" />
            <polygon points="0,-14 14,-7 0,0 -14,-7" fill="url(#pat-waterSurface-top)" />
            <polygon points="0,0 0,${h} -14,${h - 7} -14,-7" fill="#000" opacity="0.2" />
            <polygon points="0,0 14,-7 14,${h - 7} 0,${h}" fill="#000" opacity="0.05" />
            <polygon points="0,-14 14,-7 0,0 -14,-7" fill="#fff" class="water-shimmer" style="animation-delay: ${delay.toFixed(2)}s" />
          </g>
        </g>`;
    };

    // 渲染陆地方块（固定高度 BLOCK_H=14，光照：左0.5 右0.15 顶0.05白色）
    const renderBlock = (
      sx: number,
      cy: number,
      blockType: keyof typeof BLOCK_TYPES,
      delay: number
    ) => {
      const bt = BLOCK_TYPES[blockType];
      const h = BLOCK_H;

      const texTop = `url(#pat-${bt.top}-top)`;
      const texLeft = `url(#pat-${bt.side}-left)`;
      const texRight = `url(#pat-${bt.side}-right)`;

      return `
        <g transform="translate(${sx}, ${cy})">
          <g class="animated-wave interactive-block" style="animation-delay: ${delay.toFixed(2)}s">
            <polygon points="0,0 0,${h} -14,${h - 7} -14,-7" fill="${texLeft}" />
            <polygon points="0,0 14,-7 14,${h - 7} 0,${h}" fill="${texRight}" />
            <polygon points="0,-14 14,-7 0,0 -14,-7" fill="${texTop}" />
            <polygon points="0,0 0,${h} -14,${h - 7} -14,-7" fill="#000" opacity="0.5" />
            <polygon points="0,0 14,-7 14,${h - 7} 0,${h}" fill="#000" opacity="0.15" />
            <polygon points="0,-14 14,-7 0,0 -14,-7" fill="#fff" opacity="0.05" />
          </g>
        </g>`;
    };

    // ===== 构建渲染队列：水底座 + 陆地方块 =====
    // 先按格子分组，每个格子一个 <g class="block-column">
    interface CellData {
      w: number; d: number; level: number; count: number; date: string;
    }
    // 按画家算法排序格子
    const sortedCells: CellData[] = [...data].sort((a, b) => {
      const depthA = a.w + a.d;
      const depthB = b.w + b.d;
      return depthA - depthB;
    });

    let allBlocks = "";
    sortedCells.forEach(({ w, d, level, count, date }) => {
      const sx = (w - d) * TILE_W;
      const sy = (w + d) * TILE_H;
      const delay = -((w + d) * 0.15);

      // 水底座（下沉 一点点，避免水面高于一格方块）
      let columnSvg = renderWater(sx, sy + 3, delay);

      // 陆地堆叠（从 z=0 开始覆盖水面，共 level 层）
      if (level > 0) {
        for (let z = 0; z < level; z++) {
          const cy = sy - z * BLOCK_H;
          columnSvg += renderBlock(sx, cy, getBlockType(level, z + 1), delay);
        }
      }

      // MC 风格 tooltip 框：仅对陆地方块生效（水方块 = 0 commit，不显示）
      if (level > 0) {
        const topZ = level - 1;
        const tooltipBaseY = sy - topZ * BLOCK_H - 14 - 16;

        const line1 = date;
        const line2 = `${count} commits`;
        const maxChars = Math.max(line1.length, line2.length);
        const boxW = maxChars * 8.4 + 20;
        const boxH = 40;
        const boxX = sx - boxW / 2;
        const boxY = tooltipBaseY - boxH - 2;

        columnSvg += `
          <g class="block-tooltip">
            <rect x="${boxX}" y="${boxY}" width="${boxW}" height="${boxH}" rx="1" fill="#100010" fill-opacity="0.94" />
            <rect x="${boxX + 1}" y="${boxY + 1}" width="${boxW - 2}" height="${boxH - 2}" rx="1" fill="none" stroke="#5000FF" stroke-opacity="0.4" stroke-width="1" />
            <text x="${sx}" y="${boxY + 15}" text-anchor="middle" fill="#AAAAAA" font-size="12" font-family="'Courier New', Courier, monospace">${line1}</text>
            <text x="${sx + 0.7}" y="${boxY + 32.7}" text-anchor="middle" fill="#3F3F3F" font-size="13" font-family="'Courier New', Courier, monospace" font-weight="bold">${line2}</text>
            <text x="${sx}" y="${boxY + 32}" text-anchor="middle" fill="#fff" font-size="13" font-family="'Courier New', Courier, monospace" font-weight="bold">${line2}</text>
          </g>`;
      }

      allBlocks += `<g class="block-column">${columnSvg}</g>`;
    });

    // 动态计算 viewBox
    const maxZ = 4; // 最高堆叠层数
    const maxH = (maxZ + 1) * BLOCK_H + BLOCK_H; // 最高方块顶部偏移
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
        animation: water-float 6s ease-in-out infinite;
      }
      .interactive-block {
        transition: filter 0.2s;
        cursor: crosshair;
      }
      .interactive-block:hover {
        filter: brightness(1.5) contrast(1.2);
      }
      .block-tooltip {
        opacity: 0;
        pointer-events: none;
        transform: translateY(8px);
        transition: opacity 0.25s ease, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      .block-column:hover .block-tooltip {
        opacity: 1;
        transform: translateY(0);
      }
      .block-column {
        cursor: crosshair;
      }
      @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-8px); }
      }
      @keyframes water-float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-3px); }
      }
      /* 水面扫光：opacity 脉冲 + 基于位置的 delay → 阳光扫过海面 */
      .water-shimmer {
        opacity: 0.03;
        animation: shimmer 4s ease-in-out infinite;
      }
      @keyframes shimmer {
        0%, 100% { opacity: 0.03; }
        40% { opacity: 0.25; }
        60% { opacity: 0.25; }
        80% { opacity: 0.03; }
      }
    </style>
  </defs>
  <rect x="${vbX}" y="${vbY}" width="${vbW}" height="${vbH}" fill="#09121c" />
  <g>${allBlocks}</g>
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
        <div className="flex items-center gap-4">
          {avatarUrl && (
            <div className="mc-avatar-frame">
              <img
                src={avatarUrl}
                alt={username}
                className="w-9 h-9"
              />
            </div>
          )}
          <div className="flex flex-col leading-tight">
            <span className="text-white text-base font-bold mc-text-shadow">
              {username}
            </span>
            <span className="text-[#FFAA00] text-sm mc-text-shadow-gold">
              {calendar.totalContributions.toLocaleString()} contributions
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMode((m) => (m === "color" ? "count" : "color"))}
            className="mc-btn-secondary text-sm"
          >
            MODE: {mode === "color" ? "COLOR" : "COUNT"}
          </button>
          <button onClick={handleDownload} className="mc-btn-secondary text-sm">
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
