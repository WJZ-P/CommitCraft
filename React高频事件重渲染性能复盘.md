# React 高频事件触发全量重渲染 — 性能事故复盘

> **项目**: CommitCraft (Next.js 15 + SVG 等距地图)
> **时间**: 2026-02-25
> **严重程度**: P1 — 页面交互严重卡顿，接近不可用

---

## 一、现象描述

在 IsometricMap（等距 SVG 地图）渲染完成后，鼠标在页面上任意位置移动时，浏览器出现**严重卡顿**，帧率从 60fps 骤降至个位数，DevTools Performance 面板显示主线程被密集的 Scripting + Rendering 任务完全阻塞。

关键表现：
- 鼠标移动时 SVG 区域持续触发重绘（可通过 DevTools → Rendering → Paint Flashing 观察到绿色闪烁）
- 鼠标静止时页面恢复流畅
- SVG 节点数量越多（贡献数据越多），卡顿越严重

---

## 二、根因分析

### 2.1 直接原因

`Home` 组件中使用 `useState` 存储鼠标坐标：

```tsx
// ❌ 致命写法
const [mouse, setMouse] = useState({ x: 0, y: 0 });

const handleMouseMove = useCallback((e: MouseEvent) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;
    setMouse({ x, y }); // 每次鼠标移动都触发 setState
}, []);
```

`mousemove` 是高频事件（60Hz 显示器 = 60次/秒，144Hz = 144次/秒），每次 `setMouse` 都会触发 `Home` 组件 re-render。

### 2.2 根本原因：React 的 "AOE 连坐" 渲染机制

**React 铁律：一个组件的 State 变化，会导致该组件及其所有子组件默认全部重新渲染。**

组件树结构：

```
<Home>                          ← mouse state 在这里
   ├── <WeatherCanvas />        ← 真正需要鼠标数据（天气视差）
   ├── <IsometricMap />         ← 完全不需要鼠标数据（无辜躺枪）
   ├── 导航栏、页脚等...
   └── ...
```

连锁反应：

```
鼠标移动 1px
  → setMouse({ x, y })           // 新对象引用，触发 re-render
  → Home 组件重新执行              // 每秒 60~144 次
  → 所有子组件跟着重新渲染
  → IsometricMap 被迫 re-render
  → React 对 dangerouslySetInnerHTML 的几千节点 SVG 字符串执行 DOM Diff
  → 浏览器主线程爆炸 💥
```

### 2.3 为什么 `useMemo` 救不了？

`svgContent` 确实被 `useMemo` 缓存了，**字符串本身不会重新计算**。但问题出在下游：

```tsx
<div dangerouslySetInnerHTML={{ __html: svgContent }} />
```

每次 `Home` re-render 时，React 仍然需要：
1. 重新创建虚拟 DOM 节点
2. 将 `dangerouslySetInnerHTML` 的值与当前真实 DOM 进行**比对（Diffing）**
3. 对一个包含几千个 `<g>`、`<polygon>` 节点的超大 SVG，这个 Diff 操作本身就极其昂贵

**即使最终结论是"不需要更新"，比对过程本身就已经把主线程拖垮了。**

### 2.4 额外加害者：CSS 变量设在 `:root`

```tsx
document.documentElement.style.setProperty("--mouse-x", x.toString());
```

CSS 自定义属性是**继承**的。设在 `<html>` 上意味着整棵 DOM 树（包括 SVG 内部节点）都会被标记为"样式可能已变"，触发浏览器的 Style Recalculation，进一步加重渲染负担。

---

## 三、影响范围

| 维度 | 影响 |
|------|------|
| 用户体验 | 鼠标移动时页面严重卡顿，hover 高亮、天气动画全部掉帧 |
| 性能指标 | FPS 从 60 降至 < 10，Long Task 持续阻塞主线程 |
| 功能影响 | SVG 交互（hover 高亮）基本不可用 |

---

## 四、解决方案

### 4.1 采用方案：`useRef` 逃生舱（Escape Hatch）

**核心思路**：鼠标坐标是"高频、仅供读取"的数据，不需要驱动 React 渲染，应绕过 React 的响应式系统。

```tsx
// ✅ 正确写法
const mouseRef = useRef({ x: 0, y: 0 });

const handleMouseMove = useCallback((e: MouseEvent) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;
    document.documentElement.style.setProperty("--mouse-x", x.toString());
    document.documentElement.style.setProperty("--mouse-y", y.toString());
    mouseRef.current = { x, y }; // 直接赋值，零 re-render
}, []);
```

WeatherCanvas 通过 `RefObject` 直接读取：

```tsx
// WeatherCanvas props
interface WeatherCanvasProps {
    weather: "clear" | "rain" | "snow";
    mouseRef: RefObject<{ x: number; y: number }>; // 传 ref 而非值
}

// 在 requestAnimationFrame 循环中直接读取
const mx = mouseRef.current.x;
const my = mouseRef.current.y;
```

**效果**：鼠标移动完全绕过 React 渲染管线，Home 组件 re-render 次数从 60次/秒 → 0次/秒。

### 4.2 备选方案对比

| 方案 | 原理 | 优点 | 缺点 |
|------|------|------|------|
| **useRef（已采用）** | 绕过 React 响应式系统 | 零 re-render，性能最优 | 需要消费方主动读取 ref |
| **状态下放** | 把 mouse state 移入 WeatherCanvas 内部 | 隔离渲染范围 | WeatherCanvas 仍会高频 re-render（但它是 Canvas 不怕） |
| **React.memo** | 给 IsometricMap 加记忆化包装 | 阻止子组件无意义 re-render | Home 本身仍在高频 re-render，治标不治本 |
| **useDeferredValue** | 降低更新优先级 | React 18 原生支持 | 延迟而非消除，不适合实时视差 |

---

## 五、经验总结

### 规则 1：高频事件数据禁用 `useState`

> **任何伴随 `mousemove`、`scroll`、`resize`、`pointermove` 的超高频数据流，绝对不能存进 `useState`，必须走 `useRef` 或直接操作 DOM/CSS 变量。**

判断标准：如果一个值每秒变化超过 10 次，且不需要驱动 UI 渲染，就应该用 `useRef`。

### 规则 2：警惕 State 的"爆炸半径"

State 放在哪个组件，决定了 re-render 的影响范围。放得越高，波及面越大。

```
State 在 <App>      → 全站重渲染 ☠️
State 在 <Page>     → 整页重渲染 😰
State 在 <Component> → 局部重渲染 ✅
```

**原则：State 应该放在"需要它的最小公共祖先"，而非习惯性地堆在顶层。**

### 规则 3：`dangerouslySetInnerHTML` + 大型 DOM = 定时炸弹

使用 `dangerouslySetInnerHTML` 注入大量 HTML/SVG 时，所在组件的任何 re-render 都会触发昂贵的字符串 Diff。务必确保该组件的 re-render 频率极低，或用 `React.memo` 保护。

### 规则 4：CSS 变量的继承陷阱 — 必须限定作用域

CSS 自定义属性（Custom Properties）是**继承**的。设在 `:root`（`document.documentElement`）上，意味着整棵 DOM 树的每一个节点都会被标记为"继承的样式可能已变"。

**灾难场景**：当页面中存在几千个 SVG 节点时，每次 `mousemove` 修改 `:root` 上的 CSS 变量，浏览器都要对这几千个节点执行 **Style Recalculation**（样式重算），即使这些节点根本不使用这个变量。

```tsx
// ❌ 设在 :root — 影响整棵 DOM 树
document.documentElement.style.setProperty("--mouse-x", x.toString());
document.documentElement.style.setProperty("--mouse-y", y.toString());

// ✅ 设在实际消费变量的元素上 — 只影响该子树
const bgRef = useRef<HTMLDivElement>(null);

if (bgRef.current) {
    bgRef.current.style.setProperty("--mouse-x", x.toString());
    bgRef.current.style.setProperty("--mouse-y", y.toString());
}
```

```tsx
// 背景层 div 绑定 ref
<div ref={bgRef} className="fixed inset-0 mc-bg-stone mc-texture" />
```

**实测效果**：将 CSS 变量从 `:root` 改为设在背景层 `div` 上后，在包含大量 SVG 节点的页面中帧率明显回升、稳定保持流畅。

**原理**：浏览器的 Style Recalculation 是按子树范围进行的。变量设在某个 `div` 上，只有该 `div` 及其子节点需要重算样式；而 SVG 所在的兄弟子树完全不受影响，Style Recalculation 的工作量从"几千个节点"降到"背景层的几十个节点"。

**原则：高频变化的 CSS 变量，务必设在实际使用它的最小 DOM 子树的根节点上，绝不要无脑挂 `:root`。**

---

## 六、检测与预防

### 开发阶段检测手段

1. **React DevTools → Profiler**：录制操作，查看哪些组件在不必要地 re-render
2. **React DevTools → Highlight updates**：开启后，re-render 的组件会闪烁高亮
3. **Chrome DevTools → Performance**：录制后查看 Scripting/Rendering 占比
4. **Chrome DevTools → Rendering → Paint Flashing**：绿色闪烁区域即为重绘区域

### Code Review Checklist

- [ ] `useState` 的 setter 是否被绑定在高频事件（mousemove/scroll/resize）中？
- [ ] State 是否放在了必要的最低层级组件中？
- [ ] 包含大量 DOM 节点的组件是否有 `React.memo` 保护？
- [ ] CSS 变量是否设在了最小必要范围的 DOM 节点上？

---

## 七、参考资料

- [React 官方文档 — useRef](https://react.dev/reference/react/useRef)
- [React 官方文档 — Escape Hatches](https://react.dev/learn/escape-hatches)
- [React 官方文档 — React.memo](https://react.dev/reference/react/memo)
- [Why Did You Render — 自动检测不必要的 re-render](https://github.com/welldone-software/why-did-you-render)
