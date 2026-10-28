import React, { useState, useEffect, useMemo, useCallback } from "react";
import { LoadingSpinner } from "../../components/Icons";
import { formatLongDate } from "../../utils/dateFormatter";
import { uploadWithProgress, formatBytes } from "../../utils/uploadWithProgress";
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

const PRESET_TIME_SLOTS = [
  "09:00 AM",
  "09:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "01:00 PM",
  "01:30 PM",
  "02:00 PM",
  "02:30 PM",
  "03:00 PM",
  "03:30 PM",
  "04:00 PM",
  "04:30 PM",
  "05:00 PM",
  "05:30 PM",
  "06:00 PM",
  "06:30 PM",
  "07:00 PM",
  "07:30 PM",
  "08:00 PM",
];

const SERVICE_CATEGORIES = [
  "PRODUCTION",
  "MIXING",
  "MASTERING",
  "RECORDING",
  "COLLABORATION",
];

/* =========================================================
   CUSTOM THEMED TIME SLOT PICKER (REQ #9)
   Eliminates raw OS time inputs; luxury dark/gold aesthetic
   ========================================================= */
function ThemedTimeSlotPicker({ slots, onAddSlot, onRemoveSlot }) {
  const [selectedPreset, setSelectedPreset] = useState(PRESET_TIME_SLOTS[2]); // 10:00 AM

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <label style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Active Time Slots ({slots.length})
      </label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", minHeight: "32px", alignItems: "center" }}>
        {slots.length === 0 ? (
          <span style={{ fontSize: "12px", color: "var(--muted)", fontStyle: "italic" }}>
            No slots configured (clients cannot book this date)
          </span>
        ) : (
          slots.map((slot, idx) => (
            <span
              key={idx}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 12px",
                background: "rgba(223, 194, 125, 0.15)",
                border: "1px solid var(--gold)",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: 700,
                color: "var(--gold)",
              }}
            >
              {slot}
              <button
                type="button"
                onClick={() => onRemoveSlot(idx)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--muted)",
                  cursor: "pointer",
                  fontSize: "14px",
                  lineHeight: 1,
                  padding: "0 2px",
                }}
                aria-label={`Remove slot ${slot}`}
              >
                ×
              </button>
            </span>
          ))
        )}
      </div>

      <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "4px" }}>
        <select
          value={selectedPreset}
          onChange={(e) => setSelectedPreset(e.target.value)}
          className="studio-input"
          style={{ height: "38px", padding: "0 10px", fontSize: "12px", width: "160px" }}
        >
          {PRESET_TIME_SLOTS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            if (selectedPreset && !slots.includes(selectedPreset)) {
              onAddSlot(selectedPreset);
            }
          }}
          className="studio-pill-btn"
          style={{ height: "38px", padding: "0 16px", fontSize: "12px", fontWeight: 700 }}
        >
          + Add Slot
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   INTERACTIVE MONTHLY STUDIO CALENDAR (REQ #11)
   ========================================================= */
function StudioMonthlyCalendar({ availabilityList, onSelectDate, selectedDate, onOpenBatch }) {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
  const startOffset = (firstDayIndex + 6) % 7; // Monday-first offset
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const availMap = useMemo(() => {
    const map = new Map();
    for (const item of availabilityList) {
      if (item?.dateStr) {
        map.set(item.dateStr, item);
      }
    }
    return map;
  }, [availabilityList]);

  const days = [];
  for (let i = 0; i < startOffset; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ dayNumber: d, dateStr });
  }

  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div
      style={{
        background: "rgba(10, 8, 16, 0.75)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "24px",
      }}
    >
      {/* Calendar Header with Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: "20px", color: "var(--text-h)", fontWeight: 800 }}>
            {monthNames[month]} {year}
          </h3>
          <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Studio Booking Schedule · Closed by Default
          </span>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          {onOpenBatch && (
            <button
              type="button"
              onClick={onOpenBatch}
              className="studio-pill-btn"
              style={{
                padding: "6px 14px",
                fontSize: "12px",
                color: "var(--gold)",
                borderColor: "rgba(223, 194, 125, 0.4)",
                background: "rgba(223, 194, 125, 0.1)",
                fontWeight: 700,
              }}
              title="Bulk open or configure multiple dates at once"
            >
              ⚡ Bulk Open Dates
            </button>
          )}
          <button
            type="button"
            onClick={prevMonth}
            className="studio-pill-btn"
            style={{ padding: "6px 14px", fontSize: "12px" }}
            aria-label="Previous month"
          >
            ← Prev
          </button>
          <button
            type="button"
            onClick={goToday}
            className="studio-pill-btn"
            style={{ padding: "6px 14px", fontSize: "12px" }}
          >
            Current Month
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="studio-pill-btn"
            style={{ padding: "6px 14px", fontSize: "12px" }}
            aria-label="Next month"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Weekdays Header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "8px",
          textAlign: "center",
          marginBottom: "10px",
        }}
      >
        {weekdays.map((w) => (
          <div
            key={w}
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--gold)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {w}
          </div>
        ))}
      </div>

      {/* Day Cells Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "8px",
        }}
      >
        {days.map((cell, idx) => {
          if (!cell) {
            return (
              <div
                key={`empty-${idx}`}
                style={{
                  minHeight: "78px",
                  opacity: 0.1,
                  background: "rgba(255, 255, 255, 0.02)",
                  borderRadius: "6px",
                }}
              />
            );
          }
          const item = availMap.get(cell.dateStr);
          const isOpen =
            item && !item.isClosed && Array.isArray(item.slots) && item.slots.length > 0;
          const isSelected = selectedDate === cell.dateStr;

          return (
            <div
              key={cell.dateStr}
              onClick={() => onSelectDate(cell.dateStr, item)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectDate(cell.dateStr, item);
                }
              }}
              style={{
                minHeight: "78px",
                padding: "8px",
                borderRadius: "8px",
                background: isSelected
                  ? "rgba(223, 194, 125, 0.22)"
                  : isOpen
                  ? "rgba(16, 40, 24, 0.65)"
                  : "rgba(18, 14, 24, 0.45)",
                border: isSelected
                  ? "2px solid var(--gold)"
                  : isOpen
                  ? "1px solid rgba(52, 211, 153, 0.45)"
                  : "1px solid rgba(255, 255, 255, 0.06)",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 800,
                    color: isSelected ? "var(--gold)" : "var(--text-h)",
                  }}
                >
                  {cell.dayNumber}
                </span>
                {isOpen ? (
                  <span
                    style={{
                      fontSize: "9px",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      background: "rgba(52, 211, 153, 0.25)",
                      color: "#34d399",
                      fontWeight: 800,
                    }}
                  >
                    OPEN ({item.slots.length})
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: "9px",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      background: "rgba(239, 68, 68, 0.15)",
                      color: "#ef4444",
                      fontWeight: 700,
                    }}
                  >
                    CLOSED
                  </span>
                )}
              </div>
              {item?.notes ? (
                <span
                  style={{
                    fontSize: "10px",
                    color: "var(--muted)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {item.notes}
                </span>
              ) : (
                <span style={{ fontSize: "9px", color: "var(--muted)", opacity: 0.6 }}>
                  {isOpen ? `${item.slots[0] || ""}...` : "Unavailable"}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

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

  // Deliverable Upload state (with accurate progress, Req #14)
  const [isUploadingDeliverable, setIsUploadingDeliverable] = useState(false);
  const [deliverableProgress, setDeliverableProgress] = useState(null);
  const [deliverableError, setDeliverableError] = useState(null);

  // Service Edit & Create Modals (Req #12)
  const [editingService, setEditingService] = useState(null);
  const [isSavingService, setIsSavingService] = useState(false);
  const [serviceSaveError, setServiceSaveError] = useState(null);

  const [isCreatingService, setIsCreatingService] = useState(false);
  const [isSubmittingNewService, setIsSubmittingNewService] = useState(false);
  const [createServiceError, setCreateServiceError] = useState(null);
  const [newService, setNewService] = useState({
    title: "",
    slug: "",
    tagline: "",
    description: "",
    category: "PRODUCTION",
    basePriceNgn: "",
    isHourly: false,
    hourlyRateNgn: "",
    turnaroundDays: 3,
    sortOrder: 10,
    isActive: true,
    deliverablesText: "",
  });

  // Studio Availability Management (Req #9 & Req #11)
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [selectedDaySlots, setSelectedDaySlots] = useState([
    "10:00 AM",
    "02:00 PM",
    "06:00 PM",
  ]);
  const [selectedDayIsClosed, setSelectedDayIsClosed] = useState(true);
  const [selectedDayNotes, setSelectedDayNotes] = useState("");

  // Batch Availability Modal State (Stage 38)
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchStartDate, setBatchStartDate] = useState("");
  const [batchEndDate, setBatchEndDate] = useState("");
  const [batchPreset, setBatchPreset] = useState("weekdays"); // 'all' | 'weekdays' | 'weekends'
  const [batchSlots, setBatchSlots] = useState(["10:00 AM", "02:00 PM", "06:00 PM"]);
  const [batchIsClosed, setBatchIsClosed] = useState(false);
  const [batchNotes, setBatchNotes] = useState("");
  const [isApplyingBatch, setIsApplyingBatch] = useState(false);
  const [batchSuccessMsg, setBatchSuccessMsg] = useState(null);
  const [batchError, setBatchError] = useState(null);

  const handleOpenBatchModal = () => {
    const today = new Date();
    const nextMonthEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    const startStr = today.toISOString().slice(0, 10);
    const endStr = nextMonthEnd.toISOString().slice(0, 10);
    setBatchStartDate(startStr);
    setBatchEndDate(endStr);
    setBatchPreset("weekdays");
    setBatchIsClosed(false);
    setBatchSlots(["10:00 AM", "02:00 PM", "06:00 PM"]);
    setBatchNotes("");
    setBatchError(null);
    setBatchSuccessMsg(null);
    setShowBatchModal(true);
  };

  const getBatchMatchingDates = () => {
    if (!batchStartDate || !batchEndDate || batchStartDate > batchEndDate) return [];
    const dates = [];
    let cur = new Date(batchStartDate + "T00:00:00");
    const end = new Date(batchEndDate + "T00:00:00");
    while (cur <= end) {
      const dayOfWeek = cur.getDay(); // 0: Sun, 6: Sat
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      if (
        batchPreset === "all" ||
        (batchPreset === "weekdays" && !isWeekend) ||
        (batchPreset === "weekends" && isWeekend)
      ) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, "0");
        const d = String(cur.getDate()).padStart(2, "0");
        dates.push(`${y}-${m}-${d}`);
      }
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  };

  const handleApplyBatchAvailability = async (e) => {
    e.preventDefault();
    const dates = getBatchMatchingDates();
    if (dates.length === 0) {
      setBatchError("No dates matched your selected range and preset.");
      return;
    }

    setIsApplyingBatch(true);
    setBatchError(null);
    setBatchSuccessMsg(null);

    try {
      const res = await fetch("/api/admin/services/availability/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dates,
          slots: batchIsClosed ? [] : batchSlots,
          isClosed: batchIsClosed,
          notes: batchNotes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update availability in batch");

      await fetchAvailability();
      setBatchSuccessMsg(`✓ Successfully configured ${data.affected || dates.length} studio dates!`);
      setTimeout(() => {
        setShowBatchModal(false);
        setBatchSuccessMsg(null);
      }, 1400);
    } catch (err) {
      setBatchError(err.message || "Failed to save batch availability");
    } finally {
      setIsApplyingBatch(false);
    }
  };

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

  // When a day on the calendar is selected
  const handleSelectCalendarDate = useCallback((dateStr, existingItem) => {
    setSelectedCalendarDate(dateStr);
    if (existingItem) {
      setSelectedDayIsClosed(Boolean(existingItem.isClosed));
      setSelectedDaySlots(
        Array.isArray(existingItem.slots) && existingItem.slots.length > 0
          ? [...existingItem.slots]
          : ["10:00 AM", "02:00 PM", "06:00 PM"]
      );
      setSelectedDayNotes(existingItem.notes || "");
    } else {
      // Unconfigured = Closed by default
      setSelectedDayIsClosed(true);
      setSelectedDaySlots(["10:00 AM", "02:00 PM", "06:00 PM"]);
      setSelectedDayNotes("");
    }
    setAvailabilityError(null);
  }, []);

  const handleSaveDayAvailability = async () => {
    if (!selectedCalendarDate) return;
    setIsSavingAvailability(true);
    setAvailabilityError(null);

    try {
      const res = await fetch("/api/admin/services/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateStr: selectedCalendarDate,
          slots: selectedDayIsClosed ? [] : selectedDaySlots,
          isClosed: selectedDayIsClosed,
          notes: selectedDayNotes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save availability");
      await fetchAvailability();
    } catch (err) {
      setAvailabilityError(err.message || "Failed to save availability");
    } finally {
      setIsSavingAvailability(false);
    }
  };

  const handleDeleteDayAvailability = async (dateStr) => {
    if (!dateStr) return;
    setIsSavingAvailability(true);
    try {
      await fetch(`/api/admin/services/availability/${encodeURIComponent(dateStr)}`, {
        method: "DELETE",
      });
      setSelectedDayIsClosed(true);
      await fetchAvailability();
    } catch (err) {
      setAvailabilityError(err.message);
    } finally {
      setIsSavingAvailability(false);
    }
  };

  // Order management
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

  // Deliverables upload with real byte-level progress (Req #14)
  const handleDeliverableUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingDeliverable(true);
    setDeliverableError(null);
    setDeliverableProgress({ percent: 0, loadedFormatted: "0 B", totalFormatted: formatBytes(file.size) });

    try {
      const data = await uploadWithProgress({
        url: "/api/services/upload",
        file,
        onProgress: (p) => setDeliverableProgress(p),
      });

      if (!data || !data.success) {
        throw new Error(data?.message || data?.error || "File upload failed");
      }

      setEditingOrder((prev) => ({
        ...prev,
        deliverables: [
          ...prev.deliverables,
          {
            id: data.file.id,
            name: data.file.name,
            size: data.file.size,
            type: data.file.type,
            url: data.file.url,
            uploadedAt: new Date().toISOString(),
          },
        ],
      }));
      setDeliverableProgress(null);
    } catch (err) {
      setDeliverableError(err.message);
      setDeliverableProgress(null);
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

  // Services Catalogue CRUD (Req #12)
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
          slug: editingService.slug,
          title: editingService.title,
          tagline: editingService.tagline,
          description: editingService.description,
          category: editingService.category,
          basePriceNgn: editingService.basePriceNgn,
          isHourly: editingService.isHourly,
          hourlyRateNgn: editingService.hourlyRateNgn,
          turnaroundDays: Number(editingService.turnaroundDays),
          sortOrder: Number(editingService.sortOrder ?? 10),
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

  const handleCreateService = async (e) => {
    e.preventDefault();
    if (!newService.title.trim()) {
      setCreateServiceError("Service title is required");
      return;
    }
    setIsSubmittingNewService(true);
    setCreateServiceError(null);

    try {
      const deliverables = newService.deliverablesText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newService,
          turnaroundDays: Number(newService.turnaroundDays),
          sortOrder: Number(newService.sortOrder ?? 10),
          deliverables,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create service");

      await fetchServices();
      setIsCreatingService(false);
      setNewService({
        title: "",
        slug: "",
        tagline: "",
        description: "",
        category: "PRODUCTION",
        basePriceNgn: "",
        isHourly: false,
        hourlyRateNgn: "",
        turnaroundDays: 3,
        sortOrder: 10,
        isActive: true,
        deliverablesText: "",
      });
    } catch (err) {
      setCreateServiceError(err.message);
    } finally {
      setIsSubmittingNewService(false);
    }
  };

  const handleDeleteService = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/services/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete service");
      await fetchServices();
    } catch (err) {
      alert(err.message || "Failed to delete service");
    }
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesStatus =
        statusFilter === "ALL" || o.orderStatus === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (o.orderNumber && o.orderNumber.toLowerCase().includes(q)) ||
        (o.customerName && o.customerName.toLowerCase().includes(q)) ||
        (o.customerEmail && o.customerEmail.toLowerCase().includes(q)) ||
        (o.serviceTitle && o.serviceTitle.toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [orders, statusFilter, searchQuery]);

  return (
    <div className="admin-services-page" style={{ padding: "32px 6vw 120px", maxWidth: "1280px", margin: "0 auto" }}>
      {/* Refined Header Typography & Navigation (Req #9) */}
      <div style={{ marginBottom: "28px" }}>
        <p className="eyebrow" style={{ color: "var(--gold)", margin: "0 0 6px", fontSize: "11px", letterSpacing: "0.14em" }}>
          STUDIO OPERATIONS & ARCHIVE
        </p>
        <h1 style={{ fontSize: "28px", color: "var(--text-h)", margin: "0 0 8px", fontWeight: 800 }}>
          Services & Studio Management
        </h1>
        <p style={{ color: "var(--muted)", margin: 0, fontSize: "14px", lineHeight: 1.5 }}>
          Manage client orders, track delivery milestones, curate service catalogue offerings, and set strict studio booking availability.
        </p>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          borderBottom: "1px solid var(--border)",
          paddingBottom: "14px",
          marginBottom: "28px",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("orders")}
          className={`studio-pill-btn ${activeTab === "orders" ? "is-active" : ""}`}
          style={{ fontSize: "13px", padding: "8px 18px", fontWeight: 700 }}
        >
          Client Orders ({orders.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("services")}
          className={`studio-pill-btn ${activeTab === "services" ? "is-active" : ""}`}
          style={{ fontSize: "13px", padding: "8px 18px", fontWeight: 700 }}
        >
          Services Catalogue ({services.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("schedule")}
          className={`studio-pill-btn ${activeTab === "schedule" ? "is-active" : ""}`}
          style={{ fontSize: "13px", padding: "8px 18px", fontWeight: 700 }}
        >
          Studio Availability ({availabilityList.length})
        </button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--gold)" }}>
          <LoadingSpinner size={32} />
          <p style={{ marginTop: "14px", color: "var(--muted)", fontSize: "13px" }}>Loading data...</p>
        </div>
      ) : activeTab === "orders" ? (
        /* =========================================================
           ORDERS TAB
           ========================================================= */
        <div>
          {/* Controls */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "14px",
              marginBottom: "20px",
            }}
          >
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <input
                type="text"
                placeholder="Search orders, clients, email..."
                className="studio-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: "260px" }}
              />
              <select
                className="studio-input"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: "160px" }}
              >
                <option value="ALL">All Statuses</option>
                {STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st}>
                    {st.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>
              Showing {filteredOrders.length} of {orders.length} orders
            </span>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="admin-empty-card" style={{ padding: "50px 20px", textAlign: "center" }}>
              <p style={{ margin: "0 0 6px", color: "var(--text)", fontWeight: 600 }}>No client orders found</p>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: "13px" }}>
                {searchQuery || statusFilter !== "ALL"
                  ? "Try clearing search filters."
                  : "Client orders placed on the /services page will appear here."}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--muted)", fontSize: "11px", textTransform: "uppercase" }}>
                    <th style={{ padding: "12px 14px" }}>Order #</th>
                    <th style={{ padding: "12px 14px" }}>Client</th>
                    <th style={{ padding: "12px 14px" }}>Services</th>
                    <th style={{ padding: "12px 14px" }}>Amount</th>
                    <th style={{ padding: "12px 14px" }}>Payment</th>
                    <th style={{ padding: "12px 14px" }}>Status</th>
                    <th style={{ padding: "12px 14px" }}>Agreed Deadline</th>
                    <th style={{ padding: "12px 14px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((o) => (
                    <tr
                      key={o.id}
                      style={{
                        borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                        transition: "background 0.15s ease",
                      }}
                    >
                      <td style={{ padding: "14px", fontWeight: 700, color: "var(--gold)", fontSize: "13px" }}>
                        {o.orderNumber || o.id.slice(0, 8)}
                      </td>
                      <td style={{ padding: "14px" }}>
                        <div style={{ fontWeight: 600, color: "var(--text-h)", fontSize: "13px" }}>
                          {o.customerName || "Anonymous"}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--muted)" }}>{o.customerEmail}</div>
                      </td>
                      <td style={{ padding: "14px", fontSize: "13px", color: "var(--text)" }}>
                        {o.serviceTitle || o.serviceSlug || "Studio Package"}
                      </td>
                      <td style={{ padding: "14px", fontWeight: 700, color: "var(--text-h)", fontSize: "13px" }}>
                        {o.totalAmountNgn !== null
                          ? `₦${Number(o.totalAmountNgn).toLocaleString("en-US")}`
                          : "TBD (Quote)"}
                      </td>
                      <td style={{ padding: "14px" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontWeight: 700,
                            background:
                              o.paymentStatus === "PAID"
                                ? "rgba(52, 211, 153, 0.15)"
                                : "rgba(239, 68, 68, 0.15)",
                            color: o.paymentStatus === "PAID" ? "#34d399" : "#ef4444",
                          }}
                        >
                          {o.paymentStatus}
                        </span>
                      </td>
                      <td style={{ padding: "14px" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontWeight: 700,
                            background: "rgba(223, 194, 125, 0.12)",
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
                          ? formatLongDate(o.agreedDeadline) + (o.deadlineTimezone ? ` (${o.deadlineTimezone})` : "")
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
           SERVICES CATALOGUE TAB (FULL CRUD, REQ #12)
           ========================================================= */
        <div>
          {/* Header Action Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div>
              <h3 style={{ margin: "0 0 4px", fontSize: "18px", color: "var(--text-h)", fontWeight: 700 }}>
                Active Offerings ({services.length})
              </h3>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)" }}>
                Curate studio offerings, base prices, hourly billing, and deliverables.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreatingService(true)}
              className="primary-button"
              style={{ padding: "8px 20px", fontSize: "13px", fontWeight: 700 }}
            >
              + Create New Service
            </button>
          </div>

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
                  gap: "16px",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "10px", color: "var(--gold)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.08em" }}>
                      {s.category} · #{s.sortOrder ?? 0}
                    </span>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: s.isActive ? "#34d399" : "#ef4444" }}>
                      {s.isActive ? "● Active" : "○ Inactive"}
                    </span>
                  </div>
                  <h3 style={{ fontSize: "18px", color: "var(--text-h)", margin: "0 0 6px", fontWeight: 700 }}>
                    {s.title}
                  </h3>
                  <p style={{ color: "var(--muted)", fontSize: "12px", lineHeight: 1.5, margin: "0 0 14px" }}>
                    {s.tagline || s.description}
                  </p>
                  <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--gold)", marginBottom: "8px" }}>
                    {s.basePriceNgn !== null
                      ? `₦${Number(s.isHourly ? s.hourlyRateNgn : s.basePriceNgn).toLocaleString("en-US")}${s.isHourly ? " / hr" : ""}`
                      : "Price Upon Request (TBD)"}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                    Turnaround: ~{s.turnaroundDays} business days
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={() => handleOpenEditService(s)}
                    className="studio-pill-btn"
                    style={{ flex: 1, textAlign: "center", fontSize: "12px" }}
                  >
                    Edit Details
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteService(s.id, s.title)}
                    className="cookie-btn cookie-btn-reject"
                    style={{ padding: "6px 12px", fontSize: "12px" }}
                    title="Delete service"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* =========================================================
           STUDIO AVAILABILITY & SCHEDULING TAB (REQ #9 & #11)
           Interactive Themed Monthly Calendar + Day Inspector
           ========================================================= */
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
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
              Clients on the public Services page cannot book sessions on any arbitrary date. They can <strong>ONLY</strong> choose dates and time slots you explicitly open below. Click any date on the calendar to open or close it.
            </p>
          </div>

          {/* Interactive Monthly Calendar + Day Inspector (Stage 35 — Polish & Clean Hierarchy) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            {/* Top: Themed Monthly Calendar (Spacious & Prominent) */}
            <StudioMonthlyCalendar
              availabilityList={availabilityList}
              selectedDate={selectedCalendarDate}
              onSelectDate={handleSelectCalendarDate}
              onOpenBatch={handleOpenBatchModal}
            />

            {/* Bottom: Selected Day Inspector Card (Intentional, Balanced Full-Width Layout) */}
            <div
              style={{
                background: "rgba(13, 13, 18, 0.85)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "clamp(20px, 3vw, 28px)",
                display: "flex",
                flexDirection: "column",
                gap: "20px",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
              }}
            >
              {/* Card Header: Balanced Title & Centered Status Badge */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px",
                  paddingBottom: "16px",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "var(--gold)",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      display: "block",
                      marginBottom: "4px",
                    }}
                  >
                    Studio Date Configuration
                  </span>
                  <h3 style={{ margin: 0, fontSize: "clamp(18px, 2.5vw, 22px)", color: "var(--text-h)", fontWeight: 800 }}>
                    {formatLongDate(selectedCalendarDate)}
                  </h3>
                </div>

                {/* Status Indicator (Centered & Aligned) */}
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      fontSize: "12px",
                      fontWeight: 800,
                      letterSpacing: "0.06em",
                      padding: "6px 14px",
                      borderRadius: "999px",
                      background: selectedDayIsClosed ? "rgba(239, 68, 68, 0.15)" : "rgba(52, 211, 153, 0.15)",
                      border: selectedDayIsClosed ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid rgba(52, 211, 153, 0.4)",
                      color: selectedDayIsClosed ? "#ef4444" : "#34d399",
                      textTransform: "uppercase",
                      textAlign: "center",
                    }}
                  >
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: selectedDayIsClosed ? "#ef4444" : "#34d399",
                        boxShadow: selectedDayIsClosed ? "0 0 6px rgba(239, 68, 68, 0.6)" : "0 0 6px rgba(52, 211, 153, 0.6)",
                      }}
                    />
                    {selectedDayIsClosed ? "CLOSED" : "OPEN FOR BOOKINGS"}
                  </span>
                </div>
              </div>

              {availabilityError && (
                <div style={{ padding: "12px 16px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "6px", color: "#ef4444", fontSize: "12px" }}>
                  {availabilityError}
                </div>
              )}

              {/* Status Toggle & Notes Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "20px",
                }}
              >
                {/* Status Toggle */}
                <div>
                  <label style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "8px" }}>
                    Session Availability Status
                  </label>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      type="button"
                      onClick={() => setSelectedDayIsClosed(false)}
                      style={{
                        flex: 1,
                        padding: "10px 16px",
                        borderRadius: "6px",
                        border: !selectedDayIsClosed ? "1px solid #34d399" : "1px solid var(--border)",
                        background: !selectedDayIsClosed ? "rgba(52, 211, 153, 0.2)" : "rgba(255, 255, 255, 0.03)",
                        color: !selectedDayIsClosed ? "#34d399" : "var(--muted)",
                        fontWeight: 700,
                        fontSize: "12px",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      ✓ Open Studio
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDayIsClosed(true)}
                      style={{
                        flex: 1,
                        padding: "10px 16px",
                        borderRadius: "6px",
                        border: selectedDayIsClosed ? "1px solid #ef4444" : "1px solid var(--border)",
                        background: selectedDayIsClosed ? "rgba(239, 68, 68, 0.2)" : "rgba(255, 255, 255, 0.03)",
                        color: selectedDayIsClosed ? "#ef4444" : "var(--muted)",
                        fontWeight: 700,
                        fontSize: "12px",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      ✕ Set Closed
                    </button>
                  </div>
                </div>

                {/* Studio Notes */}
                <div>
                  <label style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "8px" }}>
                    Studio Notes & Label (Optional)
                  </label>
                  <input
                    type="text"
                    className="studio-input"
                    placeholder="e.g. Vocal Recording Block / Priority Session"
                    value={selectedDayNotes}
                    onChange={(e) => setSelectedDayNotes(e.target.value)}
                    style={{ width: "100%", height: "40px" }}
                  />
                </div>
              </div>

              {/* Themed Time Slots Picker */}
              {!selectedDayIsClosed && (
                <div style={{ paddingTop: "6px", borderTop: "1px solid rgba(255, 255, 255, 0.06)" }}>
                  <ThemedTimeSlotPicker
                    slots={selectedDaySlots}
                    onAddSlot={(newSlot) => setSelectedDaySlots((prev) => [...prev, newSlot])}
                    onRemoveSlot={(idx) => setSelectedDaySlots((prev) => prev.filter((_, i) => i !== idx))}
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  paddingTop: "14px",
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                  justifyContent: "flex-end",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={() => handleDeleteDayAvailability(selectedCalendarDate)}
                  disabled={isSavingAvailability}
                  className="studio-pill-btn"
                  style={{
                    padding: "10px 18px",
                    fontSize: "12px",
                    minWidth: "140px",
                    color: "#ef4444",
                    borderColor: "rgba(239, 68, 68, 0.4)",
                    background: "rgba(239, 68, 68, 0.08)",
                    fontWeight: 700,
                  }}
                  title="Reset date configuration back to default closed"
                >
                  ✕ Reset to Closed
                </button>
                <button
                  type="button"
                  onClick={handleSaveDayAvailability}
                  disabled={isSavingAvailability}
                  className="primary-button"
                  style={{ padding: "10px 24px", fontSize: "13px", fontWeight: 700, minWidth: "160px" }}
                >
                  {isSavingAvailability ? "Saving..." : "Save Availability"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
         CREATE NEW SERVICE MODAL (REQ #12)
         ========================================================= */}
      {isCreatingService && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(10px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setIsCreatingService(false)}
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
              <h2 style={{ fontSize: "20px", color: "var(--text-h)", margin: 0, fontWeight: 700 }}>
                + Add New Service Offering
              </h2>
              <button
                type="button"
                onClick={() => setIsCreatingService(false)}
                style={{ background: "transparent", border: "none", color: "var(--muted)", fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateService} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                  Service Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Stem Mastering"
                  className="studio-input"
                  value={newService.title}
                  onChange={(e) => {
                    const t = e.target.value;
                    const autoSlug = t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
                    setNewService((prev) => ({ ...prev, title: t, slug: prev.slug || autoSlug }));
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                    URL Slug *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. stem-mastering"
                    className="studio-input"
                    value={newService.slug}
                    onChange={(e) => setNewService({ ...newService, slug: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                    Category
                  </label>
                  <select
                    className="studio-input"
                    value={newService.category}
                    onChange={(e) => setNewService({ ...newService, category: e.target.value })}
                  >
                    {SERVICE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                  Tagline / Conversational Prompt
                </label>
                <input
                  type="text"
                  placeholder="e.g. Precision audio mastering for multitrack stems"
                  className="studio-input"
                  value={newService.tagline}
                  onChange={(e) => setNewService({ ...newService, tagline: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                  Full Description
                </label>
                <textarea
                  className="studio-input"
                  rows={3}
                  placeholder="Detailed description of studio engineering and delivery..."
                  value={newService.description}
                  onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                    Base Price (NGN) — Blank for TBD
                  </label>
                  <input
                    type="number"
                    className="studio-input"
                    placeholder="e.g. 50000"
                    value={newService.basePriceNgn}
                    onChange={(e) => setNewService({ ...newService, basePriceNgn: e.target.value })}
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
                    value={newService.turnaroundDays}
                    onChange={(e) => setNewService({ ...newService, turnaroundDays: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <input
                  type="checkbox"
                  id="newIsHourly"
                  checked={newService.isHourly}
                  onChange={(e) => setNewService({ ...newService, isHourly: e.target.checked })}
                />
                <label htmlFor="newIsHourly" style={{ fontSize: "13px", color: "var(--text)", cursor: "pointer" }}>
                  Billed hourly (e.g. In-studio recording)
                </label>
              </div>

              {newService.isHourly && (
                <div>
                  <label style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                    Hourly Rate (NGN)
                  </label>
                  <input
                    type="number"
                    className="studio-input"
                    placeholder="e.g. 25000"
                    value={newService.hourlyRateNgn}
                    onChange={(e) => setNewService({ ...newService, hourlyRateNgn: e.target.value })}
                  />
                </div>
              )}

              <div>
                <label style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                  Deliverables (One per line)
                </label>
                <textarea
                  className="studio-input"
                  rows={3}
                  placeholder="Master WAV File&#10;Tracked-out Stems&#10;Instrumental Mix"
                  value={newService.deliverablesText}
                  onChange={(e) => setNewService({ ...newService, deliverablesText: e.target.value })}
                />
              </div>

              {createServiceError && (
                <div style={{ color: "#ef4444", fontSize: "12px" }}>{createServiceError}</div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => setIsCreatingService(false)}
                  className="cookie-btn cookie-btn-reject"
                  disabled={isSubmittingNewService}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNewService}
                  className="primary-button"
                  style={{ minWidth: "140px" }}
                >
                  {isSubmittingNewService ? <LoadingSpinner size={16} color="#000" /> : "Create Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
         EDIT SERVICE MODAL
         ========================================================= */}
      {editingService && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.85)",
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
              <h2 style={{ fontSize: "20px", color: "var(--text-h)", margin: 0, fontWeight: 700 }}>
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
                    Category
                  </label>
                  <select
                    className="studio-input"
                    value={editingService.category}
                    onChange={(e) => setEditingService({ ...editingService, category: e.target.value })}
                  >
                    {SERVICE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                    Sort Order
                  </label>
                  <input
                    type="number"
                    className="studio-input"
                    value={editingService.sortOrder ?? 10}
                    onChange={(e) => setEditingService({ ...editingService, sortOrder: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                    Base Price (NGN) — Blank for TBD
                  </label>
                  <input
                    type="number"
                    className="studio-input"
                    placeholder="e.g. 80000"
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

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <input
                  type="checkbox"
                  id="editIsHourly"
                  checked={editingService.isHourly}
                  onChange={(e) => setEditingService({ ...editingService, isHourly: e.target.checked })}
                />
                <label htmlFor="editIsHourly" style={{ fontSize: "13px", color: "var(--text)", cursor: "pointer" }}>
                  Billed hourly (e.g. In-studio vocal recording)
                </label>
              </div>

              {editingService.isHourly && (
                <div>
                  <label style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                    Hourly Rate (NGN)
                  </label>
                  <input
                    type="number"
                    className="studio-input"
                    placeholder="e.g. 25000"
                    value={editingService.hourlyRateNgn ?? ""}
                    onChange={(e) =>
                      setEditingService({
                        ...editingService,
                        hourlyRateNgn: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </div>
              )}

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

      {/* =========================================================
         EDIT ORDER MODAL (DELIVERABLES UPLOAD WITH PROGRESS, REQ #14)
         ========================================================= */}
      {editingOrder && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.85)",
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
                <h2 style={{ fontSize: "20px", color: "var(--text-h)", margin: 0, fontWeight: 700 }}>
                  Manage Order: {editingOrder.orderNumber || editingOrder.id.slice(0, 8)}
                </h2>
                <span style={{ fontSize: "12px", color: "var(--gold)" }}>
                  {editingOrder.serviceTitle || editingOrder.serviceSlug}
                </span>
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
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

              {/* Deadline */}
              <div>
                <label style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                  Agreed Milestone / Delivery Deadline
                </label>
                <input
                  type="datetime-local"
                  className="studio-input"
                  value={editingOrder.agreedDeadlineDate || ""}
                  onChange={(e) => setEditingOrder({ ...editingOrder, agreedDeadlineDate: e.target.value })}
                />
              </div>

              {/* Deliverables Upload (Req #14: uploadWithProgress) */}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
                <label style={{ fontSize: "11px", color: "var(--gold)", textTransform: "uppercase", display: "block", marginBottom: "6px", fontWeight: 700 }}>
                  Order Deliverables & Master Files
                </label>
                <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "10px" }}>
                  <label
                    className="studio-pill-btn"
                    style={{
                      cursor: isUploadingDeliverable ? "wait" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "12px",
                    }}
                  >
                    {isUploadingDeliverable ? <LoadingSpinner size={14} /> : "+ Upload Deliverable File"}
                    <input
                      type="file"
                      onChange={handleDeliverableUpload}
                      disabled={isUploadingDeliverable}
                      style={{ display: "none" }}
                    />
                  </label>
                  {isUploadingDeliverable && deliverableProgress && (
                    <span style={{ fontSize: "12px", color: "var(--gold)" }}>
                      {deliverableProgress.percent}% ({deliverableProgress.loadedFormatted} / {deliverableProgress.totalFormatted})
                    </span>
                  )}
                </div>

                {isUploadingDeliverable && deliverableProgress && (
                  <div style={{ width: "100%", height: "4px", background: "rgba(255, 255, 255, 0.1)", borderRadius: "2px", overflow: "hidden", marginBottom: "10px" }}>
                    <div style={{ width: `${deliverableProgress.percent}%`, height: "100%", background: "var(--gold)", transition: "width 0.1s linear" }} />
                  </div>
                )}

                {deliverableError && (
                  <div style={{ color: "#ef4444", fontSize: "12px", marginBottom: "8px" }}>
                    {deliverableError}
                  </div>
                )}

                {editingOrder.deliverables && editingOrder.deliverables.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
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
                        <span>✓ {d.name} {d.size ? `(${formatBytes(d.size)})` : ""}</span>
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
                  rows={3}
                  value={editingOrder.adminNotes || ""}
                  onChange={(e) => setEditingOrder({ ...editingOrder, adminNotes: e.target.value })}
                />
              </div>

              {orderSaveError && (
                <div style={{ color: "#ef4444", fontSize: "12px" }}>{orderSaveError}</div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
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

      {/* Batch Availability Modal (Stage 38) */}
      {showBatchModal && (
        <div className="modal-overlay" onClick={() => !isApplyingBatch && setShowBatchModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "580px",
              width: "92%",
              background: "rgba(18, 18, 24, 0.98)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              padding: "clamp(20px, 3vw, 28px)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.7)",
              color: "var(--text-main)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                paddingBottom: "14px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "11px",
                    color: "var(--gold)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  ⚡ Bulk Schedule Setup
                </span>
                <h3 style={{ margin: 0, fontSize: "20px", color: "var(--text-h)", fontWeight: 800 }}>
                  Configure Multiple Studio Dates
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                disabled={isApplyingBatch}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--muted)",
                  fontSize: "20px",
                  cursor: "pointer",
                  padding: "4px 8px",
                }}
              >
                ✕
              </button>
            </div>

            {batchError && (
              <div style={{ padding: "12px 16px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "6px", color: "#ef4444", fontSize: "12px", marginBottom: "16px" }}>
                {batchError}
              </div>
            )}
            {batchSuccessMsg && (
              <div style={{ padding: "12px 16px", background: "rgba(52, 211, 153, 0.15)", border: "1px solid rgba(52, 211, 153, 0.3)", borderRadius: "6px", color: "#34d399", fontSize: "12px", marginBottom: "16px" }}>
                {batchSuccessMsg}
              </div>
            )}

            <form onSubmit={handleApplyBatchAvailability} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              {/* Date Range Inputs */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>
                    From Date
                  </label>
                  <input
                    type="date"
                    className="studio-input"
                    value={batchStartDate}
                    onChange={(e) => setBatchStartDate(e.target.value)}
                    required
                    style={{ width: "100%", height: "40px" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>
                    To Date
                  </label>
                  <input
                    type="date"
                    className="studio-input"
                    value={batchEndDate}
                    onChange={(e) => setBatchEndDate(e.target.value)}
                    required
                    style={{ width: "100%", height: "40px" }}
                  />
                </div>
              </div>

              {/* Day Preset Selector */}
              <div>
                <label style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "8px" }}>
                  Apply To Which Days?
                </label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {[
                    { id: "weekdays", label: "Weekdays (Mon – Fri)" },
                    { id: "weekends", label: "Weekends (Sat – Sun)" },
                    { id: "all", label: "All Days (Mon – Sun)" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setBatchPreset(p.id)}
                      className="studio-pill-btn"
                      style={{
                        padding: "6px 14px",
                        fontSize: "12px",
                        color: batchPreset === p.id ? "var(--gold)" : "var(--muted)",
                        borderColor: batchPreset === p.id ? "var(--gold)" : "var(--border)",
                        background: batchPreset === p.id ? "rgba(223, 194, 125, 0.15)" : "transparent",
                        fontWeight: batchPreset === p.id ? 700 : 500,
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Toggle */}
              <div>
                <label style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "8px" }}>
                  Studio Availability Action
                </label>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setBatchIsClosed(false)}
                    style={{
                      flex: 1,
                      padding: "10px 16px",
                      borderRadius: "6px",
                      border: !batchIsClosed ? "1px solid #34d399" : "1px solid var(--border)",
                      background: !batchIsClosed ? "rgba(52, 211, 153, 0.2)" : "rgba(255, 255, 255, 0.03)",
                      color: !batchIsClosed ? "#34d399" : "var(--muted)",
                      fontWeight: 700,
                      fontSize: "12px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    ✓ Open Studio For Bookings
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchIsClosed(true)}
                    style={{
                      flex: 1,
                      padding: "10px 16px",
                      borderRadius: "6px",
                      border: batchIsClosed ? "1px solid #ef4444" : "1px solid var(--border)",
                      background: batchIsClosed ? "rgba(239, 68, 68, 0.2)" : "rgba(255, 255, 255, 0.03)",
                      color: batchIsClosed ? "#ef4444" : "var(--muted)",
                      fontWeight: 700,
                      fontSize: "12px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    ✕ Set Studio Closed
                  </button>
                </div>
              </div>

              {/* Optional Notes */}
              <div>
                <label style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>
                  Schedule Label / Notes (Optional)
                </label>
                <input
                  type="text"
                  className="studio-input"
                  placeholder="e.g. Standard Recording Hours / Weekend Sessions"
                  value={batchNotes}
                  onChange={(e) => setBatchNotes(e.target.value)}
                  style={{ width: "100%", height: "40px" }}
                />
              </div>

              {/* Time Slots when Open */}
              {!batchIsClosed && (
                <div style={{ paddingTop: "6px", borderTop: "1px solid rgba(255, 255, 255, 0.06)" }}>
                  <ThemedTimeSlotPicker
                    slots={batchSlots}
                    onAddSlot={(newSlot) => setBatchSlots((prev) => [...prev, newSlot])}
                    onRemoveSlot={(idx) => setBatchSlots((prev) => prev.filter((_, i) => i !== idx))}
                  />
                </div>
              )}

              {/* Summary of matching dates */}
              <div
                style={{
                  padding: "12px 16px",
                  background: "rgba(223, 194, 125, 0.08)",
                  border: "1px solid rgba(223, 194, 125, 0.25)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "var(--text-h)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>Matching studio dates to update:</span>
                <strong style={{ color: "var(--gold)", fontSize: "14px" }}>
                  {getBatchMatchingDates().length} dates
                </strong>
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="studio-pill-btn"
                  disabled={isApplyingBatch}
                  style={{ padding: "10px 18px", fontSize: "12px" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isApplyingBatch || getBatchMatchingDates().length === 0}
                  className="primary-button"
                  style={{ minWidth: "160px", padding: "10px 20px", fontSize: "13px", fontWeight: 700 }}
                >
                  {isApplyingBatch
                    ? "Applying Schedule..."
                    : `Apply to ${getBatchMatchingDates().length} Dates`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
