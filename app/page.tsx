"use client";

import { useState, useEffect, useCallback } from "react";
import WeatherCanvas from "./components/WeatherCanvas";

// 原版 MC 材质 CDN 链接
const TEXTURES = {
  stone: "https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.20.4/assets/minecraft/textures/block/stone.png",
  dirt: "https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.20.4/assets/minecraft/textures/block/dirt.png",
  grassTop: "https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.20.4/assets/minecraft/textures/block/grass_block_top.png",
  emerald: "https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.20.4/assets/minecraft/textures/item/emerald.png",
  diamond_ore: "https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.20.4/assets/minecraft/textures/block/diamond_ore.png",
  gold_ore: "https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.20.4/assets/minecraft/textures/block/gold_ore.png",
  iron_ore: "https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.20.4/assets/minecraft/textures/block/iron_ore.png",
  copper_ore: "https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.20.4/assets/minecraft/textures/block/copper_ore.png",
  coal_ore: "https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.20.4/assets/minecraft/textures/block/coal_ore.png",
  redstone_ore: "https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.20.4/assets/minecraft/textures/block/redstone_ore.png",
  emerald_ore: "https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.20.4/assets/minecraft/textures/block/emerald_ore.png",
  lapis_ore: "https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.20.4/assets/minecraft/textures/block/lapis_ore.png",
};

export default function Home() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [svgPreview, setSvgPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [totalContributions, setTotalContributions] = useState<number | null>(null);
  const [ores, setOres] = useState<{ id: number; x: number; y: number; type: string }[]>([]);
  const [weather, setWeather] = useState<"clear" | "rain" | "snow">("rain");
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  // 监听鼠标位置，注入 CSS 变量用于背景视差 + 传递给天气粒子
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;
    document.documentElement.style.setProperty("--mouse-x", x.toString());
    document.documentElement.style.setProperty("--mouse-y", y.toString());
    setMouse({ x, y });
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  // 挂载时生成随机矿石分布
  useEffect(() => {
    const generatedOres: typeof ores = [];
    const types = [
      "diamond_ore", "gold_ore", "iron_ore", "copper_ore",
      "coal_ore", "redstone_ore", "emerald_ore", "lapis_ore",
    ];
    for (let i = 0; i < 40; i++) {
      for (let j = 0; j < 40; j++) {
        if (Math.random() < 0.04) {
          generatedOres.push({
            id: i * 100 + j,
            x: i * 64,
            y: j * 64,
            type: types[Math.floor(Math.random() * types.length)],
          });
        }
      }
    }
    setOres(generatedOres);
  }, []);

  async function handleGenerate() {
    if (!username.trim()) return;
    setLoading(true);
    setError(null);
    setSvgPreview(null);
    setTotalContributions(null);

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
    <div className="min-h-screen relative flex flex-col selection:bg-[#5ec462] selection:text-black">

      {/* ===== 背景层 1：石头材质 + 动态矿石 ===== */}
      <div
        className="fixed inset-0 z-[0] mc-bg-stone mc-texture"
        style={{ backgroundImage: `url('${TEXTURES.stone}')` }}
      >
        {ores.map((ore) => (
          <div
            key={ore.id}
            className="absolute mc-texture"
            style={{
              left: ore.x,
              top: ore.y,
              width: 64,
              height: 64,
              backgroundImage: `url('${TEXTURES[ore.type as keyof typeof TEXTURES]}')`,
              backgroundSize: "cover",
            }}
          />
        ))}
      </div>

      {/* ===== 背景层 2：暗调遮罩 ===== */}
      <div className="fixed inset-0 z-[1] bg-black/20 pointer-events-none" />

      {/* ===== 背景层 3：中心聚焦打光 (Vignette) ===== */}
      <div className="fixed inset-0 z-[2] mc-vignette" />

      {/* ===== 背景层 4：Canvas 粒子天气系统 ===== */}
      <WeatherCanvas weather={weather} mouseX={mouse.x} mouseY={mouse.y} />

      {/* ===== 顶部导航栏 ===== */}
      <nav
        className="relative z-[20] px-6 py-4 border-black mc-navbar mc-texture flex items-center justify-between"
        style={{ backgroundImage: `url('${TEXTURES.dirt}')` }}
      >
        <div className="absolute inset-0 mc-navbar-overlay" />

        <div className="relative z-10 flex items-center gap-4">
          <img
            src={TEXTURES.emerald}
            alt="CommitCraft"
            className="w-10 h-10 mc-pixel-icon hover:scale-110 transition-transform cursor-pointer"
          />
          <h1 className="text-2xl font-bold text-white tracking-wider mc-text-shadow-heavy">
            CommitCraft
          </h1>
        </div>

        <div className="relative z-10 flex gap-3 items-center">
          <button
            onClick={() => setWeather((w) => (w === "clear" ? "rain" : w === "rain" ? "snow" : "clear"))}
            className="mc-btn-secondary text-xs flex items-center gap-2"
          >
            WEATHER: {weather.toUpperCase()}
          </button>

          <a
            href="https://github.com/WJZ-P/CommitCraft"
            target="_blank"
            rel="noopener noreferrer"
            className="mc-nav-link text-sm"
          >
            GitHub
          </a>
        </div>
      </nav>

      {/* 顶部草皮边缘 */}
      <div
        className="relative z-[20] h-4 w-full mc-texture"
        style={{ backgroundImage: `url('${TEXTURES.grassTop}')` }}
      />

      {/* ===== 主体内容区 ===== */}
      <main className="relative z-[20] flex-1 w-full max-w-3xl mx-auto px-4 py-12 flex flex-col items-center justify-center">

        {/* Hero 标题 */}
        <div className="mb-10 flex flex-col items-center animate-[bounce_4s_infinite]">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-widest text-center mc-text-shadow-3d">
            Craft Your Commits
          </h2>
          <div className="flex items-center gap-3">
            <span className="h-1 w-12 bg-[#5ec462] shadow-[2px_2px_0_0_#000]" />
            <p className="text-[#c6c6c6] text-sm tracking-widest text-center mc-text-shadow">
              MINING YOUR GITHUB HISTORY
            </p>
            <span className="h-1 w-12 bg-[#5ec462] shadow-[2px_2px_0_0_#000]" />
          </div>
        </div>

        {/* ===== 箱子 GUI 面板 ===== */}
        <div className="mc-gui w-full">
          <div className="mc-gui-inner">

            <label className="block text-[#3f3f3f] font-bold text-lg mb-4 mc-text-shadow-white">
              Enter GitHub Username:
            </label>

            <div className="flex flex-col md:flex-row gap-4">
              {/* 下凹输入框 */}
              <div className="mc-input-sunken flex-1">
                <input
                  type="text"
                  placeholder="e.g. octocat"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                  spellCheck={false}
                />
              </div>

              {/* CRAFT 按钮 */}
              <button
                onClick={handleGenerate}
                disabled={loading || !username.trim()}
                className="mc-btn h-14 px-8 text-xl"
              >
                <span>{loading ? "MINING..." : "CRAFT"}</span>
              </button>
            </div>

            {/* ===== 状态展示区 ===== */}
            <div className="mc-display mt-8 relative">

              {/* 空状态 */}
              {!loading && !error && !svgPreview && (
                <div className="text-[#888] text-center mc-text-shadow-light">
                  <p className="mb-2">Awaiting target...</p>
                  <p className="text-sm">The 3D SVG blueprint will appear here.</p>
                </div>
              )}

              {/* 加载中 */}
              {loading && (
                <div className="flex flex-col items-center">
                  <div className="flex gap-2 mb-4">
                    {[0, 1, 2].map((i) => (
                      <img
                        key={i}
                        src={TEXTURES.emerald}
                        alt="Mining..."
                        className="w-8 h-8 mc-pixel-icon animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                  <p className="text-[#5ec462] animate-pulse mc-text-shadow">
                    Forging Isometric World...
                  </p>
                </div>
              )}

              {/* 错误 */}
              {error && (
                <div className="text-[#ff5555] text-center mc-text-shadow-error">
                  <p className="text-xl mb-1">⚠ ERROR</p>
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {/* 预览 */}
              {svgPreview && !loading && (
                <div className="w-full text-left overflow-auto max-h-[300px] p-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[#ffff55] text-sm mc-text-shadow-gold">
                      &gt; {username}&apos;s World:
                    </p>
                    {totalContributions !== null && (
                      <span className="text-xs text-[#5ec462] mc-text-shadow-light">
                        {totalContributions.toLocaleString()} contributions
                      </span>
                    )}
                  </div>
                  <pre className="text-white text-xs whitespace-pre-wrap break-all leading-relaxed mc-text-shadow-light">
                    {svgPreview}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ===== 底部页脚 ===== */}
      <div
        className="relative z-[20] h-4 w-full mc-texture"
        style={{ backgroundImage: `url('${TEXTURES.grassTop}')` }}
      />
      <footer
        className="relative z-[20] px-6 py-6 border-black text-center mc-texture"
        style={{ backgroundImage: `url('${TEXTURES.dirt}')` }}
      >
        <div className="absolute inset-0 mc-footer-overlay" />
        <p className="relative z-10 text-[#a0a0a0] text-sm hover:text-white transition-colors mc-text-shadow">
          Crafted with ❤️ by WJZ | Not an official Minecraft product
        </p>
      </footer>
    </div>
  );
}
