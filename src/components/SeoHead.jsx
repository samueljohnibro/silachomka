import { Helmet } from "react-helmet-async";
import { SITE_ORIGIN } from "../data/credits";

function toAbsolute(value) {
  if (!value) return `${SITE_ORIGIN}/og-image.png`;
  try {
    return new URL(value, `${SITE_ORIGIN}/`).toString();
  } catch {
    return `${SITE_ORIGIN}/og-image.png`;
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

export default function SeoHead({
  title,
  description,
  path = "/",
  image = "/og-image.png",
  imageAlt,
}) {
  const canonical = toAbsolute(path);
  const imageUrl = toAbsolute(image);
  const alt = imageAlt || title;
  const mimeType = imageMimeType(imageUrl);

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonical} />
      <meta property="og:site_name" content="silachomka" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:secure_url" content={imageUrl} />
      {mimeType && <meta property="og:image:type" content={mimeType} />}
      <meta property="og:image:alt" content={alt} />
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
