"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import opentype from "opentype.js";
import type { UserStats } from "@/app/lib/github";
import { generateCardSvg } from "@/app/lib/cardSvg";
import EndpointCopyBox from "./EndpointCopyBox";

// ==========================================
// 包装组件：集成到主页面
// ==========================================
interface ProfileCardViewProps {
  username: string;
  avatarUrl: string;
  stats: UserStats;
  totalContributions: number;
}

export default function ProfileCardView({ username, avatarUrl, stats, totalContributions }: ProfileCardViewProps) {
  const [quote, setQuote] = useState("Exploring the infinite code blocks.");
  const [animKey, setAnimKey] = useState(0);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const fontCacheRef = useRef<opentype.Font | null>(null);

  const joinDate = stats.createdAt ? stats.createdAt.slice(0, 10) : "Unknown";

  const svgHtml = useMemo(() => generateCardSvg({
    username,
    displayName: stats.name || username,
    avatarUrl,
    joinDate,
    stars: stats.totalStars,
    commits: totalContributions,
    followers: stats.followers,
    quote,
  }), [username, stats.name, avatarUrl, joinDate, stats.totalStars, totalContributions, stats.followers, quote]);

  const handleDownload = useCallback(async () => {
    if (!svgContainerRef.current) return;
    const svgElement = svgContainerRef.current.querySelector("svg");
    if (!svgElement) return;

    // 加载 Minecraft 字体（缓存）
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

    // 克隆 SVG 并烘焙字体（混合模式：ASCII→path，非ASCII→<text>+系统字体）
    const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;

    const isAscii = (ch: string) => ch.charCodeAt(0) <= 0x7f;
    const cjkFonts = "'Microsoft YaHei', 'PingFang SC', 'Noto Sans SC', sans-serif";

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
        if (seg.ascii) {
          const p = font.getPath(seg.t, curX, yPos, fontSize);
          const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
          pathEl.setAttribute("d", p.toPathData(5));
          pathEl.setAttribute("fill", fillColor);
          if (opacityVal !== "1") pathEl.setAttribute("opacity", opacityVal);
          elements.push(pathEl);
          curX += font.getAdvanceWidth(seg.t, fontSize);
        } else {
          const textEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
          textEl.setAttribute("x", String(curX));
          textEl.setAttribute("y", String(yPos));
          textEl.setAttribute("font-family", cjkFonts);
          textEl.setAttribute("font-size", String(fontSize));
          textEl.setAttribute("fill", fillColor);
          if (opacityVal !== "1") textEl.setAttribute("opacity", opacityVal);
          if (fontWeightAttr === "bold" || fontWeightAttr === "700") {
            textEl.setAttribute("font-weight", "bold");
          }
          textEl.textContent = seg.t;
          elements.push(textEl);
          curX += [...seg.t].length * fontSize;
        }
      }
      return { elements, endX: curX };
    };

    const textEls = Array.from(clonedSvg.querySelectorAll("text"));
    textEls.forEach((textEl) => {
      const fontSize = parseFloat(textEl.getAttribute("font-size") || "10");
      const x = parseFloat(textEl.getAttribute("x") || "0");
      const y = parseFloat(textEl.getAttribute("y") || "0");
      const baseFill = textEl.getAttribute("fill") || "#000";
      const opacity = textEl.getAttribute("opacity") || "1";
      const textAnchor = textEl.getAttribute("text-anchor") || "start";
      const filter = textEl.getAttribute("filter") || "";
      const fw = textEl.getAttribute("font-weight") || "";
      const fullText = textEl.textContent || "";

      let totalW = 0;
      for (const ch of fullText) {
        totalW += isAscii(ch) ? font.getAdvanceWidth(ch, fontSize) : fontSize;
      }
      let currentX = x;
      if (textAnchor === "middle") currentX -= totalW / 2;
      else if (textAnchor === "end") currentX -= totalW;

      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      if (filter) g.setAttribute("filter", filter);

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

    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${username}-commitcraft-passport.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [username]);

  return (
    <div className="w-full mt-8">
      {/* 控制栏 */}
      <div className="mc-player-bar mb-3">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <span className="text-[#55ff55] text-sm mc-text-shadow whitespace-nowrap">QUOTE:</span>
          <input
            type="text"
            value={quote}
            maxLength={45}
            onChange={(e) => setQuote(e.target.value)}
            className="flex-1 min-w-0 bg-black/60 text-[#55FFFF] font-mono text-sm px-3 py-1.5 outline-none border-2 border-[#373737]"
            placeholder="Enter your quote..."
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAnimKey((k) => k + 1)}
            className="mc-btn-secondary text-sm"
          >
            REPLAY
          </button>
          <button onClick={handleDownload} className="mc-btn-secondary text-sm">
            DOWNLOAD .SVG
          </button>
        </div>
      </div>

      {/* 卡片展示区 */}
      <div className="mc-display !p-6 flex items-center justify-center">
        <div
          key={animKey}
          ref={svgContainerRef}
          className="w-full max-w-[560px] drop-shadow-[0_20px_30px_rgba(0,0,0,0.7)]"
          dangerouslySetInnerHTML={{ __html: svgHtml }}
        />
      </div>

      {/* URL 端点栏 */}
      {username && (
        <div className="mt-3">
          <EndpointCopyBox
            url={`${typeof window !== "undefined" ? window.location.origin : ""}/api/card/${encodeURIComponent(username)}.svg`}
          />
        </div>
      )}

      <p className="text-[#888] text-xs mt-2 text-center mc-text-shadow-light">
        Customize your quote &bull; Download or embed your Player Passport
      </p>
    </div>
  );
}
