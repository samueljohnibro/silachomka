// src/components/SharePageButton.jsx
// Stage 37 & UX Polish: Universal Luxury Share Page Component

import React, { useState } from "react";
import { SITE_ORIGIN } from "../data/siteConfig";

/**
 * Universal Luxury Gold Frosted Share Page Button
 *
 * Uses the native Web Share API (navigator.share) when supported,
 * otherwise provides an instant Copy Link fallback with clear success feedback.
 * Features an SVG icon, frosted glass capsule styling, and gold glow.
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
  const [isHovered, setIsHovered] = useState(false);

  const handleShare = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const shareUrl = url || (typeof window !== "undefined" ? window.location.href : SITE_ORIGIN);
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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`share-page-btn studio-pill-btn ${className}`}
      aria-label="Share this page"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "7px 16px",
        borderRadius: "999px",
        border: copied
          ? "1px solid var(--gold)"
          : isHovered
          ? "1px solid rgba(223, 194, 125, 0.7)"
          : "1px solid rgba(223, 194, 125, 0.35)",
        background: copied
          ? "linear-gradient(135deg, rgba(223, 194, 125, 0.22) 0%, rgba(20, 18, 14, 0.9) 100%)"
          : isHovered
          ? "linear-gradient(135deg, rgba(223, 194, 125, 0.16) 0%, rgba(14, 12, 18, 0.85) 100%)"
          : "linear-gradient(135deg, rgba(223, 194, 125, 0.08) 0%, rgba(8, 8, 12, 0.75) 100%)",
        boxShadow: copied || isHovered
          ? "0 0 18px rgba(223, 194, 125, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.15)"
          : "0 2px 8px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.06)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        color: copied || isHovered ? "var(--gold)" : "var(--text)",
        fontSize: "12px",
        fontWeight: 650,
        letterSpacing: "0.06em",
        cursor: "pointer",
        transform: isHovered ? "translateY(-1px)" : "none",
        transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        ...style,
      }}
    >
      <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center" }}>
        {copied ? (
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        )}
      </span>
      <span>{copied ? "Link Copied!" : label}</span>
    </button>
  );
}
