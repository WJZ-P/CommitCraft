"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { ContributionCalendar, UserStats } from "@/app/lib/github";
import { generateMapSvg } from "@/app/lib/mapSvg";
import EndpointCopyBox from "./EndpointCopyBox";

interface IsometricMapProps {
  calendar: ContributionCalendar;
  username: string;
  avatarUrl?: string | null;
  stats?: UserStats | null;
}

export default function IsometricMap({ calendar, username, avatarUrl, stats }: IsometricMapProps) {
  const t = useTranslations("components");
  const svgContent = useMemo(() => {
    if (calendar.weeks.length === 0) return "";
    return generateMapSvg({ weeks: calendar.weeks, interactive: true });
  }, [calendar]);

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
              {calendar.totalContributions.toLocaleString()} {t("contributions")}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleDownload} className="mc-btn-secondary text-sm">
            {t("downloadSvg")}
          </button>
        </div>
      </div>

      {/* SVG 渲染区 */}
      <div
        className="mc-display overflow-auto !p-0"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />

      {/* URL 端点栏 */}
      {username && (
        <div className="mt-3">
          <EndpointCopyBox
            url={`${typeof window !== "undefined" ? window.location.origin : ""}/api/map/${encodeURIComponent(username)}.svg`}
          />
        </div>
      )}

      <p className="text-[#888] text-xs mt-2 text-center mc-text-shadow-light">
        {t("mapHint")}
      </p>
    </div>
  );
}
