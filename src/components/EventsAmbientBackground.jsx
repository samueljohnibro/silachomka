// src/components/EventsAmbientBackground.jsx
// Unique Abstract Background for Live Events & Sanctuary Page
// Theme: Stage Sanctuary / Volumetric Concert Spotlights & Acoustic Amphitheater Haze

import React from "react";

export default function EventsAmbientBackground({
  image = null,
  className = "",
  style = {},
}) {
  return (
    <div
      className={`events-ambient-backdrop ${className}`}
      aria-hidden="true"
      style={style}
    >
      {/* 1. Deep Stage Arena Base Canvas */}
      <div className="stage-base-gradient" />

      {/* 2. Optional Organic Blurred Artwork Atmosphere */}
      {image && (
        <div
          className="stage-artwork-layer"
          style={{ backgroundImage: `url('${image}')` }}
        />
      )}

      {/* 3. Volumetric Concert Spotlight Beams */}
      <div className="stage-beam stage-beam-left" />
      <div className="stage-beam stage-beam-right" />
      <div className="stage-beam stage-beam-center" />

      {/* 4. Acoustic Amphitheater Resonance Arcs (SVG) */}
      <svg
        className="stage-acoustic-waves-svg"
        viewBox="0 0 1200 800"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="stageSoundwaveGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#dfc27d" stopOpacity="0.32" />
            <stop offset="50%" stopColor="#e11d48" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.02" />
          </linearGradient>
          <radialGradient id="stageCenterGlow" cx="50%" cy="100%" r="60%">
            <stop offset="0%" stopColor="#dfc27d" stopOpacity="0.35" />
            <stop offset="40%" stopColor="#e11d48" stopOpacity="0.12" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Live Stage Source Emitter */}
        <ellipse cx="600" cy="800" rx="320" ry="140" fill="url(#stageCenterGlow)" />

        {/* Expanding Acoustic Wave Arcs */}
        <g className="stage-soundwave-group">
          <ellipse
            cx="600"
            cy="820"
            rx="460"
            ry="220"
            stroke="url(#stageSoundwaveGrad)"
            strokeWidth="1.2"
            strokeDasharray="6 14"
          />
          <ellipse
            cx="600"
            cy="840"
            rx="640"
            ry="310"
            stroke="url(#stageSoundwaveGrad)"
            strokeWidth="1"
            strokeDasharray="8 20"
          />
          <ellipse
            cx="600"
            cy="860"
            rx="820"
            ry="400"
            stroke="url(#stageSoundwaveGrad)"
            strokeWidth="0.8"
            strokeDasharray="4 24"
          />
          <ellipse
            cx="600"
            cy="880"
            rx="1020"
            ry="500"
            stroke="rgba(223, 194, 125, 0.12)"
            strokeWidth="0.6"
            strokeDasharray="2 30"
          />
        </g>
      </svg>

      {/* 5. Floating Concert Motes & Stage Embers */}
      <div className="stage-embers-container">
        <span className="stage-ember ember-1" />
        <span className="stage-ember ember-2" />
        <span className="stage-ember ember-3" />
        <span className="stage-ember ember-4" />
        <span className="stage-ember ember-5" />
        <span className="stage-ember ember-6" />
        <span className="stage-ember ember-7" />
        <span className="stage-ember ember-8" />
      </div>

      {/* 6. Sub-bass Stage Horizon Underglow */}
      <div className="stage-horizon-underglow" />

      {/* 7. Concert Vignette & High-Contrast Overlay */}
      <div className="stage-vignette-overlay" />
    </div>
  );
}
