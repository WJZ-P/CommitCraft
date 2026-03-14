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
    sand: "https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.20.4/assets/minecraft/textures/block/sand.png",
};

const ORE_SPAWN_CHANCE = 0.05



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
    const VIEW_LABELS: Record<string, string> = { map: t("views.map"), banner: t("views.banner"), card: t("views.card") };
    const VIEW_KEYS: ("map" | "banner" | "card")[] = ["map", "banner", "card"];

    const ABOUT_INPUTS = [
        { label: t("about.inputUsername"), example: t("about.inputUsernameExample"), detail: t("about.inputUsernameDetail") },
        { label: t("about.inputShort"), example: t("about.inputShortExample"), detail: t("about.inputShortDetail") },
        { label: t("about.inputUrl"), example: t("about.inputUrlExample"), detail: t("about.inputUrlDetail") },
    ];
    const ABOUT_RESULTS = [
        { title: t("about.resultMap"), detail: t("about.resultMapDetail") },
        { title: t("about.resultBanner"), detail: t("about.resultBannerDetail") },
        { title: t("about.resultPassport"), detail: t("about.resultPassportDetail") },
        { title: t("about.resultRepo"), detail: t("about.resultRepoDetail") },
    ];
    const ABOUT_ENDPOINTS = [
        { label: t("about.apiMap"), path: "/api/map/{username}.svg" },
        { label: t("about.apiPassport"), path: "/api/card/{username}.svg" },
        { label: t("about.apiBanner"), path: "/api/banner/{username}/{statId}.svg" },
        { label: t("about.apiRepo"), path: "/api/repo/{owner}/{repo}.svg" },
    ];
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
                    setError(data.error || t("error.contributions"));
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
                    setError(data.error || t("error.repo"));
                    return;
                }

                setRepoData(data as RepoSvgParams);
                setResultMode("repo");
            }
        } catch {
            setError(t("error.network"));
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
                className="relative z-[20] h-20 bg-[#282a2e] border-b-4 border-[#111111] mc-navbar"
            >
                {/* 物理光影层：顶部高光 + 底部深色阴影 → 钢铁面板立体感 */}
                <div className="absolute inset-0 pointer-events-none shadow-[inset_0_4px_0_0_rgba(255,255,255,0.1),inset_0_-4px_0_0_rgba(0,0,0,0.4)]" />

                {/* 泥土材质噪点：极低透明度营造工业颗粒感 */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-[0.12]"
                    style={{
                        backgroundImage: `url('${TEXTURES.dirt}')`,
                        backgroundSize: '32px 32px',
                        imageRendering: 'pixelated',
                        mixBlendMode: 'luminosity',
                    }}
                />

                {/* 铆钉装饰 (四角) */}
                <div className="absolute top-2 left-2 w-2 h-2 bg-[#1a1b1e] border-b border-r border-[#444]" />
                <div className="absolute bottom-2 left-2 w-2 h-2 bg-[#1a1b1e] border-b border-r border-[#444]" />
                <div className="absolute top-2 right-2 w-2 h-2 bg-[#1a1b1e] border-b border-r border-[#444]" />
                <div className="absolute bottom-2 right-2 w-2 h-2 bg-[#1a1b1e] border-b border-r border-[#444]" />

                {/* 内部内容容器 */}
                <div className="relative z-10 w-full h-full mx-auto px-6 flex items-center justify-between">

                    <a href="https://github.com/WJZ-P/CommitCraft" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 cursor-pointer group no-underline">
                        <div className="relative">
                            <div className="absolute inset-0 bg-[#55FF55] blur-md opacity-0 group-hover:opacity-40 transition-opacity" />
                            <img
                                src={TEXTURES.emerald}
                                alt="CommitCraft"
                                className="w-8 h-8 md:w-10 md:h-10 relative z-10"
                                style={{ imageRendering: 'pixelated', filter: 'drop-shadow(2px 4px 0px rgba(0,0,0,0.5))' }}
                            />
                        </div>
                        <h1
                            className="text-3xl md:text-4xl text-white font-bold tracking-widest transition-transform group-hover:scale-105"
                            style={{ textShadow: '3px 3px 0px #000, 0px 0px 8px rgba(85,255,85,0.2)' }}
                        >
                            CommitCraft
                        </h1>
                    </a>

                    <div className="flex items-center gap-3 md:gap-4">
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
                        {t("nav.about")}
                    </button>

                    <button
                        onClick={() => setWeather((w) => (w === "clear" ? "rain" : w === "rain" ? "snow" : "clear"))}
                        className="mc-btn-secondary text-xs flex items-center gap-2"
                    >
                        {t("nav.weather")}: {weather.toUpperCase()}
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
                </div>
            </nav>


            {/* ===== 主体内容区 ===== */}
            <main
                className="relative z-[20] flex-1 w-full max-w-5xl mx-auto px-4 py-12 flex flex-col items-center justify-center">

                {/* Hero 标题 */}
                <div className="mb-10 flex flex-col items-center animate-[bounce_4s_infinite]">
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-widest text-center mc-text-shadow-3d">
                        {t("hero.title")}
                    </h2>
                    <div className="flex items-center gap-3">
                        <span className="h-1 w-12 bg-[#5ec462] shadow-[2px_2px_0_0_#000]" />
                        <p className="text-[#c6c6c6] text-sm tracking-widest text-center mc-text-shadow">
                            {t("hero.subtitle")}
                        </p>
                        <span className="h-1 w-12 bg-[#5ec462] shadow-[2px_2px_0_0_#000]" />
                    </div>
                </div>

                {/* ===== 箱子 GUI 面板 ===== */}
                <div className="mc-gui w-full">
                    <div className="mc-gui-inner">

                        <label className="block text-[#3f3f3f] font-bold text-lg mb-4 mc-text-shadow-white">
                            {t("input.label")}
                        </label>

                        <div className="flex flex-col md:flex-row gap-4">
                            {/* 下凹输入框 */}
                            <div className="mc-input-sunken flex-1">
                                <input
                                    type="text"
                                    placeholder={t("input.placeholder")}
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
                                <span>{loading ? t("input.mining") : t("input.craft")}</span>
                            </button>
                        </div>

                        <p className="text-[#444] text-md mt-2" style={{ textShadow: "1px 1px 0 #fff" }}>
                            {t("input.hint")}
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
                                        <p className="mb-2">{t("empty.title")}</p>
                                        <p className="text-sm">{t("empty.subtitle")}</p>
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
                                            {parseInput(input)?.type === "repo" ? t("loading.repo") : t("loading.user")}
                                        </p>
                                    </div>
                                )}

                                {error && (
                                    <div className="text-[#ff5555] text-center mc-text-shadow-error">
                                        <p className="text-xl mb-1">⚠ {t("error.label")}</p>
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
                                    <p className="text-md font-bold text-[#444]" style={{ textShadow: '1px 1px 0 #fff' }}>{t("about.projectInfo")}</p>
                                    <h3 id="about-modal-title" className="mt-1 text-2xl text-white mc-text-shadow-heavy">
                                        {t("about.title")}
                                    </h3>
                                    <p className="mc-cjk-text mt-2 text-sm font-semibold text-[#202020]">
                                        {t("about.description")}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    aria-label={t("about.close")}
                                    onClick={() => setIsAboutOpen(false)}
                                    className="mc-btn-secondary text-xs shrink-0"
                                >
                                    {t("about.close")}
                                </button>
                            </div>

                            <div className="mc-about-copy overflow-y-auto px-5 py-5 text-[#1f1f1f] sm:px-6 sm:py-6">
                                <section className="mc-about-section p-4">
                                    <h4 className="text-lg font-bold">{t("about.whatIsThis")}</h4>
                                    <p className="mt-3 text-sm leading-7">
                                        {t("about.whatIsThisContent")}
                                    </p>
                                </section>

                                <div className="mt-4 grid gap-4 md:grid-cols-2">
                                    <section className="mc-about-section p-4">
                                        <h4 className="text-lg font-bold">{t("about.supportedInputs")}</h4>
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
                                        <h4 className="text-lg font-bold">{t("about.whatCanGenerate")}</h4>
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
                                    <h4 className="text-lg font-bold">{t("about.howToUse")}</h4>
                                    <ol className="mt-3 space-y-3 text-sm leading-7">
                                        <li><span className="font-bold">1.</span> {t("about.step1")}</li>
                                        <li><span className="font-bold">2.</span> {t("about.step2_prefix")}<span className="mc-about-code">{t("about.step2_craft")}</span>{t("about.step2_suffix")}</li>
                                        <li><span className="font-bold">3.</span> {t("about.step3_prefix")}<span className="mc-about-code">{t("views.map")}</span>、<span className="mc-about-code">{t("views.banner")}</span>、<span className="mc-about-code">{t("views.card")}</span>{t("about.step3_suffix")}</li>
                                        <li><span className="font-bold">4.</span> {t("about.step4_prefix")}<span className="mc-about-code">{t("about.step4_download")}</span>{t("about.step4_suffix")}</li>
                                        <li><span className="font-bold">5.</span> {t("about.step5")}</li>
                                    </ol>
                                </section>

                                <section className="mc-about-section mt-4 p-4">
                                    <h4 className="text-lg font-bold">{t("about.apiUsage")}</h4>
                                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                        {ABOUT_ENDPOINTS.map((item) => (
                                            <div key={item.path} className="border-2 border-black bg-black/8 px-3 py-3">
                                                <p className="font-bold text-sm">{item.label}</p>
                                                <p className="mc-about-code mt-2 text-xs break-all">{item.path}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="mt-3 text-sm leading-6">
                                        {t("about.apiStatIdNote_prefix")}<span className="mc-about-code">{t("about.apiStatIdNote_statId")}</span>{t("about.apiStatIdNote_suffix")}
                                    </p>
                                </section>

                                <section className="mc-about-section mt-4 p-4">
                                    <h4 className="text-lg font-bold">{t("about.notes")}</h4>
                                    <ul className="mt-3 space-y-2 text-sm leading-7">
                                        <li>- {t("about.note1")}</li>
                                        <li>- {t("about.note2")}</li>
                                        <li>- {t("about.note3")}</li>
                                    </ul>
                                </section>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== 底部页脚 ===== */}

            <footer
                className="relative z-[20] h-16 bg-[#282a2e] border-t-4 border-[#111111]"
            >
                {/* 物理光影层：顶部高光 + 底部深色阴影 */}
                <div className="absolute inset-0 pointer-events-none shadow-[inset_0_4px_0_0_rgba(255,255,255,0.1),inset_0_-4px_0_0_rgba(0,0,0,0.4)]" />

                {/* 沙子材质噪点 */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-[0.12]"
                    style={{
                        backgroundImage: `url('${TEXTURES.sand}')`,
                        backgroundSize: '32px 32px',
                        imageRendering: 'pixelated',
                        mixBlendMode: 'luminosity',
                    }}
                />

                {/* 铆钉装饰 (四角) */}
                <div className="absolute top-2 left-2 w-2 h-2 bg-[#1a1b1e] border-b border-r border-[#444]" />
                <div className="absolute bottom-2 left-2 w-2 h-2 bg-[#1a1b1e] border-b border-r border-[#444]" />
                <div className="absolute top-2 right-2 w-2 h-2 bg-[#1a1b1e] border-b border-r border-[#444]" />
                <div className="absolute bottom-2 right-2 w-2 h-2 bg-[#1a1b1e] border-b border-r border-[#444]" />

                {/* 内容 */}
                <div className="relative z-10 w-full h-full mx-auto px-3 flex items-center justify-center">
                    <p className="text-[#a0a0a0] text-sm hover:text-white transition-colors mc-text-shadow">
                        {t("footer.credit")}
                    </p>
                </div>
            </footer>
        </div>
    );
}

