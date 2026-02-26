/**
 * GitHub GraphQL API - 获取用户 Commit 贡献数据
 */

import { ProxyAgent, setGlobalDispatcher } from "undici";

// ===== 全局代理注入 =====
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;

if (proxyUrl) {
  console.log(`[System] 🛡️ 侦测到代理配置，强制拦截全局 fetch，指向: ${proxyUrl}`);
  const dispatcher = new ProxyAgent(proxyUrl);
  setGlobalDispatcher(dispatcher);
} else {
  console.log("[System] ⚠️ 未配置代理，fetch 将尝试直连...");
}

// ===== 类型定义 =====

export interface ContributionDay {
  /** 日期，格式 YYYY-MM-DD */
  date: string;
  /** 当日 commit 数量 */
  contributionCount: number;
  /** GitHub 原始颜色等级 (#ebedf0, #9be9a8, #40c463, #30a14e, #216e39) */
  color: string;
}

export interface ContributionWeek {
  contributionDays: ContributionDay[];
}

export interface ContributionCalendar {
  totalContributions: number;
  weeks: ContributionWeek[];
}

export interface GitHubContributionResponse {
  user: {
    avatarUrl: string;
    contributionsCollection: {
      contributionCalendar: ContributionCalendar;
    };
  } | null;
}

// ===== GraphQL 查询 =====

const CONTRIBUTIONS_QUERY = `
  query($username: String!, $from: DateTime, $to: DateTime) {
    user(login: $username) {
      avatarUrl
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
              color
            }
          }
        }
      }
    }
  }
`;

// ===== API 调用 =====

/**
 * 通过 GitHub GraphQL API 获取用户贡献日历数据
 *
 * @param username - GitHub 用户名
 * @param token - GitHub Personal Access Token（需要 read:user 权限）
 * @param from - 起始日期（可选，默认为过去一年）
 * @param to - 结束日期（可选，默认为今天）
 */
export interface FetchContributionsResult {
  calendar: ContributionCalendar;
  avatarUrl: string;
}

export async function fetchContributions(
  username: string,
  token: string,
  from?: string,
  to?: string
): Promise<FetchContributionsResult> {
  const variables: Record<string, string> = { username };
  if (from) variables.from = new Date(from).toISOString();
  if (to) variables.to = new Date(to).toISOString();

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { 
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: CONTRIBUTIONS_QUERY,
      variables,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.log("[GitHub] ❌ 非 200 响应体:", text);
    throw new Error(`GitHub API error (${response.status}): ${text}`);
  }

  const json = await response.json();
  if (json.errors) {
    console.log("[GitHub] ❌ GraphQL errors:", JSON.stringify(json.errors));
    throw new Error(
      `GitHub GraphQL errors: ${json.errors.map((e: { message: string }) => e.message).join(", ")}`
    );
  }

  const data = json.data as GitHubContributionResponse;

  if (!data.user) {
    throw new Error(`GitHub user "${username}" not found`);
  }

  return {
    calendar: data.user.contributionsCollection.contributionCalendar,
    avatarUrl: data.user.avatarUrl,
  };
}
