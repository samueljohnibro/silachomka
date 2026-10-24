import React, { useState, useEffect } from "react";
import { adminApi } from "../../data/adminApi";
import { TrashIcon } from "../../components/Icons";
import "./admin.css";

export default function AdminSubscribersPage() {
  const [activeTab, setActiveTab] = useState("subscribers"); // "subscribers" | "notifications"
  const [subscribers, setSubscribers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [subsData, notifsData] = await Promise.all([
        adminApi.getSubscribers().catch(() => []),
        adminApi.getSubscriberNotifications().catch(() => []),
      ]);
      setSubscribers(Array.isArray(subsData) ? subsData : []);
      setNotifications(Array.isArray(notifsData) ? notifsData : []);
    } catch (err) {
      setError(err.message || "Failed to load subscriber data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteSubscriber = async (id) => {
    setActionLoadingId(id);
    setError(null);
    setSuccessMsg(null);
    try {
      await adminApi.deleteSubscriber(id);
      setSuccessMsg("Subscriber deleted successfully.");
      setDeleteConfirmId(null);
      await fetchData();
    } catch (err) {
      setError(err.message || "Failed to delete subscriber.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const activeCount = subscribers.filter((s) => s.status === "ACTIVE").length;
  const unsubCount = subscribers.filter((s) => s.status === "UNSUBSCRIBED").length;

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h2 className="studio-section-heading" style={{ margin: "0 0 6px 0" }}>
            Subscribers & Notifications
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
            Manage fan mailing list subscriptions, consent, and track automated publication notification dispatches.
          </p>
        </div>

        {/* Quick Stats Badges */}
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "8px", padding: "8px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#34d399" }}>{activeCount}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Active</div>
          </div>
          <div style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: "8px", padding: "8px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#fbbf24" }}>{unsubCount}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Unsubscribed</div>
          </div>
        </div>
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

      {/* Tab Navigation */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => setActiveTab("subscribers")}
          className="studio-pill-btn"
          style={{
            background: activeTab === "subscribers" ? "var(--gold)" : "transparent",
            color: activeTab === "subscribers" ? "#000" : "var(--muted)",
            borderColor: activeTab === "subscribers" ? "var(--gold)" : "var(--border)",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Subscribers List ({subscribers.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("notifications")}
          className="studio-pill-btn"
          style={{
            background: activeTab === "notifications" ? "var(--gold)" : "transparent",
            color: activeTab === "notifications" ? "#000" : "var(--muted)",
            borderColor: activeTab === "notifications" ? "var(--gold)" : "var(--border)",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Notification Log ({notifications.length})
        </button>
      </div>

      {isLoading ? (
        <div style={{ color: "var(--muted)", padding: 32, textAlign: "center" }}>
          Loading subscriber data...
        </div>
      ) : activeTab === "subscribers" ? (
        subscribers.length === 0 ? (
          <div className="admin-card" style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>📬</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-h)", marginBottom: 4 }}>
              No subscribers yet
            </div>
            <div style={{ fontSize: 13 }}>
              When listeners subscribe via the website, they will appear here.
            </div>
          </div>
        ) : (
          <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(223, 194, 125, 0.05)" }}>
                  <th style={{ padding: "14px 16px", color: "var(--muted)", fontWeight: 500, fontSize: 11, textTransform: "uppercase" }}>
                    Email
                  </th>
                  <th style={{ padding: "14px 16px", color: "var(--muted)", fontWeight: 500, fontSize: 11, textTransform: "uppercase" }}>
                    Status
                  </th>
                  <th style={{ padding: "14px 16px", color: "var(--muted)", fontWeight: 500, fontSize: 11, textTransform: "uppercase" }}>
                    Source
                  </th>
                  <th style={{ padding: "14px 16px", color: "var(--muted)", fontWeight: 500, fontSize: 11, textTransform: "uppercase" }}>
                    Subscribed Date
                  </th>
                  <th style={{ padding: "14px 16px", textAlign: "right", color: "var(--muted)", fontWeight: 500, fontSize: 11, textTransform: "uppercase" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((sub) => {
                  const isActive = sub.status === "ACTIVE";
                  const isConfirming = deleteConfirmId === sub.id;
                  const isActionLoading = actionLoadingId === sub.id;

                  return (
                    <tr key={sub.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "14px 16px", color: "var(--text-h)", fontWeight: 500 }}>
                        {sub.email}
                      </td>
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
                            background: isActive ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                            color: isActive ? "#34d399" : "#fbbf24",
                            border: `1px solid ${isActive ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
                          }}
                        >
                          {sub.status}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", color: "var(--muted)", fontSize: 13 }}>
                        {sub.source || "website"}
                      </td>
                      <td style={{ padding: "14px 16px", color: "var(--muted)", fontSize: 13 }}>
                        {sub.created_at ? new Date(sub.created_at).toLocaleDateString() : "—"}
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        {isConfirming ? (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 11, color: "#f87171" }}>Remove?</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteSubscriber(sub.id)}
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
                              {isActionLoading ? "..." : "Yes"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              disabled={isActionLoading}
                              className="studio-pill-btn"
                              style={{ fontSize: 11, padding: "4px 10px" }}
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(sub.id)}
                            className="studio-pill-btn"
                            style={{
                              background: "transparent",
                              color: "var(--muted)",
                              padding: "4px 8px",
                            }}
                            title="Remove subscriber"
                          >
                            <TrashIcon size={14} color="currentColor" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        /* Notifications Tab */
        notifications.length === 0 ? (
          <div className="admin-card" style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>🔔</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-h)", marginBottom: 4 }}>
              No notifications queued
            </div>
            <div style={{ fontSize: 13 }}>
              When new content is published, queued subscriber notifications will appear here.
            </div>
          </div>
        ) : (
          <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(223, 194, 125, 0.05)" }}>
                  <th style={{ padding: "14px 16px", color: "var(--muted)", fontWeight: 500, fontSize: 11, textTransform: "uppercase" }}>
                    Content Title
                  </th>
                  <th style={{ padding: "14px 16px", color: "var(--muted)", fontWeight: 500, fontSize: 11, textTransform: "uppercase" }}>
                    Type
                  </th>
                  <th style={{ padding: "14px 16px", color: "var(--muted)", fontWeight: 500, fontSize: 11, textTransform: "uppercase" }}>
                    Recipient
                  </th>
                  <th style={{ padding: "14px 16px", color: "var(--muted)", fontWeight: 500, fontSize: 11, textTransform: "uppercase" }}>
                    Status
                  </th>
                  <th style={{ padding: "14px 16px", color: "var(--muted)", fontWeight: 500, fontSize: 11, textTransform: "uppercase" }}>
                    Date Queued
                  </th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((notif) => (
                  <tr key={notif.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "14px 16px", color: "var(--text-h)", fontWeight: 500 }}>
                      {notif.content_title || notif.content_id}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          background: "rgba(223, 194, 125, 0.15)",
                          color: "var(--gold)",
                        }}
                      >
                        {notif.content_type}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", color: "var(--muted)", fontSize: 13 }}>
                      {notif.email || "—"}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span
                        style={{
                          fontSize: 12,
                          color: notif.status === "SENT" ? "#34d399" : "#fbbf24",
                        }}
                        title={notif.error_message || ""}
                      >
                        {notif.status}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", color: "var(--muted)", fontSize: 13 }}>
                      {notif.created_at ? new Date(notif.created_at).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
