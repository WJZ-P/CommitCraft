"use client";

import React, { useState, useMemo, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import opentype from "opentype.js";
import type { UserStats } from "@/app/lib/github";
import {
  TEXTURES,
  TIER_CONFIG,
  buildStats,
  getProj,
  getMatrix,
  type StatItem,
  type Proj,
} from "@/app/lib/bannerSvg";
import EndpointCopyBox from "./EndpointCopyBox";

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

// ===== 单个旗帜（React SVG 组件） =====
function BannerItem({ stat, proj, getMatrixFn }: {
  stat: StatItem;
  proj: Proj;
  getMatrixFn: (plane: string, x: number, y: number, z: number) => string;
}) {
  const config = TIER_CONFIG[stat.tier];
  const tierFontSize = stat.tier.length > 1 ? 7.5 : 10;

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
          <g transform={getMatrixFn("front", 10.5, 0, 1)}>
            <image href={TEXTURES.spruce_log} width={3} height={80} preserveAspectRatio="none" />
            <polygon points="0,0 3,0 3,80 0,80" fill="#000" opacity={0.3} />
          </g>
          <g transform={getMatrixFn("right", 13.5, 0, 0)}>
            <image href={TEXTURES.spruce_log} width={1} height={80} preserveAspectRatio="none" />
            <polygon points="0,0 1,0 1,80 0,80" fill="#000" opacity={0.6} />
          </g>
          <g transform={getMatrixFn("top", 10.5, 80, 0)}>
            <image href={TEXTURES.spruce_log} width={3} height={1} preserveAspectRatio="none" />
            <polygon points="0,0 3,0 3,1 0,1" fill="#000" opacity={0.8} />
          </g>
        </g>

        {/* 旗帜布料 */}
        <g
          className={`mc-cloth-sway-${stat.id}`}
          style={{ transformOrigin: swayOrigin }}
        >
          <g transform={getMatrixFn("front", 0, 0, 1.5)}>
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

          <g transform={getMatrixFn("right", 24, 0, 1)}>
            <polygon points="0,-2 3,-2 3,68 0,68" fill={config.base} />
            <polygon points="0,-2 3,-2 3,68 0,68" fill="#000" opacity={0.35} />
          </g>
          <g transform={getMatrixFn("top", 0, -2, 1)}>
            <polygon points="0,0 24,0 24,1 0,1" fill={config.base} />
            <polygon points="0,0 24,0 24,1 0,1" fill="#fff" opacity={0.15} />
          </g>
        </g>

        {/* 顶部横梁 */}
        <g id="top-bar">
          <g transform={getMatrixFn("front", -2, -3, 3)}>
            <image href={TEXTURES.spruce_log} width={28} height={3} preserveAspectRatio="none" />
            <polygon points="0,0 28,0 28,3 0,3" fill="#000" opacity={0.1} />
          </g>
          <g transform={getMatrixFn("top", -2, -3, 1)}>
            <image href={TEXTURES.spruce_log} width={28} height={2} preserveAspectRatio="none" />
            <polygon points="0,0 28,0 28,2 0,2" fill="#fff" opacity={0.1} />
          </g>
          <g transform={getMatrixFn("right", 26, -3, 1)}>
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
  username: string;
}

export default function BannerHall({ stats, totalContributions, username }: BannerHallProps) {
  const t = useTranslations("components");
  const [rotation, setRotation] = useState(0);
  const displayRef = useRef<HTMLDivElement>(null);
  const fontCacheRef = useRef<Record<string, opentype.Font>>({});

  const statItems = useMemo(() => buildStats(stats, totalContributions), [stats, totalContributions]);
  const bannerDelays = useMemo(() => statItems.map(() => ({
    delay: Math.random() * 0.25,
    duration: 4.0 + Math.random() * 1,
    rotateA: -0.6 - Math.random() * 0.9,
    rotateB: 1.8 + Math.random() * 1.2,
    skewA: 0.9 + Math.random() * 0.6,
    skewB: -0.9 - Math.random() * 0.6,
  })), [statItems]);

  const proj = useMemo<Proj>(() => getProj(rotation), [rotation]);

  const getMatrixFn = useCallback(
    (plane: string, x: number, y: number, z: number): string => getMatrix(proj, plane, x, y, z),
    [proj]
  );

  const handleDownload = useCallback(async () => {
    if (!displayRef.current) return;
    const originalSvgs = displayRef.current.querySelectorAll("svg");
    if (originalSvgs.length === 0) return;

    if (!fontCacheRef.current["mc"]) {
      try {
        const buf = await fetch("https://fonts.cdnfonts.com/s/25041/3_MinecraftBold1.woff").then(r => r.arrayBuffer());
        fontCacheRef.current["mc"] = opentype.parse(buf);
      } catch (e) {
        console.error("加载 Minecraft 字体失败:", e);
        alert(t("fontError"));
        return;
      }
    }
    const font = fontCacheRef.current["mc"];

    // 加载 Zpix 中文像素字体（缓存）
    if (!fontCacheRef.current["zpix"]) {
      try {
        const buf = await fetch("/fonts/zpix.ttf").then(r => r.arrayBuffer());
        fontCacheRef.current["zpix"] = opentype.parse(buf);
      } catch (e) {
        console.error("加载 Zpix 字体失败:", e);
      }
    }
    const zpixFont = fontCacheRef.current["zpix"];

    const cloneContainer = displayRef.current.cloneNode(true) as HTMLDivElement;
    const svgs = Array.from(cloneContainer.querySelectorAll("svg"));

    const isAscii = (ch: string) => ch.charCodeAt(0) <= 0x7f;

    const bakeMixed = (
      text: string, startX: number, yPos: number,
      fontSize: number, fillColor: string, opacityVal: string, fontWeightAttr?: string,
    ): { elements: SVGElement[]; endX: number } => {
      const elements: SVGElement[] = [];
      let curX = startX;
      const segs: { t: string; ascii: boolean }[] = [];
      for (const ch of text) {
        const a = isAscii(ch);
        if (segs.length > 0 && segs[segs.length - 1].ascii === a) {
          segs[segs.length - 1].t += ch;
        } else {
          segs.push({ t: ch, ascii: a });
        }
      }
      for (const seg of segs) {
        const activeFont = seg.ascii ? font : (zpixFont || font);
        const p = activeFont.getPath(seg.t, curX, yPos, fontSize);
        const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pathEl.setAttribute("d", p.toPathData(5));
        pathEl.setAttribute("fill", fillColor);
        if (opacityVal !== "1") pathEl.setAttribute("opacity", opacityVal);
        elements.push(pathEl);
        curX += activeFont.getAdvanceWidth(seg.t, fontSize);
      }
      return { elements, endX: curX };
    };

    svgs.forEach((svg) => {
      const textEls = Array.from(svg.querySelectorAll("text"));
      textEls.forEach((textEl) => {
        const fullText = textEl.textContent || "";
        const fontSize = parseFloat(textEl.getAttribute("font-size") || textEl.getAttribute("fontSize") || "10");
        const x = parseFloat(textEl.getAttribute("x") || "0");
        const y = parseFloat(textEl.getAttribute("y") || "0");
        const baseFill = textEl.getAttribute("fill") || "#000";
        const opacity = textEl.getAttribute("opacity") || "1";
        const textAnchor = textEl.getAttribute("text-anchor") || textEl.getAttribute("textAnchor") || "start";
        const fw = textEl.getAttribute("font-weight") || "";

        let totalW = 0;
        for (const ch of fullText) {
          totalW += isAscii(ch) ? font.getAdvanceWidth(ch, fontSize) : fontSize;
        }
        let currentX = x;
        if (textAnchor === "middle") currentX -= totalW / 2;
        else if (textAnchor === "end") currentX -= totalW;

        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

        Array.from(textEl.childNodes).forEach((child) => {
          if (child.nodeType === Node.TEXT_NODE) {
            const txt = child.textContent || "";
            if (!txt) return;
            const { elements, endX } = bakeMixed(txt, currentX, y, fontSize, baseFill, opacity, fw);
            elements.forEach(el => g.appendChild(el));
            currentX = endX;
          } else if (child.nodeType === Node.ELEMENT_NODE && (child as Element).tagName.toLowerCase() === "tspan") {
            const tspan = child as Element;
            const txt = tspan.textContent || "";
            if (!txt) return;
            const tFill = tspan.getAttribute("fill") || baseFill;
            const { elements, endX } = bakeMixed(txt, currentX, y, fontSize, tFill, opacity, fw);
            elements.forEach(el => g.appendChild(el));
            currentX = endX;
          }
        });

        textEl.parentNode?.replaceChild(g, textEl);
      });
    });

    const cols = svgs.length;
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
    const totalW = cols * cellW + (cols - 1) * gap + padding * 2;
    const totalH = cellH + padding * 2;

    const allDefs = parts.map((p) => p.defs).join("\n");
    const inner = parts.map((p, i) => {
      const x = padding + i * (cellW + gap) + (cellW - p.vb[2]) / 2 + p.vb[0];
      const y = padding + (cellH - p.vb[3]) / 2 + p.vb[1];
      return `<g transform="translate(${x},${y})">${p.inner}</g>`;
    }).join("");

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
      `  style="image-rendering:pixelated">`,
      `  <defs>`,
      `    ${allDefs}`,
      `  </defs>`,
      `  <style>${animCSS}</style>`,
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
            {t("viewAngle")} <span className="inline-block w-[3.5ch] text-right">{rotation}</span>°
          </span>
          <McSlider min={-90} max={90} value={rotation} onChange={setRotation} />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRotation(0)}
            className="mc-btn-secondary text-sm"
          >
            {t("reset")}
          </button>
          <button
            onClick={handleDownload}
            className="mc-btn-secondary text-sm"
          >
            {t("downloadSvg")}
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
              getMatrixFn={getMatrixFn}
            />
          ))}
        </div>
      </div>

      {/* URL 端点栏 */}
      {username && (
        <div className="mt-3 space-y-2">
          {statItems.map((stat) => (
            <EndpointCopyBox
              key={stat.id}
              url={`${typeof window !== "undefined" ? window.location.origin : ""}/api/banner/${encodeURIComponent(username)}/${stat.id}.svg`}
              label={stat.title}
            />
          ))}
        </div>
      )}

      <p className="text-[#888] text-xs mt-2 text-center mc-text-shadow-light">
        {t("bannerHint")}
      </p>
    </div>
  );
}
