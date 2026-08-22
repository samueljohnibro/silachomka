import { useState } from "react";

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "absolute";
  input.style.left = "-9999px";
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  document.body.removeChild(input);
}

export default function ShareLinkBox({ url, compact = false, label = "SHARE:" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      await copyText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard can fail in insecure contexts; keep UI quiet.
    }
  };

  if (compact) {
    return (
      <button
        type="button"
        className="share-copy-btn share-copy-btn-compact"
        onClick={handleCopy}
        aria-live="polite"
      >
        {copied ? "Link Copied!" : "Share / Copy Link"}
      </button>
    );
  }

  return (
    <div className="share-link-box">
      <span style={{ color: "var(--gold)", fontSize: "11px", fontWeight: 700 }}>
        {label}
      </span>
      <input
        type="text"
        readOnly
        value={url}
        className="share-link-input"
        aria-label="Direct share link"
        onClick={(event) => event.target.select()}
      />
      <button
        type="button"
        onClick={handleCopy}
        className="share-copy-btn"
        aria-live="polite"
      >
        {copied ? "Link Copied!" : "Copy Link"}
      </button>
    </div>
  );
}
