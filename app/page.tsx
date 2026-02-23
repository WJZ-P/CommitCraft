"use client";

import { useState } from "react";

export default function Home() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [svgPreview, setSvgPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [totalContributions, setTotalContributions] = useState<number | null>(null);

  async function handleGenerate() {
    if (!username.trim()) return;
    setLoading(true);
    setError(null);
    setSvgPreview(null);

    try {
      const res = await fetch(`/api/contributions/${encodeURIComponent(username.trim())}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to fetch contributions");
        return;
      }

      setTotalContributions(data.totalContributions);
      // TODO: 后续接入 SVG 生成引擎，目前先展示原始数据
      setSvgPreview(JSON.stringify(data, null, 2));
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* ===== 顶部导航栏 ===== */}
      <nav className="dirt-strip px-6 py-3 flex items-center justify-between border-b-4 border-black">
        <div className="flex items-center gap-3">
          {/* 像素方块 Logo */}
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 bg-[#3cb043] border-2 border-black" />
            <div className="absolute top-1 left-1 w-3 h-3 bg-[#2d8632]" />
            <div className="absolute bottom-1 right-1 w-2 h-2 bg-[#5ec462]" />
            <div className="absolute top-1 right-2 w-1.5 h-1.5 bg-[#1a5c12]" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-wider"
              style={{ textShadow: "2px 2px 0 #2a2a2a" }}>
            CommitCraft
          </h1>
        </div>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="mc-btn mc-btn-secondary text-xs"
        >
          GitHub
        </a>
      </nav>

      <div className="grass-top" />

      {/* ===== Hero 区域 ===== */}
      <section className="flex flex-col items-center pt-16 pb-12 px-4">
        {/* 像素艺术标题装饰 */}
        <div className="flex gap-2 mb-6">
          {["#3cb043", "#5ec462", "#2d8632", "#8b6b47", "#3cb043"].map((color, i) => (
            <div
              key={i}
              className="w-4 h-4 border border-black"
              style={{ background: color }}
            />
          ))}
        </div>

        <h2
          className="text-3xl md:text-4xl font-bold text-center text-white mb-4 tracking-wide"
          style={{ textShadow: "3px 3px 0 #000" }}
        >
          Craft Your Commits
        </h2>
        <p
          className="text-sm text-[#a0a0a0] text-center max-w-md mb-10"
          style={{ textShadow: "1px 1px 0 #000" }}
        >
          Turn your GitHub contribution graph into a
          <br />
          Minecraft-style isometric masterpiece
        </p>

        {/* ===== 输入表单 ===== */}
        <div className="mc-panel w-full max-w-lg">
          <label
            className="block text-xs text-[#a0a0a0] mb-2 tracking-widest uppercase"
            style={{ textShadow: "1px 1px 0 #000" }}
          >
            GitHub Username
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              className="mc-input flex-1"
              placeholder="e.g. octocat"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            />
            <button
              className="mc-btn whitespace-nowrap"
              onClick={handleGenerate}
              disabled={loading || !username.trim()}
            >
              {loading ? "Mining..." : "Generate"}
            </button>
          </div>
        </div>
      </section>

      <div className="pixel-divider" />

      {/* ===== 预览区域 ===== */}
      <section className="flex-1 flex flex-col items-center py-12 px-4">
        {error && (
          <div className="mc-panel w-full max-w-lg border-red-900 mb-6">
            <p className="text-red-400 text-sm" style={{ textShadow: "1px 1px 0 #000" }}>
              ⚠ {error}
            </p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-4 h-4 bg-[#3cb043] border border-black animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <p className="text-xs text-[#a0a0a0]" style={{ textShadow: "1px 1px 0 #000" }}>
              Mining contribution data...
            </p>
          </div>
        )}

        {svgPreview && !loading && (
          <div className="w-full max-w-4xl">
            <div className="flex items-center justify-between mb-4">
              <h3
                className="text-lg text-white"
                style={{ textShadow: "2px 2px 0 #000" }}
              >
                {username}&apos;s World
              </h3>
              {totalContributions !== null && (
                <span className="text-xs text-[#5ec462]" style={{ textShadow: "1px 1px 0 #000" }}>
                  {totalContributions.toLocaleString()} contributions
                </span>
              )}
            </div>

            {/* SVG 预览区 - 暂时显示 JSON 数据 */}
            <div className="mc-panel overflow-auto max-h-96">
              <pre className="text-xs text-[#5ec462] whitespace-pre-wrap break-all leading-relaxed">
                {svgPreview}
              </pre>
            </div>

            <p className="text-xs text-[#666] mt-4 text-center" style={{ textShadow: "1px 1px 0 #000" }}>
              SVG rendering engine coming soon...
            </p>
          </div>
        )}

        {!svgPreview && !loading && !error && (
          <div className="flex flex-col items-center gap-4 text-[#555]">
            {/* 空状态：像素方块堆 */}
            <div className="relative w-24 h-24">
              <div className="absolute bottom-0 left-2 w-8 h-8 bg-[#7f7f7f] border-2 border-[#3a3a3a]" />
              <div className="absolute bottom-0 right-2 w-8 h-8 bg-[#8b6b47] border-2 border-[#3a3a3a]" />
              <div className="absolute bottom-6 left-5 w-8 h-8 bg-[#3cb043] border-2 border-[#3a3a3a]" />
              <div className="absolute bottom-4 right-5 w-6 h-6 bg-[#5ec462] border-2 border-[#3a3a3a]" />
            </div>
            <p className="text-xs" style={{ textShadow: "1px 1px 0 #000" }}>
              Enter a username to start crafting
            </p>
          </div>
        )}
      </section>

      {/* ===== 底部 ===== */}
      <footer className="dirt-strip px-6 py-4 border-t-4 border-black">
        <div className="grass-top mb-3" />
        <p
          className="text-xs text-center text-[#a0a0a0]"
          style={{ textShadow: "1px 1px 0 #000" }}
        >
          CommitCraft &mdash; Not affiliated with Mojang or Microsoft
        </p>
      </footer>
    </div>
  );
}
