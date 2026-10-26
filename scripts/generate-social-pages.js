import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import staticBeats from "../src/data/beats.js";
import staticGallery from "../src/data/gallery.js";
import staticReleases from "../src/data/releases.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDirectory = path.resolve(__dirname, "..");
const outputDirectory = path.join(rootDirectory, "dist");

const SOCIAL_METADATA_PATTERN =
  /<!-- SOCIAL_METADATA:START -->[\s\S]*?<!-- SOCIAL_METADATA:END -->/;
const DEFAULT_SITE_URL = "https://silachomka.vercel.app";
const WORKER_API_ORIGIN = "https://silachomka-api.samueljohnibrotech.workers.dev";
const DEFAULT_SOCIAL_IMAGE = "/og-image.png";
const MAX_DESCRIPTION_LENGTH = 280;

function getSiteUrl() {
  return DEFAULT_SITE_URL;
}

const siteUrl = getSiteUrl();

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return character;
    }
  });
}

function normalizeDescription(value, fallback) {
  const normalized = String(value || fallback || "")
    .replace(/\s+/g, " ")
    .trim();

  if (normalized.length <= MAX_DESCRIPTION_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_DESCRIPTION_LENGTH - 1).trimEnd()}…`;
}

function toAbsoluteUrl(value) {
  if (!value) return new URL("/", `${siteUrl}/`).toString();
  if (/^https?:\/\//i.test(value)) return value;
  try {
    return new URL(value.startsWith("/") ? value : `/${value}`, `${siteUrl}/`).toString();
  } catch {
    return new URL("/", `${siteUrl}/`).toString();
  }
}

function toRoutePath(...segments) {
  return `/${segments
    .filter((segment) => segment !== undefined && segment !== null)
    .map((segment) => encodeURIComponent(String(segment).trim()))
    .join("/")}`;
}

function isRasterImage(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/\/api\/media\/asset\/[a-zA-Z0-9-]+/i.test(trimmed)) return true;
  return /\.(?:avif|gif|jpe?g|png|webp)(?:[?#].*)?$/i.test(trimmed);
}

function imageMimeType(imageUrl) {
  const pathname = imageUrl.split("?")[0].split("#")[0].toLowerCase();

  if (pathname.endsWith(".png")) return "image/png";
  if (pathname.endsWith(".gif")) return "image/gif";
  if (pathname.endsWith(".webp")) return "image/webp";
  if (pathname.endsWith(".avif")) return "image/avif";
  if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) {
    return "image/jpeg";
  }

  return "";
}

const fallbackImageRoutes = [];

function resolveSocialImage(candidates, routePath) {
  const image = candidates.find(isRasterImage);

  if (image) {
    return toAbsoluteUrl(image);
  }

  fallbackImageRoutes.push(routePath);
  return toAbsoluteUrl(DEFAULT_SOCIAL_IMAGE);
}

function renderSocialMetadata({
  title,
  description,
  canonicalPath,
  image,
  imageAlt,
  type = "website",
  audio = null,
}) {
  const canonicalUrl = toAbsoluteUrl(canonicalPath);
  const imageUrl = toAbsoluteUrl(image || DEFAULT_SOCIAL_IMAGE);
  const mimeType = imageMimeType(imageUrl);
  const escapedTitle = escapeHtml(title);
  const escapedDescription = escapeHtml(description);
  const escapedCanonicalUrl = escapeHtml(canonicalUrl);
  const escapedImageUrl = escapeHtml(imageUrl);
  const escapedImageAlt = escapeHtml(imageAlt || title);
  const escapedType = escapeHtml(type || "website");
  const imageTypeTag = mimeType
    ? `\n    <meta property="og:image:type" content="${escapeHtml(mimeType)}" />`
    : "";
  const audioTags = audio
    ? `\n    <meta property="og:audio" content="${escapeHtml(toAbsoluteUrl(audio))}" />\n    <meta property="og:audio:type" content="audio/mpeg" />`
    : "";

  return `<!-- SOCIAL_METADATA:START -->
    <title>${escapedTitle}</title>
    <meta name="description" content="${escapedDescription}" />
    <link rel="canonical" href="${escapedCanonicalUrl}" />
    <meta name="author" content="silachomka" />
    <meta name="keywords" content="silachomka, chomkaMUSIC, Chomka Nation, music, beats, visual archive" />

    <meta property="og:type" content="${escapedType}" />
    <meta property="og:url" content="${escapedCanonicalUrl}" />
    <meta property="og:site_name" content="silachomka" />
    <meta property="og:title" content="${escapedTitle}" />
    <meta property="og:description" content="${escapedDescription}" />
    <meta property="og:image" content="${escapedImageUrl}" />
    <meta property="og:image:secure_url" content="${escapedImageUrl}" />${imageTypeTag}
    <meta property="og:image:alt" content="${escapedImageAlt}" />${audioTags}

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@silachomka" />
    <meta name="twitter:creator" content="@silachomka" />
    <meta name="twitter:title" content="${escapedTitle}" />
    <meta name="twitter:description" content="${escapedDescription}" />
    <meta name="twitter:image" content="${escapedImageUrl}" />
    <meta name="twitter:image:alt" content="${escapedImageAlt}" />
    <!-- SOCIAL_METADATA:END -->`;
}

function withSocialMetadata(html, metadata) {
  if (!SOCIAL_METADATA_PATTERN.test(html)) {
    throw new Error(
      "Could not find SOCIAL_METADATA markers in dist/index.html. Keep the markers in index.html so share pages can be generated."
    );
  }

  return html.replace(SOCIAL_METADATA_PATTERN, renderSocialMetadata(metadata));
}

async function writePage(relativeDirectory, html) {
  const pageDirectory = path.join(outputDirectory, ...relativeDirectory);
  await mkdir(pageDirectory, { recursive: true });
  await writeFile(path.join(pageDirectory, "index.html"), html, "utf8");
}

function createHomeMetadata() {
  const title = "silachomka — Official Home";
  return {
    title,
    description:
      "Official artist website of silachomka. Music, visuals, beat store, and everything in between — part of chomkaMUSIC™ and Chomka Nation.",
    canonicalPath: "/",
    image: DEFAULT_SOCIAL_IMAGE,
    imageAlt: "silachomka official logo",
  };
}

function createBeatHubMetadata() {
  const title = "chomkaMUSIC™ Studio Beats | silachomka";
  return {
    title,
    description:
      "Explore original studio beats by silachomka. Listen, license on Selar, and craft your next release with chomkaMUSIC™ Studio.",
    canonicalPath: "/beats",
    image: "/beats-image.png",
    imageAlt: "chomkaMUSIC™ Studio Beats by silachomka",
  };
}

function createBeatMetadata(beat) {
  const beatKey = beat.id || beat.slug;
  const canonicalPath = toRoutePath("beats", beatKey);
  const title = `${beat.title} | chomkaMUSIC™ Studio Beats | silachomka`;
  const genre = beat.genre ? ` ${beat.genre}` : "";

  return {
    title,
    description: normalizeDescription(
      beat.description,
      `${beat.title} is an original${genre} instrumental by silachomka, available to listen to and license through chomkaMUSIC™ Studio.`
    ),
    canonicalPath,
    type: "music.song",
    audio: beat.audio || null,
    image: resolveSocialImage(
      [
        beat.ogImage,
        beat.image,
        beat.cover,
        beat.thumbnail,
        beat.poster,
        beat.videoPoster,
        beat.video ? beat.video.replace(".mp4", ".jpg") : null,
        "/beats-image.png",
      ],
      canonicalPath
    ),
    imageAlt: `${beat.title} beat by silachomka`,
  };
}

function createGalleryMetadata(post) {
  const postKey = post.id || post.slug;
  const canonicalPath = toRoutePath("gallery", postKey);
  const displayTitle = (post.title && post.title.trim()) || post.category || "Visual Archive";
  const title = `${displayTitle} | silachomka Visual Archive`;
  const slideImages = Array.isArray(post.slides)
    ? post.slides.map((s) => (typeof s === "string" ? s : s?.src || s?.asset))
    : [];
  const generatedVideoPoster =
    post.src && post.src.endsWith(".mp4") ? post.src.replace(".mp4", ".jpg") : null;

  return {
    title,
    description: normalizeDescription(
      post.description || post.caption,
      `${displayTitle} — a visual archive post by silachomka.`
    ),
    canonicalPath,
    image: resolveSocialImage(
      [
        post.ogImage,
        post.image,
        post.src,
        post.asset,
        generatedVideoPoster,
        ...slideImages,
        post.videoSrc,
      ],
      canonicalPath
    ),
    imageAlt: `${displayTitle} — silachomka visual archive`,
  };
}

function createReleaseMetadata(release) {
  const canonicalPath = toRoutePath("release", release.slug);
  const title = `${release.title} | silachomka`;
  const relDate = release.date ? new Date(release.date) : null;
  const isFuture =
    release.isUpcoming === true ||
    release.status === "SCHEDULED" ||
    (relDate && !isNaN(relDate.getTime()) && relDate.getTime() > Date.now());

  let formattedDate = release.displayDate;
  if (!formattedDate && relDate && !isNaN(relDate.getTime())) {
    formattedDate = relDate.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  }

  const statusLead = isFuture
    ? `${release.title} — Coming soon${formattedDate ? ` on ${formattedDate}` : ""}.`
    : `${release.title} — Out now.`;

  const customDesc = String(release.description || "").trim();
  const hasStatusWord =
    customDesc.toLowerCase().includes("coming soon") ||
    customDesc.toLowerCase().includes("out now");
  const fullDesc = customDesc
    ? hasStatusWord
      ? customDesc
      : `${statusLead} ${customDesc}`
    : statusLead;

  return {
    title,
    description: normalizeDescription(fullDesc, statusLead),
    canonicalPath,
    type: "music.album",
    image: resolveSocialImage(
      [release.ogImage, release.image, release.cover],
      canonicalPath
    ),
    imageAlt: `${release.title} official cover art`,
  };
}

function validEntries(entries, key, requireTitle = true) {
  return entries.filter(
    (entry) =>
      entry &&
      typeof entry[key] === "string" &&
      entry[key].trim().length > 0 &&
      (!requireTitle ||
        (typeof entry.title === "string" && entry.title.trim().length > 0))
  );
}

function mergeByKey(staticList, liveList, key) {
  const map = new Map();
  for (const item of Array.isArray(staticList) ? staticList : []) {
    if (item && item[key]) map.set(String(item[key]).trim(), item);
  }
  for (const item of Array.isArray(liveList) ? liveList : []) {
    const k = item?.[key] || item?.slug || item?.id;
    if (k) {
      const normalizedKey = String(k).trim();
      const existing = map.get(normalizedKey) || {};
      map.set(normalizedKey, { ...existing, ...item, [key]: normalizedKey });
    }
  }
  return Array.from(map.values());
}

async function fetchLiveEndpoint(pathname) {
  try {
    const res = await fetch(`${WORKER_API_ORIGIN}${pathname}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function generateSocialPages() {
  const baseHtmlPath = path.join(outputDirectory, "index.html");
  const baseHtml = await readFile(baseHtmlPath, "utf8");
  const homeHtml = withSocialMetadata(baseHtml, createHomeMetadata());

  await writeFile(baseHtmlPath, homeHtml, "utf8");
  await writePage(["beats"], withSocialMetadata(homeHtml, createBeatHubMetadata()));
  await writePage(
    ["studio"],
    withSocialMetadata(homeHtml, {
      title: "chomkaMUSIC™ Studio Publishing",
      description:
        "Official publishing catalog and sync licensing for silachomka. Explore rights, master ownership, and sync opportunities.",
      canonicalPath: "/studio",
      image: DEFAULT_SOCIAL_IMAGE,
      imageAlt: "chomkaMUSIC™ Studio Publishing",
    })
  );
  await writePage(
    ["privacy"],
    withSocialMetadata(homeHtml, {
      title: "Privacy Policy | silachomka",
      description:
        "Privacy Policy and transparency disclosures for silachomka. Explains data privacy, local storage keys including silachomka_cookie_consent_v1, and embedded media consent.",
      canonicalPath: "/privacy",
      image: DEFAULT_SOCIAL_IMAGE,
      imageAlt: "Privacy Policy | silachomka",
    })
  );
  await writePage(
    ["cookies"],
    withSocialMetadata(homeHtml, {
      title: "Cookie Policy | silachomka",
      description:
        "Cookie Policy and consent management for silachomka. Details silachomka_cookie_consent_v1, functional preferences, and embedded media options.",
      canonicalPath: "/cookies",
      image: DEFAULT_SOCIAL_IMAGE,
      imageAlt: "Cookie Policy | silachomka",
    })
  );
  await writePage(
    ["terms"],
    withSocialMetadata(homeHtml, {
      title: "Terms & Conditions | silachomka",
      description:
        "Terms and conditions of use for silachomka website, music catalog, beat store, and digital assets.",
      canonicalPath: "/terms",
      image: DEFAULT_SOCIAL_IMAGE,
      imageAlt: "Terms & Conditions | silachomka",
    })
  );

  const [liveBeats, liveGallery, liveReleases] = await Promise.all([
    fetchLiveEndpoint("/api/beats"),
    fetchLiveEndpoint("/api/gallery"),
    fetchLiveEndpoint("/api/releases"),
  ]);

  const mergedBeats = mergeByKey(staticBeats, liveBeats, "id");
  const mergedGallery = mergeByKey(staticGallery, liveGallery, "id");
  const mergedReleases = mergeByKey(staticReleases, liveReleases, "slug");

  const canonicalBeats = validEntries(mergedBeats, "id", true);
  const canonicalGallery = validEntries(mergedGallery, "id", false);
  const canonicalReleases = validEntries(mergedReleases, "slug", true);

  await Promise.all([
    ...canonicalBeats.map((beat) =>
      writePage(
        ["beats", encodeURIComponent(beat.id.trim())],
        withSocialMetadata(homeHtml, createBeatMetadata(beat))
      )
    ),
    ...canonicalGallery.map((post) =>
      writePage(
        ["gallery", encodeURIComponent(post.id.trim())],
        withSocialMetadata(homeHtml, createGalleryMetadata(post))
      )
    ),
    ...canonicalReleases.map((release) =>
      writePage(
        ["release", encodeURIComponent(release.slug.trim())],
        withSocialMetadata(homeHtml, createReleaseMetadata(release))
      )
    ),
    ...canonicalReleases.flatMap((rel) =>
      Array.isArray(rel.previous_slugs)
        ? rel.previous_slugs
            .filter((oldSlug) => oldSlug && oldSlug !== rel.slug)
            .map((oldSlug) =>
              writePage(
                ["release", encodeURIComponent(oldSlug.trim())],
                `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Redirecting to ${escapeHtml(rel.title)} | silachomka</title>
    <link rel="canonical" href="${siteUrl}/release/${encodeURIComponent(rel.slug.trim())}" />
    <meta http-equiv="refresh" content="0; url=/release/${encodeURIComponent(rel.slug.trim())}" />
  </head>
  <body>
    <p>Redirecting to <a href="/release/${encodeURIComponent(rel.slug.trim())}">/release/${encodeURIComponent(rel.slug.trim())}</a>...</p>
    <script>window.location.replace('/release/${encodeURIComponent(rel.slug.trim())}');</script>
  </body>
</html>`
              )
            )
        : []
    ),
  ]);

  console.log(
    `Generated crawler-visible metadata for 1 beat hub, ${canonicalBeats.length} beats, ${canonicalGallery.length} gallery posts, and ${canonicalReleases.length} releases.`
  );

  if (fallbackImageRoutes.length > 0) {
    console.warn(
      `Using ${DEFAULT_SOCIAL_IMAGE} for ${fallbackImageRoutes.length} route(s) without a raster social image: ${fallbackImageRoutes.join(", ")}`
    );
  }
}

generateSocialPages().catch((error) => {
  console.error("Unable to generate social metadata pages:", error);
  process.exitCode = 1;
});
