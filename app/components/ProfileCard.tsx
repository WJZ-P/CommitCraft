"use client";

import { useState, useRef, useCallback, useMemo } from "react";
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

  const handleDownload = useCallback(() => {
    if (!svgContainerRef.current) return;
    const svgElement = svgContainerRef.current.querySelector("svg");
    if (!svgElement) return;
    const svgData = new XMLSerializer().serializeToString(svgElement);
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
