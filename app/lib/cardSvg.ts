/**
 * ProfileCard SVG 生成器 — 前端/后端共用的纯函数
 */

import { ensureFontsLoaded, bakeTextElement, bakeTextWithTspans } from "./fontBaker";

const ICONS = {
  clock: "https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.20.4/assets/minecraft/textures/item/clock_00.png",
  star: "https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.20.4/assets/minecraft/textures/item/nether_star.png",
  pickaxe: "https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.20.4/assets/minecraft/textures/item/diamond_pickaxe.png",
  emerald: "https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.20.4/assets/minecraft/textures/item/emerald.png",
};

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export { escapeXml };

export interface CardSvgParams {
  username: string;
  displayName: string;
  avatarUrl: string;
  joinDate: string;
  stars: number;
  commits: number;
  followers: number;
  quote: string;
}

export function generateCardSvg(params: CardSvgParams): string {
  const { username, displayName, avatarUrl, joinDate, stars, commits, followers, quote } = params;

  const nameToShow = displayName || username;
  const safeName = escapeXml(nameToShow);
  const safeQuote = escapeXml(quote);
  const safeAvatarUrl = escapeXml(avatarUrl);

  // 名字区域可用宽度约 128px（头像宽度），预留两侧各 8px padding = 112px
  const maxNameWidth = 112;
  let nameFontSize = 36;
  let nameY = 212;
  // 粗略估算：每字符宽度 ≈ fontSize * 0.6
  while (nameFontSize > 14 && nameToShow.length * nameFontSize * 0.6 > maxNameWidth) {
    nameFontSize -= 2;
    nameY = 205 + nameFontSize * 0.2;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 300" width="500" height="300" style="image-rendering: pixelated">
<defs>
  <style>
    @font-face {
      font-family: 'Minecraft';
      src: url('https://fonts.cdnfonts.com/s/25041/1_MinecraftRegular1.woff') format('woff');
      font-weight: 400;
      font-style: normal;
    }
    @font-face {
      font-family: 'Minecraft';
      src: url('https://fonts.cdnfonts.com/s/25041/3_MinecraftBold1.woff') format('woff');
      font-weight: 700;
      font-style: normal;
    }
    @font-face {
      font-family: 'Minecraft';
      src: url('https://fonts.cdnfonts.com/s/25041/2_MinecraftItalic1.woff') format('woff');
      font-weight: 400;
      font-style: italic;
    }
    @font-face {
      font-family: 'Minecraft';
      src: url('https://fonts.cdnfonts.com/s/25041/4_MinecraftBoldItalic1.woff') format('woff');
      font-weight: 700;
      font-style: italic;
    }
    .mc-font { font-family: 'Minecraft', VT323, monospace; }
    @keyframes safeFadeUp {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .anim-fade { animation: safeFadeUp 0.4s ease-out both; }
  </style>
  <filter id="shadow-dark" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="2" dy="2" stdDeviation="0" flood-color="#000000" flood-opacity="0.8" />
  </filter>
  <filter id="shadow-light" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="2" dy="2" stdDeviation="0" flood-color="#ffffff" flood-opacity="0.8" />
  </filter>
  <clipPath id="avatar-clip">
    <rect x="28" y="44" width="120" height="120" />
  </clipPath>
</defs>

<!-- 卡片外壳 -->
<rect x="0" y="0" width="500" height="300" fill="#000000" />
<rect x="4" y="4" width="492" height="292" fill="#c6c6c6" />
<polygon points="4,4 496,4 492,8 8,8 8,292 4,296" fill="#ffffff" />
<polygon points="496,296 496,4 492,8 492,292 8,292 4,296" fill="#555555" />

<!-- 头像区（凹陷 border） -->
<g class="anim-fade" style="animation-delay: 0.1s">
  <rect x="24" y="40" width="128" height="128" fill="#e0e0e0" />
  <polygon points="24,40 152,40 150,42 26,42 26,166 24,168" fill="#a0a0a0" opacity="0.8" />
  <polygon points="152,168 152,40 150,42 150,166 26,166 24,168" fill="#ffffff" opacity="0.8" />
  <image href="${safeAvatarUrl}" x="28" y="44" width="120" height="120" preserveAspectRatio="xMidYMid slice" clip-path="url(#avatar-clip)" style="image-rendering: pixelated" />
</g>

<!-- 昵称 -->
<g class="anim-fade" style="animation-delay: 0.2s">
  <text x="88" y="${nameY}" class="mc-font" font-size="${nameFontSize}" fill="#3f3f3f" text-anchor="middle" font-weight="bold" filter="url(#shadow-light)">${safeName}</text>
</g>

<!-- JOINED -->
<g class="anim-fade" style="animation-delay: 0.3s">
  <image href="${ICONS.clock}" x="178" y="29" width="28" height="28" filter="url(#shadow-dark)" />
  <text x="215" y="53" class="mc-font" font-size="20" fill="#555555" font-weight="bold">JOINED: <tspan fill="#111111">${escapeXml(joinDate)}</tspan></text>
  <rect x="180" y="65" width="290" height="2" fill="#888888" opacity="0.5" />
  <rect x="180" y="67" width="290" height="2" fill="#ffffff" opacity="0.8" />
</g>

<!-- STARS -->
<g class="anim-fade" style="animation-delay: 0.4s">
  <image href="${ICONS.star}" x="178" y="79" width="28" height="28" filter="url(#shadow-dark)" />
  <text x="215" y="103" class="mc-font" font-size="20" fill="#555555" font-weight="bold">STARS: <tspan fill="#111111">${stars.toLocaleString()}</tspan></text>
  <rect x="180" y="115" width="290" height="2" fill="#888888" opacity="0.5" />
  <rect x="180" y="117" width="290" height="2" fill="#ffffff" opacity="0.8" />
</g>

<!-- COMMITS -->
<g class="anim-fade" style="animation-delay: 0.5s">
  <image href="${ICONS.pickaxe}" x="178" y="129" width="28" height="28" filter="url(#shadow-dark)" />
  <text x="215" y="153" class="mc-font" font-size="20" fill="#555555" font-weight="bold">COMMITS: <tspan fill="#111111">${commits.toLocaleString()}</tspan></text>
  <rect x="180" y="165" width="290" height="2" fill="#888888" opacity="0.5" />
  <rect x="180" y="167" width="290" height="2" fill="#ffffff" opacity="0.8" />
</g>

<!-- FOLLOWERS -->
<g class="anim-fade" style="animation-delay: 0.6s">
  <image href="${ICONS.emerald}" x="178" y="179" width="28" height="28" filter="url(#shadow-dark)" />
  <text x="215" y="203" class="mc-font" font-size="20" fill="#555555" font-weight="bold">FOLLOWERS: <tspan fill="#111111">${followers.toLocaleString()}</tspan></text>
</g>

<!-- 签名栏 -->
<g class="anim-fade" style="animation-delay: 0.7s">
  <rect x="24" y="234" width="452" height="36" fill="#e0e0e0" />
  <polygon points="24,234 476,234 474,236 26,236 26,268 24,270" fill="#a0a0a0" opacity="0.8" />
  <polygon points="476,270 476,234 474,236 474,268 26,268 24,270" fill="#ffffff" opacity="0.8" />
  <text x="250" y="258" class="mc-font" font-size="22" fill="#444444" text-anchor="middle" font-style="italic" letter-spacing="0.5">${safeQuote || ""}</text>
</g>

<!-- 水印 -->
<text x="470" y="288" class="mc-font anim-fade" font-size="12" fill="#888888" text-anchor="end" font-weight="bold" style="animation-delay: 0.8s">Crafted by CommitCraft</text>
</svg>`;
}

/**
 * 服务端烘焙版：所有 <text> 转为 <path>，不依赖远程字体。
 * 用于 API 路由返回的 SVG（嵌入 GitHub README 等场景）。
 */
export async function generateBakedCardSvg(params: CardSvgParams): Promise<string> {
  await ensureFontsLoaded();

  const { username, displayName, avatarUrl, joinDate, stars, commits, followers, quote } = params;

  const nameToShow = displayName || username;
  const safeName = escapeXml(nameToShow);
  const safeQuote = escapeXml(quote);
  const safeAvatarUrl = escapeXml(avatarUrl);

  // 名字区域可用宽度约 128px（头像宽度），预留两侧各 8px padding = 112px
  const maxNameWidth = 112;
  let nameFontSize = 36;
  let nameY = 212;
  while (nameFontSize > 14 && nameToShow.length * nameFontSize * 0.6 > maxNameWidth) {
    nameFontSize -= 2;
    nameY = 205 + nameFontSize * 0.2;
  }

  // 烘焙所有文本元素
  const namePath = bakeTextElement({
    text: safeName, x: 88, y: nameY, fontSize: nameFontSize,
    fill: "#3f3f3f", textAnchor: "middle", fontWeight: "bold", filter: 'url(#shadow-light)',
  });

  const joinedPath = bakeTextWithTspans({
    segments: [
      { text: "JOINED: ", fill: "#555555" },
      { text: escapeXml(joinDate), fill: "#111111" },
    ],
    x: 215, y: 53, fontSize: 20, fill: "#555555", fontWeight: "bold",
  });

  const starsPath = bakeTextWithTspans({
    segments: [
      { text: "STARS: ", fill: "#555555" },
      { text: stars.toLocaleString(), fill: "#111111" },
    ],
    x: 215, y: 103, fontSize: 20, fill: "#555555", fontWeight: "bold",
  });

  const commitsPath = bakeTextWithTspans({
    segments: [
      { text: "COMMITS: ", fill: "#555555" },
      { text: commits.toLocaleString(), fill: "#111111" },
    ],
    x: 215, y: 153, fontSize: 20, fill: "#555555", fontWeight: "bold",
  });

  const followersPath = bakeTextWithTspans({
    segments: [
      { text: "FOLLOWERS: ", fill: "#555555" },
      { text: followers.toLocaleString(), fill: "#111111" },
    ],
    x: 215, y: 203, fontSize: 20, fill: "#555555", fontWeight: "bold",
  });

  const quotePath = safeQuote
    ? bakeTextElement({
        text: safeQuote, x: 250, y: 258, fontSize: 22,
        fill: "#444444", textAnchor: "middle", fontStyle: "italic",
      })
    : "";

  const watermarkPath = bakeTextElement({
    text: "Crafted by CommitCraft", x: 470, y: 288, fontSize: 12,
    fill: "#888888", textAnchor: "end", fontWeight: "bold",
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 300" width="500" height="300" style="image-rendering: pixelated">
<defs>
  <style>
    @keyframes safeFadeUp {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .anim-fade { animation: safeFadeUp 0.4s ease-out both; }
  </style>
  <filter id="shadow-dark" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="2" dy="2" stdDeviation="0" flood-color="#000000" flood-opacity="0.8" />
  </filter>
  <filter id="shadow-light" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="2" dy="2" stdDeviation="0" flood-color="#ffffff" flood-opacity="0.8" />
  </filter>
  <clipPath id="avatar-clip">
    <rect x="28" y="44" width="120" height="120" />
  </clipPath>
</defs>

<!-- 卡片外壳 -->
<rect x="0" y="0" width="500" height="300" fill="#000000" />
<rect x="4" y="4" width="492" height="292" fill="#c6c6c6" />
<polygon points="4,4 496,4 492,8 8,8 8,292 4,296" fill="#ffffff" />
<polygon points="496,296 496,4 492,8 492,292 8,292 4,296" fill="#555555" />

<!-- 头像区（凹陷 border） -->
<g class="anim-fade" style="animation-delay: 0.1s">
  <rect x="24" y="40" width="128" height="128" fill="#e0e0e0" />
  <polygon points="24,40 152,40 150,42 26,42 26,166 24,168" fill="#a0a0a0" opacity="0.8" />
  <polygon points="152,168 152,40 150,42 150,166 26,166 24,168" fill="#ffffff" opacity="0.8" />
  <image href="${safeAvatarUrl}" x="28" y="44" width="120" height="120" preserveAspectRatio="xMidYMid slice" clip-path="url(#avatar-clip)" style="image-rendering: pixelated" />
</g>

<!-- 昵称 -->
<g class="anim-fade" style="animation-delay: 0.2s">
  ${namePath}
</g>

<!-- JOINED -->
<g class="anim-fade" style="animation-delay: 0.3s">
  <image href="${ICONS.clock}" x="178" y="29" width="28" height="28" filter="url(#shadow-dark)" />
  ${joinedPath}
  <rect x="180" y="65" width="290" height="2" fill="#888888" opacity="0.5" />
  <rect x="180" y="67" width="290" height="2" fill="#ffffff" opacity="0.8" />
</g>

<!-- STARS -->
<g class="anim-fade" style="animation-delay: 0.4s">
  <image href="${ICONS.star}" x="178" y="79" width="28" height="28" filter="url(#shadow-dark)" />
  ${starsPath}
  <rect x="180" y="115" width="290" height="2" fill="#888888" opacity="0.5" />
  <rect x="180" y="117" width="290" height="2" fill="#ffffff" opacity="0.8" />
</g>

<!-- COMMITS -->
<g class="anim-fade" style="animation-delay: 0.5s">
  <image href="${ICONS.pickaxe}" x="178" y="129" width="28" height="28" filter="url(#shadow-dark)" />
  ${commitsPath}
  <rect x="180" y="165" width="290" height="2" fill="#888888" opacity="0.5" />
  <rect x="180" y="167" width="290" height="2" fill="#ffffff" opacity="0.8" />
</g>

<!-- FOLLOWERS -->
<g class="anim-fade" style="animation-delay: 0.6s">
  <image href="${ICONS.emerald}" x="178" y="179" width="28" height="28" filter="url(#shadow-dark)" />
  ${followersPath}
</g>

<!-- 签名栏 -->
<g class="anim-fade" style="animation-delay: 0.7s">
  <rect x="24" y="234" width="452" height="36" fill="#e0e0e0" />
  <polygon points="24,234 476,234 474,236 26,236 26,268 24,270" fill="#a0a0a0" opacity="0.8" />
  <polygon points="476,270 476,234 474,236 474,268 26,268 24,270" fill="#ffffff" opacity="0.8" />
  ${quotePath}
</g>

<!-- 水印 -->
<g class="anim-fade" style="animation-delay: 0.8s">
  ${watermarkPath}
</g>
</svg>`;
}
