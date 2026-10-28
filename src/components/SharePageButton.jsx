// src/components/SharePageButton.jsx
// Stage 37 — Req #8: Universal Share Page Component

import React, { useState } from "react";

/**
 * Universal Share Page Button
 *
 * Uses the native Web Share API (navigator.share) when supported,
 * otherwise provides an instant Copy Link fallback with clear success feedback.
 * Uses the exact current canonical URL without inventing routes.
 */
export default function SharePageButton({
  title,
  text,
  url,
  label = "Share",
  className = "",
  style = {},
}) {
  const [copied, setCopied] = useState(false);

  const handleShare = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "https://silachomka.vercel.app");
    const shareTitle = title || (typeof document !== "undefined" ? document.title : "silachomka");
    const shareText = text || "Explore silachomka — music, beats, visual archive and studio services.";

    const shareData = {
      title: shareTitle,
      text: shareText,
      url: shareUrl,
    };

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if (err.name === "AbortError") return; // User dismissed share sheet
      }
    }

    // Fallback to clipboard
    if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
        return;
      } catch {}
    }

    // Prompt fallback for older browsers
    if (typeof window !== "undefined") {
      window.prompt("Copy page link:", shareUrl);
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className={`share-page-btn studio-pill-btn ${className}`}
      aria-label="Share this page"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "7px",
        padding: "7px 14px",
        borderRadius: "20px",
        border: copied ? "1px solid var(--gold)" : "1px solid rgba(223, 194, 125, 0.3)",
        background: copied ? "rgba(223, 194, 125, 0.18)" : "rgba(10, 10, 16, 0.65)",
        backdropFilter: "blur(10px)",
        color: copied ? "var(--gold)" : "var(--text-muted, #a1a1aa)",
        fontSize: "12px",
        fontWeight: 600,
        letterSpacing: "0.04em",
        cursor: "pointer",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        ...style,
      }}
    >
      <span aria-hidden="true" style={{ fontSize: "13px" }}>
        {copied ? "✓" : "↗"}
      </span>
      <span>{copied ? "Link Copied!" : label}</span>
    </button>
  );
}
