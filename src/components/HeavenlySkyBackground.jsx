// src/components/HeavenlySkyBackground.jsx
// Heavenly Celestial Environment with Animated Drifting Clouds, Golden God Rays & Floating Stardust

import React, { useMemo } from "react";

export default function HeavenlySkyBackground({
  intensity = "full", // "full" | "subtle"
  className = "",
  style = {},
  children,
}) {
  // Pre-generate golden sparkle positions deterministically
  const sparkles = useMemo(() => {
    return Array.from({ length: 18 }, (_, i) => ({
      id: i,
      left: `${(i * 5.7) % 100}%`,
      top: `${(i * 7.3) % 95}%`,
      size: 3 + (i % 4) * 2,
      delay: `${(i * 0.45).toFixed(2)}s`,
      duration: `${3.5 + (i % 3) * 1.5}s`,
    }));
  }, []);

  return (
    <div
      className={`heavenly-sky-backdrop ${className}`}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
        ...style,
      }}
    >
      {/* 1. Divine Celestial Gradient Canvas */}
      <div className="heavenly-gradient-base" />

      {/* 2. Radiant God Rays (Volumetric Golden Light Beams) */}
      <div className="heavenly-god-rays">
        <div className="god-ray ray-1" />
        <div className="god-ray ray-2" />
        <div className="god-ray ray-3" />
        <div className="god-ray ray-4" />
        <div className="god-ray ray-5" />
      </div>

      {/* 3. Golden Celestial Halo (Ethereal Sun/Portal at Top) */}
      <div className="heavenly-divine-portal" />

      {/* 4. Layer 1 (Distant Background Clouds - Slow Drift) */}
      <div className="heavenly-clouds-track track-far">
        <svg
          className="heavenly-clouds-svg svg-far"
          viewBox="0 0 2400 360"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="cloudGradFar" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.14" />
              <stop offset="40%" stopColor="#fde68a" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#0a0a14" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            fill="url(#cloudGradFar)"
            d="M0,280 Q200,220 400,260 T800,230 T1200,270 T1600,220 T2000,260 T2400,240 L2400,360 L0,360 Z"
          />
          <path
            fill="url(#cloudGradFar)"
            opacity="0.7"
            d="M0,250 Q280,180 560,230 T1120,200 T1680,240 T2240,190 T2400,220 L2400,360 L0,360 Z"
          />
        </svg>
      </div>

      {/* 5. Layer 2 (Mid-ground Ethereal Clouds - Luminous & Golden-Rimmed) */}
      <div className="heavenly-clouds-track track-mid">
        <svg
          className="heavenly-clouds-svg svg-mid"
          viewBox="0 0 2400 420"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="cloudGradMid" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fffbeb" stopOpacity="0.28" />
              <stop offset="35%" stopColor="#fef3c7" stopOpacity="0.22" />
              <stop offset="80%" stopColor="#f59e0b" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#0a0a12" stopOpacity="0" />
            </linearGradient>
            <filter id="cloudGlowMid" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <g filter="url(#cloudGlowMid)">
            {/* Cluster 1 */}
            <path
              fill="url(#cloudGradMid)"
              d="M0,320 C80,260 160,270 240,300 C300,240 420,230 480,290 C540,250 640,260 700,310 C780,280 860,300 920,330 C1000,260 1140,270 1200,320 C1280,250 1400,250 1480,310 C1560,240 1700,260 1760,320 C1840,270 1960,280 2040,320 C2120,260 2260,270 2400,310 L2400,420 L0,420 Z"
            />
          </g>
        </svg>
      </div>

      {/* 6. Layer 3 (Foreground Drifting Fluffy Clouds with Floating Bob) */}
      <div className="heavenly-clouds-track track-near">
        <svg
          className="heavenly-clouds-svg svg-near"
          viewBox="0 0 2400 480"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="cloudGradNear" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
              <stop offset="25%" stopColor="#fffdf5" stopOpacity="0.35" />
              <stop offset="65%" stopColor="#fef08a" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#050508" stopOpacity="0" />
            </linearGradient>
            <filter id="cloudSoft" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" />
            </filter>
          </defs>
          <path
            fill="url(#cloudGradNear)"
            d="M0,390 C60,330 140,330 200,360 C260,290 380,280 440,340 C500,290 600,300 660,360 C740,310 840,320 900,370 C980,300 1100,310 1160,360 C1240,290 1360,300 1440,360 C1520,290 1660,310 1720,370 C1800,310 1920,320 1980,370 C2060,300 2200,310 2280,360 C2340,330 2380,350 2400,380 L2400,480 L0,480 Z"
          />
        </svg>
      </div>

      {/* 7. Floating Celestial Stardust & Halo Sparkles */}
      <div className="heavenly-sparkles-container">
        {sparkles.map((s) => (
          <div
            key={s.id}
            className="heavenly-sparkle-dot"
            style={{
              left: s.left,
              top: s.top,
              width: `${s.size}px`,
              height: `${s.size}px`,
              animationDelay: s.delay,
              animationDuration: s.duration,
            }}
          />
        ))}
      </div>

      {/* 8. Ambient Cloud Island Pillows (Bottom Floating Cushions) */}
      <div className="heavenly-bottom-cloud-cushion" />

      {children}
    </div>
  );
}
