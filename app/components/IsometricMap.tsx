"use client";

import { useMemo } from "react";
import type { ContributionCalendar } from "@/app/lib/github";

// ===== 等距投影配置 =====
const TILE_W = 14;
const TILE_H = 7;

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

interface IsometricMapProps {
  calendar: ContributionCalendar;
  username: string;
}

export default function IsometricMap({ calendar, username }: IsometricMapProps) {
  // 将 ContributionCalendar 扁平化为 { w, d, level }[]
  const data = useMemo(() => {
    const result: { w: number; d: number; level: number }[] = [];
    calendar.weeks.forEach((week, w) => {
      week.contributionDays.forEach((day, d) => {
        result.push({ w, d, level: colorToLevel(day.color) });
      });
    });
    return result;
  }, [calendar]);

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

    // 动态计算 viewBox
    const vbW = (weeks + 7) * TILE_W + 40;
    const vbH = (weeks + 7) * TILE_H + 80;

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-weeks * TILE_W / 2 - 20} -80 ${vbW} ${vbH}" width="100%" height="100%">
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
  <rect x="${-weeks * TILE_W / 2 - 100}" y="-200" width="${vbW + 200}" height="${vbH + 300}" fill="#09121c" />
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
      {/* 工具栏 */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[#5ec462] text-sm mc-text-shadow">
          {calendar.totalContributions.toLocaleString()} contributions
        </span>
        <button onClick={handleDownload} className="mc-btn text-sm px-4 py-2">
          <span>DOWNLOAD .SVG</span>
        </button>
      </div>

      {/* SVG 渲染区 */}
      <div
        className="mc-display overflow-auto"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />

      <p className="text-[#666] text-xs mt-2 text-center mc-text-shadow-light">
        Hover to highlight &bull; Blocks: water → dirt → grass → stone → diamond
      </p>
    </div>
  );
}
