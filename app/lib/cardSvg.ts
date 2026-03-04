/**
 * ProfileCard SVG 生成器 — 前端/后端共用的纯函数
 */

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

  let nameFontSize = 36;
  let nameY = 212;
  if (nameToShow.length > 8) {
    nameFontSize = 28;
    nameY = 208;
  }
  if (nameToShow.length > 12) {
    nameFontSize = 22;
    nameY = 205;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 300" width="500" height="300" style="image-rendering: pixelated">
<defs>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=VT323&amp;display=swap');
    .mc-font { font-family: 'VT323', monospace; }
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
  <image href="${avatarUrl}" x="28" y="44" width="120" height="120" preserveAspectRatio="xMidYMid slice" clip-path="url(#avatar-clip)" style="image-rendering: pixelated" />
</g>

<!-- 昵称 -->
<g class="anim-fade" style="animation-delay: 0.2s">
  <text x="88" y="${nameY}" class="mc-font" font-size="${nameFontSize}" fill="#3f3f3f" text-anchor="middle" font-weight="bold" filter="url(#shadow-light)">${safeName}</text>
</g>

<!-- JOINED -->
<g class="anim-fade" style="animation-delay: 0.3s">
  <image href="${ICONS.clock}" x="180" y="35" width="22" height="22" filter="url(#shadow-dark)" />
  <text x="215" y="53" class="mc-font" font-size="24" fill="#555555" font-weight="bold">JOINED: <tspan fill="#111111">${escapeXml(joinDate)}</tspan></text>
  <rect x="180" y="65" width="290" height="2" fill="#888888" opacity="0.5" />
  <rect x="180" y="67" width="290" height="2" fill="#ffffff" opacity="0.8" />
</g>

<!-- STARS -->
<g class="anim-fade" style="animation-delay: 0.4s">
  <image href="${ICONS.star}" x="180" y="85" width="22" height="22" filter="url(#shadow-dark)" />
  <text x="215" y="103" class="mc-font" font-size="24" fill="#555555" font-weight="bold">STARS: <tspan fill="#111111">${stars.toLocaleString()}</tspan></text>
  <rect x="180" y="115" width="290" height="2" fill="#888888" opacity="0.5" />
  <rect x="180" y="117" width="290" height="2" fill="#ffffff" opacity="0.8" />
</g>

<!-- COMMITS -->
<g class="anim-fade" style="animation-delay: 0.5s">
  <image href="${ICONS.pickaxe}" x="180" y="135" width="22" height="22" filter="url(#shadow-dark)" />
  <text x="215" y="153" class="mc-font" font-size="24" fill="#555555" font-weight="bold">COMMITS: <tspan fill="#111111">${commits.toLocaleString()}</tspan></text>
  <rect x="180" y="165" width="290" height="2" fill="#888888" opacity="0.5" />
  <rect x="180" y="167" width="290" height="2" fill="#ffffff" opacity="0.8" />
</g>

<!-- FOLLOWERS -->
<g class="anim-fade" style="animation-delay: 0.6s">
  <image href="${ICONS.emerald}" x="180" y="185" width="22" height="22" filter="url(#shadow-dark)" />
  <text x="215" y="203" class="mc-font" font-size="24" fill="#555555" font-weight="bold">FOLLOWERS: <tspan fill="#111111">${followers.toLocaleString()}</tspan></text>
</g>

<!-- 签名栏 -->
<g class="anim-fade" style="animation-delay: 0.7s">
  <rect x="24" y="234" width="452" height="36" fill="#e0e0e0" />
  <polygon points="24,234 476,234 474,236 26,236 26,268 24,270" fill="#a0a0a0" opacity="0.8" />
  <polygon points="476,270 476,234 474,236 474,268 26,268 24,270" fill="#ffffff" opacity="0.8" />
  <text x="250" y="258" class="mc-font" font-size="22" fill="#444444" text-anchor="middle" font-style="italic" letter-spacing="0.5">${safeQuote ? `&quot;${safeQuote}&quot;` : ""}</text>
</g>

<!-- 水印 -->
<text x="470" y="288" class="mc-font anim-fade" font-size="12" fill="#888888" text-anchor="end" font-weight="bold" style="animation-delay: 0.8s">Crafted by CommitCraft</text>
</svg>`;
}
