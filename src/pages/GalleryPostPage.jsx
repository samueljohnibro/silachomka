import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import GalleryPostModal from "../components/GalleryPostModal";
import SeoHead from "../components/SeoHead";
import { LoadingSpinner } from "../components/Icons";
import { useChomkaStore } from "../data/store";
import { normalizeGalleryPost } from "../data/api";
import { DEFAULT_SOURCE } from "../data/credits";

function rasterImage(post) {
  const primary = post?.src || post?.asset;
  const videoPoster =
    primary && primary.endsWith(".mp4") ? primary.replace(".mp4", ".jpg") : null;
  const slideUrls = (post?.slides || []).map((s) =>
    typeof s === "string" ? s : s?.src || s?.asset
  );
  const candidates = [
    post?.ogImage,
    post?.image,
    !post?.isVideo ? primary : null,
    videoPoster,
    ...slideUrls,
  ];
  return (
    candidates.find(
      (value) =>
        typeof value === "string" &&
        (/\.(?:avif|gif|jpe?g|png|webp)(?:[?#].*)?$/i.test(value) ||
          value.startsWith("/api/media/asset/"))
    ) || "/og-image.png"
  );
}

export default function GalleryPostPage() {
  const { id } = useParams();
  const { gallery, isLoading: isStoreLoading } = useChomkaStore();
  const [fetchedPost, setFetchedPost] = useState(null);
  const [isFetchingPost, setIsFetchingPost] = useState(false);

  const storePost = useMemo(() => {
    if (!Array.isArray(gallery)) return null;
    return gallery.find((item) => item.id === id) || null;
  }, [gallery, id]);

  useEffect(() => {
    if (storePost || !id) return;
    let cancelled = false;
    setIsFetchingPost(true);
    fetch(`/api/gallery/${encodeURIComponent(id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data && data.id) {
          setFetchedPost(normalizeGalleryPost(data));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsFetchingPost(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, storePost]);

  const post = storePost || fetchedPost;

  if (!post && (isStoreLoading || isFetchingPost)) {
    return (
      <main className="release-page-view">
        <div
          style={{
            maxWidth: "600px",
            margin: "100px auto",
            textAlign: "center",
            color: "var(--gold)",
          }}
        >
          <LoadingSpinner size={28} />
          <p style={{ marginTop: "14px", color: "var(--muted)", fontSize: "13px" }}>
            Loading gallery entry...
          </p>
        </div>
      </main>
    );
  }

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

  const postImage = rasterImage(post);
  const galleryJsonLd = {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    name: post.title || post.caption || "Visual Archive Post",
    description: (post.caption || `${post.title} — a visual archive post by silachomka.`).trim(),
    contentUrl: postImage.startsWith("http") ? postImage : `https://silachomka.vercel.app${postImage}`,
    thumbnailUrl: postImage.startsWith("http") ? postImage : `https://silachomka.vercel.app${postImage}`,
    datePublished: post.date || post.post_date,
    author: {
      "@type": "Person",
      name: "silachomka",
      url: "https://silachomka.vercel.app",
    },
    publisher: {
      "@type": "Organization",
      name: "chomkaMUSIC™",
      url: "https://silachomka.vercel.app",
    },
  };

  return (
    <main className="gallery-post-page">
      <SeoHead
        title={`${post.title || post.caption || "Visual Archive Post"} | Silachomka Visual Archive`}
        description={(
          post.caption || `${post.title} — a visual archive post by silachomka.`
        )
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 280)}
        path={`/gallery/${post.id}`}
        image={postImage}
        imageAlt={`${post.title || post.caption || "Visual Archive"} — silachomka visual archive`}
        jsonLd={galleryJsonLd}
      />
      <Link className="release-breadcrumb" to="/#gallery">
        ← All Gallery
      </Link>
      <p className="eyebrow" style={{ marginTop: "18px" }}>
        Visual Archive · Source: {post.source || DEFAULT_SOURCE}
      </p>
      <GalleryPostModal post={post} onClose={() => {}} embedded />
    </main>
  );
}
