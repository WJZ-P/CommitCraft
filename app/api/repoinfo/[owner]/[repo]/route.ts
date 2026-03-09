import { fetchRepoInfo } from "@/app/lib/github";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  const { owner, repo } = await params;
  const url = new URL(request.url);
  const { searchParams } = url;
  const token = searchParams.get("token") || process.env["GITHUB_TOKEN"] || "";

  if (!token) {
    return Response.json(
      { error: "Missing GitHub token. Provide via ?token= query param or set GITHUB_TOKEN env variable." },
      { status: 401 },
    );
  }

  try {
    const repoInfo = await fetchRepoInfo(owner, repo, token);
    return Response.json(repoInfo, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("not found") ? 404 : 500;
    return Response.json({ error: message }, { status });
  }
}
