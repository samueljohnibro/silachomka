import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import SeoHead from "../components/SeoHead";
import { LoadingSpinner, LeftArrowIcon, RightArrowIcon } from "../components/Icons";
import { formatLongDate } from "../utils/dateFormatter";

const STATUS_ORDER = [
  "AWAITING_PAYMENT",
  "PAID",
  "IN_PROGRESS",
  "DELIVERED",
  "COMPLETED",
];

const STATUS_LABELS = {
  DRAFT: "Draft Created",
  AWAITING_PAYMENT: "Awaiting Payment",
  PAID: "Payment Confirmed",
  IN_PROGRESS: "In Production",
  DELIVERED: "Files Delivered",
  COMPLETED: "Completed",
  REFUND_PENDING: "Refund Pending",
  REFUNDED: "Refunded",
};

export default function ServiceOrderDetailPage() {
  const { orderNumber } = useParams();
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isInitializingPayment, setIsInitializingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [paymentNotice, setPaymentNotice] = useState(null);
  const [hasCopiedOrderNumber, setHasCopiedOrderNumber] = useState(false);

  // Check for Paystack redirect parameters (?reference=... or ?trxref=... or ?paid=true)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference") || params.get("trxref");
    if (reference && order && order.paymentStatus !== "PAID") {
      fetch("/api/services/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, orderNumber: order.orderNumber })
      })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setPaymentNotice("Payment verified successfully! Studio production is now authorized.");
          setOrder(prev => ({ ...prev, paymentStatus: "PAID", orderStatus: "PAID" }));
        }
      })
      .catch(console.warn);
    }
  }, [order]);

  const copyOrderNumber = () => {
    if (!order?.orderNumber) return;
    navigator.clipboard.writeText(order.orderNumber).then(() => {
      setHasCopiedOrderNumber(true);
      setTimeout(() => setHasCopiedOrderNumber(false), 2400);
    }).catch(() => {});
  };

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetch(`/api/services/orders/${encodeURIComponent(orderNumber)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Order not found");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setOrder(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Unable to locate order");
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [orderNumber]);

  const handlePayNow = async () => {
    if (!order) return;
    setIsInitializingPayment(true);
    setPaymentError(null);
    setPaymentNotice(null);

    try {
      const res = await fetch(`/api/services/orders/${encodeURIComponent(order.orderNumber)}/payment`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || "Payment initialization failed");
      }

      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        setPaymentNotice(
          data.message || `Payment Reference: ${data.reference}. Please complete direct transfer and notify studio.`
        );
      }
    } catch (err) {
      setPaymentError(err.message);
    } finally {
      setIsInitializingPayment(false);
    }
  };

  const formattedDeadline = order?.agreedDeadline
    ? `${formatLongDate(order.agreedDeadline)}${order.deadlineTimezone ? ` (${order.deadlineTimezone})` : ""}`
    : null;

  return (
    <main style={{ minHeight: "100vh", position: "relative", padding: "80px 7vw 120px" }}>
      <SeoHead
        title={`Order ${orderNumber} | chomkaMUSIC™ Studio`}
        description={`Track order status and deliverables for ${orderNumber}.`}
        path={`/services/order/${orderNumber}`}
        image="/beats-image.png"
        type="website"
      />

      {/* Atmospheric Starry Background */}
      <div className="product-ambient-backdrop" aria-hidden="true">
        <div className="ambient-image-layer" style={{ backgroundImage: "url('/beats-image.png')" }} />
        <div className="ambient-gradient-overlay" />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: "880px", margin: "0 auto" }}>
        {/* Navigation */}
        <div style={{ marginBottom: "28px" }}>
          <Link to="/services" className="release-breadcrumb" style={{ margin: 0 }}>
            <LeftArrowIcon /> Back to All Services
          </Link>
        </div>

        {isLoading ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <LoadingSpinner size={32} color="var(--gold)" />
            <p style={{ color: "var(--muted)", fontSize: "14px", marginTop: "16px" }}>
              Retrieving studio order details...
            </p>
          </div>
        ) : error || !order ? (
          <div
            style={{
              textAlign: "center",
              background: "rgba(10, 10, 14, 0.8)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "48px 24px",
            }}
          >
            <h2 style={{ color: "var(--text-h)", fontSize: "22px", margin: "0 0 12px" }}>Order Not Found</h2>
            <p style={{ color: "var(--muted)", fontSize: "14px", margin: "0 0 24px" }}>
              We could not find an order matching reference: <strong style={{ color: "var(--gold)" }}>{orderNumber}</strong>.
            </p>
            <Link to="/services" className="primary-button" style={{ display: "inline-flex" }}>
              Explore Services
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Order Header Card */}
            <div
              style={{
                background: "rgba(13, 13, 18, 0.82)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                border: "1px solid rgba(223, 194, 125, 0.25)",
                borderRadius: "14px",
                padding: "32px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                    <span style={{ fontSize: "11px", color: "var(--gold)", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700 }}>
                      STUDIO SESSION
                    </span>
                    <span style={{ color: "var(--border)" }}>•</span>
                    <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                      {formatLongDate(order.createdAt)}
                    </span>
                  </div>
                  <h1 style={{ fontSize: "28px", color: "var(--text-h)", margin: "0 0 6px", letterSpacing: "-0.01em" }}>
                    {order.serviceTitle}
                  </h1>
                  <span style={{ fontSize: "13px", color: "var(--muted)" }}>
                    Client: <strong style={{ color: "var(--text-p)" }}>{order.customerName}</strong> ({order.customerEmail})
                  </span>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      display: "inline-block",
                      padding: "6px 14px",
                      borderRadius: "999px",
                      fontSize: "12px",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      background:
                        order.orderStatus === "COMPLETED" || order.orderStatus === "DELIVERED"
                          ? "rgba(16, 185, 129, 0.15)"
                          : order.orderStatus === "IN_PROGRESS"
                          ? "rgba(56, 189, 248, 0.15)"
                          : "rgba(223, 194, 125, 0.15)",
                      color:
                        order.orderStatus === "COMPLETED" || order.orderStatus === "DELIVERED"
                          ? "#34d399"
                          : order.orderStatus === "IN_PROGRESS"
                          ? "#38bdf8"
                          : "var(--gold)",
                      border: "1px solid currentColor",
                    }}
                  >
                    {STATUS_LABELS[order.orderStatus] || order.orderStatus}
                  </div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "6px" }}>
                    <span style={{ fontSize: "12px", color: "var(--gold)", fontFamily: "monospace", letterSpacing: "0.06em" }}>
                      #{order.orderNumber}
                    </span>
                    <button
                      type="button"
                      onClick={copyOrderNumber}
                      style={{
                        padding: "2px 8px",
                        borderRadius: "3px",
                        border: "1px solid var(--line-gold)",
                        background: hasCopiedOrderNumber ? "var(--gold)" : "rgba(223, 194, 125, 0.1)",
                        color: hasCopiedOrderNumber ? "#050507" : "var(--gold)",
                        fontSize: "9px",
                        fontWeight: 800,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        cursor: "pointer",
                      }}
                    >
                      {hasCopiedOrderNumber ? "COPIED" : "COPY"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Progress Milestones Bar */}
              <div style={{ margin: "28px 0 10px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px", position: "relative" }}>
                  {STATUS_ORDER.map((step, idx) => {
                    const currentIdx = STATUS_ORDER.indexOf(order.orderStatus);
                    const isDone = currentIdx >= idx;
                    const isCurrent = order.orderStatus === step;

                    return (
                      <div key={step} style={{ textAlign: "center" }}>
                        <div
                          style={{
                            height: "4px",
                            borderRadius: "2px",
                            background: isDone ? "var(--gold)" : "rgba(255, 255, 255, 0.1)",
                            marginBottom: "8px",
                            transition: "background 0.3s ease",
                          }}
                        />
                        <span
                          style={{
                            fontSize: "10px",
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            fontWeight: isCurrent ? 800 : isDone ? 600 : 400,
                            color: isCurrent ? "var(--gold)" : isDone ? "var(--text-p)" : "var(--muted)",
                            display: "block",
                          }}
                        >
                          {STATUS_LABELS[step] || step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Delivery Deadline & Payment Action */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
              {/* Deadline Card */}
              <div
                style={{
                  background: "rgba(13, 13, 18, 0.72)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  padding: "24px",
                }}
              >
                <div style={{ fontSize: "11px", color: "var(--gold)", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700, marginBottom: "8px" }}>
                  Delivery Timeline
                </div>
                {formattedDeadline ? (
                  <>
                    <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-h)", marginBottom: "4px" }}>
                      {formattedDeadline}
                    </div>
                    <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                      Explicit Timezone: {order.deadlineTimezone || "WAT"} (West Africa Time)
                    </span>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-h)", marginBottom: "4px" }}>
                      Estimated {order.turnaroundDays || 5} Business Days
                    </div>
                    <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                      Creator will lock in exact delivery timestamp upon review.
                    </span>
                  </>
                )}
              </div>

              {/* Total & Payment Status Card */}
              <div
                style={{
                  background: "rgba(13, 13, 18, 0.72)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontSize: "11px", color: "var(--gold)", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700, marginBottom: "8px" }}>
                    Session Total
                  </div>
                  <div style={{ fontSize: "26px", fontWeight: 800, color: "var(--gold)", letterSpacing: "-0.01em" }}>
                    {order.totalAmountNgn ? `₦${order.totalAmountNgn.toLocaleString("en-US")}` : "Quote On Request"}
                  </div>
                  <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                    Payment Status: <strong style={{ color: order.paymentStatus === "PAID" ? "#34d399" : "var(--gold)" }}>{order.paymentStatus}</strong>
                  </span>
                </div>

                {order.orderStatus === "AWAITING_PAYMENT" && order.totalAmountNgn && (
                  <div style={{ marginTop: "16px" }}>
                    <button
                      type="button"
                      onClick={handlePayNow}
                      disabled={isInitializingPayment}
                      className="primary-button"
                      style={{ width: "100%", padding: "10px 16px", fontSize: "12px" }}
                    >
                      {isInitializingPayment ? <LoadingSpinner size={16} color="#050507" /> : "Pay Now (Card / Bank) →"}
                    </button>
                    {paymentError && (
                      <div style={{ color: "#ef4444", fontSize: "11px", marginTop: "6px" }}>{paymentError}</div>
                    )}
                    {paymentNotice && (
                      <div style={{ color: "var(--gold)", fontSize: "11px", marginTop: "6px", lineHeight: 1.4 }}>
                        {paymentNotice}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Deliverables Section (Active when DELIVERED or COMPLETED) */}
            {Array.isArray(order.deliverables) && order.deliverables.length > 0 && (
              <div
                style={{
                  background: "rgba(16, 185, 129, 0.05)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  borderRadius: "12px",
                  padding: "26px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                  <span style={{ color: "#34d399", fontSize: "18px" }}>✓</span>
                  <h3 style={{ fontSize: "18px", color: "var(--text-h)", margin: 0 }}>
                    Final Deliverables Ready
                  </h3>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {order.deliverables.map((d, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: "rgba(0, 0, 0, 0.5)",
                        padding: "12px 18px",
                        borderRadius: "8px",
                        flexWrap: "wrap",
                        gap: "10px",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--text-h)", fontSize: "14px" }}>
                          🎵 {d.name || d.title || `Deliverable File #${idx + 1}`}
                        </div>
                        {d.size && (
                          <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                            {(Number(d.size) / (1024 * 1024)).toFixed(1)} MB
                          </span>
                        )}
                      </div>
                      <a
                        href={d.url}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="studio-pill-btn"
                        style={{
                          background: "var(--gold)",
                          color: "#050507",
                          fontWeight: 700,
                          fontSize: "12px",
                          border: "none",
                          textDecoration: "none",
                        }}
                      >
                        Download Master File ↓
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Multi-Service Items Breakdown (Req #20 & #24) */}
            {Array.isArray(order.items) && order.items.length > 0 && (
              <div
                style={{
                  background: "rgba(13, 13, 18, 0.72)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  padding: "24px",
                }}
              >
                <div style={{ fontSize: "11px", color: "var(--gold)", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700, marginBottom: "14px" }}>
                  Selected Studio Services ({order.items.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {order.items.map((it, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px 16px",
                        borderRadius: "6px",
                        background: "rgba(5, 5, 7, 0.5)",
                        border: "1px solid rgba(223, 194, 125, 0.12)",
                      }}
                    >
                      <div>
                        <strong style={{ color: "var(--text-h)", fontSize: "14px", display: "block" }}>
                          {it.title || it.slug}
                        </strong>
                        {it.configuration?.hours && (
                          <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                            {it.configuration.hours} hours
                          </span>
                        )}
                        {it.configuration?.genre && (
                          <span style={{ fontSize: "11px", color: "var(--muted)", marginLeft: "6px" }}>
                            • {it.configuration.genre}
                          </span>
                        )}
                      </div>
                      <span style={{ color: "var(--gold)", fontWeight: 800, fontSize: "14px" }}>
                        {it.calculatedPriceNgn !== null && it.calculatedPriceNgn !== undefined
                          ? `₦${Number(it.calculatedPriceNgn).toLocaleString()}`
                          : "Price Upon Request"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Customer Message / Vision (Req #23) */}
            {order.customerMessage && (
              <div
                style={{
                  background: "rgba(13, 13, 18, 0.72)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  padding: "24px",
                }}
              >
                <div style={{ fontSize: "11px", color: "var(--gold)", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700, marginBottom: "8px" }}>
                  Project Vision & Instructions
                </div>
                <p style={{ color: "var(--text-p)", fontSize: "13px", lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>
                  "{order.customerMessage}"
                </p>
              </div>
            )}

            {/* Project Specifications Summary */}
            <div
              style={{
                background: "rgba(13, 13, 18, 0.72)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "24px",
              }}
            >
              <h3 style={{ fontSize: "15px", color: "var(--text-h)", margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Session Specifications
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                {order.configuration?.hours && (
                  <div>
                    <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>Booked Hours</span>
                    <div style={{ fontSize: "14px", color: "var(--text-h)", fontWeight: 600 }}>{order.configuration.hours}h Studio Tracking</div>
                  </div>
                )}
                {order.configuration?.bpm && (
                  <div>
                    <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>Target BPM</span>
                    <div style={{ fontSize: "14px", color: "var(--text-h)", fontWeight: 600 }}>{order.configuration.bpm}</div>
                  </div>
                )}
                {order.configuration?.key && (
                  <div>
                    <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>Musical Key</span>
                    <div style={{ fontSize: "14px", color: "var(--text-h)", fontWeight: 600 }}>{order.configuration.key}</div>
                  </div>
                )}
                {order.configuration?.genre && (
                  <div>
                    <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>Genre</span>
                    <div style={{ fontSize: "14px", color: "var(--text-h)", fontWeight: 600 }}>{order.configuration.genre}</div>
                  </div>
                )}
                {order.configuration?.featurePart && (
                  <div>
                    <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>Feature Contribution</span>
                    <div style={{ fontSize: "14px", color: "var(--text-h)", fontWeight: 600 }}>
                      {order.configuration.featurePart === "hook" ? "Hook / Chorus" : "Verse (16 Bars)"}
                    </div>
                  </div>
                )}
                <div>
                  <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>Private Audio Uploads</span>
                  <div style={{ fontSize: "14px", color: "var(--text-h)", fontWeight: 600 }}>{order.clientFilesCount || 0} File(s) Attached</div>
                </div>
              </div>

              {order.configuration?.notes && (
                <div style={{ marginTop: "20px", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
                  <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Session Brief / Notes
                  </span>
                  <p style={{ color: "var(--text-p)", fontSize: "13px", lineHeight: 1.6, margin: "6px 0 0" }}>
                    {order.configuration.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
