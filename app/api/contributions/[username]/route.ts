import {type NextRequest} from "next/server";
import {fetchContributions} from "@/app/lib/github";

export async function GET(
    request: NextRequest,
    {params}: { params: Promise<{ username: string }> }
) {
    const {username} = await params;
    const {searchParams} = request.nextUrl;

    // Token 优先从 query 参数取，其次从环境变量取
    const token = searchParams.get("token") || process.env.GITHUB_TOKEN || "";

    if (!token) {
        return Response.json(
            {error: "Missing GitHub token. Provide via ?token= query param or set GITHUB_TOKEN env variable."},
            {status: 401}
        );
    }

    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;

    try {
        const calendar = await fetchContributions(username, token, from, to);

        return Response.json(calendar, {
            headers: {  //  页面过期时间一小时，随后半小时的第一次访问还是旧数据，同时从后台拉新的。
                "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800",
            },
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        const status = message.includes("not found") ? 404 : 500;
        return Response.json({error: message}, {status});
    }
}
