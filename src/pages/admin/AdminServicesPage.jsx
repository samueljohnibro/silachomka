import React, { useState, useEffect } from "react";
import { LoadingSpinner } from "../../components/Icons";
import "./admin.css";

const STATUS_OPTIONS = [
  "DRAFT",
  "AWAITING_PAYMENT",
  "PAID",
  "IN_PROGRESS",
  "DELIVERED",
  "COMPLETED",
  "REFUND_PENDING",
  "REFUNDED",
];

const PAYMENT_STATUS_OPTIONS = [
  "UNPAID",
  "PARTIALLY_PAID",
  "PAID",
  "REFUNDED",
];

export default function AdminServicesPage() {
  const [activeTab, setActiveTab] = useState("orders"); // 'orders' | 'services' | 'schedule'
  const [orders, setOrders] = useState([]);
  const [services, setServices] = useState([]);
  const [availabilityList, setAvailabilityList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Order Edit Modal
  const [editingOrder, setEditingOrder] = useState(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [orderSaveError, setOrderSaveError] = useState(null);

  // Deliverable Upload state
  const [isUploadingDeliverable, setIsUploadingDeliverable] = useState(false);
  const [deliverableError, setDeliverableError] = useState(null);

  // Service Edit Modal
  const [editingService, setEditingService] = useState(null);
  const [isSavingService, setIsSavingService] = useState(false);
  const [serviceSaveError, setServiceSaveError] = useState(null);

  // Studio Availability Management (Req #10)
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState(null);
  const [newDateInput, setNewDateInput] = useState("");
  const [newSlotsInput, setNewSlotsInput] = useState("10:00 AM, 02:00 PM, 06:00 PM");
  const [newNotesInput, setNewNotesInput] = useState("");

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/admin/service-orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn("Failed to fetch admin orders:", err);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await fetch("/api/admin/services");
      if (res.ok) {
        const data = await res.json();
        setServices(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn("Failed to fetch admin services:", err);
    }
  };

  const fetchAvailability = async () => {
    try {
      const res = await fetch("/api/admin/services/availability");
      if (res.ok) {
        const data = await res.json();
        setAvailabilityList(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn("Failed to fetch admin availability:", err);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchOrders(), fetchServices(), fetchAvailability()]).finally(() => {
      setIsLoading(false);
    });
  }, []);

  const handleAddOrUpdateAvailability = async (e) => {
    e?.preventDefault();
    if (!newDateInput || !/^\d{4}-\d{2}-\d{2}$/.test(newDateInput)) {
      setAvailabilityError("Please enter or select a valid date in YYYY-MM-DD format.");
      return;
    }
    const slots = newSlotsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (slots.length === 0) {
      setAvailabilityError("Please specify at least one time slot (e.g. 10:00 AM, 02:00 PM).");
      return;
    }
    setIsSavingAvailability(true);
    setAvailabilityError(null);
    try {
      const res = await fetch("/api/admin/services/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateStr: newDateInput,
          slots,
          isClosed: false,
          notes: newNotesInput.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save date availability");
      setNewDateInput("");
      setNewNotesInput("");
      await fetchAvailability();
    } catch (err) {
      setAvailabilityError(err.message || "Failed to save availability");
    } finally {
      setIsSavingAvailability(false);
    }
  };

  const handleToggleCloseDate = async (item) => {
    try {
      await fetch("/api/admin/services/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateStr: item.dateStr,
          slots: item.slots,
          isClosed: !item.isClosed,
          notes: item.notes || "",
        }),
      });
      await fetchAvailability();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteDate = async (dateStr) => {
    if (!window.confirm(`Delete availability record for ${dateStr}?`)) return;
    try {
      await fetch(`/api/admin/services/availability/${encodeURIComponent(dateStr)}`, {
        method: "DELETE",
      });
      await fetchAvailability();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== "ALL" && o.orderStatus !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = o.orderNumber?.toLowerCase().includes(q);
      const matchName = o.customerName?.toLowerCase().includes(q);
      const matchEmail = o.customerEmail?.toLowerCase().includes(q);
      const matchService = o.serviceTitle?.toLowerCase().includes(q);
      if (!matchNum && !matchName && !matchEmail && !matchService) return false;
    }
    return true;
  });

  const handleOpenEditOrder = (order) => {
    setEditingOrder({
      ...order,
      deliverables: Array.isArray(order.deliverables) ? [...order.deliverables] : [],
      agreedDeadlineDate: order.agreedDeadline
        ? new Date(order.agreedDeadline).toISOString().slice(0, 16)
        : "",
    });
    setOrderSaveError(null);
  };

  const handleSaveOrder = async (e) => {
    e.preventDefault();
    if (!editingOrder) return;
    setIsSavingOrder(true);
    setOrderSaveError(null);

    try {
      const deadlineIso = editingOrder.agreedDeadlineDate
        ? new Date(editingOrder.agreedDeadlineDate).toISOString()
        : null;

      const res = await fetch(`/api/admin/service-orders/${editingOrder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderStatus: editingOrder.orderStatus,
          paymentStatus: editingOrder.paymentStatus,
          totalAmountNgn: editingOrder.totalAmountNgn,
          agreedDeadline: deadlineIso,
          deadlineTimezone: editingOrder.deadlineTimezone || "WAT",
          adminNotes: editingOrder.adminNotes,
          deliverables: editingOrder.deliverables,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update order");

      await fetchOrders();
      setEditingOrder(null);
    } catch (err) {
      setOrderSaveError(err.message);
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleDeliverableUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingDeliverable(true);
    setDeliverableError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/services/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || "File upload failed");
      }

      setEditingOrder((prev) => ({
        ...prev,
        deliverables: [
          ...prev.deliverables,
          {
            name: data.file.name,
            size: data.file.size,
            type: data.file.type,
            url: data.file.url,
            uploadedAt: new Date().toISOString(),
          },
        ],
      }));
    } catch (err) {
      setDeliverableError(err.message);
    } finally {
      setIsUploadingDeliverable(false);
      e.target.value = "";
    }
  };

  const removeDeliverable = (idx) => {
    setEditingOrder((prev) => ({
      ...prev,
      deliverables: prev.deliverables.filter((_, i) => i !== idx),
    }));
  };

  const handleOpenEditService = (service) => {
    setEditingService({
      ...service,
      deliverablesText: Array.isArray(service.deliverables)
        ? service.deliverables.join("\n")
        : "",
    });
    setServiceSaveError(null);
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    if (!editingService) return;
    setIsSavingService(true);
    setServiceSaveError(null);

    try {
      const deliverables = editingService.deliverablesText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch(`/api/admin/services/${editingService.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editingService.title,
          tagline: editingService.tagline,
          description: editingService.description,
          category: editingService.category,
          basePriceNgn: editingService.basePriceNgn,
          isHourly: editingService.isHourly,
          hourlyRateNgn: editingService.hourlyRateNgn,
          turnaroundDays: Number(editingService.turnaroundDays),
          isActive: editingService.isActive,
          deliverables,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update service");

      await fetchServices();
      setEditingService(null);
    } catch (err) {
      setServiceSaveError(err.message);
    } finally {
      setIsSavingService(false);
    }
  };

  return (
    <div className="admin-page-container">
      {/* Header & Tabs */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 className="admin-page-title" style={{ margin: "0 0 6px" }}>
            Studio Services & Orders
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "13px", margin: 0 }}>
            Manage client studio bookings, stem files, milestones, deadlines (WAT), and configure service pricing.
          </p>
        </div>

        {/* Tab Toggle */}
        <div style={{ display: "flex", background: "rgba(255, 255, 255, 0.05)", padding: "4px", borderRadius: "8px", gap: "4px" }}>
          <button
            type="button"
            onClick={() => setActiveTab("orders")}
            className={`studio-pill-btn ${activeTab === "orders" ? "active" : ""}`}
            style={{
              background: activeTab === "orders" ? "var(--gold)" : "transparent",
              color: activeTab === "orders" ? "#000" : "var(--muted)",
              fontWeight: 700,
              border: "none",
            }}
          >
            Client Orders ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("services")}
            className={`studio-pill-btn ${activeTab === "services" ? "active" : ""}`}
            style={{
              background: activeTab === "services" ? "var(--gold)" : "transparent",
              color: activeTab === "services" ? "#000" : "var(--muted)",
              fontWeight: 700,
              border: "none",
            }}
          >
            Services Catalogue ({services.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("schedule")}
            className={`studio-pill-btn ${activeTab === "schedule" ? "active" : ""}`}
            style={{
              background: activeTab === "schedule" ? "var(--gold)" : "transparent",
              color: activeTab === "schedule" ? "#000" : "var(--muted)",
              fontWeight: 700,
              border: "none",
            }}
          >
            Studio Availability ({availabilityList.length})
          </button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <LoadingSpinner size={28} color="var(--gold)" />
          <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "12px" }}>Loading studio data...</p>
        </div>
      ) : activeTab === "orders" ? (
        /* =========================================================
           ORDERS TAB
           ========================================================= */
        <div>
          {/* Filters Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {["ALL", "AWAITING_PAYMENT", "PAID", "IN_PROGRESS", "DELIVERED", "COMPLETED"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className="studio-pill-btn"
                  style={{
                    background: statusFilter === st ? "rgba(223, 194, 125, 0.15)" : "transparent",
                    color: statusFilter === st ? "var(--gold)" : "var(--muted)",
                    borderColor: statusFilter === st ? "var(--gold)" : "var(--border)",
                    fontSize: "11px",
                    fontWeight: statusFilter === st ? 700 : 500,
                  }}
                >
                  {st.replace(/_/g, " ")}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Search by order #, client, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="studio-input"
              style={{ width: "240px", height: "34px", fontSize: "12px" }}
            />
          </div>

          {filteredOrders.length === 0 ? (
            <div className="admin-empty-card" style={{ padding: "48px 20px", textAlign: "center" }}>
              No service orders found.
            </div>
          ) : (
            <div className="admin-table-wrapper" style={{ overflowX: "auto" }}>
              <table className="admin-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                    <th style={{ padding: "14px", fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>Order #</th>
                    <th style={{ padding: "14px", fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>Client</th>
                    <th style={{ padding: "14px", fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>Service</th>
                    <th style={{ padding: "14px", fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>Amount</th>
                    <th style={{ padding: "14px", fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>Status</th>
                    <th style={{ padding: "14px", fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>Deadline (WAT)</th>
                    <th style={{ padding: "14px", textAlign: "right", fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((o) => (
                    <tr key={o.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "14px", fontWeight: 700, color: "var(--gold)", fontSize: "13px" }}>
                        {o.orderNumber}
                      </td>
                      <td style={{ padding: "14px" }}>
                        <div style={{ color: "var(--text-h)", fontWeight: 600, fontSize: "13px" }}>{o.customerName}</div>
                        <div style={{ color: "var(--muted)", fontSize: "11px" }}>{o.customerEmail}</div>
                      </td>
                      <td style={{ padding: "14px", color: "var(--text-p)", fontSize: "13px" }}>
                        {o.serviceTitle}
                        {o.configuration?.hours && (
                          <span style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>
                            {o.configuration.hours}h Booked
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "14px", fontWeight: 700, color: "var(--text-h)", fontSize: "13px" }}>
                        {o.totalAmountNgn ? `₦${Number(o.totalAmountNgn).toLocaleString("en-US")}` : "Quote TBD"}
                      </td>
                      <td style={{ padding: "14px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "10px",
                            fontWeight: 700,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            background:
                              o.orderStatus === "COMPLETED" || o.orderStatus === "DELIVERED"
                                ? "rgba(16, 185, 129, 0.15)"
                                : o.orderStatus === "IN_PROGRESS"
                                ? "rgba(56, 189, 248, 0.15)"
                                : "rgba(223, 194, 125, 0.15)",
                            color:
                              o.orderStatus === "COMPLETED" || o.orderStatus === "DELIVERED"
                                ? "#34d399"
                                : o.orderStatus === "IN_PROGRESS"
                                ? "#38bdf8"
                                : "var(--gold)",
                          }}
                        >
                          {o.orderStatus.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td style={{ padding: "14px", color: "var(--text-p)", fontSize: "12px" }}>
                        {o.agreedDeadline
                          ? new Date(o.agreedDeadline).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                              timeZone: "Africa/Lagos",
                            }) + ` ${o.deadlineTimezone || "WAT"}`
                          : <span style={{ color: "var(--muted)" }}>Not set</span>}
                      </td>
                      <td style={{ padding: "14px", textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditOrder(o)}
                          className="studio-pill-btn"
                          style={{ fontSize: "11px" }}
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activeTab === "services" ? (
        /* =========================================================
           SERVICES CATALOGUE TAB
           ========================================================= */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
          {services.map((s) => (
            <div
              key={s.id}
              style={{
                background: "rgba(13, 13, 18, 0.7)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "10px", color: "var(--gold)", textTransform: "uppercase", fontWeight: 700 }}>
                    {s.category}
                  </span>
                  <span style={{ fontSize: "11px", color: s.isActive ? "#34d399" : "#ef4444" }}>
                    {s.isActive ? "● Active" : "○ Inactive"}
                  </span>
                </div>
                <h3 style={{ fontSize: "17px", color: "var(--text-h)", margin: "0 0 6px" }}>{s.title}</h3>
                <p style={{ color: "var(--muted)", fontSize: "12px", lineHeight: 1.5, margin: "0 0 16px" }}>
                  {s.tagline || s.description}
                </p>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--gold)", marginBottom: "14px" }}>
                  {s.basePriceNgn !== null
                    ? `₦${Number(s.isHourly ? s.hourlyRateNgn : s.basePriceNgn).toLocaleString("en-US")}${s.isHourly ? " / hr" : ""}`
                    : "Price Upon Request (TBD)"}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenEditService(s)}
                className="studio-pill-btn"
                style={{ width: "100%", textAlign: "center", fontSize: "12px" }}
              >
                Edit Service Details & Price
              </button>
            </div>
          ))}
        </div>
      ) : (
        /* =========================================================
           STUDIO AVAILABILITY & SCHEDULING TAB (REQ #10)
           ========================================================= */
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Information & Default State Notice */}
          <div
            style={{
              padding: "18px 22px",
              background: "rgba(223, 194, 125, 0.08)",
              border: "1px solid rgba(223, 194, 125, 0.3)",
              borderRadius: "10px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--gold)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                🔒 Strict Scheduling Authority (WAT)
              </span>
              <span style={{ fontSize: "11px", background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", padding: "2px 8px", borderRadius: "999px", fontWeight: 700 }}>
                Default: ALL DATES UNAVAILABLE
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--text)", lineHeight: 1.5 }}>
              Clients on the public Services page cannot book sessions on any arbitrary date. They can <strong>ONLY</strong> choose dates and time slots you explicitly open below. The Cloudflare Worker API strictly rejects any order containing closed or unlisted studio appointments.
            </p>
          </div>

          {/* Open New Date Card */}
          <div
            style={{
              background: "rgba(13, 13, 18, 0.7)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "24px",
            }}
          >
            <h3 style={{ fontSize: "16px", color: "var(--text-h)", margin: "0 0 14px", fontWeight: 700 }}>
              + Open Studio Date for Client Bookings
            </h3>

            {availabilityError && (
              <div style={{ padding: "10px 14px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "6px", color: "#ef4444", fontSize: "12px", marginBottom: "16px" }}>
                {availabilityError}
              </div>
            )}

            <form onSubmit={handleAddOrUpdateAvailability} style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1.5fr auto", gap: "14px", alignItems: "end" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", marginBottom: "6px" }}>
                  Date (YYYY-MM-DD)
                </label>
                <input
                  type="date"
                  className="studio-input"
                  value={newDateInput}
                  onChange={(e) => setNewDateInput(e.target.value)}
                  style={{ width: "100%" }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", marginBottom: "6px" }}>
                  Time Slots (comma-separated, WAT)
                </label>
                <input
                  type="text"
                  className="studio-input"
                  placeholder="e.g. 10:00 AM, 02:00 PM, 06:00 PM"
                  value={newSlotsInput}
                  onChange={(e) => setNewSlotsInput(e.target.value)}
                  style={{ width: "100%" }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", marginBottom: "6px" }}>
                  Studio Notes (Optional)
                </label>
                <input
                  type="text"
                  className="studio-input"
                  placeholder="e.g. Vocal Recording Block"
                  value={newNotesInput}
                  onChange={(e) => setNewNotesInput(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>

              <button
                type="submit"
                disabled={isSavingAvailability}
                className="primary-button"
                style={{
                  height: "40px",
                  padding: "0 22px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: isSavingAvailability ? "wait" : "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {isSavingAvailability ? "Saving..." : "Open Date"}
              </button>
            </form>
          </div>

          {/* Configured Dates List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <h3 style={{ fontSize: "16px", color: "var(--text-h)", margin: 0, fontWeight: 700 }}>
              Configured Studio Dates ({availabilityList.length})
            </h3>

            {availabilityList.length === 0 ? (
              <div className="admin-empty-card" style={{ padding: "40px 20px", textAlign: "center" }}>
                <p style={{ margin: "0 0 6px", color: "var(--text)", fontWeight: 600 }}>
                  No Studio Dates Currently Open
                </p>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: "12px" }}>
                  All dates are unavailable by default. Use the form above to open dates and configure appointment time slots for client sessions.
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "16px" }}>
                {availabilityList.map((item) => {
                  const slots = Array.isArray(item.slots) ? item.slots : [];
                  return (
                    <div
                      key={item.dateStr}
                      style={{
                        background: "rgba(13, 13, 18, 0.7)",
                        border: item.isClosed
                          ? "1px solid rgba(239, 68, 68, 0.3)"
                          : "1px solid rgba(223, 194, 125, 0.3)",
                        borderRadius: "8px",
                        padding: "18px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <span style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-h)" }}>
                            {item.dateStr}
                          </span>
                          {item.notes && (
                            <span style={{ display: "block", fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                              {item.notes}
                            </span>
                          )}
                        </div>

                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 800,
                            letterSpacing: "0.08em",
                            padding: "3px 10px",
                            borderRadius: "999px",
                            background: item.isClosed ? "rgba(239, 68, 68, 0.15)" : "rgba(52, 211, 153, 0.15)",
                            color: item.isClosed ? "#ef4444" : "#34d399",
                            border: item.isClosed ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(52, 211, 153, 0.3)",
                            textTransform: "uppercase",
                          }}
                        >
                          {item.isClosed ? "Closed" : "Open for Bookings"}
                        </span>
                      </div>

                      {/* Slots */}
                      <div>
                        <span style={{ display: "block", fontSize: "11px", color: "var(--muted)", marginBottom: "6px", textTransform: "uppercase" }}>
                          Available Time Slots ({slots.length}):
                        </span>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {slots.map((s, idx) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: "11px",
                                fontWeight: 600,
                                color: "var(--gold)",
                                background: "rgba(223, 194, 125, 0.12)",
                                border: "1px solid rgba(223, 194, 125, 0.25)",
                                borderRadius: "4px",
                                padding: "2px 8px",
                              }}
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "10px", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
                        <button
                          type="button"
                          onClick={() => handleToggleCloseDate(item)}
                          className="studio-pill-btn"
                          style={{
                            fontSize: "11px",
                            color: item.isClosed ? "#34d399" : "#ef4444",
                            borderColor: item.isClosed ? "rgba(52, 211, 153, 0.3)" : "rgba(239, 68, 68, 0.3)",
                          }}
                        >
                          {item.isClosed ? "Re-open Date" : "Close Date"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteDate(item.dateStr)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#e57373",
                            fontSize: "12px",
                            cursor: "pointer",
                            padding: "4px 8px",
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================
          ORDER EDIT MODAL
          ========================================================= */}
      {editingOrder && (
        <div
          className="admin-modal-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(10px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setEditingOrder(null)}
        >
          <div
            className="admin-modal"
            style={{
              background: "#0c0c10",
              border: "1px solid var(--border)",
              borderRadius: "14px",
              maxWidth: "680px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "28px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <span style={{ fontSize: "11px", color: "var(--gold)", fontWeight: 700, textTransform: "uppercase" }}>
                  MANAGE ORDER
                </span>
                <h2 style={{ fontSize: "20px", color: "var(--text-h)", margin: "4px 0 0" }}>
                  {editingOrder.orderNumber} — {editingOrder.serviceTitle}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                style={{ background: "transparent", border: "none", color: "var(--muted)", fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveOrder} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Order Status & Payment Status */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                    Order Status
                  </label>
                  <select
                    className="studio-input"
                    value={editingOrder.orderStatus}
                    onChange={(e) => setEditingOrder({ ...editingOrder, orderStatus: e.target.value })}
                  >
                    {STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                    Payment Status
                  </label>
                  <select
                    className="studio-input"
                    value={editingOrder.paymentStatus}
                    onChange={(e) => setEditingOrder({ ...editingOrder, paymentStatus: e.target.value })}
                  >
                    {PAYMENT_STATUS_OPTIONS.map((pst) => (
                      <option key={pst} value={pst}>
                        {pst.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Price & Deadline */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                    Total Amount (NGN)
                  </label>
                  <input
                    type="number"
                    className="studio-input"
                    placeholder="Enter amount in NGN"
                    value={editingOrder.totalAmountNgn || ""}
                    onChange={(e) =>
                      setEditingOrder({
                        ...editingOrder,
                        totalAmountNgn: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                    Agreed Deadline (WAT)
                  </label>
                  <input
                    type="datetime-local"
                    className="studio-input"
                    value={editingOrder.agreedDeadlineDate || ""}
                    onChange={(e) =>
                      setEditingOrder({ ...editingOrder, agreedDeadlineDate: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Multi-Service Items (Req #20 & #31) */}
              {Array.isArray(editingOrder.items) && editingOrder.items.length > 0 && (
                <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border)", borderRadius: "8px", padding: "14px" }}>
                  <span style={{ fontSize: "11px", color: "var(--gold)", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: "8px" }}>
                    Selected Services & Configuration ({editingOrder.items.length})
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {editingOrder.items.map((it, idx) => (
                      <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "6px" }}>
                        <div>
                          <strong style={{ color: "var(--text-h)" }}>{it.title || it.slug}</strong>
                          {it.configuration?.hours && <span style={{ color: "var(--muted)", marginLeft: "6px" }}>({it.configuration.hours}h)</span>}
                          {it.configuration?.genre && <span style={{ color: "var(--muted)", marginLeft: "6px" }}>• {it.configuration.genre}</span>}
                          {it.configuration?.notes && <div style={{ fontSize: "11px", color: "var(--muted)", fontStyle: "italic" }}>"{it.configuration.notes}"</div>}
                        </div>
                        <span style={{ color: "var(--gold)", fontWeight: 700 }}>
                          {it.calculatedPriceNgn !== null ? `₦${Number(it.calculatedPriceNgn).toLocaleString()}` : "Price TBD"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Client Project Message (Req #23 & #31) */}
              {editingOrder.customerMessage && (
                <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border)", borderRadius: "8px", padding: "14px" }}>
                  <span style={{ fontSize: "11px", color: "var(--gold)", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: "4px" }}>
                    Client Project Message
                  </span>
                  <p style={{ margin: 0, fontSize: "12px", color: "var(--text-p)", fontStyle: "italic", lineHeight: 1.5 }}>
                    "{editingOrder.customerMessage}"
                  </p>
                </div>
              )}

              {/* Client Stems / Uploads */}
              <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border)", borderRadius: "8px", padding: "14px" }}>
                <span style={{ fontSize: "11px", color: "var(--gold)", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: "6px" }}>
                  Client Uploaded Files ({editingOrder.clientFiles?.length || 0})
                </span>
                {Array.isArray(editingOrder.clientFiles) && editingOrder.clientFiles.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {editingOrder.clientFiles.map((f, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
                        <span>🎵 {f.name} ({(Number(f.size) / (1024 * 1024)).toFixed(1)}MB)</span>
                        <a href={f.url} download target="_blank" rel="noopener noreferrer" style={{ color: "var(--gold)", textDecoration: "none" }}>
                          Download ↓
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: "12px", color: "var(--muted)" }}>No client files uploaded.</span>
                )}
              </div>

              {/* Deliverables Upload Section */}
              <div style={{ background: "rgba(16, 185, 129, 0.04)", border: "1px solid rgba(16, 185, 129, 0.25)", borderRadius: "8px", padding: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <div>
                    <span style={{ fontSize: "11px", color: "#34d399", textTransform: "uppercase", fontWeight: 700, display: "block" }}>
                      Final Deliverables for Client ({editingOrder.deliverables?.length || 0})
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                      Uploaded deliverables are downloadable by client once marked DELIVERED.
                    </span>
                  </div>
                  <label
                    className="studio-pill-btn"
                    style={{
                      cursor: isUploadingDeliverable ? "not-allowed" : "pointer",
                      fontSize: "11px",
                      background: "#34d399",
                      color: "#050507",
                      fontWeight: 700,
                      border: "none",
                    }}
                  >
                    {isUploadingDeliverable ? "Uploading..." : "+ Upload File"}
                    <input
                      type="file"
                      accept="audio/*,.zip,.rar"
                      onChange={handleDeliverableUpload}
                      disabled={isUploadingDeliverable}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>

                {deliverableError && (
                  <div style={{ color: "#ef4444", fontSize: "11px", marginBottom: "6px" }}>{deliverableError}</div>
                )}

                {editingOrder.deliverables?.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "10px" }}>
                    {editingOrder.deliverables.map((d, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          background: "rgba(0, 0, 0, 0.4)",
                          padding: "6px 12px",
                          borderRadius: "4px",
                          fontSize: "12px",
                        }}
                      >
                        <span>✓ {d.name}</span>
                        <button
                          type="button"
                          onClick={() => removeDeliverable(idx)}
                          style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "13px" }}
                        >
                          ✕ Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Private Admin Notes */}
              <div>
                <label style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                  Private Admin Notes (Internal Only)
                </label>
                <textarea
                  className="studio-input"
                  rows={2}
                  placeholder="Private production notes, vocal settings, reference checks..."
                  value={editingOrder.adminNotes || ""}
                  onChange={(e) => setEditingOrder({ ...editingOrder, adminNotes: e.target.value })}
                />
              </div>

              {orderSaveError && (
                <div style={{ color: "#ef4444", fontSize: "12px" }}>{orderSaveError}</div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="cookie-btn cookie-btn-reject"
                  disabled={isSavingOrder}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingOrder}
                  className="primary-button"
                  style={{ minWidth: "120px" }}
                >
                  {isSavingOrder ? <LoadingSpinner size={16} color="#000" /> : "Save Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          SERVICE EDIT MODAL
          ========================================================= */}
      {editingService && (
        <div
          className="admin-modal-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(10px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setEditingService(null)}
        >
          <div
            className="admin-modal"
            style={{
              background: "#0c0c10",
              border: "1px solid var(--border)",
              borderRadius: "14px",
              maxWidth: "580px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "28px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "20px", color: "var(--text-h)", margin: 0 }}>
                Edit {editingService.title}
              </h2>
              <button
                type="button"
                onClick={() => setEditingService(null)}
                style={{ background: "transparent", border: "none", color: "var(--muted)", fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveService} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                  Service Title
                </label>
                <input
                  type="text"
                  required
                  className="studio-input"
                  value={editingService.title}
                  onChange={(e) => setEditingService({ ...editingService, title: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                  Tagline / Short Overview
                </label>
                <input
                  type="text"
                  className="studio-input"
                  value={editingService.tagline || ""}
                  onChange={(e) => setEditingService({ ...editingService, tagline: e.target.value })}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                    Base Price (NGN) — Leave blank for TBD / Quote
                  </label>
                  <input
                    type="number"
                    className="studio-input"
                    placeholder="e.g. 80000 (or blank for TBD)"
                    value={editingService.basePriceNgn ?? ""}
                    onChange={(e) =>
                      setEditingService({
                        ...editingService,
                        basePriceNgn: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                    Turnaround (Days)
                  </label>
                  <input
                    type="number"
                    required
                    className="studio-input"
                    value={editingService.turnaroundDays}
                    onChange={(e) => setEditingService({ ...editingService, turnaroundDays: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                  Deliverables (One per line)
                </label>
                <textarea
                  className="studio-input"
                  rows={4}
                  value={editingService.deliverablesText}
                  onChange={(e) => setEditingService({ ...editingService, deliverablesText: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={editingService.isActive}
                  onChange={(e) => setEditingService({ ...editingService, isActive: e.target.checked })}
                />
                <label htmlFor="isActiveToggle" style={{ fontSize: "13px", color: "var(--text-h)", cursor: "pointer" }}>
                  Service is publicly active and bookable
                </label>
              </div>

              {serviceSaveError && (
                <div style={{ color: "#ef4444", fontSize: "12px" }}>{serviceSaveError}</div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => setEditingService(null)}
                  className="cookie-btn cookie-btn-reject"
                  disabled={isSavingService}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingService}
                  className="primary-button"
                  style={{ minWidth: "120px" }}
                >
                  {isSavingService ? <LoadingSpinner size={16} color="#000" /> : "Save Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
