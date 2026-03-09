"use client";

import React, { useMemo, useState, useRef, useCallback } from "react";
import { generateRepoSvg, type RepoSvgParams } from "@/app/lib/repoSvg";
import EndpointCopyBox from "./EndpointCopyBox";

interface RepoCardProps {
  repoData: RepoSvgParams;
}

export default function RepoCard({ repoData }: RepoCardProps) {
  const [animKey, setAnimKey] = useState(0);
  const fontCacheRef = useRef<Record<string, opentype.Font>>({});

  const svgHtml = useMemo(() => {
    return generateRepoSvg(repoData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoData, animKey]);

  const handleDownload = useCallback(async () => {
    const opentype = (await import("opentype.js")).default;

    // 加载字体（带缓存）
    const fontUrl = "https://fonts.cdnfonts.com/s/25041/3_MinecraftBold1.woff";
    if (!fontCacheRef.current[fontUrl]) {
      const res = await fetch(fontUrl);
      const buf = await res.arrayBuffer();
      fontCacheRef.current[fontUrl] = opentype.parse(buf);
    }
    const font = fontCacheRef.current[fontUrl];

    // 克隆 SVG DOM
    const container = document.createElement("div");
    container.innerHTML = svgHtml;
    const svgEl = container.querySelector("svg");
    if (!svgEl) return;

    // 烘焙所有 <text> 为 <path>
    const texts = Array.from(svgEl.querySelectorAll("text"));
    for (const t of texts) {
      const fontSize = parseFloat(t.getAttribute("font-size") || "16");
      const fill = t.getAttribute("fill") || "#000";
      const filter = t.getAttribute("filter") || "";
      const anchor = t.getAttribute("text-anchor") as "start" | "middle" | "end" || "start";

      // 处理 tspan 子节点
      const tspans = t.querySelectorAll("tspan");
      if (tspans.length > 0) {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        if (filter) g.setAttribute("filter", filter);

        const x = parseFloat(t.getAttribute("x") || "0");
        const y = parseFloat(t.getAttribute("y") || "0");
        let curX = x;

        for (const ts of Array.from(tspans)) {
          const text = ts.textContent || "";
          const tsFill = ts.getAttribute("fill") || fill;
          const path = font.getPath(text, curX, y, fontSize);
          const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
          pathEl.setAttribute("d", path.toPathData(5));
          pathEl.setAttribute("fill", tsFill);
          g.appendChild(pathEl);
          curX += font.getAdvanceWidth(text, fontSize);
        }
        t.replaceWith(g);
      } else {
        const text = t.textContent || "";
        const x = parseFloat(t.getAttribute("x") || "0");
        const y = parseFloat(t.getAttribute("y") || "0");

        let drawX = x;
        if (anchor === "middle") drawX -= font.getAdvanceWidth(text, fontSize) / 2;
        else if (anchor === "end") drawX -= font.getAdvanceWidth(text, fontSize);

        const path = font.getPath(text, drawX, y, fontSize);
        const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pathEl.setAttribute("d", path.toPathData(5));
        pathEl.setAttribute("fill", fill);
        if (filter) {
          const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
          g.setAttribute("filter", filter);
          g.appendChild(pathEl);
          t.replaceWith(g);
        } else {
          t.replaceWith(pathEl);
        }
      }
    }

    // 导出
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svgEl);
    const blob = new Blob([svgStr], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${repoData.owner}-${repoData.repo}-card.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [svgHtml, repoData.owner, repoData.repo]);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const endpointUrl = `${baseUrl}/api/repo/${repoData.owner}/${repoData.repo}.svg`;

  return (
    <div className="mt-6 flex flex-col items-center w-full">
      {/* SVG 预览 */}
      <div
        key={animKey}
        className="mc-display w-full flex items-center justify-center p-6"
        dangerouslySetInnerHTML={{ __html: svgHtml }}
      />

      {/* 控制栏 */}
      <div className="mt-4 flex gap-4 items-center flex-wrap justify-center">
        <button
          className="mc-btn-secondary text-xs px-4 py-2"
          onClick={() => setAnimKey((k) => k + 1)}
        >
          REPLAY
        </button>
        <button
          className="mc-btn-secondary text-xs px-4 py-2"
          onClick={handleDownload}
        >
          DOWNLOAD
        </button>
      </div>

      {/* API 端点 */}
      <div className="mt-4 w-full">
        <EndpointCopyBox url={endpointUrl} label="Repo Card" />
      </div>
    </div>
  );
}
