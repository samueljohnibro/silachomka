import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import beats from "../src/data/beats.js";
import gallery from "../src/data/gallery.js";
import releases from "../src/data/releases.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDirectory = path.resolve(__dirname, "..");
const outputDirectory = path.join(rootDirectory, "dist");

const SOCIAL_METADATA_PATTERN =
  /<!-- SOCIAL_METADATA:START -->[\s\S]*?<!-- SOCIAL_METADATA:END -->/;
const DEFAULT_SITE_URL = "https://silachomka.vercel.app";
const DEFAULT_SOCIAL_IMAGE = "/og-image.png";
const MAX_DESCRIPTION_LENGTH = 280;

function getSiteUrl() {
  // Hardcoded to the vercel.app domain because the custom .com domain is currently 
  // offline/failing DNS resolution, which breaks image downloads for WhatsApp link previews.
  return "https://silachomka.vercel.app";
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
  try {
    return new URL(value || "/", `${siteUrl}/`).toString();
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
  return (
    typeof value === "string" &&
    /\.(?:avif|gif|jpe?g|png|webp)(?:[?#].*)?$/i.test(value.trim())
  );
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
}) {
  const canonicalUrl = toAbsoluteUrl(canonicalPath);
  const imageUrl = toAbsoluteUrl(image || DEFAULT_SOCIAL_IMAGE);
  const mimeType = imageMimeType(imageUrl);
  const escapedTitle = escapeHtml(title);
  const escapedDescription = escapeHtml(description);
  const escapedCanonicalUrl = escapeHtml(canonicalUrl);
  const escapedImageUrl = escapeHtml(imageUrl);
  const escapedImageAlt = escapeHtml(imageAlt || title);
  const imageTypeTag = mimeType
    ? `\n    <meta property="og:image:type" content="${escapeHtml(mimeType)}" />`
    : "";

  return `<!-- SOCIAL_METADATA:START -->
    <title>${escapedTitle}</title>
    <meta name="description" content="${escapedDescription}" />
    <link rel="canonical" href="${escapedCanonicalUrl}" />
    <meta name="author" content="silachomka" />
    <meta name="keywords" content="silachomka, chomkaMUSIC, Chomka Nation, music, beats, visual archive" />

    <meta property="og:type" content="website" />
    <meta property="og:url" content="${escapedCanonicalUrl}" />
    <meta property="og:site_name" content="silachomka" />
    <meta property="og:title" content="${escapedTitle}" />
    <meta property="og:description" content="${escapedDescription}" />
    <meta property="og:image" content="${escapedImageUrl}" />
    <meta property="og:image:secure_url" content="${escapedImageUrl}" />${imageTypeTag}
    <meta property="og:image:alt" content="${escapedImageAlt}" />

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
  const title = "chomkaMUSIC™ Studio Beats | Silachomka";
  return {
    title,
    description:
      "Explore original studio beats by silachomka. Listen, license on Selar, and craft your next release with chomkaMUSIC™ Studio.",
    canonicalPath: "/beats",
    image: DEFAULT_SOCIAL_IMAGE,
    imageAlt: "chomkaMUSIC™ Studio Beats by silachomka",
  };
}

function createBeatMetadata(beat) {
  const canonicalPath = toRoutePath("beats", beat.id);
  const title = `${beat.title} | chomkaMUSIC™ Studio Beats | Silachomka`;
  const genre = beat.genre ? ` ${beat.genre}` : "";

  return {
    title,
    description: normalizeDescription(
      beat.description,
      `${beat.title} is an original${genre} instrumental by silachomka, available to listen to and license through chomkaMUSIC™ Studio.`
    ),
    canonicalPath,
    image: resolveSocialImage(
      [
        beat.ogImage,
        beat.image,
        beat.cover,
        beat.thumbnail,
        beat.poster,
        beat.videoPoster,
        beat.video ? beat.video.replace('.mp4', '.jpg') : null,
      ],
      canonicalPath
    ),
    imageAlt: `${beat.title} beat by silachomka`,
  };
}

function createGalleryMetadata(post) {
  const canonicalPath = toRoutePath("gallery", post.id);
  const title = `${post.title} | Silachomka Visual Archive`;
  const slideImages = Array.isArray(post.slides) ? post.slides : [];
  const generatedVideoPoster = post.src && post.src.endsWith('.mp4') ? post.src.replace('.mp4', '.jpg') : null;

  return {
    title,
    description: normalizeDescription(
      post.description || post.caption,
      `${post.title} — a visual archive post by silachomka.`
    ),
    canonicalPath,
    image: resolveSocialImage(
      [post.ogImage, post.image, post.src, generatedVideoPoster, ...slideImages, post.videoSrc],
      canonicalPath
    ),
    imageAlt: `${post.title} — silachomka visual archive`,
  };
}

function createReleaseMetadata(release) {
  const canonicalPath = toRoutePath("release", release.slug);
  const title = `${release.title} | silachomka`;

  return {
    title,
    description: normalizeDescription(
      release.description,
      `${release.title} is an official studio release by silachomka published under chomkaMUSIC™.`
    ),
    canonicalPath,
    image: resolveSocialImage(
      [release.ogImage, release.image, release.cover],
      canonicalPath
    ),
    imageAlt: `${release.title} official cover art`,
  };
}

function validEntries(entries, key) {
  return entries.filter(
    (entry) =>
      entry &&
      typeof entry[key] === "string" &&
      entry[key].trim().length > 0 &&
      typeof entry.title === "string" &&
      entry.title.trim().length > 0
  );
}

async function generateSocialPages() {
  const baseHtmlPath = path.join(outputDirectory, "index.html");
  const baseHtml = await readFile(baseHtmlPath, "utf8");
  const homeHtml = withSocialMetadata(baseHtml, createHomeMetadata());

  await writeFile(baseHtmlPath, homeHtml, "utf8");
  await writePage(["beats"], withSocialMetadata(homeHtml, createBeatHubMetadata()));
  await writePage(["studio"], withSocialMetadata(homeHtml, {
    title: "chomkaMUSIC™ Studio Publishing",
    description: "Official publishing catalog and sync licensing for silachomka. Explore rights, master ownership, and sync opportunities.",
    canonicalPath: "/studio",
    image: DEFAULT_SOCIAL_IMAGE,
    imageAlt: "chomkaMUSIC™ Studio Publishing",
  }));

  const canonicalBeats = validEntries(beats, "id");
  const canonicalGallery = validEntries(gallery, "id");
  const canonicalReleases = validEntries(releases, "slug");

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
