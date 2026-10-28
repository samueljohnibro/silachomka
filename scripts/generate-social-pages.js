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
const GOOGLE_VERIFICATION_PATTERN =
  /<!-- GOOGLE_SITE_VERIFICATION:START -->[\s\S]*?<!-- GOOGLE_SITE_VERIFICATION:END -->/;
const DEFAULT_SITE_URL = "https://silachomka.vercel.app";
const WORKER_API_ORIGIN = "https://silachomka-api.samueljohnibrotech.workers.dev";
const DEFAULT_SOCIAL_IMAGE = "/og-image.png";
const MAX_DESCRIPTION_LENGTH = 280;

function getSiteUrl() {
  const envUrl = process.env.VITE_SITE_ORIGIN || process.env.SITE_ORIGIN;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, "");
  }
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
  jsonLd = null,
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
  const jsonLdTag = jsonLd
    ? `\n    <script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n    </script>`
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
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${escapedImageAlt}" />${audioTags}

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@silachomka" />
    <meta name="twitter:creator" content="@silachomka" />
    <meta name="twitter:title" content="${escapedTitle}" />
    <meta name="twitter:description" content="${escapedDescription}" />
    <meta name="twitter:image" content="${escapedImageUrl}" />
    <meta name="twitter:image:alt" content="${escapedImageAlt}" />${jsonLdTag}
    <!-- SOCIAL_METADATA:END -->`;
}

const ROOT_PATTERN = /<div id="root"><\/div>/;

function withSocialMetadata(html, metadata, bodyHtml = "") {
  if (!SOCIAL_METADATA_PATTERN.test(html)) {
    throw new Error(
      "Could not find SOCIAL_METADATA markers in dist/index.html. Keep the markers in index.html so share pages can be generated."
    );
  }

  let result = html.replace(SOCIAL_METADATA_PATTERN, renderSocialMetadata(metadata));
  if (bodyHtml && ROOT_PATTERN.test(result)) {
    result = result.replace(ROOT_PATTERN, `<div id="root">${bodyHtml}</div>`);
  }
  return result;
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
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          "@id": `${siteUrl}/#website`,
          "url": `${siteUrl}/`,
          "name": "silachomka",
          "description":
            "Official artist website of silachomka. Music, visuals, beat store, studio services.",
          "publisher": { "@id": `${siteUrl}/#person` }
        },
        {
          "@type": "Person",
          "@id": `${siteUrl}/#person`,
          "name": "silachomka",
          "alternateName": "Samuel Silachomka John-Ibro",
          "url": `${siteUrl}/`,
          "jobTitle": "Recording Artist & Music Producer",
          "sameAs": [
            "https://www.instagram.com/silachomka",
            "https://x.com/silachomka"
          ]
        }
      ]
    }
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
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": title,
      "url": `${siteUrl}/beats`,
      "description":
        "Explore original studio beats by silachomka. Listen, license on Selar, and craft your next release with chomkaMUSIC™ Studio.",
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": `${siteUrl}/` },
          { "@type": "ListItem", "position": 2, "name": "Beats", "item": `${siteUrl}/beats` }
        ]
      }
    }
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
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "MusicRecording",
      "name": beat.title,
      "byArtist": {
        "@type": "Person",
        "name": "silachomka"
      },
      "url": `${siteUrl}/beats/${encodeURIComponent(beatKey)}`,
      "description": beat.description || `${beat.title} beat by silachomka`,
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": `${siteUrl}/` },
          { "@type": "ListItem", "position": 2, "name": "Beats", "item": `${siteUrl}/beats` },
          { "@type": "ListItem", "position": 3, "name": beat.title, "item": `${siteUrl}/beats/${encodeURIComponent(beatKey)}` }
        ]
      }
    }
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
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "MusicAlbum",
      "name": release.title,
      "byArtist": {
        "@type": "Person",
        "name": "silachomka"
      },
      "url": `${siteUrl}/release/${encodeURIComponent(release.slug)}`,
      "description": fullDesc,
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": `${siteUrl}/` },
          { "@type": "ListItem", "position": 2, "name": "Music", "item": `${siteUrl}/music` },
          { "@type": "ListItem", "position": 3, "name": release.title, "item": `${siteUrl}/release/${encodeURIComponent(release.slug)}` }
        ]
      }
    }
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

function renderSemanticNav() {
  return `<header style="padding: 20px 6vw; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1);">
    <a href="/" style="font-weight: 800; color: #dfc27d; text-decoration: none; font-size: 16px;">silachomka</a>
    <nav style="display: flex; gap: 16px; font-size: 13px;">
      <a href="/music" style="color: #fff; text-decoration: none;">Music</a>
      <a href="/beats" style="color: #fff; text-decoration: none;">Beats</a>
      <a href="/services" style="color: #fff; text-decoration: none;">Studio Services</a>
      <a href="/gallery" style="color: #fff; text-decoration: none;">Gallery</a>
      <a href="/about" style="color: #fff; text-decoration: none;">About</a>
    </nav>
  </header>`;
}

function renderSemanticFooter() {
  return `<footer style="padding: 40px 6vw; border-top: 1px solid rgba(255,255,255,0.1); margin-top: 60px; font-size: 12px; color: #888;">
    <p>&copy; ${new Date().getFullYear()} silachomka &middot; chomkaMUSIC&trade; &middot; Chomka Nation. All rights reserved.</p>
    <p><a href="/privacy" style="color: #888;">Privacy Policy</a> &middot; <a href="/cookies" style="color: #888;">Cookie Policy</a> &middot; <a href="/terms" style="color: #888;">Terms</a></p>
  </footer>`;
}

function renderHomeBodyHtml(releases, beats) {
  const topReleases = (releases || []).slice(0, 6);
  const topBeats = (beats || []).slice(0, 4);
  return `${renderSemanticNav()}
  <main style="max-width: 1200px; margin: 40px auto; padding: 0 6vw;">
    <h1>silachomka &mdash; Official Artist Home</h1>
    <p>Official website of Samuel Silachomka John-Ibro &mdash; recording artist, record producer, audio engineer, and creator behind chomkaMUSIC&trade; and Chomka Nation.</p>
    <section style="margin-top: 36px;">
      <h2>Latest Music &amp; Releases</h2>
      <ul>
        ${topReleases.map(r => `<li><a href="/release/${escapeHtml(r.slug)}"><strong>${escapeHtml(r.title)}</strong></a> &mdash; ${escapeHtml(r.displayDate || r.date || 'Out Now')}</li>`).join('')}
      </ul>
      <p><a href="/music">&rarr; View Full Music Discography</a></p>
    </section>
    <section style="margin-top: 36px;">
      <h2>chomkaMUSIC&trade; Studio Beats</h2>
      <ul>
        ${topBeats.map(b => `<li><a href="/beats/${escapeHtml(b.id)}"><strong>${escapeHtml(b.title)}</strong></a> (${b.bpm ? `${b.bpm} BPM` : 'Instrumental'}${b.genre ? ` &middot; ${escapeHtml(b.genre)}` : ''})</li>`).join('')}
      </ul>
      <p><a href="/beats">&rarr; Browse Beat Store</a></p>
    </section>
  </main>
  ${renderSemanticFooter()}`;
}

function renderMusicBodyHtml(releases) {
  return `${renderSemanticNav()}
  <main style="max-width: 1200px; margin: 40px auto; padding: 0 6vw;">
    <nav aria-label="Breadcrumb" style="font-size: 12px; margin-bottom: 20px;"><a href="/">Home</a> / <span>Music &amp; Discography</span></nav>
    <h1>silachomka Music Catalogue &amp; Discography</h1>
    <p>Explore the complete discography, albums, and singles by silachomka (Samuel Silachomka John-Ibro) under chomkaMUSIC&trade;.</p>
    <section style="margin-top: 32px;">
      ${(releases || []).map(r => `
        <article style="margin-bottom: 28px; padding-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.08);">
          <h2><a href="/release/${escapeHtml(r.slug)}" style="color: #dfc27d; text-decoration: none;">${escapeHtml(r.title)}</a></h2>
          <p>${escapeHtml(r.description || '')}</p>
          <p style="font-size: 12px; color: #888;">Release Date: ${escapeHtml(r.displayDate || r.date || 'Available')}</p>
        </article>
      `).join('')}
    </section>
  </main>
  ${renderSemanticFooter()}`;
}

function renderGalleryBodyHtml(gallery) {
  return `${renderSemanticNav()}
  <main style="max-width: 1200px; margin: 40px auto; padding: 0 6vw;">
    <nav aria-label="Breadcrumb" style="font-size: 12px; margin-bottom: 20px;"><a href="/">Home</a> / <span>Visual Archive &amp; Gallery</span></nav>
    <h1>silachomka Visual Archive &amp; Gallery</h1>
    <p>Behind-the-scenes photography, portraits, style, and visual stories from silachomka.</p>
    <section style="margin-top: 32px; display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
      ${(gallery || []).map(g => `
        <article style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 16px; border-radius: 8px;">
          <h3><a href="/gallery/${escapeHtml(g.id)}" style="color: #dfc27d; text-decoration: none;">${escapeHtml(g.title || g.category || 'Visual Archive Post')}</a></h3>
          <p style="font-size: 13px; color: #ccc;">${escapeHtml(g.caption || g.description || '')}</p>
          <p style="font-size: 11px; color: #888;">${escapeHtml(g.displayDate || g.date || '')}</p>
        </article>
      `).join('')}
    </section>
  </main>
  ${renderSemanticFooter()}`;
}

function renderAboutBodyHtml() {
  return `${renderSemanticNav()}
  <main style="max-width: 1000px; margin: 40px auto; padding: 0 6vw;">
    <nav aria-label="Breadcrumb" style="font-size: 12px; margin-bottom: 20px;"><a href="/">Home</a> / <span>About</span></nav>
    <h1>About silachomka &mdash; Samuel Silachomka John-Ibro</h1>
    <p>silachomka is the artist identity of Samuel John-Ibro &mdash; a multidisciplinary creative working across music, technology and visual culture.</p>
    <p>The music lives under <strong>chomkaMUSIC&trade;</strong>, while the wider creative, technology and sports ecosystem sits under <strong>Chomka Nation</strong>.</p>
    <section style="margin-top: 32px;">
      <h2>Chomka Nation Ecosystem Architecture</h2>
      <ul>
        <li><strong>chomkaMUSIC&trade;:</strong> Music production, artist releases, sound design, master licensing, beat catalogue.</li>
        <li><strong>chomkaTECH&trade;:</strong> Software engineering, creator tools, digital audio platforms, studio automation.</li>
        <li><strong>Spartamonuel:</strong> Athletic brand, fitness, discipline, performance co-founded by Samuel and his brother.</li>
      </ul>
    </section>
  </main>
  ${renderSemanticFooter()}`;
}

function renderBeatsBodyHtml(beats) {
  return `${renderSemanticNav()}
  <main style="max-width: 1200px; margin: 40px auto; padding: 0 6vw;">
    <nav aria-label="Breadcrumb" style="font-size: 12px; margin-bottom: 20px;"><a href="/">Home</a> / <span>Beat Store</span></nav>
    <h1>chomkaMUSIC&trade; Studio Beats &amp; Instrumentals</h1>
    <p>Browse, audition 45-second previews, and license original beats and instrumentals produced by silachomka.</p>
    <section style="margin-top: 32px;">
      ${(beats || []).map(b => `
        <article style="margin-bottom: 24px; padding-bottom: 18px; border-bottom: 1px solid rgba(255,255,255,0.08);">
          <h2><a href="/beats/${escapeHtml(b.id)}" style="color: #dfc27d; text-decoration: none;">${escapeHtml(b.title)}</a></h2>
          <p>${escapeHtml(b.description || '')}</p>
          <p style="font-size: 13px; color: #888;">BPM: ${b.bpm || 'Variable'} &middot; Genre: ${escapeHtml(b.genre || 'Instrumental')} &middot; Key: ${escapeHtml(b.key || 'N/A')}</p>
        </article>
      `).join('')}
    </section>
  </main>
  ${renderSemanticFooter()}`;
}

function renderServicesBodyHtml() {
  return `${renderSemanticNav()}
  <main style="max-width: 1000px; margin: 40px auto; padding: 0 6vw;">
    <nav aria-label="Breadcrumb" style="font-size: 12px; margin-bottom: 20px;"><a href="/">Home</a> / <span>Studio Services</span></nav>
    <h1>chomkaMUSIC™ Studio Services</h1>
    <p>Professional music production, custom beats, vocal recording, mixing &amp; mastering, and studio audio engineering by silachomka at chomkaMUSIC™ Studios.</p>
    <section style="margin-top: 32px;">
      <h2>Available Studio Services</h2>
      <ul>
        <li><strong>Voice Recording:</strong> Professional acoustic vocal tracking sessions with engineer.</li>
        <li><strong>Mixing &amp; Mastering:</strong> Industry-standard stereo balances and competitive loudness masters.</li>
        <li><strong>Custom Beat Production:</strong> Tailored instrumentals composed from scratch to your vision.</li>
        <li><strong>Sound Design &amp; Scoring:</strong> Atmospheric foley, cinematic transitions, and commercial sync.</li>
      </ul>
    </section>
  </main>
  ${renderSemanticFooter()}`;
}

function renderReleaseBodyHtml(release) {
  const tracks = Array.isArray(release.tracks) ? release.tracks : [];
  return `${renderSemanticNav()}
  <main style="max-width: 900px; margin: 40px auto; padding: 0 6vw;">
    <nav aria-label="Breadcrumb" style="font-size: 12px; margin-bottom: 20px;"><a href="/">Home</a> / <a href="/music">Music</a> / <span>${escapeHtml(release.title)}</span></nav>
    <h1>${escapeHtml(release.title)} &mdash; silachomka</h1>
    <p style="font-size: 14px; color: #dfc27d; font-weight: 700;">Release Date: ${escapeHtml(release.displayDate || release.date || 'Available Now')}</p>
    <p>${escapeHtml(release.description || '')}</p>
    ${tracks.length > 0 ? `
      <section style="margin-top: 28px;">
        <h2>Tracklist (${tracks.length} tracks)</h2>
        <ol>
          ${tracks.map(t => `<li><strong>${escapeHtml(t.title)}</strong>${t.duration ? ` &mdash; ${escapeHtml(t.duration)}` : ''}</li>`).join('')}
        </ol>
      </section>
    ` : ''}
    <p style="margin-top: 24px;"><a href="/music">&larr; Back to Music Catalogue</a></p>
  </main>
  ${renderSemanticFooter()}`;
}

function renderBeatDetailBodyHtml(beat) {
  return `${renderSemanticNav()}
  <main style="max-width: 900px; margin: 40px auto; padding: 0 6vw;">
    <nav aria-label="Breadcrumb" style="font-size: 12px; margin-bottom: 20px;"><a href="/">Home</a> / <a href="/beats">Beats</a> / <span>${escapeHtml(beat.title)}</span></nav>
    <h1>${escapeHtml(beat.title)} &mdash; chomkaMUSIC&trade; Beat</h1>
    <p style="font-size: 14px; color: #dfc27d; font-weight: 700;">BPM: ${beat.bpm || 'Variable'} &middot; Key: ${escapeHtml(beat.key || 'N/A')} &middot; Genre: ${escapeHtml(beat.genre || 'Hip-Hop/Afrobeats')}</p>
    <p>${escapeHtml(beat.description || '')}</p>
    <p><a href="/beats">&larr; Back to Beat Store</a></p>
  </main>
  ${renderSemanticFooter()}`;
}

function renderEventsBodyHtml(events) {
  const publishedEvents = (events || []).filter(e => Boolean(e.is_published));
  return `${renderSemanticNav()}
  <main style="max-width: 1000px; margin: 40px auto; padding: 0 6vw;">
    <nav aria-label="Breadcrumb" style="font-size: 12px; margin-bottom: 20px;"><a href="/">Home</a> / <span>Live Sanctuary &amp; Events</span></nav>
    <h1>silachomka Live Gatherings &amp; Tour Dates</h1>
    <p>Official calendar of live acoustic sanctuary sessions, festival appearances, and live shows by silachomka.</p>
    <section style="margin-top: 32px;">
      ${publishedEvents.length === 0 ? `
        <p style="color: #888; font-style: italic;">No public tour dates or live events currently scheduled. Check back soon or explore the release catalogue.</p>
      ` : publishedEvents.map(e => `
        <article style="margin-bottom: 28px; padding-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.08);">
          <h2><a href="/events/${escapeHtml(e.slug)}" style="color: #dfc27d; text-decoration: none;">${escapeHtml(e.title)}</a></h2>
          <p>${escapeHtml(e.subtitle || e.description || '')}</p>
          <p style="font-size: 13px; color: #888;">Date: ${escapeHtml(e.start_time ? new Date(e.start_time).toLocaleDateString() : 'TBA')} &middot; Venue: ${escapeHtml(e.venue_name || 'Sanctuary')} (${escapeHtml(e.city || '')})</p>
        </article>
      `).join('')}
    </section>
  </main>
  ${renderSemanticFooter()}`;
}

function renderCalendarBodyHtml() {
  return `${renderSemanticNav()}
  <main style="max-width: 1000px; margin: 40px auto; padding: 0 6vw;">
    <nav aria-label="Breadcrumb" style="font-size: 12px; margin-bottom: 20px;"><a href="/">Home</a> / <span>Activity Calendar</span></nav>
    <h1>silachomka Unified Activity Calendar</h1>
    <p>Chronological timeline across music releases, studio beats, visual archive posts, and live events by silachomka.</p>
    <section style="margin-top: 32px;">
      <p style="color: #888;">Browse all historical discography milestones, beats, visual posts, and upcoming releases in unified chronological order.</p>
    </section>
  </main>
  ${renderSemanticFooter()}`;
}

function renderEventDetailBodyHtml(evt) {
  return `${renderSemanticNav()}
  <main style="max-width: 900px; margin: 40px auto; padding: 0 6vw;">
    <nav aria-label="Breadcrumb" style="font-size: 12px; margin-bottom: 20px;"><a href="/">Home</a> / <a href="/events">Events</a> / <span>${escapeHtml(evt.title)}</span></nav>
    <h1>${escapeHtml(evt.title)} &mdash; Live at ${escapeHtml(evt.venue_name || 'Sanctuary')}</h1>
    <p style="font-size: 14px; color: #dfc27d; font-weight: 700;">Date: ${escapeHtml(evt.start_time ? new Date(evt.start_time).toLocaleDateString() : 'TBA')} &middot; Location: ${escapeHtml(evt.city || 'Lagos')}, ${escapeHtml(evt.country || 'Nigeria')}</p>
    <p>${escapeHtml(evt.description || evt.subtitle || '')}</p>
    ${evt.ticket_url ? `<p><a href="${escapeHtml(evt.ticket_url)}" style="display: inline-block; padding: 10px 20px; background: #dfc27d; color: #000; text-decoration: none; border-radius: 4px; font-weight: 600;">Get Tickets / RSVP</a></p>` : ''}
    <p><a href="/events">&larr; Back to Live Events</a></p>
  </main>
  ${renderSemanticFooter()}`;
}

async function generateSocialPages() {
  const [liveBeats, liveGallery, liveReleases, liveEvents] = await Promise.all([
    fetchLiveEndpoint("/api/beats"),
    fetchLiveEndpoint("/api/gallery"),
    fetchLiveEndpoint("/api/releases"),
    fetchLiveEndpoint("/api/events"),
  ]);

  const mergedBeats = mergeByKey(staticBeats, liveBeats, "id");
  const mergedGallery = mergeByKey(staticGallery, liveGallery, "id");
  const mergedReleases = mergeByKey(staticReleases, liveReleases, "slug");

  const canonicalBeats = validEntries(mergedBeats, "id", true);
  const canonicalGallery = validEntries(mergedGallery, "id", false);
  const canonicalReleases = validEntries(mergedReleases, "slug", true);
  const canonicalEvents = Array.isArray(liveEvents) ? liveEvents.filter((e) => Boolean(e.slug)) : [];

  const baseHtmlPath = path.join(outputDirectory, "index.html");
  let baseHtml = await readFile(baseHtmlPath, "utf8");

  const verificationToken = (
    process.env.VITE_GOOGLE_SITE_VERIFICATION ||
    process.env.GOOGLE_SITE_VERIFICATION ||
    ""
  ).trim();

  if (verificationToken && GOOGLE_VERIFICATION_PATTERN.test(baseHtml)) {
    baseHtml = baseHtml.replace(
      GOOGLE_VERIFICATION_PATTERN,
      `<!-- GOOGLE_SITE_VERIFICATION:START -->\n    <meta name="google-site-verification" content="${escapeHtml(verificationToken)}" />\n    <!-- GOOGLE_SITE_VERIFICATION:END -->`
    );
  }

  const homeHtml = withSocialMetadata(
    baseHtml,
    createHomeMetadata()
  );

  await writeFile(baseHtmlPath, homeHtml, "utf8");
  await writePage(
    ["beats"],
    withSocialMetadata(baseHtml, createBeatHubMetadata(), renderBeatsBodyHtml(canonicalBeats))
  );
  await writePage(
    ["services"],
    withSocialMetadata(
      baseHtml,
      {
        title: "chomkaMUSIC™ Studio Services | silachomka",
        description:
          "Professional music production, custom beats, mixing & mastering, vocal recording, sound design, and studio audio engineering by silachomka at chomkaMUSIC™ Studios.",
        canonicalPath: "/services",
        type: "website",
        image: DEFAULT_SOCIAL_IMAGE,
        imageAlt: "chomkaMUSIC™ Studio Services | silachomka",
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "ProfessionalService",
          "name": "chomkaMUSIC™ Studio Services | silachomka",
          "url": `${siteUrl}/services`,
          "description":
            "Professional music production, custom beats, mixing & mastering, vocal recording, sound design, and studio audio engineering by silachomka at chomkaMUSIC™ Studios.",
          "provider": { "@type": "Person", "name": "silachomka" },
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": `${siteUrl}/` },
              { "@type": "ListItem", "position": 2, "name": "Services", "item": `${siteUrl}/services` }
            ]
          }
        }
      },
      renderServicesBodyHtml()
    )
  );
  await writePage(
    ["studio"],
    withSocialMetadata(baseHtml, {
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
    withSocialMetadata(baseHtml, {
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
    withSocialMetadata(baseHtml, {
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
    withSocialMetadata(baseHtml, {
      title: "Terms & Conditions | silachomka",
      description:
        "Terms and conditions of use for silachomka website, music catalog, beat store, and digital assets.",
      canonicalPath: "/terms",
      image: DEFAULT_SOCIAL_IMAGE,
      imageAlt: "Terms & Conditions | silachomka",
    })
  );
  await writePage(
    ["music"],
    withSocialMetadata(
      baseHtml,
      {
        title: "Music Catalogue & Discography | silachomka",
        description:
          "Explore the complete music discography, singles, and albums by silachomka (Samuel Silachomka John-Ibro) under chomkaMUSIC™.",
        canonicalPath: "/music",
        type: "music.album",
        image: DEFAULT_SOCIAL_IMAGE,
        imageAlt: "silachomka music catalogue",
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": "Music Catalogue & Discography | silachomka",
          "url": `${siteUrl}/music`,
          "description":
            "Explore the complete music discography, singles, and albums by silachomka (Samuel Silachomka John-Ibro) under chomkaMUSIC™.",
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": `${siteUrl}/` },
              { "@type": "ListItem", "position": 2, "name": "Music", "item": `${siteUrl}/music` }
            ]
          }
        }
      },
      renderMusicBodyHtml(canonicalReleases)
    )
  );
  await writePage(
    ["gallery"],
    withSocialMetadata(
      baseHtml,
      {
        title: "Visual Archive & Gallery | silachomka",
        description:
          "Explore behind-the-scenes photography, portraits, style, and visual stories from silachomka.",
        canonicalPath: "/gallery",
        image: DEFAULT_SOCIAL_IMAGE,
        imageAlt: "silachomka visual archive",
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": "Visual Archive & Gallery | silachomka",
          "url": `${siteUrl}/gallery`,
          "description":
            "Explore behind-the-scenes photography, portraits, style, and visual stories from silachomka.",
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": `${siteUrl}/` },
              { "@type": "ListItem", "position": 2, "name": "Gallery", "item": `${siteUrl}/gallery` }
            ]
          }
        }
      },
      renderGalleryBodyHtml(canonicalGallery)
    )
  );
  await writePage(
    ["about"],
    withSocialMetadata(
      baseHtml,
      {
        title: "About silachomka — Samuel Silachomka John-Ibro | Artist & Producer",
        description:
          "Official biography and story of silachomka (Samuel Silachomka John-Ibro) — Nigerian recording artist, producer, and audio engineer under chomkaMUSIC™.",
        canonicalPath: "/about",
        image: DEFAULT_SOCIAL_IMAGE,
        imageAlt: "About silachomka",
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "AboutPage",
          "name": "About silachomka — Samuel Silachomka John-Ibro | Artist & Producer",
          "url": `${siteUrl}/about`,
          "description":
            "Official biography and story of silachomka (Samuel Silachomka John-Ibro) — Nigerian recording artist, producer, and audio engineer under chomkaMUSIC™.",
          "mainEntity": {
            "@type": "Person",
            "name": "silachomka",
            "alternateName": "Samuel Silachomka John-Ibro"
          },
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": `${siteUrl}/` },
              { "@type": "ListItem", "position": 2, "name": "About", "item": `${siteUrl}/about` }
            ]
          }
        }
      },
      renderAboutBodyHtml()
    )
  );
  await writePage(
    ["events"],
    withSocialMetadata(
      baseHtml,
      {
        title: "Live Sanctuary & Events | silachomka",
        description:
          "Official calendar of live gatherings, acoustic sanctuaries, festivals, and tour appearances for silachomka.",
        canonicalPath: "/events",
        image: DEFAULT_SOCIAL_IMAGE,
        imageAlt: "Live Sanctuary & Events | silachomka",
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": "Live Sanctuary & Events | silachomka",
          "url": `${siteUrl}/events`,
          "description":
            "Official calendar of live gatherings, acoustic sanctuaries, festivals, and tour appearances for silachomka.",
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": `${siteUrl}/` },
              { "@type": "ListItem", "position": 2, "name": "Events", "item": `${siteUrl}/events` }
            ]
          }
        }
      },
      renderEventsBodyHtml(canonicalEvents)
    )
  );
  await writePage(
    ["calendar"],
    withSocialMetadata(
      baseHtml,
      {
        title: "Unified Activity Calendar | silachomka",
        description:
          "Explore the comprehensive chronological timeline of silachomka music releases, studio beats, visual archive moments, and live concert events.",
        canonicalPath: "/calendar",
        image: DEFAULT_SOCIAL_IMAGE,
        imageAlt: "Unified Activity Calendar | silachomka",
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": "Unified Activity Calendar | silachomka",
          "url": `${siteUrl}/calendar`,
          "description":
            "Explore the comprehensive chronological timeline of silachomka music releases, studio beats, visual archive moments, and live concert events.",
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": `${siteUrl}/` },
              { "@type": "ListItem", "position": 2, "name": "Calendar", "item": `${siteUrl}/calendar` }
            ]
          }
        }
      },
      renderCalendarBodyHtml()
    )
  );

  await Promise.all([
    ...canonicalEvents.map((evt) =>
      writePage(
        ["events", encodeURIComponent(evt.slug.trim())],
        withSocialMetadata(
          baseHtml,
          {
            title: `${evt.title} — Live at ${evt.venue_name || "Sanctuary"} | silachomka`,
            description: normalizeDescription(
              evt.subtitle || evt.description,
              `Live appearance and sanctuary session by silachomka at ${evt.venue_name || "Sanctuary"}.`
            ),
            canonicalPath: `/events/${encodeURIComponent(evt.slug.trim())}`,
            image: evt.primary_artwork_url || evt.cover || DEFAULT_SOCIAL_IMAGE,
            imageAlt: `${evt.title} flyer`,
            type: "music.event",
            jsonLd: {
              "@context": "https://schema.org",
              "@type": "Event",
              "name": evt.title,
              "startDate": evt.start_time || undefined,
              "location": {
                "@type": "Place",
                "name": evt.venue_name || "Sanctuary",
                "address": {
                  "@type": "PostalAddress",
                  "addressLocality": evt.city || "Lagos",
                  "addressCountry": evt.country || "Nigeria"
                }
              },
              "url": `${siteUrl}/events/${encodeURIComponent(evt.slug.trim())}`,
              "description": evt.subtitle || evt.description || "",
              "breadcrumb": {
                "@type": "BreadcrumbList",
                "itemListElement": [
                  { "@type": "ListItem", "position": 1, "name": "Home", "item": `${siteUrl}/` },
                  { "@type": "ListItem", "position": 2, "name": "Events", "item": `${siteUrl}/events` },
                  { "@type": "ListItem", "position": 3, "name": evt.title, "item": `${siteUrl}/events/${encodeURIComponent(evt.slug.trim())}` }
                ]
              }
            }
          },
          renderEventDetailBodyHtml(evt)
        )
      )
    ),
    ...canonicalBeats.map((beat) =>
      writePage(
        ["beats", encodeURIComponent(beat.id.trim())],
        withSocialMetadata(baseHtml, createBeatMetadata(beat), renderBeatDetailBodyHtml(beat))
      )
    ),
    ...canonicalBeats.map((beat) =>
      writePage(
        ["beat", encodeURIComponent(beat.id.trim())],
        withSocialMetadata(baseHtml, createBeatMetadata(beat), renderBeatDetailBodyHtml(beat))
      )
    ),
    ...canonicalGallery.map((post) =>
      writePage(
        ["gallery", encodeURIComponent(post.id.trim())],
        withSocialMetadata(baseHtml, createGalleryMetadata(post))
      )
    ),
    ...canonicalReleases.map((release) =>
      writePage(
        ["release", encodeURIComponent(release.slug.trim())],
        withSocialMetadata(baseHtml, createReleaseMetadata(release), renderReleaseBodyHtml(release))
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

  // Generate XML Sitemap with Google Image extensions (Req #15 & #16)
  const staticRoutes = [
    { loc: `${siteUrl}/`, changefreq: "daily", priority: "1.0" },
    { loc: `${siteUrl}/music`, changefreq: "weekly", priority: "0.9" },
    { loc: `${siteUrl}/beats`, changefreq: "weekly", priority: "0.9" },
    { loc: `${siteUrl}/events`, changefreq: "weekly", priority: "0.9" },
    { loc: `${siteUrl}/services`, changefreq: "weekly", priority: "0.9" },
    { loc: `${siteUrl}/calendar`, changefreq: "daily", priority: "0.8" },
    { loc: `${siteUrl}/gallery`, changefreq: "weekly", priority: "0.8" },
    { loc: `${siteUrl}/about`, changefreq: "monthly", priority: "0.7" },
    { loc: `${siteUrl}/studio`, changefreq: "monthly", priority: "0.7" },
    { loc: `${siteUrl}/privacy`, changefreq: "yearly", priority: "0.3" },
    { loc: `${siteUrl}/cookies`, changefreq: "yearly", priority: "0.3" },
    { loc: `${siteUrl}/terms`, changefreq: "yearly", priority: "0.3" },
  ];

  let sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  sitemapXml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

  for (const route of staticRoutes) {
    sitemapXml += `  <url>\n    <loc>${route.loc}</loc>\n    <changefreq>${route.changefreq}</changefreq>\n    <priority>${route.priority}</priority>\n  </url>\n`;
  }

  for (const rel of canonicalReleases) {
    const url = `${siteUrl}/release/${encodeURIComponent(rel.slug.trim())}`;
    const coverUrl = rel.cover || rel.image ? toAbsoluteUrl(rel.cover || rel.image) : null;
    sitemapXml += `  <url>\n    <loc>${url}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n`;
    if (coverUrl) {
      sitemapXml += `    <image:image>\n      <image:loc>${escapeHtml(coverUrl)}</image:loc>\n      <image:title>${escapeHtml(rel.title)} Cover Art</image:title>\n    </image:image>\n`;
    }
    sitemapXml += `  </url>\n`;
  }

  for (const evt of canonicalEvents) {
    const url = `${siteUrl}/events/${encodeURIComponent(evt.slug.trim())}`;
    const flyer = evt.primary_artwork_url || evt.cover ? toAbsoluteUrl(evt.primary_artwork_url || evt.cover) : null;
    sitemapXml += `  <url>\n    <loc>${url}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n`;
    if (flyer) {
      sitemapXml += `    <image:image>\n      <image:loc>${escapeHtml(flyer)}</image:loc>\n      <image:title>${escapeHtml(evt.title)} Flyer</image:title>\n    </image:image>\n`;
    }
    sitemapXml += `  </url>\n`;
  }

  for (const beat of canonicalBeats) {
    const url = `${siteUrl}/beat/${encodeURIComponent(beat.id.trim())}`;
    const beatImg = beat.image ? toAbsoluteUrl(beat.image) : null;
    sitemapXml += `  <url>\n    <loc>${url}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n`;
    if (beatImg) {
      sitemapXml += `    <image:image>\n      <image:loc>${escapeHtml(beatImg)}</image:loc>\n      <image:title>${escapeHtml(beat.title)} Beat Artwork</image:title>\n    </image:image>\n`;
    }
    sitemapXml += `  </url>\n`;
  }

  for (const post of canonicalGallery) {
    const url = `${siteUrl}/gallery/${encodeURIComponent(post.id.trim())}`;
    const postTitle = escapeHtml(post.title || post.caption || "Silachomka Visual Archive");
    const rawImages = [
      post.ogImage,
      post.image,
      post.src,
      post.asset,
      ...(Array.isArray(post.slides) ? post.slides : []),
    ]
      .map((s) => (typeof s === "string" ? s : s?.src || s?.asset))
      .filter((s) => typeof s === "string" && (/\.(jpg|jpeg|png|webp|avif)/i.test(s) || s.startsWith("/api/media/asset/")));

    const uniqueImgs = Array.from(new Set(rawImages)).map((u) => toAbsoluteUrl(u));

    sitemapXml += `  <url>\n    <loc>${url}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n`;
    for (const imgUrl of uniqueImgs) {
      sitemapXml += `    <image:image>\n      <image:loc>${escapeHtml(imgUrl)}</image:loc>\n      <image:title>${postTitle}</image:title>\n    </image:image>\n`;
    }
    sitemapXml += `  </url>\n`;
  }

  sitemapXml += `</urlset>\n`;

  const sitemapDistPath = path.join(outputDirectory, "sitemap.xml");
  const sitemapPublicPath = path.join(rootDirectory, "public", "sitemap.xml");
  await writeFile(sitemapDistPath, sitemapXml, "utf8");
  await writeFile(sitemapPublicPath, sitemapXml, "utf8");

  const robotsTxt = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/
Disallow: /api/admin/
Disallow: /api/services/upload
Disallow: /api/services/files/

Sitemap: ${siteUrl}/sitemap.xml
`;
  const robotsDistPath = path.join(outputDirectory, "robots.txt");
  const robotsPublicPath = path.join(rootDirectory, "public", "robots.txt");
  await writeFile(robotsDistPath, robotsTxt, "utf8");
  await writeFile(robotsPublicPath, robotsTxt, "utf8");

  console.log(
    `Generated crawler-visible metadata, XML Sitemap, and robots.txt for 1 beat hub, ${canonicalBeats.length} beats, ${canonicalGallery.length} gallery posts, and ${canonicalReleases.length} releases.`
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
