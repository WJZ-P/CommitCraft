/**
 * Repo Card SVG 生成器 — Minecraft GUI 灰石板风格
 * 前端版 (generateRepoSvg) 使用远程字体 + 动画
 * 服务端烘焙版 (generateBakedRepoSvg) 使用 <path>，适合 README 嵌入
 */

import { ensureFontsLoaded, bakeTextElement, bakeTextWithTspans, getTextWidth } from "./fontBaker";

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export { escapeXml };

const ICONS = {
  book: "https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.20.4/assets/minecraft/textures/item/book.png",
  star: "https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.20.4/assets/minecraft/textures/item/nether_star.png",
  trident: "https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.20.4/assets/minecraft/textures/item/trident.png",
  spider_eye: "https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.20.4/assets/minecraft/textures/item/spider_eye.png",
  map: "https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.20.4/assets/minecraft/textures/item/filled_map.png",
};

export interface RepoSvgParams {
  owner: string;
  repo: string;
  description: string;
  language: string;
  languageColor: string;
  stars: number;
  forks: number;
  issues: number;
  sizeKb: number;
  isPrivate?: boolean;
}

function formatSize(kb: number): string {
  if (kb >= 1024) return (kb / 1024).toFixed(1) + " MB";
  return kb + " KB";
}

/** 估算文本像素宽度（前端版 fallback，无需 opentype） */
function estimateTextWidth(text: string, fontSize: number): number {
  let w = 0;
  for (const ch of text) {
    // CJK 字符宽度约等于 fontSize，ASCII 约 0.6
    w += ch.charCodeAt(0) > 0x7f ? fontSize : fontSize * 0.6;
  }
  return w;
}

/** 按像素宽度换行，最多两行，第二行超出加省略号 */
function wrapDescriptionByWidth(
  desc: string,
  fontSize: number,
  maxWidth: number,
  widthFn: (text: string, size: number) => number = estimateTextWidth,
): [string, string] {
  if (!desc) return ["", ""];

  // 逐字符拆第一行
  let line1 = "";
  let i = 0;
  for (; i < desc.length; i++) {
    const next = line1 + desc[i];
    if (widthFn(next, fontSize) > maxWidth) break;
    line1 = next;
  }
  if (i >= desc.length) return [line1, ""];

  // 第二行
  let line2 = "";
  for (; i < desc.length; i++) {
    const next = line2 + desc[i];
    if (widthFn(next, fontSize) > maxWidth - widthFn("...", fontSize)) {
      line2 += "...";
      break;
    }
    line2 = next;
  }
  return [line1, line2];
}

function truncateTitle(owner: string, repo: string, maxChars: number): string {
  const full = `${owner} / ${repo}`;
  if (full.length <= maxChars) return full;
  return full.substring(0, maxChars - 3) + "...";
}

// ===== MC GUI 外壳公用 SVG =====
function guiShell(w: number, h: number): string {
  return `
<rect x="0" y="0" width="${w}" height="${h}" fill="#000000" />
<rect x="4" y="4" width="${w - 8}" height="${h - 8}" fill="#c6c6c6" />
<polygon points="4,4 ${w - 4},4 ${w - 8},8 8,8 8,${h - 8} 4,${h - 4}" fill="#ffffff" />
<polygon points="${w - 4},${h - 4} ${w - 4},4 ${w - 8},8 ${w - 8},${h - 8} 8,${h - 8} 4,${h - 4}" fill="#555555" />`;
}

// ===== 凹陷槽 =====
function sunkenSlot(x: number, y: number, w: number, h: number): string {
  return `
<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#111111" />
<polygon points="${x},${y} ${x + w},${y} ${x + w - 4},${y + 4} ${x + 4},${y + 4} ${x + 4},${y + h - 4} ${x},${y + h}" fill="#373737" />
<polygon points="${x + w},${y + h} ${x + w},${y} ${x + w - 4},${y + 4} ${x + w - 4},${y + h - 4} ${x + 4},${y + h - 4} ${x},${y + h}" fill="#ffffff" />`;
}

// ===== 徽章 (Public / Private) =====
function badge(label: string, x: number, y: number, w: number, h: number): string {
  return `
<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#8b8b8b" />
<polygon points="${x},${y} ${x + w},${y} ${x + w - 4},${y + 4} ${x + 4},${y + 4} ${x + 4},${y + h - 4} ${x},${y + h}" fill="#373737" />
<polygon points="${x + w},${y + h} ${x + w},${y} ${x + w - 4},${y + 4} ${x + w - 4},${y + h - 4} ${x + 4},${y + h - 4} ${x},${y + h}" fill="#ffffff" />`;
}

// =============================================================
// 前端版：使用远程字体 + CSS 动画
// =============================================================
export function generateRepoSvg(params: RepoSvgParams): string {
  const { owner, repo, description, language, languageColor, stars, forks, issues, sizeKb, isPrivate } = params;
  const safeOwner = escapeXml(owner);
  const safeRepo = escapeXml(repo);
  // 标题截断后用于 tspan 版本
  const truncated = truncateTitle(owner, repo, 28);
  const isTruncated = truncated !== `${owner} / ${repo}`;
  const [line1, line2] = wrapDescriptionByWidth(escapeXml(description), 15, 440);
  const badgeLabel = isPrivate ? "Private" : "Public";

  // tspan 标题：如果截断了就只用单色，否则 owner / repo 分色
  const titleTspans = isTruncated
    ? `<tspan fill="#3f3f3f">${escapeXml(truncated)}</tspan>`
    : `<tspan fill="#555555">${safeOwner} / </tspan><tspan fill="#3f3f3f">${safeRepo}</tspan>`;
  const titleShadowText = escapeXml(truncated);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 160" width="480" height="160" style="image-rendering: pixelated">
<defs>
  <style>
    @font-face {
      font-family: 'Minecraft';
      src: url('https://fonts.cdnfonts.com/s/25041/1_MinecraftRegular1.woff') format('woff');
      font-weight: 400; font-style: normal;
    }
    @font-face {
      font-family: 'Minecraft';
      src: url('https://fonts.cdnfonts.com/s/25041/3_MinecraftBold1.woff') format('woff');
      font-weight: 700; font-style: normal;
    }
    .mc-font { font-family: 'Minecraft', VT323, monospace; }
    @keyframes safeFadeUp {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .anim-fade { animation: safeFadeUp 0.4s ease-out both; }
  </style>
  <filter id="shadow-dark" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="2" dy="2" stdDeviation="0" flood-color="#000000" flood-opacity="0.8" />
  </filter>
</defs>

${guiShell(480, 160)}

<!-- 顶部：仓库名称与徽章 -->
<g class="anim-fade" style="animation-delay: 0.1s">
  <image href="${ICONS.book}" x="16" y="16" width="20" height="20" filter="url(#shadow-dark)" />
  <text x="46" y="32" class="mc-font" font-size="20" fill="#ffffff" font-weight="bold">${titleShadowText}</text>
  <text x="44" y="30" class="mc-font" font-size="20" font-weight="bold">
    ${titleTspans}
  </text>
  ${badge(badgeLabel, 400, 14, 60, 22)}
  <text x="430" y="30" class="mc-font" font-size="14" fill="#ffffff" text-anchor="middle" filter="url(#shadow-dark)">${badgeLabel}</text>
</g>

<!-- 中部：仓库描述 -->
<g class="anim-fade" style="animation-delay: 0.2s">
  <text x="20" y="62" class="mc-font" font-size="15" font-weight="bold" fill="#ffffff">${line1}</text>
  <text x="18" y="60" class="mc-font" font-size="15" font-weight="bold" fill="#3f3f3f">${line1}</text>
  ${line2 ? `<text x="20" y="80" class="mc-font" font-size="15" font-weight="bold" fill="#ffffff">${line2}</text>
  <text x="18" y="78" class="mc-font" font-size="15" font-weight="bold" fill="#3f3f3f">${line2}</text>` : ""}
</g>

<!-- 底部：数据槽 -->
<g class="anim-fade" style="animation-delay: 0.3s">
  ${sunkenSlot(16, 108, 448, 36)}

  <!-- Language -->
  <g transform="translate(26, 119)">
    <circle cx="5" cy="7" r="4" fill="${languageColor}" stroke="#000" stroke-width="1.5" />
    <text x="14" y="12" class="mc-font" font-size="16" fill="#AAAAAA" filter="url(#shadow-dark)">${escapeXml(language)}</text>
  </g>
  <!-- Stars -->
  <g transform="translate(140, 119)">
    <image href="${ICONS.star}" x="0" y="0" width="16" height="16" filter="url(#shadow-dark)" />
    <text x="20" y="12" class="mc-font" font-size="16" fill="#55FFFF" filter="url(#shadow-dark)">${stars.toLocaleString()}</text>
  </g>
  <!-- Forks -->
  <g transform="translate(220, 119)">
    <image href="${ICONS.trident}" x="0" y="0" width="16" height="16" filter="url(#shadow-dark)" />
    <text x="20" y="12" class="mc-font" font-size="16" fill="#55FF55" filter="url(#shadow-dark)">${forks.toLocaleString()}</text>
  </g>
  <!-- Issues -->
  <g transform="translate(295, 119)">
    <image href="${ICONS.spider_eye}" x="0" y="0" width="16" height="16" filter="url(#shadow-dark)" />
    <text x="20" y="12" class="mc-font" font-size="16" fill="#FF5555" filter="url(#shadow-dark)">${issues.toLocaleString()}</text>
  </g>
  <!-- Size -->
  <g transform="translate(370, 119)">
    <image href="${ICONS.map}" x="0" y="0" width="16" height="16" filter="url(#shadow-dark)" />
    <text x="20" y="12" class="mc-font" font-size="16" fill="#FFAA00" filter="url(#shadow-dark)">${formatSize(sizeKb)}</text>
  </g>
</g>
</svg>`;
}

// =============================================================
// 服务端烘焙版：所有 <text> 转为 <path>
// =============================================================
export async function generateBakedRepoSvg(params: RepoSvgParams): Promise<string> {
  await ensureFontsLoaded();

  const { owner, repo, description, language, languageColor, stars, forks, issues, sizeKb, isPrivate } = params;
  const truncated = truncateTitle(owner, repo, 28);
  const isTruncated = truncated !== `${owner} / ${repo}`;
  const safeOwner = escapeXml(owner);
  const safeRepo = escapeXml(repo);
  const safeTruncated = escapeXml(truncated);
  const [line1Raw, line2Raw] = wrapDescriptionByWidth(description, 15, 440, getTextWidth);
  const line1 = escapeXml(line1Raw);
  const line2 = escapeXml(line2Raw);
  const badgeLabel = isPrivate ? "Private" : "Public";

  // 标题文字阴影层
  const titleShadow = isTruncated
    ? bakeTextElement({ text: safeTruncated, x: 46, y: 32, fontSize: 20, fill: "#ffffff", fontWeight: "bold" })
    : bakeTextWithTspans({
        segments: [
          { text: `${safeOwner} / `, fill: "#ffffff" },
          { text: safeRepo, fill: "#ffffff" },
        ],
        x: 46, y: 32, fontSize: 20, fontWeight: "bold",
      });

  // 标题前景层
  const titleFg = isTruncated
    ? bakeTextElement({ text: safeTruncated, x: 44, y: 30, fontSize: 20, fill: "#3f3f3f", fontWeight: "bold" })
    : bakeTextWithTspans({
        segments: [
          { text: `${safeOwner} / `, fill: "#555555" },
          { text: safeRepo, fill: "#3f3f3f" },
        ],
        x: 44, y: 30, fontSize: 20, fontWeight: "bold",
      });

  // 徽章文字
  const badgePath = bakeTextElement({
    text: badgeLabel, x: 430, y: 30, fontSize: 14,
    fill: "#ffffff", textAnchor: "middle", filter: "url(#shadow-dark)",
  });

  // 描述行
  const desc1Shadow = bakeTextElement({ text: line1, x: 20, y: 62, fontSize: 15, fill: "#ffffff", fontWeight: "bold" });
  const desc1Fg = bakeTextElement({ text: line1, x: 18, y: 60, fontSize: 15, fill: "#3f3f3f", fontWeight: "bold" });
  const desc2Shadow = line2 ? bakeTextElement({ text: line2, x: 20, y: 80, fontSize: 15, fill: "#ffffff", fontWeight: "bold" }) : "";
  const desc2Fg = line2 ? bakeTextElement({ text: line2, x: 18, y: 78, fontSize: 15, fill: "#3f3f3f", fontWeight: "bold" }) : "";

  // 底部数据（字号 16）
  const langPath = bakeTextElement({ text: escapeXml(language), x: 40, y: 131, fontSize: 16, fill: "#AAAAAA", filter: "url(#shadow-dark)" });
  
  const langWidth = getTextWidth(language, 16);
  const starsX = 40 + langWidth + 20;
  
  const starsPath = bakeTextElement({ text: stars.toLocaleString(), x: starsX + 20, y: 131, fontSize: 16, fill: "#55FFFF", filter: "url(#shadow-dark)" });
  const starsValWidth = getTextWidth(stars.toLocaleString(), 16);
  
  const forksX = starsX + 20 + starsValWidth + 16;
  const forksPath = bakeTextElement({ text: forks.toLocaleString(), x: forksX + 20, y: 131, fontSize: 16, fill: "#55FF55", filter: "url(#shadow-dark)" });
  const forksValWidth = getTextWidth(forks.toLocaleString(), 16);
  
  const issuesX = forksX + 20 + forksValWidth + 16;
  const issuesPath = bakeTextElement({ text: issues.toLocaleString(), x: issuesX + 20, y: 131, fontSize: 16, fill: "#FF5555", filter: "url(#shadow-dark)" });
  const issuesValWidth = getTextWidth(issues.toLocaleString(), 16);
  
  const sizeX = issuesX + 20 + issuesValWidth + 16;
  const sizePath = bakeTextElement({ text: formatSize(sizeKb), x: sizeX + 20, y: 131, fontSize: 16, fill: "#FFAA00", filter: "url(#shadow-dark)" });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 160" width="480" height="160" style="image-rendering: pixelated">
<defs>
  <style>
    @keyframes safeFadeUp {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .anim-fade { animation: safeFadeUp 0.4s ease-out both; }
  </style>
  <filter id="shadow-dark" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="2" dy="2" stdDeviation="0" flood-color="#000000" flood-opacity="0.8" />
  </filter>
</defs>

${guiShell(480, 160)}

<!-- 顶部：仓库名称与徽章 -->
<g class="anim-fade" style="animation-delay: 0.1s">
  <image href="${ICONS.book}" x="16" y="16" width="20" height="20" filter="url(#shadow-dark)" />
  ${titleShadow}
  ${titleFg}
  ${badge(badgeLabel, 400, 14, 60, 22)}
  ${badgePath}
</g>

<!-- 中部：仓库描述 -->
<g class="anim-fade" style="animation-delay: 0.2s">
  ${desc1Shadow}
  ${desc1Fg}
  ${desc2Shadow}
  ${desc2Fg}
</g>

<!-- 底部：数据槽 -->
<g class="anim-fade" style="animation-delay: 0.3s">
  ${sunkenSlot(16, 108, 448, 36)}

  <!-- Language -->
  <circle cx="31" cy="126" r="4" fill="${languageColor}" stroke="#000" stroke-width="1.5" />
  ${langPath}

  <!-- Stars -->
  <image href="${ICONS.star}" x="${starsX}" y="${119}" width="16" height="16" filter="url(#shadow-dark)" />
  ${starsPath}

  <!-- Forks -->
  <image href="${ICONS.trident}" x="${forksX}" y="${119}" width="16" height="16" filter="url(#shadow-dark)" />
  ${forksPath}

  <!-- Issues -->
  <image href="${ICONS.spider_eye}" x="${issuesX}" y="${119}" width="16" height="16" filter="url(#shadow-dark)" />
  ${issuesPath}

  <!-- Size -->
  <image href="${ICONS.map}" x="${sizeX}" y="${119}" width="16" height="16" filter="url(#shadow-dark)" />
  ${sizePath}
</g>
</svg>`;
}
