import React, { useState, useEffect, useRef, useMemo } from "react";
import { adminApi } from "../../data/adminApi";
import { LoadingSpinner, CheckIcon, TrashIcon } from "../../components/Icons";
import "./admin.css";

export default function AdminMediaPage() {
  const [media, setMedia] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("GRID"); // "GRID" | "TABLE"
  const [filterType, setFilterType] = useState("ALL"); // "ALL" | "IMAGE" | "VIDEO" | "AUDIO"
  const [searchQuery, setSearchQuery] = useState("");

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Selected asset detail modal
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Delete state
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchMedia = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminApi.getMediaAssets();
      setMedia(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load media assets.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      const uploaded = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let assetType = "IMAGE";
        if (file.type.startsWith("video/")) assetType = "VIDEO";
        else if (file.type.startsWith("audio/")) assetType = "AUDIO";

        const res = await adminApi.uploadMediaAsset(file, assetType);
        const newAsset = res?.asset || res;
        if (newAsset && newAsset.id) {
          uploaded.push(newAsset);
        }
      }

      if (uploaded.length > 0) {
        setMedia((prev) => [...uploaded, ...prev]);
      }
      await fetchMedia();
    } catch (err) {
      console.error("Media upload error:", err);
      setError(err.message || "Upload failed.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id) => {
    setIsDeleting(true);
    setError(null);
    try {
      await adminApi.deleteMediaAsset(id);
      setMedia((prev) => prev.filter((a) => a.id !== id));
      setDeleteConfirmId(null);
      if (selectedAsset?.id === id) setSelectedAsset(null);
    } catch (err) {
      setError(err.message || "Failed to delete media asset.");
    } finally {
      setIsDeleting(false);
    }
  };

  const getMediaUrl = (asset) => {
    if (!asset) return "";
    if (asset.has_file_data) {
      const suffix = asset.mime_type === "image/gif" ? "?.gif" : "";
      return `/api/media/asset/${asset.id}${suffix}`;
    }
    if (asset.r2_key) return `/${asset.r2_key.replace(/^\//, "")}`;
    return `/api/media/asset/${asset.id}`;
  };

  const filteredMedia = useMemo(() => {
    return media.filter((asset) => {
      if (filterType !== "ALL" && asset.asset_type !== filterType) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const fn = (asset.original_filename || "").toLowerCase();
      const key = (asset.r2_key || "").toLowerCase();
      const mime = (asset.mime_type || "").toLowerCase();
      return fn.includes(q) || key.includes(q) || mime.includes(q);
    });
  }, [media, filterType, searchQuery]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 60 }}>
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        multiple
        accept="image/*,video/*,audio/*"
        style={{ display: "none" }}
      />

      {/* Header & Upload Action */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <h2 className="studio-section-heading" style={{ margin: 0 }}>
            Media Library
          </h2>
          <p style={{ color: "var(--muted)", fontSize: 13, margin: "6px 0 0" }}>
            Visual and audio asset archive for music releases, beats, gallery posts, and studio collaterals.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          style={{ padding: "10px 22px" }}
        >
          {isUploading ? "Uploading Media..." : "↑ Upload Assets"}
        </button>
      </div>

      {error && <div className="admin-login-error" style={{ marginBottom: 20 }}>{error}</div>}

      {/* Filter & Search Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 20,
          flexWrap: "wrap",
          background: "rgba(223, 194, 125, 0.04)",
          padding: "12px 16px",
          borderRadius: 8,
          border: "1px solid var(--border)",
        }}
      >
        {/* Filter Pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["ALL", "IMAGE", "VIDEO", "AUDIO"].map((type) => (
            <button
              key={type}
              type="button"
              className="studio-pill-btn"
              onClick={() => setFilterType(type)}
              style={{
                fontSize: 12,
                background: filterType === type ? "var(--gold)" : "rgba(0,0,0,0.4)",
                color: filterType === type ? "#050507" : "var(--muted)",
                fontWeight: filterType === type ? 700 : 500,
                borderColor: filterType === type ? "var(--gold)" : "var(--border)",
              }}
            >
              {type === "ALL" ? `All (${media.length})` : type}
            </button>
          ))}
        </div>

        {/* Search Input & View Mode */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            type="search"
            placeholder="Search by filename or key..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="studio-input"
            style={{ width: 220, height: 36, fontSize: 13 }}
          />

          <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
            <button
              type="button"
              onClick={() => setViewMode("GRID")}
              style={{
                padding: "6px 12px",
                background: viewMode === "GRID" ? "rgba(223, 194, 125, 0.2)" : "transparent",
                color: viewMode === "GRID" ? "var(--gold)" : "var(--muted)",
                border: "none",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode("TABLE")}
              style={{
                padding: "6px 12px",
                background: viewMode === "TABLE" ? "rgba(223, 194, 125, 0.2)" : "transparent",
                color: viewMode === "TABLE" ? "var(--gold)" : "var(--muted)",
                border: "none",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              Table
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <LoadingSpinner size={32} />
          <p style={{ marginTop: 12, color: "var(--muted)", fontSize: 13 }}>Loading media library...</p>
        </div>
      ) : filteredMedia.length === 0 ? (
        <div className="admin-placeholder" style={{ padding: 48 }}>
          <h3>No Media Assets Found</h3>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
            {searchQuery || filterType !== "ALL"
              ? "No assets match your search or filter."
              : "Upload photos, videos, GIFs, or audio stems to populate your library."}
          </p>
          <button
            type="button"
            className="primary-button"
            style={{ marginTop: 16 }}
            onClick={() => fileInputRef.current?.click()}
          >
            ↑ Upload First Media
          </button>
        </div>
      ) : viewMode === "GRID" ? (
        /* GRID VIEW */
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
            gap: 16,
          }}
        >
          {filteredMedia.map((asset) => {
            const url = getMediaUrl(asset);
            const isVideo = asset.asset_type === "VIDEO" || asset.mime_type?.startsWith("video/");
            const isAudio = asset.asset_type === "AUDIO" || asset.mime_type?.startsWith("audio/");

            return (
              <div
                key={asset.id}
                onClick={() => setSelectedAsset(asset)}
                style={{
                  background: "rgba(10, 10, 16, 0.6)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  overflow: "hidden",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  transition: "transform 0.15s ease, border-color 0.15s ease",
                }}
                className="admin-media-card"
              >
                {/* Visual Thumbnail */}
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "1/1",
                    background: "#050507",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  {isVideo ? (
                    <video
                      src={url}
                      muted
                      playsInline
                      preload="metadata"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : isAudio ? (
                    <div style={{ textAlign: "center", color: "var(--gold)" }}>
                      <span style={{ fontSize: 32 }}>🎵</span>
                      <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--muted)" }}>AUDIO</p>
                    </div>
                  ) : (
                    <img
                      src={url}
                      alt={asset.original_filename || "Media asset"}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = "/og-image.png";
                      }}
                    />
                  )}

                  {/* Format Pill */}
                  <span
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      fontSize: 9,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: "rgba(0,0,0,0.75)",
                      color: "var(--gold)",
                      border: "1px solid rgba(223, 194, 125, 0.3)",
                      textTransform: "uppercase",
                    }}
                  >
                    {asset.mime_type === "image/gif" ? "GIF" : asset.asset_type}
                  </span>
                </div>

                {/* Metadata Details */}
                <div style={{ padding: "10px 12px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--text-h)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={asset.original_filename || asset.r2_key}
                    >
                      {asset.original_filename || asset.r2_key}
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--muted)" }}>
                      {asset.size_bytes ? `${(asset.size_bytes / 1024).toFixed(1)} KB` : "—"}
                      {asset.width && asset.height ? ` • ${asset.width}×${asset.height}` : ""}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(223, 194, 125, 0.05)" }}>
                <th style={{ padding: "14px 16px", color: "var(--muted)", fontSize: 11, textTransform: "uppercase" }}>Preview</th>
                <th style={{ padding: "14px 16px", color: "var(--muted)", fontSize: 11, textTransform: "uppercase" }}>Filename / Key</th>
                <th style={{ padding: "14px 16px", color: "var(--muted)", fontSize: 11, textTransform: "uppercase" }}>Type</th>
                <th style={{ padding: "14px 16px", color: "var(--muted)", fontSize: 11, textTransform: "uppercase" }}>Size</th>
                <th style={{ padding: "14px 16px", textAlign: "right", color: "var(--muted)", fontSize: 11, textTransform: "uppercase" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMedia.map((asset) => {
                const url = getMediaUrl(asset);
                const isVideo = asset.asset_type === "VIDEO" || asset.mime_type?.startsWith("video/");
                const isAudio = asset.asset_type === "AUDIO" || asset.mime_type?.startsWith("audio/");

                return (
                  <tr key={asset.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "12px 16px", width: 60 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 4,
                          overflow: "hidden",
                          background: "#050507",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "1px solid var(--border)",
                        }}
                      >
                        {isVideo ? (
                          <video src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : isAudio ? (
                          <span style={{ fontSize: 16 }}>🎵</span>
                        ) : (
                          <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--text-h)", fontWeight: 500 }}>
                      <div>{asset.original_filename || asset.r2_key}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{asset.r2_key}</div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          padding: "3px 6px",
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 700,
                          background: "rgba(223, 194, 125, 0.1)",
                          color: "var(--gold)",
                        }}
                      >
                        {asset.asset_type}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--muted)" }}>
                      {asset.size_bytes ? `${(asset.size_bytes / 1024).toFixed(1)} KB` : "—"}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => setSelectedAsset(asset)}
                        className="studio-pill-btn"
                        style={{ fontSize: 12, marginRight: 8 }}
                      >
                        Inspect
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(asset.id)}
                        className="studio-pill-btn"
                        style={{ background: "transparent", color: "var(--muted)", fontSize: 12 }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* DETAIL / INSPECT MODAL */}
      {selectedAsset && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.85)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            backdropFilter: "blur(8px)",
          }}
          onClick={() => setSelectedAsset(null)}
        >
          <div
            style={{
              background: "#0c0c12",
              border: "1px solid var(--border)",
              borderRadius: 12,
              maxWidth: 720,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: 24,
              boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, color: "var(--text-h)" }}>
                {selectedAsset.original_filename || selectedAsset.r2_key}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedAsset(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--muted)",
                  fontSize: 20,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {/* Large Preview */}
            <div
              style={{
                width: "100%",
                maxHeight: 380,
                background: "#050507",
                borderRadius: 8,
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
                border: "1px solid var(--border)",
              }}
            >
              {selectedAsset.asset_type === "VIDEO" || selectedAsset.mime_type?.startsWith("video/") ? (
                <video
                  src={getMediaUrl(selectedAsset)}
                  controls
                  style={{ maxWidth: "100%", maxHeight: 380 }}
                />
              ) : selectedAsset.asset_type === "AUDIO" || selectedAsset.mime_type?.startsWith("audio/") ? (
                <div style={{ padding: 32, width: "100%", textAlign: "center" }}>
                  <audio src={getMediaUrl(selectedAsset)} controls style={{ width: "100%" }} />
                </div>
              ) : (
                <img
                  src={getMediaUrl(selectedAsset)}
                  alt=""
                  style={{ maxWidth: "100%", maxHeight: 380, objectFit: "contain" }}
                />
              )}
            </div>

            {/* Detailed Properties Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 12, color: "var(--muted)", marginBottom: 20 }}>
              <div><strong>Asset ID:</strong> {selectedAsset.id}</div>
              <div><strong>MIME Type:</strong> {selectedAsset.mime_type || "—"}</div>
              <div><strong>Storage Key:</strong> {selectedAsset.r2_key}</div>
              <div><strong>File Size:</strong> {selectedAsset.size_bytes ? `${(selectedAsset.size_bytes / 1024).toFixed(1)} KB` : "—"}</div>
              <div><strong>Dimensions:</strong> {selectedAsset.width && selectedAsset.height ? `${selectedAsset.width} × ${selectedAsset.height} px` : "—"}</div>
              <div><strong>Uploaded At:</strong> {selectedAsset.created_at ? new Date(selectedAsset.created_at).toLocaleString() : "—"}</div>
            </div>

            {/* Quick Action Buttons */}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap", borderTop: "1px solid var(--border)", paddingTop: 16 }}>
              <button
                type="button"
                className="studio-pill-btn"
                onClick={() => {
                  navigator.clipboard.writeText(selectedAsset.id);
                  setCopiedId(true);
                  setTimeout(() => setCopiedId(false), 2000);
                }}
              >
                {copiedId ? "ID Copied ✓" : "Copy Asset ID"}
              </button>

              <button
                type="button"
                className="studio-pill-btn"
                onClick={() => {
                  navigator.clipboard.writeText(getMediaUrl(selectedAsset));
                  setCopiedUrl(true);
                  setTimeout(() => setCopiedUrl(false), 2000);
                }}
              >
                {copiedUrl ? "URL Copied ✓" : "Copy Direct URL"}
              </button>

              <button
                type="button"
                className="studio-pill-btn"
                onClick={() => setDeleteConfirmId(selectedAsset.id)}
                style={{ background: "rgba(220, 38, 38, 0.2)", color: "#fca5a5", borderColor: "#fca5a5" }}
              >
                Delete Asset
              </button>
            </div>

            {/* Delete Confirmation in Modal */}
            {deleteConfirmId === selectedAsset.id && (
              <div style={{ marginTop: 16, padding: 12, background: "rgba(220, 38, 38, 0.15)", borderRadius: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#fca5a5" }}>Are you sure you want to permanently delete this asset?</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => handleDelete(selectedAsset.id)}
                    className="studio-pill-btn"
                    style={{ background: "#dc2626", color: "#fff", borderColor: "#dc2626", fontSize: 11 }}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting..." : "Yes, Delete"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(null)}
                    className="studio-pill-btn"
                    style={{ fontSize: 11 }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Global Delete Confirm for Table rows */}
      {deleteConfirmId && !selectedAsset && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.7)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div style={{ background: "#121218", padding: 24, borderRadius: 8, maxWidth: 400, border: "1px solid var(--border)", textAlign: "center" }}>
            <h4 style={{ margin: "0 0 10px", color: "#fca5a5" }}>Delete Media Asset?</h4>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--muted)" }}>
              This will remove the media asset record from the library.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="studio-pill-btn"
                style={{ background: "#dc2626", color: "#fff", borderColor: "#dc2626" }}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="studio-pill-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
