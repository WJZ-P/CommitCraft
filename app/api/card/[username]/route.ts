import { fetchContributions } from "@/app/lib/github";
import { generateBakedCardSvg, escapeXml } from "@/app/lib/cardSvg";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  let { username } = await params;

  if (username.endsWith(".svg")) {
    username = username.slice(0, -4);
  }

  const url = new URL(request.url);
  const { searchParams } = url;
  const token = searchParams.get("token") || process.env.GITHUB_TOKEN || "";

  if (!token) {
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="50"><text x="10" y="30" fill="red" font-size="16">Error: Missing GitHub token</text></svg>',
      { status: 401, headers: { "Content-Type": "image/svg+xml" } },
    );
  }

  const quote = searchParams.get("quote") || "Exploring the infinite code blocks.";

  try {
    const { calendar, avatarUrl, stats } = await fetchContributions(username, token);
    const joinDate = stats.createdAt ? stats.createdAt.slice(0, 10) : "Unknown";

    const svg = await generateBakedCardSvg({
      username,
      displayName: stats.name || username,
      avatarUrl,
      joinDate,
      stars: stats.totalStars,
      commits: calendar.totalContributions,
      followers: stats.followers,
      quote,
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
    const escapedMsg = escapeXml(message);
    return new Response(
      `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="50"><text x="10" y="30" fill="red" font-size="14">${escapedMsg}</text></svg>`,
      { status, headers: { "Content-Type": "image/svg+xml" } },
    );
  }
}
