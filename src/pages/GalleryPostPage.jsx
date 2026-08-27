import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import GalleryPostModal from "../components/GalleryPostModal";
import SeoHead from "../components/SeoHead";
import { useChomkaStore } from "../data/store";
import { DEFAULT_SOURCE } from "../data/credits";

function rasterImage(post) {
  const videoPoster =
    post?.src && post.src.endsWith(".mp4")
      ? post.src.replace(".mp4", ".jpg")
      : null;
  const candidates = [
    post?.ogImage,
    post?.image,
    post?.src,
    videoPoster,
    ...(post?.slides || []),
    post?.videoSrc,
  ];
  return (
    candidates.find(
      (value) =>
        typeof value === "string" &&
        /\.(?:avif|gif|jpe?g|png|webp)(?:[?#].*)?$/i.test(value)
    ) || "/og-image.png"
  );
}

export default function GalleryPostPage() {
  const { id } = useParams();
  const { gallery } = useChomkaStore();

  const post = useMemo(() => {
    if (!Array.isArray(gallery)) return null;
    return gallery.find((item) => item.id === id) || null;
  }, [gallery, id]);

  if (!post) {
    return (
      <main className="release-page-view">
        <SeoHead
          title="Gallery post not found | silachomka"
          description="This visual archive post could not be found."
          path={`/gallery/${id || ""}`}
        />
        <div style={{ maxWidth: "600px", margin: "80px auto", textAlign: "center" }}>
          <p className="eyebrow">silachomka / 404</p>
          <h1 className="release-title">Post Not Found</h1>
          <p style={{ color: "var(--muted)", margin: "20px 0 35px" }}>
            This gallery post is not in the official visual archive.
          </p>
          <Link className="primary-button" to="/#gallery">
            ← Back to Gallery
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="gallery-post-page">
      <SeoHead
        title={`${post.title} | Silachomka Visual Archive`}
        description={
          (post.caption || `${post.title} — a visual archive post by silachomka.`)
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 280)
        }
        path={`/gallery/${post.id}`}
        image={rasterImage(post)}
        imageAlt={`${post.title} — silachomka visual archive`}
      />
      <Link className="release-breadcrumb" to="/#gallery">
        ← All Gallery
      </Link>
      <p className="eyebrow" style={{ marginTop: "18px" }}>
        Visual Archive · Source: {post.source || DEFAULT_SOURCE}
      </p>
      <GalleryPostModal
        post={post}
        onClose={() => {}}
        embedded
      />
    </main>
  );
}
