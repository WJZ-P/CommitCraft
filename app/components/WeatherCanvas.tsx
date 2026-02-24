"use client";

import { useRef, useEffect, useCallback } from "react";

interface WeatherCanvasProps {
  weather: "clear" | "rain" | "snow";
  mouseX: number; // -1 ~ 1
  mouseY: number; // -1 ~ 1
}

interface Particle {
  x: number;
  y: number;
  z: number; // 0(远) ~ 1(近), 决定大小/速度/亮度
  speed: number;
  drift: number; // 基础水平漂移
  length: number; // 仅雨滴：线条长度
  size: number; // 仅雪花：方块尺寸
  opacity: number;
  wobblePhase: number; // 仅雪花：左右摇摆相位
  wobbleSpeed: number;
}

const RAIN_COUNT = 200;
const SNOW_COUNT = 200;

function createParticle(
  weather: "rain" | "snow",
  canvasW: number,
  canvasH: number,
  randomY = true
): Particle {
  const z = Math.random();
  const depth = 0.3 + z * 0.7; // 深度因子 0.3~1.0

  if (weather === "rain") {
    return {
      x: Math.random() * canvasW * 1.4 - canvasW * 0.2,
      y: randomY ? Math.random() * canvasH : -Math.random() * 100,
      z,
      speed: 12 + depth * 16, // 近处更快
      drift: -1.5 - depth * 2, // 雨滴斜向左下
      length: 8 + depth * 22, // 近处更长
      size: 0,
      opacity: 0.15 + depth * 0.55,
      wobblePhase: 0,
      wobbleSpeed: 0,
    };
  } else {
    return {
      x: Math.random() * canvasW * 1.4 - canvasW * 0.2,
      y: randomY ? Math.random() * canvasH : -Math.random() * 60,
      z,
      speed: 0.6 + depth * 1.8,
      drift: -0.2 + Math.random() * 0.4,
      length: 0,
      size: 1 + depth * 3, // 近处更大的像素方块
      opacity: 0.3 + depth * 0.6,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.5 + Math.random() * 1.5,
    };
  }
}

export default function WeatherCanvas({
  weather,
  mouseX,
  mouseY,
}: WeatherCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const prevWeatherRef = useRef(weather);
  const mouseRef = useRef({ x: mouseX, y: mouseY });

  // 保持鼠标值实时更新，不触发重渲染
  useEffect(() => {
    mouseRef.current = { x: mouseX, y: mouseY };
  }, [mouseX, mouseY]);

  const initParticles = useCallback(
    (w: number, h: number, type: "rain" | "snow") => {
      const count = type === "rain" ? RAIN_COUNT : SNOW_COUNT;
      particlesRef.current = Array.from({ length: count }, () =>
        createParticle(type, w, h, true)
      );
    },
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // 天气切换时重新初始化粒子
    if (weather !== "clear") {
      if (
        prevWeatherRef.current !== weather ||
        particlesRef.current.length === 0
      ) {
        initParticles(canvas.width, canvas.height, weather);
      }
    }
    prevWeatherRef.current = weather;

    if (weather === "clear") {
      // 清空画布
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      window.removeEventListener("resize", resize);
      return;
    }

    let lastTime = performance.now();

    const render = (now: number) => {
      const dt = Math.min((now - lastTime) / 16.667, 3); // delta time, 以60fps为基准, 最大3帧
      lastTime = now;

      const w = canvas.width;
      const h = canvas.height;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      ctx.clearRect(0, 0, w, h);

      const particles = particlesRef.current;

      // 按 z 排序（远的先画）
      particles.sort((a, b) => a.z - b.z);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const depth = 0.3 + p.z * 0.7;

        // 鼠标视差偏移：近处粒子受鼠标影响更大
        const parallaxX = mx * 40 * depth;
        const parallaxY = my * 15 * depth;

        if (weather === "rain") {
          // 更新位置
          p.x += (p.drift + mx * 3 * depth) * dt;
          p.y += p.speed * dt;

          // 超出边界回收
          if (p.y > h + 50) {
            Object.assign(p, createParticle("rain", w, h, false));
          }

          // 绘制雨滴 —— 带角度的线条
          const drawX = p.x + parallaxX;
          const drawY = p.y + parallaxY;

          // 雨滴颜色：近处略亮偏蓝，远处暗淡
          const brightness = Math.floor(140 + p.z * 80);
          ctx.strokeStyle = `rgba(${brightness}, ${brightness}, ${Math.min(255, brightness + 40)}, ${p.opacity})`;
          ctx.lineWidth = 1 + p.z * 1.5;
          ctx.beginPath();
          ctx.moveTo(drawX, drawY);
          // 雨滴方向：略微倾斜
          ctx.lineTo(
            drawX + p.drift * 2,
            drawY + p.length
          );
          ctx.stroke();

          // 近处雨滴加一个微小的光晕
          if (p.z > 0.7) {
            ctx.strokeStyle = `rgba(180, 200, 255, ${(p.z - 0.7) * 0.3})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(drawX, drawY);
            ctx.lineTo(drawX + p.drift * 2, drawY + p.length);
            ctx.stroke();
          }
        } else {
          // 雪花
          p.x += (p.drift + Math.sin(p.wobblePhase) * 0.8 + mx * 2 * depth) * dt;
          p.y += p.speed * dt;
          p.wobblePhase += p.wobbleSpeed * dt * 0.05;

          if (p.y > h + 30) {
            Object.assign(p, createParticle("snow", w, h, false));
          }

          const drawX = p.x + parallaxX;
          const drawY = p.y + parallaxY;

          // 像素风方块雪花
          const s = p.size;
          const brightness = Math.floor(200 + p.z * 55);
          ctx.fillStyle = `rgba(${brightness}, ${brightness}, ${brightness}, ${p.opacity})`;

          // 主方块
          ctx.fillRect(
            Math.round(drawX - s / 2),
            Math.round(drawY - s / 2),
            Math.round(s),
            Math.round(s)
          );

          // 大雪花加十字装饰
          if (p.z > 0.6 && s > 2.5) {
            const hs = Math.round(s * 0.4);
            ctx.fillRect(Math.round(drawX - hs / 2), Math.round(drawY - s), hs, Math.round(s * 2));
            ctx.fillRect(Math.round(drawX - s), Math.round(drawY - hs / 2), Math.round(s * 2), hs);
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [weather, initParticles]);

  if (weather === "clear") return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[10] pointer-events-none"
      style={{ imageRendering: "pixelated" }}
    />
  );
}
