import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import SeoHead from "../components/SeoHead";
import { LoadingSpinner, RightArrowIcon, LeftArrowIcon } from "../components/Icons";

const CATEGORIES = [
  { id: "all", label: "All Services" },
  { id: "PRODUCTION", label: "Production" },
  { id: "MIXING", label: "Mixing" },
  { id: "RECORDING", label: "Recording" },
  { id: "MASTERING", label: "Mastering" },
  { id: "COLLABORATION", label: "Collaboration" },
];

export default function ServicesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedService, setSelectedService] = useState(null);

  // Configuration Modal State
  const [hours, setHours] = useState(2); // For hourly voice recording
  const [bpm, setBpm] = useState("");
  const [musicalKey, setMusicalKey] = useState("");
  const [genre, setGenre] = useState("");
  const [featurePart, setFeaturePart] = useState("verse"); // 'verse' | 'hook'
  const [referenceLinks, setReferenceLinks] = useState("");
  const [creativeBrief, setCreativeBrief] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [clientFiles, setClientFiles] = useState([]);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderSubmitError, setOrderSubmitError] = useState(null);
  const [createdOrder, setCreatedOrder] = useState(null);

  // Fetch Services from Worker API
  useEffect(() => {
    let cancelled = false;
    fetch("/api/services")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) {
          setServices(Array.isArray(data) ? data : []);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch services:", err);
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Pre-select service from URL parameter (e.g. /services?service=beat-production)
  useEffect(() => {
    const slug = searchParams.get("service");
    if (slug && services.length > 0 && !selectedService) {
      const match = services.find((s) => s.slug === slug);
      if (match) setSelectedService(match);
    }
  }, [searchParams, services, selectedService]);

  const filteredServices = useMemo(() => {
    if (activeCategory === "all") return services;
    return services.filter((s) => s.category?.toUpperCase() === activeCategory);
  }, [services, activeCategory]);

  // Live total calculation
  const calculatedTotal = useMemo(() => {
    if (!selectedService) return null;
    if (selectedService.isHourly) {
      const rate = Number(selectedService.hourlyRateNgn || selectedService.basePriceNgn || 25000);
      return rate * Math.max(1, hours);
    }
    if (selectedService.basePriceNgn !== null && selectedService.basePriceNgn !== undefined) {
      return Number(selectedService.basePriceNgn);
    }
    return null; // Price to be defined / quote on request
  }, [selectedService, hours]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      setUploadError("File size exceeds 100MB limit. Please upload audio under 100MB or provide cloud link.");
      return;
    }

    setIsUploadingFile(true);
    setUploadError(null);

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
      setClientFiles((prev) => [...prev, data.file]);
    } catch (err) {
      setUploadError(err.message || "Failed to upload file. Please try again.");
    } finally {
      setIsUploadingFile(false);
      e.target.value = "";
    }
  };

  const removeClientFile = (fileId) => {
    setClientFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleOpenConfigure = (service) => {
    setSelectedService(service);
    setHours(2);
    setBpm("");
    setMusicalKey("");
    setGenre("");
    setFeaturePart("verse");
    setReferenceLinks("");
    setCreativeBrief("");
    setClientFiles([]);
    setUploadError(null);
    setOrderSubmitError(null);
    setCreatedOrder(null);
  };

  const handleCloseModal = () => {
    setSelectedService(null);
    setCreatedOrder(null);
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (!selectedService) return;

    if (!customerName.trim()) {
      setOrderSubmitError("Please enter your name.");
      return;
    }
    if (!customerEmail.trim() || !customerEmail.includes("@")) {
      setOrderSubmitError("Please enter a valid email address.");
      return;
    }

    setIsSubmittingOrder(true);
    setOrderSubmitError(null);

    const configuration = {
      bpm: bpm.trim() || null,
      key: musicalKey.trim() || null,
      genre: genre.trim() || null,
      hours: selectedService.isHourly ? hours : null,
      featurePart: selectedService.slug === "feature" ? featurePart : null,
      references: referenceLinks.trim() || null,
      notes: creativeBrief.trim() || null,
    };

    try {
      const res = await fetch("/api/services/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceSlug: selectedService.slug,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.trim() || null,
          configuration,
          clientFiles,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || "Failed to create order");
      }
      setCreatedOrder(data.order);
    } catch (err) {
      setOrderSubmitError(err.message || "Could not submit order. Please try again.");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  return (
    <main className="services-page" style={{ minHeight: "100vh", position: "relative" }}>
      <SeoHead
        title="chomkaMUSIC™ Services | Studio Production & Engineering | silachomka"
        description="Official music production, beat making, vocal recording, stem mixing, full song mastering, and artist features by silachomka at Chomka Music Studio."
        path="/services"
        image="/beats-image.png"
        type="website"
      />

      {/* Atmospheric Starry Background */}
      <div className="product-ambient-backdrop" aria-hidden="true">
        <div
          className="ambient-image-layer"
          style={{ backgroundImage: "url('/beats-image.png')" }}
        />
        <div className="ambient-gradient-overlay" />
      </div>

      <div style={{ position: "relative", zIndex: 1, padding: "80px 7vw 120px", maxWidth: "1320px", margin: "0 auto" }}>
        {/* Navigation Breadcrumb */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px", flexWrap: "wrap", gap: "12px" }}>
          <Link to="/" className="release-breadcrumb" style={{ margin: 0 }}>
            <LeftArrowIcon /> Back to Home
          </Link>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <Link
              to="/beats"
              style={{
                fontSize: "11px",
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                textDecoration: "none",
                padding: "6px 12px",
                borderRadius: "4px",
                border: "1px solid var(--border)",
              }}
            >
              Browse Beats
            </Link>
          </div>
        </div>

        {/* Section Header */}
        <div style={{ textAlign: "center", maxWidth: "780px", margin: "0 auto 48px" }}>
          <p className="eyebrow" style={{ color: "var(--gold)", letterSpacing: "0.2em", marginBottom: "8px" }}>
            CHOMKAMUSIC™ STUDIO
          </p>
          <h1
            style={{
              fontFamily: "var(--font-display, var(--sans))",
              fontSize: "clamp(30px, 5vw, 48px)",
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
              color: "var(--text-h)",
              margin: "0 0 16px",
            }}
          >
            What are you looking to create?
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "16px", lineHeight: 1.6, margin: 0 }}>
            Commercial-grade production, vocal engineering, stem mixing, and official artist collaborations by silachomka. Select a service below to begin your custom session.
          </p>
        </div>

        {/* Category Tabs */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "8px",
            flexWrap: "wrap",
            marginBottom: "40px",
          }}
          role="tablist"
          aria-label="Filter studio services"
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                role="tab"
                aria-selected={isActive}
                style={{
                  background: isActive ? "var(--gold)" : "rgba(255, 255, 255, 0.04)",
                  color: isActive ? "#050507" : "var(--muted)",
                  border: isActive ? "1px solid var(--gold)" : "1px solid var(--border)",
                  borderRadius: "999px",
                  padding: "8px 18px",
                  fontSize: "12px",
                  fontWeight: isActive ? 700 : 500,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Services Grid */}
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <LoadingSpinner size={32} color="var(--gold)" />
            <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "14px" }}>Loading studio services...</p>
          </div>
        ) : filteredServices.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>
            No services found in this category.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              gap: "24px",
            }}
          >
            {filteredServices.map((service) => {
              const isHourly = service.isHourly;
              const hasPrice = service.basePriceNgn !== null && service.basePriceNgn !== undefined;

              return (
                <div
                  key={service.id || service.slug}
                  className="service-card"
                  style={{
                    background: "rgba(13, 13, 18, 0.72)",
                    backdropFilter: "blur(14px)",
                    WebkitBackdropFilter: "blur(14px)",
                    border: "1px solid rgba(223, 194, 125, 0.2)",
                    borderRadius: "12px",
                    padding: "26px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    transition: "transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(223, 194, 125, 0.55)";
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "0 14px 34px rgba(0, 0, 0, 0.6), 0 0 24px rgba(223, 194, 125, 0.12)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(223, 194, 125, 0.2)";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div>
                    {/* Card Header: Category + Turnaround */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                      <span
                        style={{
                          fontSize: "10px",
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                          color: "var(--gold)",
                          fontWeight: 700,
                        }}
                      >
                        {service.category}
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          color: "var(--muted)",
                          border: "1px solid var(--border)",
                          borderRadius: "12px",
                          padding: "2px 8px",
                        }}
                      >
                        {service.turnaroundDays}d turnaround
                      </span>
                    </div>

                    {/* Title */}
                    <h3
                      style={{
                        margin: "0 0 8px",
                        fontSize: "20px",
                        fontWeight: 700,
                        color: "var(--text-h)",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {service.title}
                    </h3>

                    {/* Tagline / Description */}
                    <p style={{ color: "var(--muted)", fontSize: "13px", lineHeight: 1.55, margin: "0 0 20px" }}>
                      {service.tagline || service.description}
                    </p>

                    {/* Deliverables Checklist */}
                    {Array.isArray(service.deliverables) && service.deliverables.length > 0 && (
                      <div style={{ marginBottom: "24px" }}>
                        <div style={{ fontSize: "10px", color: "var(--gold)", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: "8px" }}>
                          Deliverables
                        </div>
                        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
                          {service.deliverables.map((item, idx) => (
                            <li key={idx} style={{ fontSize: "12px", color: "var(--text-p)", display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ color: "var(--gold)", fontSize: "14px", lineHeight: 1 }}>✓</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Card Footer: Price & CTA */}
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: "18px", marginTop: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "16px" }}>
                      <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                        {isHourly ? "Hourly Rate" : "Investment"}
                      </span>
                      <div style={{ textAlign: "right" }}>
                        {hasPrice ? (
                          <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--gold)", letterSpacing: "-0.01em" }}>
                            ₦{Number(isHourly ? service.hourlyRateNgn : service.basePriceNgn).toLocaleString("en-US")}
                            {isHourly && <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--muted)" }}> / hr</span>}
                          </div>
                        ) : (
                          <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--gold)", letterSpacing: "0.02em" }}>
                            Price Upon Request
                          </div>
                        )}
                        {!hasPrice && (
                          <span style={{ fontSize: "10px", color: "var(--muted)", display: "block" }}>Custom quote based on stems</span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenConfigure(service)}
                      className="primary-button"
                      style={{
                        width: "100%",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: "8px",
                        padding: "12px 18px",
                        fontSize: "12px",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
                      <span>Configure Session</span>
                      <RightArrowIcon size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =====================================================================
          INTERACTIVE CONFIGURATION & CHECKOUT MODAL
          ===================================================================== */}
      {selectedService && (
        <div
          className="services-modal-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(3, 3, 5, 0.88)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            overflowY: "auto",
          }}
          onClick={handleCloseModal}
        >
          <div
            className="services-modal-sheet"
            style={{
              background: "#09090d",
              border: "1px solid rgba(223, 194, 125, 0.35)",
              borderRadius: "16px",
              boxShadow: "0 24px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(223, 194, 125, 0.15)",
              width: "min(680px, 94vw)",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "32px",
              position: "relative",
              color: "var(--text-p)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={handleCloseModal}
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                background: "transparent",
                border: "none",
                color: "var(--muted)",
                fontSize: "20px",
                cursor: "pointer",
                padding: "6px",
                lineHeight: 1,
              }}
              aria-label="Close modal"
            >
              ✕
            </button>

            {createdOrder ? (
              /* =========================================================
                 ORDER SUCCESS SCREEN
                 ========================================================= */
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    background: "rgba(223, 194, 125, 0.15)",
                    border: "1px solid var(--gold)",
                    color: "var(--gold)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                    margin: "0 auto 20px",
                  }}
                >
                  ✓
                </div>
                <p className="eyebrow" style={{ color: "var(--gold)", letterSpacing: "0.16em" }}>
                  ORDER CREATED
                </p>
                <h2 style={{ fontSize: "26px", color: "var(--text-h)", margin: "0 0 10px" }}>
                  {createdOrder.serviceTitle}
                </h2>
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px dashed var(--line-gold)",
                    borderRadius: "8px",
                    padding: "16px",
                    margin: "20px 0",
                  }}
                >
                  <div style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    Your Tracking Order Number
                  </div>
                  <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--gold)", letterSpacing: "0.06em", marginTop: "4px" }}>
                    {createdOrder.orderNumber}
                  </div>
                </div>
                <p style={{ color: "var(--muted)", fontSize: "14px", lineHeight: 1.6, maxWidth: "440px", margin: "0 auto 28px" }}>
                  We received your session configuration. A confirmation has been sent to{" "}
                  <strong style={{ color: "var(--text-h)" }}>{createdOrder.customerEmail}</strong>.
                </p>

                <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => navigate(`/services/order/${createdOrder.orderNumber}`)}
                    className="primary-button"
                    style={{ padding: "12px 24px" }}
                  >
                    View Order & Proceed to Payment →
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="cookie-btn cookie-btn-reject"
                    style={{ padding: "12px 20px" }}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              /* =========================================================
                 ORDER CONFIGURATION FORM
                 ========================================================= */
              <form onSubmit={handleSubmitOrder}>
                <div style={{ marginBottom: "24px" }}>
                  <span style={{ fontSize: "11px", color: "var(--gold)", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700 }}>
                    {selectedService.category} SESSION
                  </span>
                  <h2 style={{ fontSize: "24px", color: "var(--text-h)", margin: "4px 0 6px" }}>
                    {selectedService.title}
                  </h2>
                  <p style={{ color: "var(--muted)", fontSize: "13px", margin: 0 }}>
                    {selectedService.tagline || selectedService.description}
                  </p>
                </div>

                {/* Dynamic Configuration Fields */}
                <div style={{ display: "flex", flexDirection: "column", gap: "18px", borderTop: "1px solid var(--border)", paddingTop: "20px" }}>
                  {/* Hourly Stepper for Voice Recording */}
                  {selectedService.isHourly && (
                    <div style={{ background: "rgba(223, 194, 125, 0.05)", border: "1px solid rgba(223, 194, 125, 0.2)", borderRadius: "8px", padding: "16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                        <div>
                          <label style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-h)", display: "block" }}>
                            Session Duration (Hours)
                          </label>
                          <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                            ₦25,000 / hour in-studio tracking
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <button
                            type="button"
                            onClick={() => setHours((h) => Math.max(1, h - 1))}
                            className="studio-pill-btn"
                            style={{ width: "32px", height: "32px", padding: 0, fontSize: "18px" }}
                          >
                            –
                          </button>
                          <span style={{ fontSize: "18px", fontWeight: 800, color: "var(--gold)", minWidth: "30px", textAlign: "center" }}>
                            {hours}h
                          </span>
                          <button
                            type="button"
                            onClick={() => setHours((h) => Math.min(12, h + 1))}
                            className="studio-pill-btn"
                            style={{ width: "32px", height: "32px", padding: 0, fontSize: "18px" }}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Feature Option: Verse vs Hook */}
                  {selectedService.slug === "feature" && (
                    <div className="studio-field" style={{ textAlign: "left" }}>
                      <label style={{ fontSize: "12px", color: "var(--text-h)", fontWeight: 600, marginBottom: "8px", display: "block" }}>
                        Select Feature Contribution
                      </label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                        <button
                          type="button"
                          onClick={() => setFeaturePart("verse")}
                          className={`beats-segment-btn ${featurePart === "verse" ? "is-active" : ""}`}
                          style={{ height: "42px", justifyContent: "center" }}
                        >
                          One Verse (16 Bars)
                        </button>
                        <button
                          type="button"
                          onClick={() => setFeaturePart("hook")}
                          className={`beats-segment-btn ${featurePart === "hook" ? "is-active" : ""}`}
                          style={{ height: "42px", justifyContent: "center" }}
                        >
                          One Hook / Chorus
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Musical Technical Specifications (BPM, Key, Genre) */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" }}>
                    <div>
                      <label style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "4px" }}>
                        BPM (Optional)
                      </label>
                      <input
                        type="text"
                        className="studio-input"
                        placeholder="e.g. 102"
                        value={bpm}
                        onChange={(e) => setBpm(e.target.value)}
                        style={{ height: "38px", fontSize: "13px" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "4px" }}>
                        Key (Optional)
                      </label>
                      <input
                        type="text"
                        className="studio-input"
                        placeholder="e.g. F Minor"
                        value={musicalKey}
                        onChange={(e) => setMusicalKey(e.target.value)}
                        style={{ height: "38px", fontSize: "13px" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "4px" }}>
                        Genre / Style
                      </label>
                      <input
                        type="text"
                        className="studio-input"
                        placeholder="e.g. Afrobeat, Trap"
                        value={genre}
                        onChange={(e) => setGenre(e.target.value)}
                        style={{ height: "38px", fontSize: "13px" }}
                      />
                    </div>
                  </div>

                  {/* Reference Links */}
                  <div>
                    <label style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "4px" }}>
                      Reference Tracks / Cloud Links (Optional)
                    </label>
                    <input
                      type="text"
                      className="studio-input"
                      placeholder="e.g. Spotify or Google Drive / WeTransfer URL"
                      value={referenceLinks}
                      onChange={(e) => setReferenceLinks(e.target.value)}
                      style={{ height: "38px", fontSize: "13px" }}
                    />
                  </div>

                  {/* Creative Vision & Instructions */}
                  <div>
                    <label style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "4px" }}>
                      Session Brief & Special Instructions
                    </label>
                    <textarea
                      className="studio-input"
                      rows={3}
                      placeholder="Describe your creative vision, vocal notes, structure preferences, or specific mixing requests..."
                      value={creativeBrief}
                      onChange={(e) => setCreativeBrief(e.target.value)}
                      style={{ fontSize: "13px", resize: "vertical" }}
                    />
                  </div>

                  {/* Private File Upload Section */}
                  <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px dashed var(--border)", borderRadius: "8px", padding: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-h)" }}>
                          Upload Stems, Rough Mix or Guide Audio
                        </div>
                        <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                          WAV, MP3, or ZIP (Max 100MB). Kept strictly private.
                        </span>
                      </div>
                      <label
                        className="studio-pill-btn"
                        style={{
                          cursor: isUploadingFile ? "not-allowed" : "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "11px",
                          background: "var(--gold)",
                          color: "#050507",
                          fontWeight: 700,
                          border: "none",
                        }}
                      >
                        {isUploadingFile ? "Uploading..." : "+ Add File"}
                        <input
                          type="file"
                          accept="audio/*,.zip,.rar"
                          onChange={handleFileUpload}
                          disabled={isUploadingFile}
                          style={{ display: "none" }}
                        />
                      </label>
                    </div>

                    {uploadError && (
                      <div style={{ color: "#ef4444", fontSize: "12px", marginBottom: "8px" }}>
                        {uploadError}
                      </div>
                    )}

                    {clientFiles.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "10px" }}>
                        {clientFiles.map((f) => (
                          <div
                            key={f.id}
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
                            <span style={{ color: "var(--text-h)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "80%" }}>
                              🎵 {f.name} ({(f.size / (1024 * 1024)).toFixed(1)}MB)
                            </span>
                            <button
                              type="button"
                              onClick={() => removeClientFile(f.id)}
                              style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "14px" }}
                              title="Remove file"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Customer Information */}
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: "18px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--gold)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px" }}>
                      Your Contact Details
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                      <div>
                        <label style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "4px" }}>
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          className="studio-input"
                          placeholder="Artist or Producer Name"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          style={{ height: "38px", fontSize: "13px" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "4px" }}>
                          Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          className="studio-input"
                          placeholder="name@domain.com"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          style={{ height: "38px", fontSize: "13px" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "4px" }}>
                          Phone / WhatsApp (Optional)
                        </label>
                        <input
                          type="tel"
                          className="studio-input"
                          placeholder="+234..."
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          style={{ height: "38px", fontSize: "13px" }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Real-time Order Summary Card */}
                  <div
                    style={{
                      background: "rgba(10, 10, 14, 0.95)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      padding: "16px 20px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "12px",
                      marginTop: "10px",
                    }}
                  >
                    <div>
                      <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block" }}>
                        Calculated Session Total
                      </span>
                      <span style={{ fontSize: "12px", color: "var(--text-p)" }}>
                        {selectedService.isHourly ? `${hours} hours @ ₦25,000/hr` : selectedService.title}
                      </span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      {calculatedTotal !== null ? (
                        <span style={{ fontSize: "24px", fontWeight: 800, color: "var(--gold)" }}>
                          ₦{calculatedTotal.toLocaleString("en-US")}
                        </span>
                      ) : (
                        <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--gold)" }}>
                          Quote Upon Request
                        </span>
                      )}
                      <span style={{ display: "block", fontSize: "10px", color: "var(--muted)" }}>
                        Includes {selectedService.turnaroundDays}d turnaround & stems
                      </span>
                    </div>
                  </div>

                  {orderSubmitError && (
                    <div style={{ color: "#ef4444", fontSize: "13px", textAlign: "center" }}>
                      {orderSubmitError}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "12px" }}>
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="cookie-btn cookie-btn-reject"
                      disabled={isSubmittingOrder}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingOrder}
                      className="primary-button"
                      style={{ minWidth: "160px", display: "inline-flex", justifyContent: "center", alignItems: "center" }}
                    >
                      {isSubmittingOrder ? <LoadingSpinner size={16} color="#050507" /> : "Submit Order"}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
