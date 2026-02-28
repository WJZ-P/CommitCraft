"use client";

import { useMemo } from "react";
import type { ContributionCalendar } from "@/app/lib/github";

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
  coal_ore: `${TEX_BASE}coal_ore.png`,
  copper_ore: `${TEX_BASE}copper_ore.png`,
  iron_ore: `${TEX_BASE}iron_ore.png`,
  lapis_ore: `${TEX_BASE}lapis_ore.png`,
  redstone_ore: `${TEX_BASE}redstone_ore.png`,
  gold_ore: `${TEX_BASE}gold_ore.png`,
  emerald_ore: `${TEX_BASE}emerald_ore.png`,
  diamond_ore: `${TEX_BASE}diamond_ore.png`,
};

// 等级对应的矿石 icon（用于 tooltip）
const ITEM_BASE =
  "https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.20.4/assets/minecraft/textures/item/";

// tooltip 矿石等级（基于 count 划分，11 级）
const LEVEL_ORE: Record<number, { icon: string; name: string; color: string; quote: string }> = {
  1:  { icon: `${ITEM_BASE}coal.png`,            name: "Coal",            color: "#888888", quote: "A spark in the dark." },
  2:  { icon: `${ITEM_BASE}raw_copper.png`,      name: "Raw Copper",      color: "#C87533", quote: "Warming up the furnace." },
  3:  { icon: `${ITEM_BASE}iron_ingot.png`,      name: "Iron",            color: "#CCCCCC", quote: "Getting into the rhythm." },
  4:  { icon: `${ITEM_BASE}copper_ingot.png`,    name: "Copper",          color: "#E07040", quote: "Steady progress, forging ahead!" },
  5:  { icon: `${ITEM_BASE}lapis_lazuli.png`,    name: "Lapis",           color: "#3355DD", quote: "Building momentum!" },
  6:  { icon: `${ITEM_BASE}redstone.png`,        name: "Redstone",        color: "#FF2020", quote: "Powered up! Full charge!" },
  7:  { icon: `${ITEM_BASE}gold_ingot.png`,      name: "Gold",            color: "#FFAA00", quote: "You're on fire today!" },
  8:  { icon: `${ITEM_BASE}emerald.png`,         name: "Emerald",         color: "#00DD55", quote: "Villagers would be jealous!" },
  9:  { icon: `${ITEM_BASE}diamond.png`,         name: "Diamond",         color: "#55FFFF", quote: "Mass production! Incredible!" },
  10: { icon: `${ITEM_BASE}nether_star.png`,     name: "Nether Star",     color: "#FF8C00", quote: "Unstoppable! Absolute legend!" },
  11: { icon: `${ITEM_BASE}totem_of_undying.png`, name: "Totem of Undying", color: "#FFD700", quote: "GODLIKE! Beyond mortal limits!" },
};

// count → tooltip 矿石等级 (1~11)
function countToOreLevel(count: number): number {
  if (count <= 9) return count;  // 1~9 严格对应
  if (count < 20) return 10;     // 10~19: Nether Star
  return 11;                      // >=20: Totem of Undying
}

// count → 柱高 (0 = 水, 1~10)
// count <= 10 时高度严格等于 count；count > 10 时就直接返回10
function countToHeight(count: number): number {
  if (count === 0) return 0;
  if (count <= 10) return count;
  return 10;
}

// 贡献等级 → 方块类型映射（每层固定高度 14，堆叠式）
const BLOCK_H = 14; // 每层方块的固定高度

const BLOCK_TYPES = {
  water:        { top: "water", side: "water" },
  dirt:         { top: "dirt", side: "dirt" },
  grass:        { top: "grassTop", side: "grassSide" },
  stone:        { top: "stone", side: "stone" },
  coal_ore:     { top: "coal_ore", side: "coal_ore" },
  copper_ore:   { top: "copper_ore", side: "copper_ore" },
  iron_ore:     { top: "iron_ore", side: "iron_ore" },
  lapis_ore:    { top: "lapis_ore", side: "lapis_ore" },
  redstone_ore: { top: "redstone_ore", side: "redstone_ore" },
  gold_ore:     { top: "gold_ore", side: "gold_ore" },
  emerald_ore:  { top: "emerald_ore", side: "emerald_ore" },
  diamond_ore:  { top: "diamond_ore", side: "diamond_ore" },
};

interface IsometricMapProps {
  calendar: ContributionCalendar;
  username: string;
  avatarUrl?: string | null;
}

export default function IsometricMap({ calendar, username, avatarUrl }: IsometricMapProps) {

  // 将 ContributionCalendar 扁平化为 { w, d, height, count, date }[]
  const data = useMemo(() => {
    const result: { w: number; d: number; height: number; count: number; date: string }[] = [];
    calendar.weeks.forEach((week, w) => {
      week.contributionDays.forEach((day, d) => {
        const height = countToHeight(day.contributionCount);
        result.push({ w, d, height, count: day.contributionCount, date: day.date });
      });
    });
    return result;
  }, [calendar]);

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

    // ===== 矿石生成系统 =====
    // 矿石按稀有度排列（低→高），每种有：
    //   - minDepth: 最浅出现深度比 (0=最深, 1=最浅)
    //   - baseChance: 基础生成概率
    //   - countWeight: count 对该矿的加权（count 越高，高级矿越容易出）
    const ORE_TABLE: { type: keyof typeof BLOCK_TYPES; minDepth: number; baseChance: number; countWeight: number }[] = [
      { type: "coal_ore",     minDepth: 1.0,  baseChance: 0.15, countWeight: 0.5 },  // 到处都有，count高时反而少
      { type: "copper_ore",   minDepth: 0.85, baseChance: 0.12, countWeight: 0.7 },
      { type: "iron_ore",     minDepth: 0.7,  baseChance: 0.10, countWeight: 1.0 },
      { type: "lapis_ore",    minDepth: 0.5,  baseChance: 0.07, countWeight: 1.3 },
      { type: "redstone_ore", minDepth: 0.4,  baseChance: 0.06, countWeight: 1.5 },
      { type: "gold_ore",     minDepth: 0.35, baseChance: 0.05, countWeight: 1.8 },
      { type: "emerald_ore",  minDepth: 0.25, baseChance: 0.04, countWeight: 2.2 },
      { type: "diamond_ore",  minDepth: 0.2,  baseChance: 0.03, countWeight: 2.5 },
    ];

    function getBlockType(height: number, z: number, count: number): keyof typeof BLOCK_TYPES {
      if (height <= 2) {
        // 矮柱：顶层根据 count 决定，底层泥土
        if (z === height) return count <= 1 ? "dirt" : "grass";
        return "dirt";
      }

      // 最顶层：1 commit 用泥土，≥2 用草方块
      if (z === height) return count <= 1 ? "dirt" : "grass";
      // 次顶层：泥土
      if (z === height - 1) return "dirt";
      // 第三层开始可能泥土（过渡层）
      if (z === height - 2 && height >= 5) return Math.random() < 0.4 ? "dirt" : "stone";

      // --- 石头层：矿石生成 ---
      // 深度比 (0=最深/底部, 1=最浅/靠近地表)
      const stoneTop = height - 2;
      const depthRatio = stoneTop > 1 ? (z - 1) / (stoneTop - 1) : 0.5;

      // count 加成系数：每个 commit 都有帮助，越多越强
      // count=1 → 1.0, count=5 → 1.4, count=10 → 1.9, count=20 → 2.5(cap)
      const countFactor = Math.min(2.5, 1.0 + (count - 1) * 0.1);

      // 从最稀有开始判定（优先生成高级矿）
      const roll = Math.random();
      let cumulative = 0;

      for (let i = ORE_TABLE.length - 1; i >= 0; i--) {
        const ore = ORE_TABLE[i];
        // 深度不够则跳过（深度比必须 <= minDepth 才能生成）
        if (depthRatio > ore.minDepth) continue;

        // 深度越深，概率越高（在允许范围内的深度加成）
        const depthBonus = 1 - depthRatio / ore.minDepth; // 0~1，越深越大

        // 最终概率 = 基础概率 × (1 + 深度加成) × count加权系数
        // 低级矿 countWeight < 1，count 高时概率反而降低 → 让位给高级矿
        const chance = ore.baseChance * (1 + depthBonus) * (countFactor * ore.countWeight / 1.5);

        cumulative += chance;
        if (roll < cumulative) return ore.type;
      }

      return "stone";
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
      w: number; d: number; height: number; count: number; date: string;
    }
    // 按画家算法排序格子
    const sortedCells: CellData[] = [...data].sort((a, b) => {
      const depthA = a.w + a.d;
      const depthB = b.w + b.d;
      return depthA - depthB;
    });

    let allBlocks = "";
    sortedCells.forEach(({ w, d, height, count, date }) => {
      const sx = (w - d) * TILE_W;
      const sy = (w + d) * TILE_H;
      const delay = -((w + d) * 0.15);

      // 水底座（下沉 一点点，避免水面高于一格方块）
      let columnSvg = renderWater(sx, sy + 3, delay);

      // 陆地堆叠（从 z=0 开始覆盖水面，共 height 层）
      if (height > 0) {
        for (let z = 0; z < height; z++) {
          const cy = sy - z * BLOCK_H;
          columnSvg += renderBlock(sx, cy, getBlockType(height, z + 1, count), delay);
        }
      }

      // MC 风格 tooltip 框：仅对陆地方块生效（水方块 = 0 commit，不显示）
      if (height > 0) {
        const topZ = height - 1;
        const tooltipBaseY = sy - topZ * BLOCK_H - 14 - 16;
        const ore = LEVEL_ORE[countToOreLevel(count)];

        const line1 = date;
        const line2 = `${count} commits`;
        const line3 = ore.quote;
        const maxChars = Math.max(line1.length, line2.length + 3, line3.length);
        const boxW = maxChars * 7.2 + 10;
        const boxH = 52;
        const boxX = sx - boxW / 2;
        const boxY = tooltipBaseY - boxH - 2;

        // 矿石 icon 放在 commits 文字右侧
        const iconSize = 12;
        const line2HalfW = line2.length * 3.6;
        const iconX = sx + line2HalfW + 10;
        const iconY = boxY + 30 - iconSize + 1;

        columnSvg += `
          <g class="block-tooltip">
            <rect x="${boxX}" y="${boxY}" width="${boxW}" height="${boxH}" rx="1" fill="#100010" fill-opacity="0.94" />
            <rect x="${boxX + 1}" y="${boxY + 1}" width="${boxW - 2}" height="${boxH - 2}" rx="1" fill="none" stroke="#5000FF" stroke-opacity="0.4" stroke-width="1" />
            <text x="${sx}" y="${boxY + 15}" text-anchor="middle" fill="#AAAAAA" font-size="12" font-family="'Courier New', Courier, monospace" font-weight="bold">${line1}</text>
            <text x="${sx}" y="${boxY + 30}" text-anchor="middle" fill="#fff" font-size="13" font-family="'Courier New', Courier, monospace" font-weight="bold">${line2}</text>
            <g class="ore-icon-wrap" style="transform-box: fill-box; transform-origin: center;">
              <image href="${ore.icon}" x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}" style="image-rendering: pixelated;" />
            </g>
            <text x="${sx}" y="${boxY + 45}" text-anchor="middle" fill="${ore.color}" font-size="12" font-family="'Courier New', Courier, monospace" font-style="italic">${line3}</text>
          </g>`;
      }

      allBlocks += `<g class="block-column">${columnSvg}</g>`;
    });

    // 动态计算 viewBox
    const maxZ = 10; // 最高堆叠层数
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
      .ore-icon-wrap {
        transform-box: fill-box;
        transform-origin: center;
      }
      .block-column:hover .ore-icon-wrap {
        animation: ore-wobble 1.0s ease-in-out;
      }
      .block-column {
        cursor: crosshair;
      }
      @keyframes ore-wobble {
        0%   { transform: scale(1) rotate(0deg); }
        15%  { transform: scale(1.4) rotate(-12deg); }
        30%  { transform: scale(1.3) rotate(10deg); }
        45%  { transform: scale(1.2) rotate(-8deg); }
        60%  { transform: scale(1.1) rotate(5deg); }
        80%  { transform: scale(1.05) rotate(-2deg); }
        100% { transform: scale(1) rotate(0deg); }
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
  <rect x="${vbX}" y="${vbY}" width="${vbW}" height="${vbH}" fill="none" />
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
        Hover to inspect &bull; Height &amp; ores scale with commits
      </p>
    </div>
  );
}
