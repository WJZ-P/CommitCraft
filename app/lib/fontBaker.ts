/**
 * 服务端字体烘焙工具 — 使用 opentype.js 将 SVG 中的 <text> 转为 <path>
 * 这样生成的 SVG 不依赖任何远程字体，可直接嵌入 GitHub README 等场景。
 */

import opentype from "opentype.js";

// ===== 字体 URL =====
const FONT_URLS = {
  regular: "https://fonts.cdnfonts.com/s/25041/1_MinecraftRegular1.woff",
  bold: "https://fonts.cdnfonts.com/s/25041/3_MinecraftBold1.woff",
  italic: "https://fonts.cdnfonts.com/s/25041/2_MinecraftItalic1.woff",
  boldItalic: "https://fonts.cdnfonts.com/s/25041/4_MinecraftBoldItalic1.woff",
};

type FontVariant = keyof typeof FONT_URLS;

// 字体缓存（进程级单例）
const fontCache: Map<FontVariant, opentype.Font> = new Map();

/** 加载并缓存指定变体的字体 */
async function loadFont(variant: FontVariant): Promise<opentype.Font> {
  const cached = fontCache.get(variant);
  if (cached) return cached;

  const res = await fetch(FONT_URLS[variant]);
  if (!res.ok) throw new Error(`Failed to fetch font ${variant}: ${res.status}`);
  const buf = await res.arrayBuffer();
  const font = opentype.parse(buf);
  fontCache.set(variant, font);
  return font;
}

/** 预加载常用字体（bold + regular） */
export async function ensureFontsLoaded(): Promise<void> {
  await Promise.all([loadFont("bold"), loadFont("regular")]);
}

/** 获取已加载的字体 */
export function getFont(variant: FontVariant): opentype.Font | undefined {
  return fontCache.get(variant);
}

// ===== 文本 → Path 转换 =====

export interface TextToPathOptions {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fill?: string;
  opacity?: string;
  textAnchor?: "start" | "middle" | "end";
  fontWeight?: string;
  fontStyle?: string;
  filter?: string;
  /** 额外属性 */
  extraAttrs?: Record<string, string>;
}

/** 根据 fontWeight + fontStyle 选择字体变体 */
function selectVariant(fontWeight?: string, fontStyle?: string): FontVariant {
  const isBold = fontWeight === "bold" || fontWeight === "700";
  const isItalic = fontStyle === "italic";
  if (isBold && isItalic) return "boldItalic";
  if (isBold) return "bold";
  if (isItalic) return "italic";
  return "regular";
}

/** 将单段文本转为 SVG path 数据 (d 属性) */
export function textToPathData(
  font: opentype.Font,
  text: string,
  x: number,
  y: number,
  fontSize: number,
): string {
  const path = font.getPath(text, x, y, fontSize);
  return path.toPathData(5);
}

/** 将一个完整的 text 元素转为 <path> 或 <g> SVG 片段 */
export function bakeTextElement(opts: TextToPathOptions): string {
  const variant = selectVariant(opts.fontWeight, opts.fontStyle);
  const font = fontCache.get(variant) || fontCache.get("bold");
  if (!font) throw new Error(`Font variant "${variant}" not loaded. Call ensureFontsLoaded() first.`);

  const { text, x, y, fontSize, fill = "#000", opacity, textAnchor = "start", filter, extraAttrs } = opts;

  const totalWidth = font.getAdvanceWidth(text, fontSize);
  let drawX = x;
  if (textAnchor === "middle") drawX -= totalWidth / 2;
  else if (textAnchor === "end") drawX -= totalWidth;

  const d = textToPathData(font, text, drawX, y, fontSize);

  const attrs: string[] = [`d="${d}"`, `fill="${fill}"`];
  if (opacity && opacity !== "1") attrs.push(`opacity="${opacity}"`);

  let pathStr = `<path ${attrs.join(" ")} />`;

  // 如果有 filter，用 <g> 包裹
  if (filter) {
    pathStr = `<g filter="${filter}">${pathStr}</g>`;
  }

  // 额外属性
  if (extraAttrs) {
    // 目前不需要，预留扩展
  }

  return pathStr;
}

/** 处理包含 <tspan> 的文本（如 "JOINED: <tspan>2020-01-01</tspan>"） */
export interface TspanSegment {
  text: string;
  fill?: string;
}

export function bakeTextWithTspans(opts: Omit<TextToPathOptions, "text"> & { segments: TspanSegment[] }): string {
  const variant = selectVariant(opts.fontWeight, opts.fontStyle);
  const font = fontCache.get(variant) || fontCache.get("bold");
  if (!font) throw new Error(`Font variant "${variant}" not loaded. Call ensureFontsLoaded() first.`);

  const { segments, x, y, fontSize, fill: baseFill = "#000", opacity, textAnchor = "start", filter } = opts;

  // 计算总文本宽度
  const fullText = segments.map((s) => s.text).join("");
  const totalWidth = font.getAdvanceWidth(fullText, fontSize);
  let currentX = x;
  if (textAnchor === "middle") currentX -= totalWidth / 2;
  else if (textAnchor === "end") currentX -= totalWidth;

  const paths: string[] = [];
  for (const seg of segments) {
    if (!seg.text) continue;
    const d = textToPathData(font, seg.text, currentX, y, fontSize);
    const segFill = seg.fill || baseFill;
    const attrs: string[] = [`d="${d}"`, `fill="${segFill}"`];
    if (opacity && opacity !== "1") attrs.push(`opacity="${opacity}"`);
    paths.push(`<path ${attrs.join(" ")} />`);
    currentX += font.getAdvanceWidth(seg.text, fontSize);
  }

  const inner = paths.join("");
  if (filter) return `<g filter="${filter}">${inner}</g>`;
  return inner.length > 0 ? (paths.length === 1 ? inner : `<g>${inner}</g>`) : "";
}

// ===== 计算文本宽度（用于布局） =====
export function getTextWidth(text: string, fontSize: number, fontWeight?: string, fontStyle?: string): number {
  const variant = selectVariant(fontWeight, fontStyle);
  const font = fontCache.get(variant) || fontCache.get("bold");
  if (!font) return text.length * fontSize * 0.6; // fallback 估算

  let width = 0;
  for (const ch of text) {
    if (isAscii(ch)) {
      width += font.getAdvanceWidth(ch, fontSize);
    } else {
      width += fontSize; // 中文是方块字，宽度直接等于字号
    }
  }
  return width;
}

// ===== 混合烘焙：ASCII 用 path，非 ASCII 用 <text> =====

/** 判断字符是否为 ASCII 可打印字符（MC 字体支持范围） */
function isAscii(ch: string): boolean {
  return ch.charCodeAt(0) <= 0x7f;
}

interface MixedSegment {
  text: string;
  ascii: boolean;
}

/** 将文本按 ASCII / 非 ASCII 分段 */
function splitMixed(text: string): MixedSegment[] {
  const segs: MixedSegment[] = [];
  for (const ch of text) {
    const a = isAscii(ch);
    if (segs.length > 0 && segs[segs.length - 1].ascii === a) {
      segs[segs.length - 1].text += ch;
    } else {
      segs.push({ text: ch, ascii: a });
    }
  }
  return segs;
}

/**
 * 混合烘焙文本：ASCII 部分转 <path>（使用 MC 字体），非 ASCII 部分保留 <text>（使用系统字体）。
 * 这样中文等非 ASCII 字符可以正确显示并支持 font-weight。
 */
export function bakeMixedTextElement(opts: TextToPathOptions): string {
  const variant = selectVariant(opts.fontWeight, opts.fontStyle);
  const font = fontCache.get(variant) || fontCache.get("bold");
  if (!font) throw new Error(`Font variant "${variant}" not loaded. Call ensureFontsLoaded() first.`);

  const { text, x, y, fontSize, fill = "#000", filter, fontWeight, textAnchor = "start" } = opts;

  // 支持 textAnchor 偏移计算
  const totalWidth = getTextWidth(text, fontSize, fontWeight, opts.fontStyle);
  let curX = x;
  if (textAnchor === "middle") curX -= totalWidth / 2;
  else if (textAnchor === "end") curX -= totalWidth;

  const segs = splitMixed(text);
  const parts: string[] = [];

  for (const seg of segs) {
    if (seg.ascii) {
      // ASCII: 用 path 烘焙
      const d = textToPathData(font, seg.text, curX, y, fontSize);
      parts.push(`<path d="${d}" fill="${fill}" />`);
      curX += font.getAdvanceWidth(seg.text, fontSize);
    } else {
      // 非 ASCII: 强制内联本地原生中文字体栈，防止脱离浏览器后 CSS 丢失导致隐形
      const boldAttr = fontWeight === "bold" || fontWeight === "700" ? ` font-weight="bold"` : "";
      const cjkFonts = `'Microsoft YaHei', 'PingFang SC', 'Noto Sans SC', sans-serif`;
      parts.push(`<text x="${curX}" y="${y}" font-family="${cjkFonts}" font-size="${fontSize}" fill="${fill}"${boldAttr}>${seg.text}</text>`);
      curX += [...seg.text].length * fontSize;
    }
  }

  const inner = parts.join("");
  if (filter) return `<g filter="${filter}">${inner}</g>`;
  return parts.length === 1 ? inner : `<g>${inner}</g>`;
}
