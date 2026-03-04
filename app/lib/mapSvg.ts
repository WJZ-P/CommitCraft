/**
 * IsometricMap SVG 生成器 — 前端/后端共用的纯函数
 */

// ===== 等距投影配置 =====
export const TILE_W = 14;
export const TILE_H = 7;
export const BLOCK_H = 14;

const TEX_BASE =
  "https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.20.4/assets/minecraft/textures/block/";

export const TEXTURES: Record<string, string> = {
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

const ITEM_BASE =
  "https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.20.4/assets/minecraft/textures/item/";

export const LEVEL_ORE: Record<number, { icon: string; name: string; color: string; quote: string }> = {
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

export function countToOreLevel(count: number): number {
  if (count <= 9) return count;
  if (count < 20) return 10;
  return 11;
}

export function countToHeight(count: number): number {
  if (count === 0) return 0;
  if (count <= 10) return count;
  return 10;
}

export const BLOCK_TYPES = {
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

// ===== 矿石生成系统 =====
const ORE_TABLE: { type: keyof typeof BLOCK_TYPES; minDepth: number; baseChance: number; countWeight: number }[] = [
  { type: "coal_ore",     minDepth: 1.0,  baseChance: 0.15, countWeight: 0.5 },
  { type: "copper_ore",   minDepth: 0.85, baseChance: 0.12, countWeight: 0.7 },
  { type: "iron_ore",     minDepth: 0.7,  baseChance: 0.10, countWeight: 1.0 },
  { type: "lapis_ore",    minDepth: 0.5,  baseChance: 0.07, countWeight: 1.3 },
  { type: "redstone_ore", minDepth: 0.4,  baseChance: 0.06, countWeight: 1.5 },
  { type: "gold_ore",     minDepth: 0.35, baseChance: 0.05, countWeight: 1.8 },
  { type: "emerald_ore",  minDepth: 0.25, baseChance: 0.04, countWeight: 2.2 },
  { type: "diamond_ore",  minDepth: 0.2,  baseChance: 0.03, countWeight: 2.5 },
];

export function getBlockType(height: number, z: number, count: number): keyof typeof BLOCK_TYPES {
  if (height <= 2) {
    if (z === height) return count <= 1 ? "dirt" : "grass";
    return "dirt";
  }
  if (z === height) return count <= 1 ? "dirt" : "grass";
  if (z === height - 1) return "dirt";
  if (z === height - 2 && height >= 5) return Math.random() < 0.4 ? "dirt" : "stone";

  const stoneTop = height - 2;
  const depthRatio = stoneTop > 1 ? (z - 1) / (stoneTop - 1) : 0.5;
  const countFactor = Math.min(2.5, 1.0 + (count - 1) * 0.1);

  const roll = Math.random();
  let cumulative = 0;

  for (let i = ORE_TABLE.length - 1; i >= 0; i--) {
    const ore = ORE_TABLE[i];
    if (depthRatio > ore.minDepth) continue;
    const depthBonus = 1 - depthRatio / ore.minDepth;
    const chance = ore.baseChance * (1 + depthBonus) * (countFactor * ore.countWeight / 1.5);
    cumulative += chance;
    if (roll < cumulative) return ore.type;
  }
  return "stone";
}

// ===== SVG defs 生成 =====
function buildDefs(): string {
  return `
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
}

// ===== 渲染水方块 =====
function renderWater(sx: number, sy: number, delay: number): string {
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
}

// ===== 渲染陆地方块 =====
function renderBlock(sx: number, cy: number, blockType: keyof typeof BLOCK_TYPES, delay: number): string {
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
}

// ===== CSS 样式（前端交互版和后端静态版略有不同） =====
export function getMapStyles(interactive: boolean): string {
  const interactiveCSS = interactive ? `
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
    }` : `
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
    }`;

  return `
    .animated-wave {
      animation: float 4s ease-in-out infinite;
    }
    .animated-water-wave {
      animation: water-float 6s ease-in-out infinite;
    }
    ${interactiveCSS}
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }
    @keyframes water-float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }
    .water-shimmer {
      opacity: 0.03;
      animation: shimmer 4s ease-in-out infinite;
    }
    @keyframes shimmer {
      0%, 100% { opacity: 0.03; }
      40% { opacity: 0.25; }
      60% { opacity: 0.25; }
      80% { opacity: 0.03; }
    }`;
}

// ===== 主函数：生成完整的贡献图 SVG =====
export interface MapSvgParams {
  weeks: { contributionDays: { date: string; contributionCount: number; color: string }[] }[];
  /** 是否包含前端交互样式（hover 高亮等），后端静态 SVG 可以设为 false */
  interactive?: boolean;
}

export function generateMapSvg(params: MapSvgParams): string {
  const { weeks, interactive = false } = params;

  const data: { w: number; d: number; height: number; count: number; date: string }[] = [];
  weeks.forEach((week, w) => {
    week.contributionDays.forEach((day, d) => {
      data.push({ w, d, height: countToHeight(day.contributionCount), count: day.contributionCount, date: day.date });
    });
  });

  if (data.length === 0) return '<svg xmlns="http://www.w3.org/2000/svg" />';

  const numWeeks = weeks.length;
  const defs = buildDefs();

  // 排序（画家算法）
  interface CellData { w: number; d: number; height: number; count: number; date: string }
  const sortedCells: CellData[] = [...data].sort((a, b) => (a.w + a.d) - (b.w + b.d));

  let allBlocks = "";
  sortedCells.forEach(({ w, d, height, count, date }) => {
    const sx = (w - d) * TILE_W;
    const sy = (w + d) * TILE_H;
    const delay = -((w + d) * 0.15);

    let columnSvg = renderWater(sx, sy + 3, delay);

    if (height > 0) {
      for (let z = 0; z < height; z++) {
        const cy = sy - z * BLOCK_H;
        columnSvg += renderBlock(sx, cy, getBlockType(height, z + 1, count), delay);
      }
    }

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

  // viewBox 计算
  const maxZ = 10;
  const maxH = (maxZ + 1) * BLOCK_H + BLOCK_H;
  const minSx = (0 - 6) * TILE_W;
  const maxSx = (numWeeks - 1 - 0) * TILE_W;
  const minSy = (0 + 0) * TILE_H;
  const maxSy = (numWeeks - 1 + 6) * TILE_H;

  const padding = 20;
  const vbX = minSx - TILE_W - padding;
  const vbY = minSy - maxH - padding;
  const vbW = (maxSx + TILE_W) - vbX + padding * 2;
  const vbH = (maxSy + maxH) - vbY + padding * 2;

  const sizeAttrs = interactive
    ? 'width="100%" height="100%"'
    : `width="${vbW}" height="${vbH}"`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vbX} ${vbY} ${vbW} ${vbH}" ${sizeAttrs}>
<defs>
  ${defs}
  <style>${getMapStyles(interactive)}</style>
</defs>
<rect x="${vbX}" y="${vbY}" width="${vbW}" height="${vbH}" fill="none" />
<g>${allBlocks}</g>
</svg>`;
}
