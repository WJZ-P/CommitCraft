/**
 * Banner SVG 生成器 — 前端/后端共用的纯函数和数据
 */

import type { UserStats } from "@/app/lib/github";

// ===== MC 材质 =====
const ASSETS_BASE =
  "https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.20.4/assets/minecraft/textures/block";

export const TEXTURES = {
  stone: `${ASSETS_BASE}/stone.png`,
  spruce_log: `${ASSETS_BASE}/spruce_log.png`,
};

// ===== 成就等级色彩 =====
export const TIER_CONFIG: Record<string, { name: string; base: string; text: string; label: string }> = {
  "S+": { name: "Diamond", base: "#0E6B72", text: "#55FFFF", label: "#E0E0E0" },
  "S":  { name: "Diamond", base: "#158991", text: "#55FFFF", label: "#E0E0E0" },
  "S-": { name: "Diamond", base: "#1FA0A8", text: "#55FFFF", label: "#E0E0E0" },
  "A+": { name: "Orange",  base: "#E06A0A", text: "#333333", label: "#2A2A2A" },
  "A":  { name: "Orange",  base: "#F9801D", text: "#333333", label: "#2A2A2A" },
  "A-": { name: "Orange",  base: "#FA9A4D", text: "#333333", label: "#2A2A2A" },
  "B+": { name: "Gold",    base: "#E5AE0E", text: "#333333", label: "#2A2A2A" },
  "B":  { name: "Gold",    base: "#F8C527", text: "#333333", label: "#2A2A2A" },
  "B-": { name: "Gold",    base: "#FAD45C", text: "#333333", label: "#2A2A2A" },
  "C+": { name: "Iron",    base: "#C0C0C0", text: "#333333", label: "#2A2A2A" },
  "C":  { name: "Iron",    base: "#D8D8D8", text: "#333333", label: "#2A2A2A" },
  "C-": { name: "Iron",    base: "#E8E8E8", text: "#333333", label: "#2A2A2A" },
  "D":  { name: "Stone",   base: "#474F52", text: "#E0E0E0", label: "#E0E0E0" },
};

// ===== 图标路径 =====
const ITEM_BASE = "https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.20.4/assets/minecraft/textures/item";
export const ICONS: Record<string, string> = {
  commits:   `${ITEM_BASE}/diamond_pickaxe.png`,
  prs:       `${ITEM_BASE}/writable_book.png`,
  stars:     `${ITEM_BASE}/nether_star.png`,
  issues:    `${ITEM_BASE}/spider_eye.png`,
  followers: `https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.20.4/assets/minecraft/textures/gui/sprites/hud/heart/full.png`,
  repos:     `${ITEM_BASE}/book.png`,
  merged:    `${ITEM_BASE}/gold_ingot.png`,
};

// ===== 根据数值计算等级 =====
function buildThresholds(sPlus: number, s: number, sMinus: number, a: number, b: number, c: number): number[] {
  const aStep = (sMinus - a) / 3;
  const aPlus  = Math.round(a + aStep * 2);
  const aMid   = Math.round(a + aStep);
  const aMinus = a;
  const bStep = (a - b) / 3;
  const bPlus  = Math.round(b + bStep * 2);
  const bMid   = Math.round(b + bStep);
  const bMinus = b;
  const cStep = (b - c) / 3;
  const cPlus  = Math.round(c + cStep * 2);
  const cMid   = Math.round(c + cStep);
  const cMinus = c;
  return [sPlus, s, sMinus, aPlus, aMid, aMinus, bPlus, bMid, bMinus, cPlus, cMid, cMinus];
}

const TIER_THRESHOLDS: Record<string, number[]> = {
  commits:   buildThresholds(1500, 1250, 1000, 500, 250, 100),
  prs:       buildThresholds(400, 300, 200, 100, 30, 10),
  stars:     buildThresholds(2000, 1500, 1000, 100, 30, 5),
  issues:    buildThresholds(400, 300, 200, 100, 30, 10),
  followers: buildThresholds(1000, 750, 500, 100, 30, 10),
  repos:     buildThresholds(100, 75, 50, 30, 15, 5),
  merged:    buildThresholds(300, 225, 150, 80, 20, 5),
};

const TIER_LABELS = ["S+", "S", "S-", "A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-"];

export function getTier(id: string, value: number): string {
  const t = TIER_THRESHOLDS[id] || buildThresholds(200, 150, 100, 50, 20, 5);
  for (let i = 0; i < TIER_LABELS.length; i++) {
    if (value >= t[i]) return TIER_LABELS[i];
  }
  return "D";
}

// ===== 统计项 =====
export interface StatItem {
  id: string;
  title: string;
  value: string;
  rawValue: number;
  tier: string;
  icon: string;
}

export const VALID_STAT_IDS = ["commits", "prs", "stars", "issues", "followers", "repos", "merged"] as const;
export type StatId = typeof VALID_STAT_IDS[number];

export const STAT_TITLES: Record<StatId, string> = {
  commits:   "COMMITS",
  prs:       "PULL REQS",
  stars:     "STARS",
  issues:    "ISSUES",
  followers: "FOLLOWERS",
  repos:     "REPOS",
  merged:    "MERGED PRs",
};

export function getStatValue(id: StatId, stats: UserStats, totalContributions: number): number {
  switch (id) {
    case "commits":   return totalContributions;
    case "prs":       return stats.pullRequests;
    case "stars":     return stats.totalStars;
    case "issues":    return stats.issues;
    case "followers": return stats.followers;
    case "repos":     return stats.publicRepos;
    case "merged":    return stats.mergedPullRequests;
  }
}

export function buildStats(stats: UserStats, totalContributions: number): StatItem[] {
  const items: { id: string; title: string; raw: number }[] = [
    { id: "commits",   title: "COMMITS",    raw: totalContributions },
    { id: "prs",       title: "PULL REQS",  raw: stats.pullRequests },
    { id: "stars",     title: "STARS",      raw: stats.totalStars },
    { id: "issues",    title: "ISSUES",     raw: stats.issues },
    { id: "followers", title: "FOLLOWERS",  raw: stats.followers },
    { id: "repos",     title: "REPOS",      raw: stats.publicRepos },
    { id: "merged",    title: "MERGED PRs", raw: stats.mergedPullRequests },
  ];
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    value: String(item.raw),
    rawValue: item.raw,
    tier: getTier(item.id, item.raw),
    icon: ICONS[item.id] || ICONS.commits,
  }));
}

// ===== 投影系统 =====
export interface Proj {
  Wx: number; Wy: number;
  Hx: number; Hy: number;
  Dx: number; Dy: number;
  Ox: number; Oy: number;
}

export function getProj(rotation: number): Proj {
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
}

export function getMatrix(proj: Proj, plane: string, x: number, y: number, z: number): string {
  const { Wx, Wy, Hx, Hy, Dx, Dy, Ox, Oy } = proj;
  const tx = Ox + x * Wx + y * Hx + z * Dx;
  const ty = Oy + x * Wy + y * Hy + z * Dy;
  if (plane === "front") return `matrix(${Wx}, ${Wy}, ${Hx}, ${Hy}, ${tx}, ${ty})`;
  if (plane === "right") return `matrix(${Dx}, ${Dy}, ${Hx}, ${Hy}, ${tx}, ${ty})`;
  if (plane === "top")   return `matrix(${Wx}, ${Wy}, ${Dx}, ${Dy}, ${tx}, ${ty})`;
  return `matrix(${Wx}, ${Wy}, ${Hx}, ${Hy}, ${tx}, ${ty})`;
}

// ===== 单个旗帜完整 SVG 生成（后端用 + 前端下载用） =====
export interface BannerSvgParams {
  statId: StatId;
  title: string;
  value: number;
  tier: string;
  icon: string;
  rotation: number;
}

export function generateBannerSvg(params: BannerSvgParams): string {
  const { title, value, tier, icon, rotation } = params;

  const config = TIER_CONFIG[tier];
  const tierFontSize = tier.length > 1 ? 7.5 : 10;
  const proj = getProj(rotation);
  const gm = (plane: string, x: number, y: number, z: number) => getMatrix(proj, plane, x, y, z);

  const swayDuration = 4.5;
  const rotateA = -1.0;
  const rotateB = 2.5;
  const skewA = 1.2;
  const skewB = -1.2;

  const swayOriginX = proj.Ox + 12 * proj.Wx + 0 * proj.Hx + 1.25 * proj.Dx;
  const swayOriginY = proj.Oy + 12 * proj.Wy + 0 * proj.Hy + 1.25 * proj.Dy;

  const isDarkLabel = config.label === "#E0E0E0";
  const shadowFill = isDarkLabel ? "#000" : "#fff";
  const shadowOpacity = isDarkLabel ? 1 : 0.3;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
  viewBox="-50 0 400 800" width="320" height="640"
  style="image-rendering: pixelated">
<defs>
  <linearGradient id="cloth-shading" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#000" stop-opacity="0.3" />
    <stop offset="25%" stop-color="#000" stop-opacity="0" />
    <stop offset="75%" stop-color="#fff" stop-opacity="0" />
    <stop offset="100%" stop-color="#fff" stop-opacity="0.2" />
  </linearGradient>
  <linearGradient id="top-shadow" x1="0" y1="-2" x2="0" y2="4" gradientUnits="userSpaceOnUse">
    <stop offset="0%" stop-color="#000" stop-opacity="0.6" />
    <stop offset="100%" stop-color="#000" stop-opacity="0" />
  </linearGradient>
  <filter id="icon-darken">
    <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0   0 0 0 0.6 0" />
  </filter>
</defs>
<style>
  @keyframes banner-sway {
    0%, 100% { transform: rotate(${rotateA}deg) skewX(${skewA}deg); }
    50% { transform: rotate(${rotateB}deg) skewX(${skewB}deg); }
  }
  .mc-cloth-sway {
    animation: banner-sway ${swayDuration}s ease-in-out infinite;
    transform-origin: ${swayOriginX}px ${swayOriginY}px;
  }
</style>

<!-- 旗杆 -->
<g>
  <g transform="${gm("front", 10.5, 0, 1)}">
    <image href="${TEXTURES.spruce_log}" width="3" height="80" preserveAspectRatio="none" />
    <polygon points="0,0 3,0 3,80 0,80" fill="#000" opacity="0.3" />
  </g>
  <g transform="${gm("right", 13.5, 0, 0)}">
    <image href="${TEXTURES.spruce_log}" width="1" height="80" preserveAspectRatio="none" />
    <polygon points="0,0 1,0 1,80 0,80" fill="#000" opacity="0.6" />
  </g>
  <g transform="${gm("top", 10.5, 80, 0)}">
    <image href="${TEXTURES.spruce_log}" width="3" height="1" preserveAspectRatio="none" />
    <polygon points="0,0 3,0 3,1 0,1" fill="#000" opacity="0.8" />
  </g>
</g>

<!-- 旗帜布料 -->
<g class="mc-cloth-sway">
  <g transform="${gm("front", 0, 0, 1.5)}">
    <polygon points="0,-2 24,-2 24,68 12,58 0,68" fill="${config.base}" />

    <!-- 标题 -->
    <text x="12.2" y="8.2" font-size="3.5" font-family="'Minecraft', VT323, monospace" text-anchor="middle" fill="${shadowFill}" font-weight="bold" opacity="${shadowOpacity}">${title}</text>
    <text x="12" y="8" font-size="3.5" font-family="'Minecraft', VT323, monospace" text-anchor="middle" fill="${config.label}" font-weight="bold">${title}</text>

    <g transform="translate(5, 12)">
      <image href="${icon}" x="0.5" y="1.5" width="14" height="14" filter="url(#icon-darken)" />
      <image href="${icon}" x="0" y="0" width="14" height="14" />
    </g>

    <!-- 数值 -->
    <text x="12.2" y="38.2" font-size="6" font-family="'Minecraft', VT323, monospace" text-anchor="middle" fill="${shadowFill}" font-weight="bold" opacity="${shadowOpacity}">${value}</text>
    <text x="12" y="38" font-size="6" font-family="'Minecraft', VT323, monospace" text-anchor="middle" fill="${config.text}" font-weight="bold">${value}</text>

    <!-- 等级字母 -->
    <text x="12.8" y="51.3" font-size="${tierFontSize}" font-family="'Minecraft', VT323, monospace" text-anchor="middle" fill="${shadowFill}" font-weight="bold" opacity="${shadowOpacity}">${tier}</text>
    <text x="12.5" y="51" font-size="${tierFontSize}" font-family="'Minecraft', VT323, monospace" text-anchor="middle" fill="${config.text}" font-weight="bold">${tier}</text>

    <polygon points="0,-2 24,-2 24,68 12,58 0,68" fill="url(#cloth-shading)" style="pointer-events: none" />
    <polygon points="0,-2 24,-2 24,68 12,58 0,68" fill="url(#top-shadow)" style="pointer-events: none" />
  </g>

  <g transform="${gm("right", 24, 0, 1)}">
    <polygon points="0,-2 3,-2 3,68 0,68" fill="${config.base}" />
    <polygon points="0,-2 3,-2 3,68 0,68" fill="#000" opacity="0.35" />
  </g>
  <g transform="${gm("top", 0, -2, 1)}">
    <polygon points="0,0 24,0 24,1 0,1" fill="${config.base}" />
    <polygon points="0,0 24,0 24,1 0,1" fill="#fff" opacity="0.15" />
  </g>
</g>

<!-- 顶部横梁 -->
<g>
  <g transform="${gm("front", -2, -3, 3)}">
    <image href="${TEXTURES.spruce_log}" width="28" height="3" preserveAspectRatio="none" />
    <polygon points="0,0 28,0 28,3 0,3" fill="#000" opacity="0.1" />
  </g>
  <g transform="${gm("top", -2, -3, 1)}">
    <image href="${TEXTURES.spruce_log}" width="28" height="2" preserveAspectRatio="none" />
    <polygon points="0,0 28,0 28,2 0,2" fill="#fff" opacity="0.1" />
  </g>
  <g transform="${gm("right", 26, -3, 1)}">
    <image href="${TEXTURES.spruce_log}" width="2" height="3" preserveAspectRatio="none" />
    <polygon points="0,0 2,0 2,3 0,3" fill="#000" opacity="0.5" />
  </g>
</g>
</svg>`;
}
