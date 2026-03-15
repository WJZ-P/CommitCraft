# ⛏️ CommitCraft

**Forge your GitHub data into Minecraft-style pixel-art SVGs.**

把 GitHub 公开数据锻造成 Minecraft 风格的像素风 SVG 展示物。

<br>

<div align="center">

  <a href="https://github.com/WJZ-P/CommitCraft/graphs/contributors">
    <img src="https://img.shields.io/github/contributors/WJZ-P/CommitCraft.svg?style=flat-square" alt="Contributors" style="height: 30px">
  </a>
  &nbsp;
  <a href="https://github.com/WJZ-P/CommitCraft/network/members">
    <img src="https://img.shields.io/github/forks/WJZ-P/CommitCraft.svg?style=flat-square" alt="Forks" style="height: 30px">
  </a>
  &nbsp;
  <a href="https://github.com/WJZ-P/CommitCraft/stargazers">
    <img src="https://img.shields.io/github/stars/WJZ-P/CommitCraft.svg?style=flat-square" alt="Stargazers" style="height: 30px">
  </a>
  &nbsp;
  <a href="https://github.com/WJZ-P/CommitCraft/issues">
    <img src="https://img.shields.io/github/issues/WJZ-P/CommitCraft.svg?style=flat-square" alt="Issues" style="height: 30px">
  </a>

</div>

<br>

<p align="center">
  <a href="https://www.bilibili.com/video/BV1vx4y1t7rH">
    <img src="markdown/深蓝雨.jpg" alt="深蓝雨">
  </a>
</p>
<h2 align="center">"尽握在手沉重的花束名誉&nbsp;沾着泥土的指尖始终&nbsp;怯于靠近&nbsp;那脸庞遥不可及"</h2>

## ✨ 功能特性 / Features

| 模块 | 说明 |
|:---:|:---|
| 🗺️ **Contribution Map** | 将年度贡献热力图转换为 Minecraft 风格等距地形地图，高度和矿石随提交量变化 |
| 🏳️ **Banner Hall** | 根据 GitHub 统计数据生成战绩旗帜，支持拖动旋转视角 |
| 🪪 **Player Passport** | 生成玩家护照卡片，支持自定义个性签名 |
| 📦 **Repo Card** | 展示仓库名称、描述、语言与热度信息，支持中英文混合导出 |

所有输出均为 **SVG 格式** —— 清晰缩放、易于嵌入网页和 README。

## 📖 背景 / Background

本项目最初基于 **Next.js** 框架开发，原计划部署到 Vercel。后来考虑到 **Cloudflare Workers** 的免费额度更加慷慨（每日 10 万次请求免费），决定将项目迁移至 [vinext](https://github.com/nicomatsakis/vinext)（Vite + Next.js on Cloudflare）框架，以便无缝部署到 Cloudflare Workers 上，在保持 Next.js 开发体验的同时享受 CF 的免费托管政策。

## 🚀 快速体验 / Quick Start

访问[在线站点](https://commit-craft.wjz-p.workers.dev/)，在输入框中填入：

- **GitHub 用户名** （如 `wjz-p`）→ 生成 Contribution Map、Banner Hall、Player Passport
- **仓库短格式** （如 `vercel/next.js`）→ 生成 Repo Card
- **仓库完整链接** （如 `https://github.com/vercel/next.js`）→ 自动解析并生成 Repo Card

点击 **CRAFT** 即可生成，每个视图支持 **下载 .SVG** 并提供可复制的 API Endpoint 用于嵌入。

## 📡 API / 嵌入用法

生成的 SVG 可以通过以下 API 端点直接嵌入到 README 或网页中：

```
# 贡献地图
https://commit-craft.wjz-p.workers.dev/api/map/{username}.svg

# 玩家护照（支持自定义签名）
https://commit-craft.wjz-p.workers.dev/api/card/{username}.svg?quote=Your+Quote+Here

# 旗帜大厅（支持旋转角度）
https://commit-craft.wjz-p.workers.dev/api/banner/{username}/{statId}.svg?rotation=30

# 仓库卡片
https://commit-craft.wjz-p.workers.dev/api/repo/{owner}/{repo}.svg
```

在 Markdown 中嵌入：

```markdown
![Contribution Map](https://commit-craft.wjz-p.workers.dev/api/map/username.svg)
![Player Passport](https://commit-craft.wjz-p.workers.dev/api/card/username.svg?quote=Your+Quote+Here)
![Banner](https://commit-craft.wjz-p.workers.dev/api/banner/username/statId.svg?rotation=30)
![Repo Card](https://commit-craft.wjz-p.workers.dev/api/repo/owner/repo.svg)
```

## 🛠️ 技术栈 / Tech Stack

- **框架**: [Next.js](https://nextjs.org/) (App Router) + [React 19](https://react.dev/)
- **构建 & 部署**: [vinext](https://github.com/cloudflare/vinext) + [Cloudflare Workers](https://workers.cloudflare.com/)
- **样式**: [Tailwind CSS 4](https://tailwindcss.com/)
- **国际化**: [next-intl](https://next-intl.dev/) (中文 / English)
- **像素字体**: Minecraft Font + [Zpix](https://github.com/SolidZORO/zpix-pixel-font)（中文像素字体）
- **SVG 生成**: 服务端 SVG 模板 + [opentype.js](https://opentype.js.org/) 字体烘焙

## 📦 本地开发 / Local Development

```bash
# 克隆仓库
git clone https://github.com/WJZ-P/CommitCraft.git
cd CommitCraft

# 安装依赖
npm install

# 创建环境变量（需要 GitHub Token）
echo "GITHUB_TOKEN=your_github_token_here" > .env.local

# 启动开发服务器
npm run dev
```

> 💡 需要一个 [GitHub Personal Access Token](https://github.com/settings/tokens)（只需 `public_repo` 权限）来获取贡献数据。

## ☁️ 部署 / Deploy

项目基于 vinext 构建，原生支持 Cloudflare Workers 部署：

```bash
# 构建
npm run build

# 部署到 Cloudflare Workers
npm run deploy
```

部署前请在 Cloudflare Dashboard 中设置 `GITHUB_TOKEN` 密钥。

## 🌐 国际化 / i18n

支持中文和英文，通过页面右上角按钮切换。语言偏好保存在 Cookie 中。

## 📝 License

Crafted with ❤️ by [WJZ_P](https://github.com/WJZ-P) | Not an official Minecraft product.

## ⭐ Star 历史


**如果你喜欢这个项目，请给个 ⭐ 吧(๑>◡<๑)！**

[![Stargazers over time](https://starchart.cc/WJZ-P/CommitCraft.svg?variant=adaptive)](https://starchart.cc/WJZ-P/CommitCraft)

---