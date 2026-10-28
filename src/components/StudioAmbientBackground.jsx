// src/components/StudioAmbientBackground.jsx
// Stage 37 — Req #1: Reusable Atmospheric Ambient Background (Smiley / Artwork)

import React from "react";

/**
 * Reusable Atmospheric Ambient Background
 * Reuses the iconic /beats-image.png (or custom artwork) atmospheric blurred visual treatment
 * behind the interface, matching the visual language of the order tracking experience.
 */
export default function StudioAmbientBackground({
  image = "/beats-image.png",
  className = "",
  style = {},
}) {
  return (
    <div
      className={`product-ambient-backdrop ${className}`}
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
      <div
        className="ambient-image-layer"
        style={{
          backgroundImage: `url('${image}')`,
        }}
      />
      <div className="ambient-gradient-overlay" />
    </div>
  );
}
