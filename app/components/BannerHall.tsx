"use client";

import React, { useState, useMemo, useCallback, useRef } from "react";
import type { UserStats } from "@/app/lib/github";

// ===== MC 材质 =====
const ASSETS_BASE =
  "https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.20.4/assets/minecraft/textures/block";

const TEXTURES = {
  stone: `${ASSETS_BASE}/stone.png`,
  spruce_log: `${ASSETS_BASE}/spruce_log.png`,
};

// ===== 成就等级色彩 =====
const TIER_CONFIG: Record<string, { name: string; base: string; text: string; label: string }> = {
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
const ICONS: Record<string, string> = {
  commits:   `${ITEM_BASE}/diamond_pickaxe.png`,
  prs:       `${ITEM_BASE}/writable_book.png`,
  stars:     `${ITEM_BASE}/nether_star.png`,
  issues:    `${ITEM_BASE}/spider_eye.png`,
  followers: `https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.20.4/assets/minecraft/textures/gui/sprites/hud/heart/full.png`,
  repos:     `${ITEM_BASE}/book.png`,
  merged:    `${ITEM_BASE}/gold_ingot.png`,
};

// ===== 根据数值计算等级 =====
// 阈值顺序: [S+, S, S-, A+, A, A-, B+, B, B-, C+, C, C-]
// stars 的 S 档由用户指定: S-=1000, S=1500, S+=2000
// 其他指标: 原 S 阈值作 S-, 1.5x 作 S, 2x 作 S+
// A/B/C 各等级在 [下界, 上界) 区间内三等分
function buildThresholds(sPlus: number, s: number, sMinus: number, a: number, b: number, c: number): number[] {
  // A 区间: [a, sMinus), 三等分 → A-=a, A=a+1/3, A+=a+2/3
  const aStep = (sMinus - a) / 3;
  const aPlus  = Math.round(a + aStep * 2);
  const aMid   = Math.round(a + aStep);
  const aMinus = a;

  // B 区间: [b, a), 三等分
  const bStep = (a - b) / 3;
  const bPlus  = Math.round(b + bStep * 2);
  const bMid   = Math.round(b + bStep);
  const bMinus = b;

  // C 区间: [c, b), 三等分
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

function getTier(id: string, value: number): string {
  const t = TIER_THRESHOLDS[id] || buildThresholds(200, 150, 100, 50, 20, 5);
  for (let i = 0; i < TIER_LABELS.length; i++) {
    if (value >= t[i]) return TIER_LABELS[i];
  }
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
  const tierFontSize = stat.tier.length > 1 ? 7.5 : 10;

  // 摆动圆心
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

        {/* 旗杆 */}
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

        {/* 旗帜布料 */}
        <g
          className={`mc-cloth-sway-${stat.id}`}
          style={{ transformOrigin: swayOrigin }}
        >
          <g transform={getMatrix("front", 0, 0, 1.5)}>
            <polygon points="0,-2 24,-2 24,68 12,58 0,68" fill={config.base} />

            {/* 标题 */}
            <text x="12.2" y="8.2" fontSize="3.5" fontFamily="'Minecraft', VT323, monospace" textAnchor="middle" fill={config.label === "#E0E0E0" ? "#000" : "#fff"} fontWeight="bold" opacity={config.label === "#E0E0E0" ? 1 : 0.3}>
              {stat.title}
            </text>
            <text x="12" y="8" fontSize="3.5" fontFamily="'Minecraft', VT323, monospace" textAnchor="middle" fill={config.label} fontWeight="bold">
              {stat.title}
            </text>

            <g transform="translate(5, 12)">
              <image href={stat.icon} x="0.5" y="1.5" width="14" height="14" filter="url(#icon-darken)" />
              <image href={stat.icon} x="0" y="0" width="14" height="14" />
            </g>

            {/* 数值 */}
            <text x="12.2" y="38.2" fontSize="6" fontFamily="'Minecraft', VT323, monospace" textAnchor="middle" fill={config.label === "#E0E0E0" ? "#000" : "#fff"} fontWeight="bold" opacity={config.label === "#E0E0E0" ? 1 : 0.3}>
              {stat.value}
            </text>
            <text x="12" y="38" fontSize="6" fontFamily="'Minecraft', VT323, monospace" textAnchor="middle" fill={config.text} fontWeight="bold">
              {stat.value}
            </text>

            {/* 等级字母 */}
            <text x="12.8" y="51.3" fontSize={tierFontSize} fontFamily="'Minecraft', VT323, monospace" textAnchor="middle" fill={config.label === "#E0E0E0" ? "#000" : "#fff"} fontWeight="bold" opacity={config.label === "#E0E0E0" ? 1 : 0.3}>
              {stat.tier}
            </text>
            <text x="12.5" y="51" fontSize={tierFontSize} fontFamily="'Minecraft', VT323, monospace" textAnchor="middle" fill={config.text} fontWeight="bold">
              {stat.tier}
            </text>

            <polygon points="0,-2 24,-2 24,68 12,58 0,68" fill={`url(#cloth-shading-${stat.id})`} style={{ pointerEvents: "none" }} />
            <polygon points="0,-2 24,-2 24,68 12,58 0,68" fill={`url(#top-shadow-${stat.id})`} style={{ pointerEvents: "none" }} />
          </g>

          <g transform={getMatrix("right", 24, 0, 1)}>
            <polygon points="0,-2 3,-2 3,68 0,68" fill={config.base} />
            <polygon points="0,-2 3,-2 3,68 0,68" fill="#000" opacity={0.35} />
          </g>
          <g transform={getMatrix("top", 0, -2, 1)}>
            <polygon points="0,0 24,0 24,1 0,1" fill={config.base} />
            <polygon points="0,0 24,0 24,1 0,1" fill="#fff" opacity={0.15} />
          </g>
        </g>

        {/* 顶部横梁 */}
        <g id="top-bar">
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
  
  // 用于缓存解析好的 opentype 字体引擎对象
  const fontCacheRef = useRef<any>(null);

  const statItems = useMemo(() => buildStats(stats, totalContributions), [stats, totalContributions]);
  const bannerDelays = useMemo(() => statItems.map(() => ({
    delay: Math.random() * 0.25,
    duration: 4.0 + Math.random() * 1,          
    rotateA: -0.6 - Math.random() * 0.9,        
    rotateB: 1.8 + Math.random() * 1.2,         
    skewA: 0.9 + Math.random() * 0.6,           
    skewB: -0.9 - Math.random() * 0.6,          
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

  const handleDownload = useCallback(async () => {
    if (!displayRef.current) return;
    const originalSvgs = displayRef.current.querySelectorAll("svg");
    if (originalSvgs.length === 0) return;

    // 1. 动态注入 opentype.js 引擎 (无需 npm install)
    let opentype = (window as any).opentype;
    if (!opentype) {
      try {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdn.jsdelivr.net/npm/opentype.js@1.3.4/dist/opentype.min.js";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
        opentype = (window as any).opentype;
      } catch (e) {
        console.error("加载 opentype.js 失败", e);
        alert("字体解析引擎加载失败，请检查网络！");
        return;
      }
    }

    // 2. 加载 Minecraft Bold 字体
    if (!fontCacheRef.current) {
      try {
        const buf = await fetch("https://fonts.cdnfonts.com/s/25041/3_MinecraftBold1.woff").then(r => r.arrayBuffer());
        fontCacheRef.current = opentype.parse(buf);
      } catch (e) {
        console.error("加载 Minecraft 字体失败:", e);
        alert("Minecraft 字体拉取失败！");
        return;
      }
    }
    const font = fontCacheRef.current;

    // 3. 深克隆 DOM，不干扰 React 渲染树
    const cloneContainer = displayRef.current.cloneNode(true) as HTMLDivElement;
    const svgs = Array.from(cloneContainer.querySelectorAll("svg"));

    // 4. 将所有 <text> 转换为纯几何 <path>
    svgs.forEach((svg) => {
      const textEls = Array.from(svg.querySelectorAll("text"));
      textEls.forEach((textEl) => {
        const fullText = textEl.textContent || "";

        // DOM 属性多路兜底：React 渲染后属性名变为小写连字符
        const fontSize = parseFloat(textEl.getAttribute("font-size") || textEl.getAttribute("fontSize") || "10");

        const x = parseFloat(textEl.getAttribute("x") || "0");
        const y = parseFloat(textEl.getAttribute("y") || "0");
        const baseFill = textEl.getAttribute("fill") || "#000";
        const opacity = textEl.getAttribute("opacity") || "1";
        const textAnchor = textEl.getAttribute("text-anchor") || textEl.getAttribute("textAnchor") || "start";

        // text-anchor 偏移
        const totalWidth = font.getAdvanceWidth(fullText, fontSize);
        let currentX = x;
        if (textAnchor === "middle") currentX -= totalWidth / 2;
        else if (textAnchor === "end") currentX -= totalWidth;

        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

        Array.from(textEl.childNodes).forEach((child) => {
          if (child.nodeType === Node.TEXT_NODE) {
            const txt = child.textContent || "";
            if (!txt) return;
            const pathData = font.getPath(txt, currentX, y, fontSize).toPathData(5);
            const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
            pathEl.setAttribute("d", pathData);
            pathEl.setAttribute("fill", baseFill);
            if (opacity !== "1") pathEl.setAttribute("opacity", opacity);
            g.appendChild(pathEl);
            currentX += font.getAdvanceWidth(txt, fontSize);
          } else if (child.nodeType === Node.ELEMENT_NODE && (child as Element).tagName.toLowerCase() === "tspan") {
            const tspan = child as Element;
            const txt = tspan.textContent || "";
            if (!txt) return;
            const tFill = tspan.getAttribute("fill") || baseFill;
            const pathData = font.getPath(txt, currentX, y, fontSize).toPathData(5);
            const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
            pathEl.setAttribute("d", pathData);
            pathEl.setAttribute("fill", tFill);
            if (opacity !== "1") pathEl.setAttribute("opacity", opacity);
            g.appendChild(pathEl);
            currentX += font.getAdvanceWidth(txt, fontSize);
          }
        });

        textEl.parentNode?.replaceChild(g, textEl);
      });
    });

    // 5. 融合所有 SVG 为一张输出图
    const cols = 4;
    const gap = 20;
    const padding = 30;
    const parts: { inner: string; defs: string; vb: number[] }[] = [];

    svgs.forEach((svg) => {
      const vb = svg.getAttribute("viewBox")?.split(" ").map(Number) || [0, 0, 300, 800];

      const defsEls = svg.querySelectorAll("defs");
      let defsContent = "";
      defsEls.forEach((d) => { defsContent += d.innerHTML; });

      let inner = "";
      svg.childNodes.forEach((child) => {
        if (child instanceof Element && child.tagName.toLowerCase() === "defs") return;
        if (child instanceof Element) {
          inner += child.outerHTML;
        } else if (child.nodeType === Node.TEXT_NODE) {
          inner += child.textContent;
        }
      });

      parts.push({ inner, defs: defsContent, vb });
    });

    const cellW = Math.max(...parts.map((p) => p.vb[2]));
    const cellH = Math.max(...parts.map((p) => p.vb[3]));
    const rows = Math.ceil(parts.length / cols);
    const totalW = cols * cellW + (cols - 1) * gap + padding * 2;
    const totalH = rows * cellH + (rows - 1) * gap + padding * 2;

    const allDefs = parts.map((p) => p.defs).join("\n");

    const inner = parts.map((p, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = padding + col * (cellW + gap) + (cellW - p.vb[2]) / 2 + p.vb[0];
      const y = padding + row * (cellH + gap) + (cellH - p.vb[3]) / 2 + p.vb[1];
      return `<g transform="translate(${x},${y})">${p.inner}</g>`;
    }).join("");

    // 生成 SVG 内嵌动画样式
    const animCSS = statItems.map((stat, i) => {
      const p = bannerDelays[i];
      return `
        @keyframes banner-sway-${stat.id} {
          0%, 100% { transform: rotate(${p.rotateA}deg) skewX(${p.skewA}deg); }
          50% { transform: rotate(${p.rotateB}deg) skewX(${p.skewB}deg); }
        }
        .mc-cloth-sway-${stat.id} {
          animation: banner-sway-${stat.id} ${p.duration}s ease-in-out ${p.delay}s infinite;
        }`;
    }).join("\n");

    const combined = [
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"`,
      `  viewBox="0 0 ${totalW} ${totalH}" width="${totalW}" height="${totalH}"`,
      `  style="image-rendering:pixelated;background:#2a2a2a">`,
      `  <defs>`,
      `    ${allDefs}`,
      `  </defs>`,
      `  <style>${animCSS}</style>`,
      `  <rect width="${totalW}" height="${totalH}" fill="#2a2a2a" rx="8"/>`,
      `  ${inner}`,
      `</svg>`,
    ].join("\n");

    const blob = new Blob([combined], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mc-banner-hall-paths.svg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [statItems, bannerDelays]);

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
