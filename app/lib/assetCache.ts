/**
 * 资源缓存模块 — 将外部 CDN 图片下载并转为 data:image/png;base64 的 data URI
 * 使生成的 SVG 完全自包含，不依赖任何外部请求。
 * 这样 SVG 被 GitHub Camo 代理转发后，嵌入的图片资源也能正常显示。
 */

// ===== 内存缓存：URL → data URI =====
const cache = new Map<string, string>();

/**
 * 将远程图片 URL 转为 data URI（base64 内嵌）
 * 带内存缓存，同一 URL 只下载一次
 */
export async function toDataUri(url: string): Promise<string> {
  const cached = cache.get(url);
  if (cached) return cached;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[assetCache] Failed to fetch ${url}: ${res.status}`);
      return url; // fallback: 返回原始 URL
    }

    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);

    // 检测 MIME 类型
    let mime = "image/png";
    if (url.endsWith(".jpg") || url.endsWith(".jpeg")) mime = "image/jpeg";
    else if (url.endsWith(".svg")) mime = "image/svg+xml";
    else if (url.endsWith(".gif")) mime = "image/gif";
    else if (url.endsWith(".webp")) mime = "image/webp";

    // 转 base64
    const b64 = uint8ToBase64(bytes);
    const dataUri = `data:${mime};base64,${b64}`;

    cache.set(url, dataUri);
    return dataUri;
  } catch (err) {
    console.warn(`[assetCache] Error fetching ${url}:`, err);
    return url; // fallback
  }
}

/**
 * 批量将多个 URL 转为 data URI（并发下载）
 */
export async function toDataUris(urls: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(urls)];
  await Promise.all(unique.map((u) => toDataUri(u)));
  const result = new Map<string, string>();
  for (const u of unique) {
    result.set(u, cache.get(u) || u);
  }
  return result;
}

/**
 * 预加载一组资源（通常在首次请求时调用，后续走缓存）
 */
export async function preloadAssets(urls: string[]): Promise<void> {
  await toDataUris(urls);
}

/**
 * 将 GitHub 头像 URL 下载并转为 data URI
 * 头像 URL 形如 https://avatars.githubusercontent.com/u/xxx?v=4
 * 添加 size=120 参数以减小下载体积
 */
export async function avatarToDataUri(avatarUrl: string): Promise<string> {
  // 追加 size 参数以控制下载尺寸
  const url = new URL(avatarUrl);
  if (!url.searchParams.has("s") && !url.searchParams.has("size")) {
    url.searchParams.set("s", "120");
  }
  return toDataUri(url.toString());
}

// ===== Uint8Array → base64 （兼容 Node / Workers） =====
function uint8ToBase64(bytes: Uint8Array): string {
  // 优先使用 Buffer（Node 环境）
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  // Workers / 浏览器 fallback
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
