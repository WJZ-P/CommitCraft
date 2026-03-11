import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 手动加载 .env 文件到 process.env（兼容 vinext/Vite 环境）
 * 加载优先级：.env -> .env.local -> .env.development.local（后者覆盖前者）
 */
function loadEnvFiles() {
    const envFiles = [".env", ".env.local"];
    if (process.env.NODE_ENV !== "production") {
        envFiles.push(".env.development.local");
    }
    for (const file of envFiles) {
        const filePath = path.join(__dirname, file);
        if (!fs.existsSync(filePath)) continue;
        const content = fs.readFileSync(filePath, "utf-8");
        for (const line of content.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#")) continue;
            const eqIndex = trimmed.indexOf("=");
            if (eqIndex === -1) continue;
            const key = trimmed.slice(0, eqIndex).trim();
            const value = trimmed.slice(eqIndex + 1).trim();
            if (key && value) {
                process.env[key] = value;
            }
        }
    }
}

loadEnvFiles();

import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
    compiler: {
        removeConsole: process.env.NODE_ENV === "production" ? {exclude: ["error", "warn"]} : false,
    },
    env: {
        GITHUB_TOKEN: process.env.GITHUB_TOKEN || "",
        HTTPS_PROXY: process.env.HTTPS_PROXY || "",
    },
};

export default withNextIntl(nextConfig);
