import { type NextRequest } from "next/server";
import { fetchContributions } from "@/app/lib/github";
import {
  VALID_STAT_IDS,
  STAT_TITLES,
  ICONS,
  getTier,
  getStatValue,
  generateBannerSvg,
  type StatId,
} from "@/app/lib/bannerSvg";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string; statId: string }> },
) {
  let { username, statId } = await params;

  if (statId.endsWith(".svg")) {
    statId = statId.slice(0, -4);
  }

  if (!VALID_STAT_IDS.includes(statId as StatId)) {
    return new Response(
      `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="50"><text x="10" y="30" fill="red" font-size="14">Invalid stat: ${statId}. Valid: ${VALID_STAT_IDS.join(", ")}</text></svg>`,
      { status: 400, headers: { "Content-Type": "image/svg+xml" } },
    );
  }

  const { searchParams } = request.nextUrl;
  const token = searchParams.get("token") || process.env.GITHUB_TOKEN || "";

  if (!token) {
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="50"><text x="10" y="30" fill="red" font-size="16">Error: Missing GitHub token</text></svg>',
      { status: 401, headers: { "Content-Type": "image/svg+xml" } },
    );
  }

  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  const rotation = parseInt(searchParams.get("rotation") || "0", 10);
  const clampedRotation = Math.max(-90, Math.min(90, isNaN(rotation) ? 0 : rotation));

  try {
    const { calendar, stats } = await fetchContributions(username, token, from, to);
    const sid = statId as StatId;
    const rawValue = getStatValue(sid, stats, calendar.totalContributions);
    const tier = getTier(sid, rawValue);
    const icon = ICONS[sid] || ICONS.commits;
    const title = STAT_TITLES[sid];

    const svg = generateBannerSvg({
      statId: sid,
      title,
      value: rawValue,
      tier,
      icon,
      rotation: clampedRotation,
    });

    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("not found") ? 404 : 500;
    const escapedMsg = message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return new Response(
      `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="50"><text x="10" y="30" fill="red" font-size="14">${escapedMsg}</text></svg>`,
      { status, headers: { "Content-Type": "image/svg+xml" } },
    );
  }
}
