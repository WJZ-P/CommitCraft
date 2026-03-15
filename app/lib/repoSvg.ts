/**
 * Repo Card SVG 生成器 — Minecraft GUI 灰石板风格
 * 前端版 (generateRepoSvg) 使用远程字体 + 动画
 * 服务端烘焙版 (generateBakedRepoSvg) 使用 <path>，适合 README 嵌入
 */

import { ensureFontsLoaded, bakeTextElement, bakeMixedTextElement, getTextWidth } from "./fontBaker";
import { toDataUri, preloadAssets } from "./assetCache";

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

/** 预加载 Repo Card 模块所有静态图片资源到内存缓存 */
export async function ensureRepoAssetsLoaded(): Promise<void> {
  await preloadAssets(Object.values(ICONS));
}

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
  if (kb >= 1048576) return (kb / 1048576).toFixed(1) + " GB";
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
  const [line1, line2] = wrapDescriptionByWidth(escapeXml(description), 16, 440);
  const badgeLabel = isPrivate ? "Private" : "Public";

  // tspan 标题：如果截断了就只用单色，否则 owner / repo 分色
  const titleTspans = isTruncated
    ? `<tspan fill="#3f3f3f">${escapeXml(truncated)}</tspan>`
    : `<tspan fill="#555555">${safeOwner} / </tspan><tspan fill="#3f3f3f">${safeRepo}</tspan>`;

  const sizeText = formatSize(sizeKb);
  const langTextWidth = estimateTextWidth(language, 16);
  const sizeTextWidth = estimateTextWidth(sizeText, 16);

  // 左锚: Language 圆点(10) + 间隔(4) + 文字
  const leftEnd = 26 + 10 + 4 + langTextWidth + 8;
  // 右锚: 凹槽右边界 464 - 边距6 = 458; 文字宽 + 图标20 + 间隔4
  const sizeGroupWidth = 20 + 4 + sizeTextWidth;
  const sizeGroupX = 458 - sizeGroupWidth;
  const rightStart = sizeGroupX - 8;
  // 中间 Stars/Forks/Issues 均分
  const midSpace = rightStart - leftEnd;
  const midStep = midSpace / 3;
  const starsGroupX = Math.round(leftEnd + midStep * 0.5 - 10);
  const forksGroupX = Math.round(leftEnd + midStep * 1.5 - 10);
  const issuesGroupX = Math.round(leftEnd + midStep * 2.5 - 10);

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
  <filter id="shadow-text" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="1" dy="1" stdDeviation="0" flood-color="#000000" flood-opacity="0.5" />
  </filter>
  <filter id="shadow-title" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="1" dy="1" stdDeviation="0" flood-color="#ffffff" flood-opacity="0.4" />
  </filter>
</defs>

${guiShell(480, 160)}

<!-- 顶部：仓库名称与徽章 -->
<g class="anim-fade" style="animation-delay: 0.1s">
  <image href="${ICONS.book}" x="14" y="12" width="26" height="26" filter="url(#shadow-dark)" />
  <text x="48" y="33" class="mc-font" font-size="20" font-weight="bold" filter="url(#shadow-title)">
    ${titleTspans}
  </text>
  ${badge(badgeLabel, 400, 14, 60, 22)}
  <text x="430" y="29" class="mc-font" font-size="14" fill="#ffffff" text-anchor="middle" filter="url(#shadow-dark)">${badgeLabel}</text>
</g>

<!-- 中部：仓库描述 -->
<g class="anim-fade" style="animation-delay: 0.2s">
  <text x="18" y="60" class="mc-font" font-size="16" font-weight="bold" fill="#3f3f3f">${line1}</text>
  ${line2 ? `<text x="18" y="79" class="mc-font" font-size="16" font-weight="bold" fill="#3f3f3f">${line2}</text>` : ""}
</g>

<!-- 底部：数据槽 -->
<g class="anim-fade" style="animation-delay: 0.3s">
  ${sunkenSlot(16, 108, 448, 36)}

  <!-- Language (左锚定) -->
  <g transform="translate(26, 119)">
    <circle cx="5" cy="7" r="4" fill="${languageColor}" stroke="#000" stroke-width="1.5" />
    <text x="14" y="12" class="mc-font" font-size="16" fill="#AAAAAA" filter="url(#shadow-dark)">${escapeXml(language)}</text>
  </g>
  <!-- Stars -->
  <g transform="translate(${starsGroupX}, 119)">
    <image href="${ICONS.star}" x="0" y="0" width="16" height="16" filter="url(#shadow-dark)" />
    <text x="20" y="12" class="mc-font" font-size="16" fill="#55FFFF" filter="url(#shadow-dark)">${stars.toLocaleString()}</text>
  </g>
  <!-- Forks -->
  <g transform="translate(${forksGroupX}, 119)">
    <image href="${ICONS.trident}" x="0" y="0" width="16" height="16" filter="url(#shadow-dark)" />
    <text x="20" y="12" class="mc-font" font-size="16" fill="#55FF55" filter="url(#shadow-dark)">${forks.toLocaleString()}</text>
  </g>
  <!-- Issues -->
  <g transform="translate(${issuesGroupX}, 119)">
    <image href="${ICONS.spider_eye}" x="0" y="0" width="16" height="16" filter="url(#shadow-dark)" />
    <text x="20" y="12" class="mc-font" font-size="16" fill="#FF5555" filter="url(#shadow-dark)">${issues.toLocaleString()}</text>
  </g>
  <!-- Size (右锚定) -->
  <g transform="translate(${sizeGroupX}, 119)">
    <image href="${ICONS.map}" x="0" y="0" width="16" height="16" filter="url(#shadow-dark)" />
    <text x="24" y="12" class="mc-font" font-size="16" fill="#FFAA00" filter="url(#shadow-dark)">${sizeText}</text>
  </g>
</g>
</svg>`;
}

// =============================================================
// 服务端烘焙版：所有 <text> 转为 <path>
// =============================================================
export async function generateBakedRepoSvg(params: RepoSvgParams): Promise<string> {
  await ensureFontsLoaded();
  await ensureRepoAssetsLoaded();

  const { owner, repo, description, language, languageColor, stars, forks, issues, sizeKb, isPrivate } = params;

  // 将外部资源转为 data URI
  const bookDataUri = await toDataUri(ICONS.book);
  const starDataUri = await toDataUri(ICONS.star);
  const tridentDataUri = await toDataUri(ICONS.trident);
  const spiderEyeDataUri = await toDataUri(ICONS.spider_eye);
  const mapDataUri = await toDataUri(ICONS.map);

  const truncated = truncateTitle(owner, repo, 28);
  const isTruncated = truncated !== `${owner} / ${repo}`;
  const safeOwner = escapeXml(owner);
  const safeRepo = escapeXml(repo);
  const safeTruncated = escapeXml(truncated);
  const [line1Raw, line2Raw] = wrapDescriptionByWidth(description, 16, 440, getTextWidth);
  const line1 = escapeXml(line1Raw);
  const line2 = escapeXml(line2Raw);
  const badgeLabel = isPrivate ? "Private" : "Public";

  // 标题全面换用混合烘焙，防止碰到中文仓库名直接消失
  const ownerWidth = getTextWidth(`${safeOwner} / `, 20, "bold");
  const titleFg = isTruncated
    ? bakeMixedTextElement({ text: safeTruncated, x: 48, y: 33, fontSize: 20, fill: "#3f3f3f", fontWeight: "bold", filter: "url(#shadow-title)" })
    : bakeMixedTextElement({ text: `${safeOwner} / `, x: 48, y: 33, fontSize: 20, fill: "#555555", fontWeight: "bold", filter: "url(#shadow-title)" }) +
      bakeMixedTextElement({ text: safeRepo, x: 48 + ownerWidth, y: 33, fontSize: 20, fill: "#3f3f3f", fontWeight: "bold", filter: "url(#shadow-title)" });

  // 徽章文字换用混合烘焙
  const badgePath = bakeMixedTextElement({
    text: badgeLabel, x: 430, y: 29, fontSize: 14,
    fill: "#ffffff", textAnchor: "middle", filter: "url(#shadow-dark)",
  });

  // 描述行（混合烘焙：ASCII 用 path，中文用 <text> + bold）
  const desc1Fg = bakeMixedTextElement({ text: line1, x: 18, y: 60, fontSize: 16, fill: "#3f3f3f", fontWeight: "bold" });
  const desc2Fg = line2 ? bakeMixedTextElement({ text: line2, x: 18, y: 79, fontSize: 16, fill: "#3f3f3f", fontWeight: "bold" }) : "";

  // 底部数据（字号 16）— 左锚 Language，右锚 Size，中间 Stars/Forks/Issues 均分
  const slotLeft = 26;   // 凹槽内左起
  const slotRight = 458; // 凹槽内右止 (16 + 448 - 6)

  // Language（左锚定：圆点 + 文字）— 换用混合烘焙，Language 也可能是中文
  const langPath = bakeMixedTextElement({ text: escapeXml(language), x: slotLeft + 14, y: 131, fontSize: 16, fill: "#AAAAAA", filter: "url(#shadow-dark)" });
  const langWidth = getTextWidth(escapeXml(language), 16);
  const leftEnd = slotLeft + 14 + langWidth + 10; // Language 区域右边界

  // Size（右锚定：图标 + 间隔 + 文字，整组靠右）
  const sizeText = formatSize(sizeKb);
  const sizeTextWidth = getTextWidth(sizeText, 16);
  const sizeGroupWidth = 16 + 4 + sizeTextWidth; // icon(16) + gap(4) + text
  const sizeGroupLeft = slotRight - sizeGroupWidth;
  const sizeIconX = sizeGroupLeft;
  const sizeTextX = sizeGroupLeft + 20;
  const sizePath = bakeTextElement({ text: sizeText, x: sizeTextX, y: 131, fontSize: 16, fill: "#FFAA00", filter: "url(#shadow-dark)" });
  const rightStart = sizeGroupLeft - 8; // Size 区域左边界

  // 中间区域均分给 Stars / Forks / Issues
  const midSpace = rightStart - leftEnd;
  const midStep = midSpace / 3;
  const starsX = leftEnd + midStep * 0.5 - 10;
  const forksX = leftEnd + midStep * 1.5 - 10;
  const issuesX = leftEnd + midStep * 2.5 - 10;

  const starsPath = bakeTextElement({ text: stars.toLocaleString(), x: starsX + 20, y: 131, fontSize: 16, fill: "#55FFFF", filter: "url(#shadow-dark)" });
  const forksPath = bakeTextElement({ text: forks.toLocaleString(), x: forksX + 20, y: 131, fontSize: 16, fill: "#55FF55", filter: "url(#shadow-dark)" });
  const issuesPath = bakeTextElement({ text: issues.toLocaleString(), x: issuesX + 20, y: 131, fontSize: 16, fill: "#FF5555", filter: "url(#shadow-dark)" });

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
  <filter id="shadow-text" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="1" dy="1" stdDeviation="0" flood-color="#000000" flood-opacity="0.5" />
  </filter>
  <filter id="shadow-title" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="1" dy="1" stdDeviation="0" flood-color="#ffffff" flood-opacity="0.4" />
  </filter>
</defs>

${guiShell(480, 160)}

<!-- 顶部：仓库名称与徽章 -->
<g class="anim-fade" style="animation-delay: 0.1s">
  <image href="${bookDataUri}" x="16" y="16" width="20" height="20" filter="url(#shadow-dark)" />
  ${titleFg}
  ${badge(badgeLabel, 400, 14, 60, 22)}
  ${badgePath}
</g>

<!-- 中部：仓库描述 -->
<g class="anim-fade" style="animation-delay: 0.2s">
  ${desc1Fg}
  ${desc2Fg}
</g>

<!-- 底部：数据槽 -->
<g class="anim-fade" style="animation-delay: 0.3s">
  ${sunkenSlot(16, 108, 448, 36)}

  <!-- Language (左锚定) -->
  <circle cx="${slotLeft + 5}" cy="126" r="4" fill="${languageColor}" stroke="#000" stroke-width="1.5" />
  ${langPath}

  <!-- Stars (中间均分) -->
  <image href="${starDataUri}" x="${starsX}" y="${119}" width="16" height="16" filter="url(#shadow-dark)" />
  ${starsPath}

  <!-- Forks (中间均分) -->
  <image href="${tridentDataUri}" x="${forksX}" y="${119}" width="16" height="16" filter="url(#shadow-dark)" />
  ${forksPath}

  <!-- Issues (中间均分) -->
  <image href="${spiderEyeDataUri}" x="${issuesX}" y="${119}" width="16" height="16" filter="url(#shadow-dark)" />
  ${issuesPath}

  <!-- Size (右锚定) -->
  <image href="${mapDataUri}" x="${sizeIconX}" y="${119}" width="16" height="16" filter="url(#shadow-dark)" />
  ${sizePath}
</g>
</svg>`;
}
