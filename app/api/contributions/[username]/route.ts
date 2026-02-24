import {type NextRequest} from "next/server";
import {fetchContributions} from "@/app/lib/github";

export async function GET(
    request: NextRequest,
    {params}: { params: Promise<{ username: string }> }
) {
    console.log("[API] ====== 收到请求 ======");
    console.log("[API] URL:", request.nextUrl.toString());

    const {username} = await params;
    console.log("[API] 解析到 username:", username);

    const {searchParams} = request.nextUrl;

    // Token 优先从 query 参数取，其次从环境变量取
    const token = searchParams.get("token") || process.env.GITHUB_TOKEN || "";
    console.log("[API] Token 来源:", searchParams.get("token") ? "query param" : process.env.GITHUB_TOKEN ? "env GITHUB_TOKEN" : "无");
    console.log("[API] Token 长度:", token.length, "| 前8位:", token.slice(0, 8) + "...");

    if (!token) {
        console.log("[API] ❌ Token 缺失，返回 401");
        return Response.json(
            {error: "Missing GitHub token. Provide via ?token= query param or set GITHUB_TOKEN env variable."},
            {status: 401}
        );
    }

    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;
    console.log("[API] 日期范围: from =", from ?? "(默认)", "| to =", to ?? "(默认)");

    try {
        console.log("[API] 开始调用 fetchContributions...");
        const calendar = await fetchContributions(username, token, from, to);
        console.log("[API] ✅ 成功! totalContributions =", calendar.totalContributions, "| weeks =", calendar.weeks.length);

        return Response.json(calendar, {
            headers: {
                "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800",
            },
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        const stack = err instanceof Error ? err.stack : "";
        const status = message.includes("not found") ? 404 : 500;
        console.log("[API] ❌ 异常! status =", status);
        console.log("[API] ❌ message:", message);
        console.log("[API] ❌ stack:", stack);
        return Response.json({error: message}, {status});
    }
}
