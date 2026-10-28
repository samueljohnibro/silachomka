// src/components/CalendarAmbientBackground.jsx
// Unique Abstract Background for Unified Activity Calendar
// Theme: Chrono-Celestial Continuum / Cosmic Timeline Nexus

import React from "react";

export default function CalendarAmbientBackground({ className = "", style = {} }) {
  return (
    <div
      className={`calendar-ambient-backdrop ${className}`}
      aria-hidden="true"
      style={style}
    >
      {/* 1. Deep Space Cosmic Base Canvas */}
      <div className="chrono-base-gradient" />

      {/* 2. Floating Chromatic Nebula Auroras */}
      <div className="chrono-nebula chrono-nebula-gold" />
      <div className="chrono-nebula chrono-nebula-violet" />
      <div className="chrono-nebula chrono-nebula-cyan" />

      {/* 3. Celestial Astrolabe & Orbital Chronometer Rings (SVG) */}
      <svg
        className="chrono-astrolabe-svg"
        viewBox="0 0 1000 1000"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="chronoGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#dfc27d" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#f3e5ab" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#b89343" stopOpacity="0.35" />
          </linearGradient>
          <linearGradient id="chronoVioletGrad" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.40" />
            <stop offset="50%" stopColor="#6366f1" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#dfc27d" stopOpacity="0.25" />
          </linearGradient>
          <radialGradient id="chronoCoreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#dfc27d" stopOpacity="0.30" />
            <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.10" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Core Luminous Epoch Sun */}
        <circle cx="500" cy="500" r="160" fill="url(#chronoCoreGlow)" />

        {/* Outer Ring: 12 Epoch Divisions (Months) with tick marks */}
        <g className="chrono-ring-outer">
          <circle
            cx="500"
            cy="500"
            r="440"
            stroke="url(#chronoGoldGrad)"
            strokeWidth="1.2"
            strokeDasharray="4 14"
          />
          <circle
            cx="500"
            cy="500"
            r="426"
            stroke="rgba(223, 194, 125, 0.18)"
            strokeWidth="0.8"
          />
          {/* 12 Radiant Hour / Month Coordinate Nodes */}
          {[...Array(12)].map((_, i) => {
            const angle = (i * 30 * Math.PI) / 180;
            const x1 = 500 + Math.cos(angle) * 420;
            const y1 = 500 + Math.sin(angle) * 420;
            const x2 = 500 + Math.cos(angle) * 446;
            const y2 = 500 + Math.sin(angle) * 446;
            const nodeX = 500 + Math.cos(angle) * 440;
            const nodeY = 500 + Math.sin(angle) * 440;
            return (
              <g key={`month-tick-${i}`}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(223, 194, 125, 0.4)"
                  strokeWidth="1.5"
                />
                <circle
                  cx={nodeX}
                  cy={nodeY}
                  r={i % 3 === 0 ? "3.5" : "2"}
                  fill={i % 3 === 0 ? "#dfc27d" : "rgba(223, 194, 125, 0.6)"}
                />
              </g>
            );
          })}
        </g>

        {/* Middle Ring: Celestial Chrono Ellipse (Counter-Rotating) */}
        <g className="chrono-ring-middle">
          <ellipse
            cx="500"
            cy="500"
            rx="350"
            ry="330"
            stroke="url(#chronoVioletGrad)"
            strokeWidth="1"
            strokeDasharray="8 20"
          />
          <circle
            cx="500"
            cy="500"
            r="310"
            stroke="rgba(139, 92, 246, 0.22)"
            strokeWidth="0.7"
            strokeDasharray="2 8"
          />
          {/* Orbital Satellite Nodes */}
          <circle cx="150" cy="500" r="4" fill="#dfc27d" />
          <circle cx="850" cy="500" r="3.5" fill="#8b5cf6" />
          <circle cx="500" cy="170" r="3" fill="#06b6d4" />
          <circle cx="500" cy="830" r="3" fill="#dfc27d" />
        </g>

        {/* Inner Ring: Astrolabe Chrono Dial */}
        <g className="chrono-ring-inner">
          <circle
            cx="500"
            cy="500"
            r="230"
            stroke="rgba(223, 194, 125, 0.3)"
            strokeWidth="1.2"
          />
          <circle
            cx="500"
            cy="500"
            r="218"
            stroke="rgba(223, 194, 125, 0.15)"
            strokeWidth="0.6"
            strokeDasharray="1 6"
          />
          {/* Crosshair Cardinal Timeline Axes */}
          <line
            x1="260"
            y1="500"
            x2="740"
            y2="500"
            stroke="rgba(223, 194, 125, 0.25)"
            strokeWidth="0.8"
            strokeDasharray="4 8"
          />
          <line
            x1="500"
            y1="260"
            x2="500"
            y2="740"
            stroke="rgba(223, 194, 125, 0.25)"
            strokeWidth="0.8"
            strokeDasharray="4 8"
          />
          <circle cx="500" cy="500" r="6" fill="#dfc27d" />
          <circle cx="500" cy="500" r="2" fill="#050507" />
        </g>
      </svg>

      {/* 4. Constellation Chrono-Stars (Micro Shimmers) */}
      <div className="chrono-constellation">
        <span className="chrono-star star-1" />
        <span className="chrono-star star-2" />
        <span className="chrono-star star-3" />
        <span className="chrono-star star-4" />
        <span className="chrono-star star-5" />
        <span className="chrono-star star-6" />
        <span className="chrono-star star-7" />
        <span className="chrono-star star-8" />
      </div>

      {/* 5. Infinite Horizon Perspective Grid (Subtle Timeline Dimension) */}
      <div className="chrono-perspective-grid" />

      {/* 6. High-Contrast Vignette Overlay for Pristine Readability */}
      <div className="chrono-vignette-overlay" />
    </div>
  );
}
