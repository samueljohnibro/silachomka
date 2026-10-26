import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { SITE_ORIGIN } from "../data/credits";

function toAbsolute(value) {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : SITE_ORIGIN;
  if (!value) return `${origin}/og-image.png`;
  if (/^https?:\/\//i.test(value)) return value;
  try {
    return new URL(value.startsWith("/") ? value : `/${value}`, `${origin}/`).toString();
  } catch {
    return `${origin}/og-image.png`;
  }
}

function imageMimeType(url) {
  const pathname = (url || "").split("?")[0].split("#")[0].toLowerCase();
  if (pathname.endsWith(".png")) return "image/png";
  if (pathname.endsWith(".gif")) return "image/gif";
  if (pathname.endsWith(".webp")) return "image/webp";
  if (pathname.endsWith(".avif")) return "image/avif";
  if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) return "image/jpeg";
  return "";
}

function upsertMetaTag(attrName, attrValue, content) {
  if (typeof document === "undefined" || !content) return;
  let el = document.head.querySelector(`meta[${attrName}="${attrValue}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export default function SeoHead({
  title,
  description,
  path = "/",
  image = "/og-image.png",
  imageAlt,
  icon,
  type = "website",
  audio = null,
}) {
  const canonical = toAbsolute(path);
  const imageUrl = toAbsolute(image);
  const iconUrl = icon ? toAbsolute(icon) : null;
  const audioUrl = audio ? toAbsolute(audio) : null;
  const alt = imageAlt || title;
  const mimeType = imageMimeType(imageUrl);

  // Directly synchronize existing static head tags so newly created beats & releases
  // never retain stale homepage Open Graph / Twitter tags in document.head
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (title) document.title = title;
    upsertMetaTag("name", "description", description);
    upsertMetaTag("property", "og:type", type);
    upsertMetaTag("property", "og:url", canonical);
    upsertMetaTag("property", "og:title", title);
    upsertMetaTag("property", "og:description", description);
    upsertMetaTag("property", "og:image", imageUrl);
    upsertMetaTag("property", "og:image:secure_url", imageUrl);
    upsertMetaTag("property", "og:image:alt", alt);
    upsertMetaTag("name", "twitter:title", title);
    upsertMetaTag("name", "twitter:description", description);
    upsertMetaTag("name", "twitter:image", imageUrl);
    upsertMetaTag("name", "twitter:image:alt", alt);
    if (audioUrl) {
      upsertMetaTag("property", "og:audio", audioUrl);
    }
    const canonicalEl = document.head.querySelector('link[rel="canonical"]');
    if (canonicalEl) {
      canonicalEl.setAttribute("href", canonical);
    }
  }, [title, description, canonical, imageUrl, alt, type, audioUrl]);

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      {iconUrl && <link rel="icon" href={iconUrl} />}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonical} />
      <meta property="og:site_name" content="silachomka" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:secure_url" content={imageUrl} />
      {mimeType && <meta property="og:image:type" content={mimeType} />}
      <meta property="og:image:alt" content={alt} />
      {audioUrl && <meta property="og:audio" content={audioUrl} />}
      {audioUrl && <meta property="og:audio:type" content="audio/mpeg" />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@silachomka" />
      <meta name="twitter:creator" content="@silachomka" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:image:alt" content={alt} />
    </Helmet>
  );
}
