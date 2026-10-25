import React, { useState, useEffect } from "react";
import { adminApi } from "../../data/adminApi";
import { TrashIcon, RestoreIcon } from "../../components/Icons";
import "./admin.css";

const TABLE_LABELS = {
  releases: "Release",
  tracks: "Track",
  beats: "Beat",
  music_videos: "Music Video",
  gallery_posts: "Gallery Post",
  media_assets: "Media Asset",
  social_links: "Social Link",
  merchandise: "Merchandise",
};

const TABLE_COLORS = {
  releases: "#3b82f6",
  tracks: "#8b5cf6",
  beats: "#ec4899",
  music_videos: "#f59e0b",
  gallery_posts: "#10b981",
  media_assets: "#06b6d4",
  social_links: "#6366f1",
  merchandise: "#f97316",
};

export default function AdminRecycleBinPage() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [filterType, setFilterType] = useState("ALL");
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [confirmPermanentId, setConfirmPermanentId] = useState(null);
  const [isPurging, setIsPurging] = useState(false);

  const fetchItems = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminApi.getRecycleBin();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load recycle bin items.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleRestore = async (item) => {
    setActionLoadingId(item.id);
    setError(null);
    setSuccessMsg(null);
    try {
      await adminApi.restoreItem(item.table_name, item.id);
      setSuccessMsg(`Successfully restored "${item.title || item.id}" to active catalog.`);
      await fetchItems();
    } catch (err) {
      setError(err.message || "Failed to restore item.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePermanentDelete = async (item) => {
    setActionLoadingId(item.id);
    setError(null);
    setSuccessMsg(null);
    try {
      await adminApi.permanentDeleteItem(item.table_name, item.id);
      setSuccessMsg(`Permanently deleted "${item.title || item.id}".`);
      setConfirmPermanentId(null);
      await fetchItems();
    } catch (err) {
      setError(err.message || "Failed to permanently delete item.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePurgeExpired = async () => {
    if (!window.confirm("Permanently purge all deleted items older than 60 days? This action cannot be undone.")) {
      return;
    }
    setIsPurging(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await adminApi.purgeExpired();
      setSuccessMsg(`Purged ${res.count || 0} expired item(s) older than 60 days.`);
      await fetchItems();
    } catch (err) {
      setError(err.message || "Failed to purge expired items.");
    } finally {
      setIsPurging(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (filterType === "ALL") return true;
    return item.table_name === filterType;
  });

  const getDaysRemaining = (deletedAt) => {
    if (!deletedAt) return 60;
    const deletedDate = new Date(deletedAt);
    const msElapsed = Date.now() - deletedDate.getTime();
    const daysElapsed = Math.floor(msElapsed / (1000 * 60 * 60 * 24));
    return Math.max(0, 60 - daysElapsed);
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h2 className="studio-section-heading" style={{ margin: "0 0 6px 0" }}>
            Recycle Bin
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
            Items soft-deleted within the last 60 days can be restored. Items older than 60 days are permanently purged.
          </p>
        </div>
        <button
          onClick={handlePurgeExpired}
          disabled={isPurging || items.length === 0}
          className="studio-pill-btn"
          style={{
            background: "rgba(220, 38, 38, 0.15)",
            color: "#f87171",
            borderColor: "rgba(220, 38, 38, 0.4)",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <TrashIcon size={14} />
          {isPurging ? "Purging..." : "Purge Expired (>60 Days)"}
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="admin-login-error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}
      {successMsg && (
        <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid #10b981", color: "#34d399", padding: "10px 16px", borderRadius: "8px", fontSize: 13, marginBottom: 16 }}>
          {successMsg}
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 12, marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => setFilterType("ALL")}
          className="studio-pill-btn"
          style={{
            background: filterType === "ALL" ? "var(--gold)" : "transparent",
            color: filterType === "ALL" ? "#000" : "var(--muted)",
            borderColor: filterType === "ALL" ? "var(--gold)" : "var(--border)",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          All ({items.length})
        </button>
        {Object.entries(TABLE_LABELS).map(([tableKey, label]) => {
          const count = items.filter((i) => i.table_name === tableKey).length;
          if (count === 0) return null;
          return (
            <button
              key={tableKey}
              type="button"
              onClick={() => setFilterType(tableKey)}
              className="studio-pill-btn"
              style={{
                background: filterType === tableKey ? TABLE_COLORS[tableKey] || "var(--gold)" : "transparent",
                color: filterType === tableKey ? "#fff" : "var(--muted)",
                borderColor: filterType === tableKey ? TABLE_COLORS[tableKey] || "var(--gold)" : "var(--border)",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div style={{ color: "var(--muted)", padding: 32, textAlign: "center" }}>
          Loading recycle bin...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="admin-card" style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>🗑️</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-h)", marginBottom: 4 }}>
            Recycle Bin is empty
          </div>
          <div style={{ fontSize: 13 }}>
            {filterType === "ALL"
              ? "No deleted items currently in retention."
              : `No deleted items in the ${TABLE_LABELS[filterType] || filterType} category.`}
          </div>
        </div>
      ) : (
        <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(223, 194, 125, 0.05)" }}>
                <th style={{ padding: "14px 16px", color: "var(--muted)", fontWeight: 500, fontSize: 11, textTransform: "uppercase" }}>
                  Type
                </th>
                <th style={{ padding: "14px 16px", color: "var(--muted)", fontWeight: 500, fontSize: 11, textTransform: "uppercase" }}>
                  Title / Name
                </th>
                <th style={{ padding: "14px 16px", color: "var(--muted)", fontWeight: 500, fontSize: 11, textTransform: "uppercase" }}>
                  Deleted Date
                </th>
                <th style={{ padding: "14px 16px", color: "var(--muted)", fontWeight: 500, fontSize: 11, textTransform: "uppercase" }}>
                  Retention
                </th>
                <th style={{ padding: "14px 16px", textAlign: "right", color: "var(--muted)", fontWeight: 500, fontSize: 11, textTransform: "uppercase" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const daysLeft = getDaysRemaining(item.deleted_at);
                const isActionLoading = actionLoadingId === item.id;
                const isConfirming = confirmPermanentId === item.id;
                const typeColor = TABLE_COLORS[item.table_name] || "var(--gold)";

                return (
                  <tr key={`${item.table_name}-${item.id}`} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "14px 16px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          background: `${typeColor}22`,
                          color: typeColor,
                          border: `1px solid ${typeColor}55`,
                        }}
                      >
                        {TABLE_LABELS[item.table_name] || item.table_name}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", color: "var(--text-h)", fontWeight: 500 }}>
                      {item.title || `Deleted ${TABLE_LABELS[item.table_name] || "Item"}`}
                      <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400, marginTop: 2 }}>
                        {TABLE_LABELS[item.table_name] || item.table_name}
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", color: "var(--muted)", fontSize: 13 }}>
                      {item.deleted_at ? new Date(item.deleted_at).toLocaleString() : "Unknown"}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: daysLeft <= 7 ? "#f87171" : daysLeft <= 20 ? "#fbbf24" : "#34d399",
                        }}
                      >
                        {daysLeft} days left
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      {isConfirming ? (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 11, color: "#f87171", fontWeight: 600 }}>Permanent?</span>
                          <button
                            type="button"
                            onClick={() => handlePermanentDelete(item)}
                            disabled={isActionLoading}
                            className="studio-pill-btn"
                            style={{
                              background: "rgba(220, 38, 38, 0.25)",
                              color: "#f87171",
                              borderColor: "#f87171",
                              fontSize: 11,
                              padding: "4px 10px",
                            }}
                          >
                            {isActionLoading ? "..." : "Yes, Delete"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmPermanentId(null)}
                            disabled={isActionLoading}
                            className="studio-pill-btn"
                            style={{ fontSize: 11, padding: "4px 10px" }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => handleRestore(item)}
                            disabled={isActionLoading}
                            className="studio-pill-btn"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              fontSize: 12,
                              padding: "5px 12px",
                              color: "var(--gold)",
                              borderColor: "var(--gold)",
                            }}
                          >
                            <RestoreIcon size={13} color="currentColor" />
                            {isActionLoading ? "Restoring..." : "Restore"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmPermanentId(item.id)}
                            disabled={isActionLoading}
                            className="studio-pill-btn"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              fontSize: 12,
                              padding: "5px 12px",
                              background: "transparent",
                              color: "var(--muted)",
                            }}
                            title="Delete permanently"
                          >
                            <TrashIcon size={13} color="currentColor" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
