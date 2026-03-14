import path from "node:path";
import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [
    vinext(),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
  resolve: {
    alias: {
      // next-intl 的 Webpack 插件 (createNextIntlPlugin) 在 Vite 下无法生效，
      // 需要手动设置这个别名，让 next-intl 运行时能找到 i18n 配置文件
      "next-intl/config": path.resolve(__dirname, "./i18n/request.ts"),
    },
  },
});
