import React, { useState } from "react";
import { UpRightArrowIcon } from "./Icons";

function parseSocialEmbedInfo(rawUrl, explicitPlatform) {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const url = rawUrl.trim();
  const lower = url.toLowerCase();

  let platform = explicitPlatform || "Social";
  if (lower.includes("instagram.com") || lower.includes("instagr.am")) {
    platform = "Instagram";
  } else if (lower.includes("x.com") || lower.includes("twitter.com")) {
    platform = "X";
  } else if (lower.includes("snapchat.com")) {
    platform = "Snapchat";
  } else if (lower.includes("tiktok.com")) {
    platform = "TikTok";
  } else if (lower.includes("youtube.com") || lower.includes("youtu.be")) {
    platform = "YouTube";
  }

  // Instagram /p/:code or /reel/:code
  if (platform === "Instagram") {
    const igMatch = url.match(/instagram\.com\/(?:[^/]+\/)?(p|reel|tv)\/([A-Za-z0-9_-]+)/i);
    if (igMatch) {
      return {
        platform: "Instagram",
        url,
        embedUrl: `https://www.instagram.com/${igMatch[1].toLowerCase()}/${igMatch[2]}/embed/`,
        canEmbed: true,
      };
    }
  }

  // X / Twitter /status/:id
  if (platform === "X") {
    const xMatch = url.match(/(?:x\.com|twitter\.com)\/[^/]+\/status\/(\d+)/i);
    if (xMatch) {
      return {
        platform: "X",
        url,
        embedUrl: `https://platform.twitter.com/embed/Tweet.html?id=${xMatch[1]}&theme=dark&dnt=true`,
        canEmbed: true,
      };
    }
  }

  // Snapchat Spotlight / Story embed or fallback
  if (platform === "Snapchat") {
    const snapMatch = url.match(/snapchat\.com\/(?:spotlight|t)\/([A-Za-z0-9_-]+)/i);
    if (snapMatch) {
      return {
        platform: "Snapchat",
        url,
        embedUrl: `https://www.snapchat.com/spotlight/${snapMatch[1]}/embed`,
        canEmbed: false, // Snapchat frequently blocks cross-origin frames; fallback card is primary
      };
    }
  }

  return {
    platform,
    url,
    embedUrl: null,
    canEmbed: false,
  };
}

/**
 * SocialPostEmbed (Stage 26 — Req #18)
 *
 * Renders an embedded social post (Instagram, X/Twitter, Snapchat) or an
 * atmospheric fallback card with preview artwork, platform name, and direct
 * link to the original post when an embed is blocked or unsupported.
 */
export default function SocialPostEmbed({
  url,
  platform,
  previewImage,
  title,
  compact = false,
}) {
  const [showLiveEmbed, setShowLiveEmbed] = useState(false);
  const [embedError, setEmbedError] = useState(false);

  const info = parseSocialEmbedInfo(url, platform);
  if (!info) return null;

  return (
    <div className="social-post-embed-card">
      <div className="social-post-embed-header">
        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
          <span className="social-post-platform-pill">{info.platform}</span>
          <span style={{ fontSize: "11px", color: "var(--muted)" }}>
            External Social Post
          </span>
        </div>

        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
          {info.canEmbed && !compact && (
            <button
              type="button"
              onClick={() => setShowLiveEmbed((prev) => !prev)}
              className="social-embed-toggle-btn"
            >
              {showLiveEmbed ? "Hide Embed" : "Load Interactive Embed"}
            </button>
          )}
          <a
            href={info.url}
            target="_blank"
            rel="noopener noreferrer"
            className="social-post-external-link"
          >
            <span>Open on {info.platform}</span>
            <UpRightArrowIcon size={13} />
          </a>
        </div>
      </div>

      {showLiveEmbed && info.canEmbed && info.embedUrl && !embedError ? (
        <div className="social-post-iframe-wrap">
          <iframe
            src={info.embedUrl}
            title={`${title || info.platform} embedded post`}
            className="social-post-iframe"
            loading="lazy"
            sandbox="allow-scripts allow-same-origin allow-popups"
            onError={() => setEmbedError(true)}
          />
        </div>
      ) : (
        <a
          href={info.url}
          target="_blank"
          rel="noopener noreferrer"
          className="social-post-fallback-body"
        >
          {previewImage && (
            <img
              src={previewImage}
              alt={title || `${info.platform} post preview`}
              className="social-post-fallback-thumb"
              loading="lazy"
            />
          )}
          <div className="social-post-fallback-meta">
            <div className="social-post-fallback-title">
              {title || `Official ${info.platform} Post`}
            </div>
            <div className="social-post-fallback-sub">
              View original post on {info.platform} <UpRightArrowIcon size={12} />
            </div>
          </div>
        </a>
      )}
    </div>
  );
}
