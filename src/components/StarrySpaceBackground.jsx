// src/components/StarrySpaceBackground.jsx

import { useEffect, useRef } from "react";

export default function StarrySpaceBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const createStar = () => ({
      nx: Math.random(),
      ny: Math.random(),
      radius: Math.random() * 1.4 + 0.3,
      alpha: Math.random() * 0.8 + 0.2,
      twinkleSpeed: Math.random() * 0.02 + 0.005,
      twinkleOffset: Math.random() * Math.PI * 2,
      color: Math.random() > 0.35 ? "#dfc27d" : Math.random() > 0.5 ? "#ffffff" : "#c4b5fd",
      driftX: (Math.random() - 0.5) * 0.12,
      driftY: (Math.random() - 0.5) * 0.12,
    });

    const getTargetStarCount = (w, h) => Math.max(Math.floor((w * h) / 4500), 120);

    const stars = Array.from({ length: getTargetStarCount(width, height) }, createStar);

    /* Generate distant nebula particles with normalized coordinates */
    const nebulae = Array.from({ length: 4 }, () => ({
      nx: Math.random(),
      ny: Math.random(),
      radius: Math.random() * 300 + 150,
      color: Math.random() > 0.5 ? "rgba(223, 194, 125, 0.035)" : "rgba(139, 92, 246, 0.025)",
      driftX: (Math.random() - 0.5) * 0.05,
      driftY: (Math.random() - 0.5) * 0.05,
    }));

    const handleResize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      if (newWidth === width && newHeight === height) return;

      width = canvas.width = newWidth;
      height = canvas.height = newHeight;

      const targetCount = getTargetStarCount(width, height);
      while (stars.length < targetCount) {
        stars.push(createStar());
      }
      if (stars.length > targetCount) {
        stars.length = targetCount;
      }
    };

    window.addEventListener("resize", handleResize);
    let resizeObserver = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(canvas);
    }

    let time = 0;

    const render = () => {
      time += 0.03;
      ctx.clearRect(0, 0, width, height);

      /* Draw nebulae */
      for (const neb of nebulae) {
        neb.nx += neb.driftX / Math.max(width, 1);
        neb.ny += neb.driftY / Math.max(height, 1);
        if (neb.nx < -0.2) neb.nx = 1.2;
        if (neb.nx > 1.2) neb.nx = -0.2;
        if (neb.ny < -0.2) neb.ny = 1.2;
        if (neb.ny > 1.2) neb.ny = -0.2;

        const px = neb.nx * width;
        const py = neb.ny * height;

        const grad = ctx.createRadialGradient(px, py, 0, px, py, neb.radius);
        grad.addColorStop(0, neb.color);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, neb.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      /* Draw stars using normalized coordinates for responsive rendering */
      for (const star of stars) {
        star.nx += star.driftX / Math.max(width, 1);
        star.ny += star.driftY / Math.max(height, 1);
        if (star.nx < 0) star.nx = 1;
        if (star.nx > 1) star.nx = 0;
        if (star.ny < 0) star.ny = 1;
        if (star.ny > 1) star.ny = 0;

        const px = star.nx * width;
        const py = star.ny * height;

        const twinkle = Math.sin(time * star.twinkleSpeed * 10 + star.twinkleOffset);
        const currentAlpha = Math.max(0.1, Math.min(1, star.alpha + twinkle * 0.35));

        ctx.globalAlpha = currentAlpha;
        ctx.fillStyle = star.color;
        ctx.beginPath();
        ctx.arc(px, py, star.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
      aria-hidden="true"
    />
  );
}
