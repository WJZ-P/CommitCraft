"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import WeatherCanvas from "./components/WeatherCanvas";
import IsometricMap from "./components/IsometricMap";
import BannerHall from "./components/BannerHall";
import ProfileCardView from "./components/ProfileCard";
import RepoCard from "./components/RepoCard";
import type { ContributionCalendar, UserStats } from "@/app/lib/github";
import type { RepoSvgParams } from "@/app/lib/repoSvg";

// 判断输入类型：repo（owner/repo 或 GitHub URL）还是 user（纯用户名）
function parseInput(input: string): { type: "repo"; owner: string; repo: string } | { type: "user"; username: string } | null {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // 支持完整 URL: https://github.com/owner/repo
    const urlMatch = trimmed.match(/github\.com\/([^/]+)\/([^/\s?#]+)/);
    if (urlMatch) return { type: "repo", owner: urlMatch[1], repo: urlMatch[2].replace(/\.git$/, "") };

    // 支持 owner/repo 格式
    const slashMatch = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/);
    if (slashMatch) return { type: "repo", owner: slashMatch[1], repo: slashMatch[2] };

    // 否则视为用户名
    return { type: "user", username: trimmed };
}

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

const ORE_SPAWN_CHANCE = 0.05

const ABOUT_INPUTS = [
    {
        label: "GitHub 用户名",
        example: "例： WJZ_P",
        detail: "生成 Contribution Map、Banner Hall 和 Player Passport 三种用户视图。",
    },
    {
        label: "仓库短格式",
        example: "例： vercel/next.js",
        detail: "直接生成仓库 Repo Card，适合展示项目概览。",
    },
    {
        label: "仓库完整链接",
        example: "例： https://github.com/vercel/next.js",
        detail: "自动解析 owner/repo，适合直接粘贴 GitHub 页面地址。",
    },
]

const ABOUT_RESULTS = [
    {
        title: "Contribution Map",
        detail: "把年度贡献热力图转成 Minecraft 风格的等距地形地图。",
    },
    {
        title: "Banner Hall",
        detail: "根据 GitHub 统计生成战绩旗帜，并支持旋转视角查看。",
    },
    {
        title: "Player Passport",
        detail: "生成玩家护照卡，可自定义一句个性签名。",
    },
    {
        title: "Repo Card",
        detail: "展示仓库名称、描述、语言与热度信息，支持下载 SVG。",
    },
]

const ABOUT_ENDPOINTS = [
    {
        label: "贡献地图",
        path: "/api/map/{username}.svg",
    },
    {
        label: "玩家护照",
        path: "/api/card/{username}.svg",
    },
    {
        label: "旗帜大厅",
        path: "/api/banner/{username}/{statId}.svg",
    },
    {
        label: "仓库卡片",
        path: "/api/repo/{owner}/{repo}.svg",
    },
]

export default function Home() {
    const t = useTranslations();
    const locale = useLocale();

    const [input, setInput] = useState("");
    const [displayUsername, setDisplayUsername] = useState("");
    const [loading, setLoading] = useState(false);
    // 用户模式数据
    const [calendarData, setCalendarData] = useState<ContributionCalendar | null>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [userStats, setUserStats] = useState<UserStats | null>(null);
    // 仓库模式数据
    const [repoData, setRepoData] = useState<RepoSvgParams | null>(null);
    // 当前结果类型
    const [resultMode, setResultMode] = useState<"user" | "repo" | null>(null);

    const [error, setError] = useState<string | null>(null);
    const [ores, setOres] = useState<{ id: number; x: number; y: number; type: string }[]>([]);
    const [activeView, setActiveView] = useState<"map" | "banner" | "card">("map");
    const VIEW_LABELS: Record<string, string> = { map: "Contribution Map", banner: "Banner Hall", card: "Player Passport" };
    const VIEW_KEYS: ("map" | "banner" | "card")[] = ["map", "banner", "card"];
    const [weather, setWeather] = useState<"clear" | "rain" | "snow">("snow");
    const [isAboutOpen, setIsAboutOpen] = useState(false);
    const mouseRef = useRef({ x: 0, y: 0 });

    // 切换语言：写 Cookie 并刷新页面
    const toggleLocale = useCallback(() => {
        const next = locale === "zh" ? "en" : "zh";
        document.cookie = `locale=${next};path=/;max-age=31536000`;
        window.location.reload();
    }, [locale]);

    //  指向石头背景的ref，避免把鼠标位置挂载在全局HTML上，优化性能。
    const bgRef = useRef<HTMLDivElement>(null);

    // 监听鼠标位置，注入 CSS 变量 + 更新 ref（不触发 re-render）
    const handleMouseMove = useCallback((e: MouseEvent) => {
        //  这里的x和y是在做归一化处理，第一步除法结果是0-1， 减去0.5，就是-0.5 ~ 0.5，再乘以2就是-1到1，鼠标在最左侧就是-1，最右侧就是1.
        const x = (e.clientX / window.innerWidth - 0.5) * 2;
        const y = (e.clientY / window.innerHeight - 0.5) * 2;
        if (bgRef.current) {
            bgRef.current.style.setProperty("--mouse-x", x.toString());
            bgRef.current.style.setProperty("--mouse-y", y.toString());
        }
        mouseRef.current = { x, y };
    }, []);

    useEffect(() => {
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, [handleMouseMove]);

    useEffect(() => {
        if (!isAboutOpen) return;

        const previousOverflow = document.body.style.overflow;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsAboutOpen(false);
            }
        };

        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isAboutOpen]);

    // 挂载时生成随机矿石分布

    useEffect(() => {
        const generatedOres: typeof ores = [];
        const types = [
            "diamond_ore", "gold_ore", "iron_ore", "copper_ore",
            "coal_ore", "redstone_ore", "emerald_ore", "lapis_ore",
        ];
        for (let i = 0; i < 40; i++) {
            for (let j = 0; j < 40; j++) {
                if (Math.random() < ORE_SPAWN_CHANCE) {
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
        const parsed = parseInput(input);
        if (!parsed) return;

        setLoading(true);
        setError(null);
        setCalendarData(null);
        setAvatarUrl(null);
        setUserStats(null);
        setRepoData(null);
        setResultMode(null);

        try {
            if (parsed.type === "user") {
                const res = await fetch(`/api/contributions/${encodeURIComponent(parsed.username)}`);
                const data = await res.json();

                if (!res.ok) {
                    setError(data.error || "Failed to fetch contributions");
                    return;
                }

                setCalendarData(data as ContributionCalendar);
                setAvatarUrl(data.avatarUrl || null);
                setUserStats(data.stats || null);
                setDisplayUsername(parsed.username);
                setResultMode("user");
            } else {
                const res = await fetch(`/api/repoinfo/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}`);
                const data = await res.json();

                if (!res.ok) {
                    setError(data.error || "Failed to fetch repository info");
                    return;
                }

                setRepoData(data as RepoSvgParams);
                setResultMode("repo");
            }
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
                ref={bgRef}
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
            <div className="fixed inset-0 z-[1] bg-black/15 pointer-events-none" />

            {/* ===== 背景层 3：中心聚焦打光 (Vignette) ===== */}
            <div className="fixed inset-0 z-[2] mc-vignette" />

            {/* ===== 背景层 4：Canvas 粒子天气系统 ===== */}
            <WeatherCanvas weather={weather} mouseRef={mouseRef} />

            {/* ===== 顶部导航栏 ===== */}
            <nav
                className="relative z-[20] flex flex-col gap-4 px-6 py-4 border-black mc-navbar mc-texture sm:flex-row sm:items-center sm:justify-between"
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

                <div className="relative z-10 flex flex-wrap items-center gap-3 sm:justify-end">
                    <button
                        type="button"
                        onClick={toggleLocale}
                        className="mc-btn-secondary text-xs"
                    >
                        {locale === "zh" ? "EN" : "中文"}
                    </button>

                    <button
                        type="button"
                        onClick={() => setIsAboutOpen(true)}
                        aria-haspopup="dialog"
                        aria-expanded={isAboutOpen}
                        className="mc-btn-secondary text-xs"
                    >
                        ABOUT
                    </button>

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
                        className="mc-nav-link text-xs flex items-center gap-2"
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
            <main
                className="relative z-[20] flex-1 w-full max-w-5xl mx-auto px-4 py-12 flex flex-col items-center justify-center">

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
                            Enter GitHub Username or Repository:
                        </label>

                        <div className="flex flex-col md:flex-row gap-4">
                            {/* 下凹输入框 */}
                            <div className="mc-input-sunken flex-1">
                                <input
                                    type="text"
                                    placeholder="e.g. WJZ_P  or  facebook/react  or  https://github.com/..."
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                                    spellCheck={false}
                                />
                            </div>

                            {/* CRAFT 按钮 */}
                            <button
                                onClick={handleGenerate}
                                disabled={loading || !input.trim()}
                                className="mc-btn h-14 px-8 text-xl"
                            >
                                <span>{loading ? "MINING..." : "CRAFT"}</span>
                            </button>
                        </div>

                        <p className="text-[#888] text-xs mt-2 mc-text-shadow-light">
                            Username → Player Stats &amp; Maps &nbsp;|&nbsp; owner/repo or URL → Repository Card
                        </p>

                        {/* ===== 视图切换栏（仅用户模式） ===== */}
                        {resultMode === "user" && calendarData && !loading && !error && (
                            <div className="mc-view-switcher mt-6 mb-2 flex items-center justify-center select-none">
                                <button
                                    className="mc-btn-secondary text-sm px-4 py-2"
                                    onClick={() => {
                                        const idx = VIEW_KEYS.indexOf(activeView);
                                        setActiveView(VIEW_KEYS[(idx - 1 + VIEW_KEYS.length) % VIEW_KEYS.length]);
                                    }}
                                >
                                    &lt;
                                </button>
                                <div className="mc-view-label mx-4 min-w-[180px] text-center text-white font-bold mc-text-shadow">
                                    {VIEW_LABELS[activeView]}
                                </div>
                                <button
                                    className="mc-btn-secondary text-sm px-4 py-2"
                                    onClick={() => {
                                        const idx = VIEW_KEYS.indexOf(activeView);
                                        setActiveView(VIEW_KEYS[(idx + 1) % VIEW_KEYS.length]);
                                    }}
                                >
                                    &gt;
                                </button>
                            </div>
                        )}

                        {/* ===== 空状态 / 加载中 / 错误 ===== */}
                        {(!resultMode || loading || error) && (
                            <div className="mc-display mt-8 relative">
                                {!loading && !error && !resultMode && (
                                    <div className="text-[#888] text-center mc-text-shadow-light">
                                        <p className="mb-2">Awaiting target...</p>
                                        <p className="text-sm">Enter a username for player stats, or owner/repo for a repository card.</p>
                                    </div>
                                )}

                                {loading && (
                                    <div className="flex flex-col items-center">
                                        <div className="flex gap-2 mb-4">
                                            {[0, 1, 2].map((i) => (
                                                <img
                                                    key={i}
                                                    src={TEXTURES.emerald}
                                                    alt="Mining..."
                                                    className="w-8 h-8 mc-pixel-icon animate-bounce"
                                                    style={{ animationDelay: `${i * 0.15}s`, animationFillMode: "both" }}
                                                />
                                            ))}
                                        </div>
                                        <p className="text-[#5ec462] animate-pulse mc-text-shadow">
                                            {parseInput(input)?.type === "repo" ? "Querying Repository Data..." : "Forging Isometric World..."}
                                        </p>
                                    </div>
                                )}

                                {error && (
                                    <div className="text-[#ff5555] text-center mc-text-shadow-error">
                                        <p className="text-xl mb-1">⚠ ERROR</p>
                                        <p className="text-sm">{error}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ===== 用户模式：等距 SVG 地图 ===== */}
                        {resultMode === "user" && calendarData && !loading && activeView === "map" && (
                            <IsometricMap calendar={calendarData} username={displayUsername} avatarUrl={avatarUrl} stats={userStats} />
                        )}

                        {/* ===== 用户模式：旗帜战绩大厅 ===== */}
                        {resultMode === "user" && calendarData && !loading && activeView === "banner" && userStats && (
                            <BannerHall stats={userStats} totalContributions={calendarData.totalContributions} username={displayUsername} />
                        )}

                        {/* ===== 用户模式：玩家护照卡片 ===== */}
                        {resultMode === "user" && calendarData && !loading && activeView === "card" && userStats && avatarUrl && (
                            <ProfileCardView stats={userStats} totalContributions={calendarData.totalContributions} username={displayUsername} avatarUrl={avatarUrl} />
                        )}

                        {/* ===== 仓库模式：Repo Card ===== */}
                        {resultMode === "repo" && repoData && !loading && !error && (
                            <RepoCard repoData={repoData} />
                        )}
                    </div>
                </div>
            </main>
            {/* 下面是模态窗口 */}
            {isAboutOpen && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/72 px-4 py-6 mc-modal-backdrop"
                    onClick={() => setIsAboutOpen(false)}
                    role="presentation"
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="about-modal-title"
                        className="mc-gui mc-modal-shell w-full max-w-4xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="mc-gui-inner !p-0 flex max-h-[85vh] flex-col overflow-hidden">
                            <div className="flex items-start justify-between gap-4 border-b-4 border-black bg-[#8b8b8b] px-5 py-4">
                                <div className="min-w-0">
                                    <p className="text-xs text-[#55ff55] mc-text-shadow">PROJECT INFO</p>
                                    <h3 id="about-modal-title" className="mt-1 text-2xl text-white mc-text-shadow-heavy">
                                        CommitCraft
                                    </h3>
                                    <p className="mc-cjk-text mt-2 text-sm font-semibold text-[#202020]">
                                        把 GitHub 公开数据锻造成 Minecraft 风格的 SVG 展示物。
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    aria-label="关闭项目说明"
                                    onClick={() => setIsAboutOpen(false)}
                                    className="mc-btn-secondary text-xs shrink-0"
                                >
                                    CLOSE
                                </button>
                            </div>

                            <div className="mc-about-copy overflow-y-auto px-5 py-5 text-[#1f1f1f] sm:px-6 sm:py-6">
                                <section className="mc-about-section p-4">
                                    <h4 className="text-lg font-bold">这是一个什么项目？</h4>
                                    <p className="mt-3 text-sm leading-7">
                                        CommitCraft 会把 GitHub 用户贡献、仓库信息和统计数据，转换成可预览、可下载、可嵌入的 Minecraft 像素风 SVG。它适合放进 README、个人主页、作品集，或者直接当成分享图使用。
                                    </p>
                                </section>

                                <div className="mt-4 grid gap-4 md:grid-cols-2">
                                    <section className="mc-about-section p-4">
                                        <h4 className="text-lg font-bold">支持哪些输入？</h4>
                                        <ul className="mt-3 space-y-3 text-sm">
                                            {ABOUT_INPUTS.map((item) => (
                                                <li key={item.label} className="border-t-2 border-black/15 pt-3 first:border-t-0 first:pt-0">
                                                    <p className="font-bold text-[#15380f]">{item.label}</p>
                                                    <p className="mc-about-code mt-1 text-xs text-[#3a3a3a]">{item.example}</p>
                                                    <p className="mt-1 leading-6">{item.detail}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    </section>

                                    <section className="mc-about-section p-4">
                                        <h4 className="text-lg font-bold">可以生成什么？</h4>
                                        <ul className="mt-3 space-y-3 text-sm">
                                            {ABOUT_RESULTS.map((item) => (
                                                <li key={item.title} className="border-t-2 border-black/15 pt-3 first:border-t-0 first:pt-0">
                                                    <p className="font-bold text-[#15380f]">{item.title}</p>
                                                    <p className="mt-1 leading-6">{item.detail}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    </section>
                                </div>

                                <section className="mc-about-section mt-4 p-4">
                                    <h4 className="text-lg font-bold">完整使用方式</h4>
                                    <ol className="mt-3 space-y-3 text-sm leading-7">
                                        <li><span className="font-bold">1.</span> 在输入框中填入 GitHub 用户名、仓库短格式，或完整仓库链接。</li>
                                        <li><span className="font-bold">2.</span> 点击 <span className="mc-about-code">CRAFT</span>，等待页面生成对应内容。</li>
                                        <li><span className="font-bold">3.</span> 如果输入的是用户名，可以在 <span className="mc-about-code">Contribution Map</span>、<span className="mc-about-code">Banner Hall</span>、<span className="mc-about-code">Player Passport</span> 之间切换。</li>
                                        <li><span className="font-bold">4.</span> 每个视图都支持 <span className="mc-about-code">DOWNLOAD .SVG</span>；同时页面下方提供可复制的 endpoint，便于嵌入 README 或网页。</li>
                                        <li><span className="font-bold">5.</span> 玩家护照支持自定义一句 quote；旗帜大厅支持拖动角度；仓库卡片支持直接导出仓库说明 SVG。</li>
                                    </ol>
                                </section>

                                <section className="mc-about-section mt-4 p-4">
                                    <h4 className="text-lg font-bold">API / 嵌入用法</h4>
                                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                        {ABOUT_ENDPOINTS.map((item) => (
                                            <div key={item.path} className="border-2 border-black bg-black/8 px-3 py-3">
                                                <p className="font-bold text-sm">{item.label}</p>
                                                <p className="mc-about-code mt-2 text-xs break-all">{item.path}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="mt-3 text-sm leading-6">
                                        其中旗帜大厅的 <span className="mc-about-code">statId</span> 会在页面中按每面旗帜分别提供复制入口，不需要手动记忆。
                                    </p>
                                </section>

                                <section className="mc-about-section mt-4 p-4">
                                    <h4 className="text-lg font-bold">补充说明</h4>
                                    <ul className="mt-3 space-y-2 text-sm leading-7">
                                        <li>- 导出结果以 SVG 为主，方便二次编辑、嵌入网页和保持清晰缩放。</li>
                                        <li>- 用户模式与仓库模式都直接面向公开 GitHub 数据源。</li>
                                        <li>- 仓库卡片下载已经支持中英文混合内容导出，不会再把中文描述丢掉。</li>
                                    </ul>
                                </section>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                    Crafted with ❤️ by WJZ_P | Not an official Minecraft product
                </p>
            </footer>
        </div>
    );
}

