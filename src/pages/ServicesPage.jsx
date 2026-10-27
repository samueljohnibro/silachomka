import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import SeoHead from "../components/SeoHead";
import {
  LoadingSpinner,
  RightArrowIcon,
  LeftArrowIcon,
  CheckIcon,
  TrashIcon,
} from "../components/Icons";

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

  // Multi-service Session Cart (Req #20 & #21)
  const [sessionCart, setSessionCart] = useState([]);
  const [configuringService, setConfiguringService] = useState(null);
  const [currentConfig, setCurrentConfig] = useState({});

  // Active step: 'catalog' | 'review' | 'success'
  const [activeStep, setActiveStep] = useState("catalog");

  // Customer Contact & Brief
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerMessage, setCustomerMessage] = useState("");

  // Private File Upload State
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Submission & Confirmation State
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderSubmitError, setOrderSubmitError] = useState(null);
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [hasCopiedOrderNumber, setHasCopiedOrderNumber] = useState(false);

  // Fetch Authoritative Services from Worker API
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
    if (slug && services.length > 0 && sessionCart.length === 0) {
      const match = services.find((s) => s.slug === slug);
      if (match) {
        startConfiguringService(match);
      }
    }
  }, [searchParams, services]);

  const filteredServices = useMemo(() => {
    if (activeCategory === "all") return services;
    return services.filter((s) => s.category?.toUpperCase() === activeCategory);
  }, [services, activeCategory]);

  // Combined Live Total
  const { cartTotalNgn, hasPriceUponRequest } = useMemo(() => {
    let total = 0;
    let uponRequest = false;

    for (const item of sessionCart) {
      if (item.calculatedPrice === null || item.calculatedPrice === undefined) {
        uponRequest = true;
      } else {
        total += item.calculatedPrice;
      }
    }

    return { cartTotalNgn: total, hasPriceUponRequest: uponRequest };
  }, [sessionCart]);

  const startConfiguringService = (service) => {
    // Check if already in cart to edit existing config
    const existing = sessionCart.find((it) => it.service.slug === service.slug);
    if (existing) {
      setCurrentConfig({ ...existing.configuration });
    } else {
      setCurrentConfig({
        hours: service.isHourly ? 2 : undefined,
        bpm: "",
        musicalKey: "",
        genre: "",
        mood: "",
        featurePart: "verse",
        referenceLinks: "",
        notes: "",
      });
    }
    setConfiguringService(service);
  };

  const handleSaveToSession = () => {
    if (!configuringService) return;

    let price = null;
    if (configuringService.isHourly) {
      const rate = Number(
        configuringService.hourlyRateNgn ||
          configuringService.basePriceNgn ||
          25000
      );
      const hours = Math.max(1, parseInt(currentConfig.hours || 1, 10));
      price = rate * hours;
    } else if (
      configuringService.basePriceNgn !== null &&
      configuringService.basePriceNgn !== undefined
    ) {
      price = Number(configuringService.basePriceNgn);
    } else {
      // Service #5: Price Upon Request
      price = null;
    }

    const newItem = {
      id: configuringService.slug,
      service: configuringService,
      configuration: { ...currentConfig },
      calculatedPrice: price,
    };

    setSessionCart((prev) => {
      const idx = prev.findIndex(
        (it) => it.service.slug === configuringService.slug
      );
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newItem;
        return copy;
      }
      return [...prev, newItem];
    });

    setConfiguringService(null);
  };

  const handleRemoveFromSession = (slug) => {
    setSessionCart((prev) => prev.filter((it) => it.service.slug !== slug));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      setUploadError(
        "File size exceeds 100MB limit. Please upload audio under 100MB or provide a link."
      );
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
        throw new Error(data.error || "File upload failed");
      }
      setUploadedFiles((prev) => [...prev, data.file]);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setIsUploadingFile(false);
      e.target.value = "";
    }
  };

  const handleRemoveFile = (fileId) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (sessionCart.length === 0) {
      setOrderSubmitError("Please select at least one studio service.");
      return;
    }
    if (!customerName.trim() || !customerEmail.trim()) {
      setOrderSubmitError("Please provide your name and a valid email.");
      return;
    }

    setIsSubmittingOrder(true);
    setOrderSubmitError(null);

    const payload = {
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim().toLowerCase(),
      customerPhone: customerPhone.trim(),
      customerMessage: customerMessage.trim(),
      services: sessionCart.map((it) => ({
        slug: it.service.slug,
        configuration: it.configuration,
      })),
      clientFiles: uploadedFiles,
    };

    try {
      const res = await fetch("/api/services/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unable to submit order");
      }
      setConfirmedOrder(data.order);
      setActiveStep("success");
    } catch (err) {
      setOrderSubmitError(err.message);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const copyOrderNumberToClipboard = () => {
    if (!confirmedOrder?.orderNumber) return;
    navigator.clipboard
      .writeText(confirmedOrder.orderNumber)
      .then(() => {
        setHasCopiedOrderNumber(true);
        setTimeout(() => setHasCopiedOrderNumber(false), 2400);
      })
      .catch(() => {});
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        position: "relative",
        padding: "60px 6vw 140px",
      }}
    >
      <SeoHead
        title="Studio Services & Production | silachomka"
        description="Book professional music production, vocal recording, mixing, mastering, and artist collaborations directly with Chomka Music Studio."
        canonicalUrl="/services"
      />

      {/* =========================================================
          1. WARM CONVERSATIONAL STUDIO GREETING (Req #19)
          ========================================================= */}
      <section style={{ maxWidth: "880px", margin: "0 auto 50px" }}>
        <p
          className="eyebrow"
          style={{ letterSpacing: "0.22em", color: "var(--gold)" }}
        >
          chomkaMUSIC™ STUDIO SERVICES
        </p>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(26px, 4.5vw, 44px)",
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--text)",
            margin: "8px 0 16px",
            lineHeight: 1.15,
          }}
        >
          What are you looking to create?
        </h1>
        <p
          style={{
            fontSize: "clamp(14px, 1.8vw, 16px)",
            lineHeight: 1.6,
            color: "var(--muted)",
            maxWidth: "700px",
            margin: 0,
          }}
        >
          Whether you need bespoke beat production, vocal tracking in Lagos, an
          industry-standard mix, or a collaborative verse, customize your studio
          session below. You can select multiple services into a single order.
        </p>

        {/* Step Indicator */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginTop: "24px",
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          <span
            style={{
              color: activeStep === "catalog" ? "var(--gold)" : "var(--muted)",
            }}
          >
            1. Services
          </span>
          <span style={{ color: "var(--line-gold)" }}>→</span>
          <span
            style={{
              color: activeStep === "review" ? "var(--gold)" : "var(--muted)",
            }}
          >
            2. Review & Brief
          </span>
          <span style={{ color: "var(--line-gold)" }}>→</span>
          <span
            style={{
              color: activeStep === "success" ? "var(--gold)" : "var(--muted)",
            }}
          >
            3. Confirmation
          </span>
        </div>
      </section>

      {/* =========================================================
          STEP 1: SERVICES CATALOG & MULTI-SERVICE SELECTION
          ========================================================= */}
      {activeStep === "catalog" && (
        <section style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {/* Category Filter Pills */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              marginBottom: "36px",
            }}
          >
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  height: "36px",
                  padding: "0 16px",
                  borderRadius: "4px",
                  border:
                    activeCategory === cat.id
                      ? "1px solid var(--gold)"
                      : "1px solid var(--line)",
                  background:
                    activeCategory === cat.id
                      ? "rgba(223, 194, 125, 0.12)"
                      : "rgba(5, 5, 7, 0.4)",
                  color:
                    activeCategory === cat.id ? "var(--gold)" : "var(--muted)",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "80px 0",
              }}
            >
              <LoadingSpinner size={32} color="var(--gold)" />
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fill, minmax(320px, 1fr))",
                gap: "24px",
              }}
            >
              {filteredServices.map((service) => {
                const inCart = sessionCart.find(
                  (it) => it.service.slug === service.slug
                );

                return (
                  <article
                    key={service.id}
                    style={{
                      background: "rgba(10, 10, 16, 0.75)",
                      border: inCart
                        ? "1px solid var(--gold)"
                        : "1px solid rgba(223, 194, 125, 0.15)",
                      borderRadius: "8px",
                      padding: "26px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      transition: "all 0.2s ease",
                      position: "relative",
                      boxShadow: inCart
                        ? "0 0 20px rgba(223, 194, 125, 0.15)"
                        : "none",
                    }}
                  >
                    {inCart && (
                      <span
                        style={{
                          position: "absolute",
                          top: "14px",
                          right: "14px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "3px 8px",
                          borderRadius: "3px",
                          background: "var(--gold)",
                          color: "#050507",
                          fontSize: "9px",
                          fontWeight: 800,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                        }}
                      >
                        <CheckIcon size={11} color="#050507" /> IN SESSION
                      </span>
                    )}

                    <div>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          letterSpacing: "0.16em",
                          textTransform: "uppercase",
                          color: "var(--gold)",
                        }}
                      >
                        {service.category}
                      </span>
                      <h2
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: "18px",
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          color: "var(--text)",
                          margin: "8px 0 6px",
                        }}
                      >
                        {service.title}
                      </h2>
                      {service.tagline && (
                        <p
                          style={{
                            fontSize: "12px",
                            fontStyle: "italic",
                            color: "var(--gold-light)",
                            margin: "0 0 12px",
                          }}
                        >
                          {service.tagline}
                        </p>
                      )}
                      <p
                        style={{
                          fontSize: "13px",
                          lineHeight: 1.5,
                          color: "var(--muted)",
                          margin: "0 0 20px",
                        }}
                      >
                        {service.description}
                      </p>
                    </div>

                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "baseline",
                          paddingTop: "14px",
                          borderTop: "1px solid rgba(223, 194, 125, 0.12)",
                          marginBottom: "16px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            letterSpacing: "0.12em",
                            color: "var(--muted)",
                            textTransform: "uppercase",
                          }}
                        >
                          Rate
                        </span>
                        <span
                          style={{
                            fontSize: "16px",
                            fontWeight: 800,
                            letterSpacing: "0.06em",
                            color: "var(--gold)",
                          }}
                        >
                          {service.isHourly
                            ? `₦${Number(
                                service.hourlyRateNgn || 25000
                              ).toLocaleString()} / hr`
                            : service.basePriceNgn !== null &&
                              service.basePriceNgn !== undefined
                            ? `₦${Number(
                                service.basePriceNgn
                              ).toLocaleString()}`
                            : "Price Upon Request"}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => startConfiguringService(service)}
                        style={{
                          width: "100%",
                          height: "40px",
                          borderRadius: "4px",
                          border: inCart
                            ? "1px solid var(--gold)"
                            : "1px solid var(--line-gold)",
                          background: inCart
                            ? "rgba(223, 194, 125, 0.15)"
                            : "rgba(223, 194, 125, 0.05)",
                          color: inCart ? "var(--gold)" : "var(--text)",
                          fontSize: "11px",
                          fontWeight: 700,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {inCart ? "Edit Configuration" : "+ Add to Session"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* =========================================================
          PERSISTENT "YOUR SESSION" DRAWER BAR (Req #20)
          ========================================================= */}
      {sessionCart.length > 0 && activeStep === "catalog" && (
        <aside
          style={{
            position: "fixed",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "min(94vw, 920px)",
            background: "rgba(10, 10, 15, 0.94)",
            border: "1px solid var(--gold)",
            borderRadius: "10px",
            padding: "16px 24px",
            boxShadow:
              "0 20px 50px rgba(0, 0, 0, 0.85), 0 0 30px rgba(223, 194, 125, 0.18)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            zIndex: 990,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "4px",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--gold)",
                }}
              >
                YOUR SESSION ({sessionCart.length}{" "}
                {sessionCart.length === 1 ? "SERVICE" : "SERVICES"})
              </span>
            </div>
            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              {sessionCart.map((item) => (
                <span
                  key={item.id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "rgba(223, 194, 125, 0.1)",
                    border: "1px solid rgba(223, 194, 125, 0.25)",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    color: "var(--text)",
                  }}
                >
                  {item.service.title}
                  {item.calculatedPrice !== null && (
                    <strong style={{ color: "var(--gold)" }}>
                      ₦{item.calculatedPrice.toLocaleString()}
                    </strong>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveFromSession(item.service.slug)}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "var(--muted)",
                      cursor: "pointer",
                      padding: "0 2px",
                      fontSize: "13px",
                      lineHeight: 1,
                    }}
                    title="Remove service"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
              marginLeft: "auto",
            }}
          >
            <div style={{ textAlign: "right" }}>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  display: "block",
                }}
              >
                Session Total
              </span>
              <span
                style={{
                  fontSize: "18px",
                  fontWeight: 800,
                  color: "var(--gold)",
                }}
              >
                {hasPriceUponRequest
                  ? "Quote Upon Request"
                  : `₦${cartTotalNgn.toLocaleString()}`}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setActiveStep("review")}
              style={{
                height: "42px",
                padding: "0 22px",
                borderRadius: "5px",
                border: "none",
                background: "linear-gradient(135deg, #fae2a0 0%, #dfc27d 100%)",
                color: "#050507",
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: "pointer",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              Review & Book <RightArrowIcon size={12} />
            </button>
          </div>
        </aside>
      )}

      {/* =========================================================
          SERVICE CONFIGURATION MODAL (Req #21)
          ========================================================= */}
      {configuringService && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(5, 5, 7, 0.85)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setConfiguringService(null)}
        >
          <div
            style={{
              background: "#0c0c12",
              border: "1px solid var(--line-gold)",
              borderRadius: "10px",
              width: "min(92vw, 580px)",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "30px",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.9)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "20px",
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "var(--gold)",
                  }}
                >
                  Configure Service
                </span>
                <h3
                  style={{
                    fontSize: "20px",
                    fontWeight: 800,
                    letterSpacing: "0.06em",
                    color: "var(--text)",
                    margin: "4px 0 0",
                  }}
                >
                  {configuringService.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setConfiguringService(null)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "var(--muted)",
                  fontSize: "20px",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            {/* Dynamic Service-Specific Fields (Req #21) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Hourly Voice Recording Stepper */}
              {configuringService.isHourly && (
                <div
                  style={{
                    padding: "16px",
                    borderRadius: "6px",
                    background: "rgba(223, 194, 125, 0.05)",
                    border: "1px solid rgba(223, 194, 125, 0.2)",
                  }}
                >
                  <label
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "var(--gold)",
                      display: "block",
                      marginBottom: "8px",
                    }}
                  >
                    Studio Time Required (Hours)
                  </label>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentConfig((prev) => ({
                          ...prev,
                          hours: Math.max(1, (prev.hours || 1) - 1),
                        }))
                      }
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "4px",
                        border: "1px solid var(--line-gold)",
                        background: "rgba(5, 5, 7, 0.6)",
                        color: "var(--gold)",
                        fontSize: "18px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      -
                    </button>
                    <span
                      style={{
                        fontSize: "18px",
                        fontWeight: 800,
                        color: "var(--text)",
                        minWidth: "30px",
                        textAlign: "center",
                      }}
                    >
                      {currentConfig.hours || 1}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentConfig((prev) => ({
                          ...prev,
                          hours: (prev.hours || 1) + 1,
                        }))
                      }
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "4px",
                        border: "1px solid var(--line-gold)",
                        background: "rgba(5, 5, 7, 0.6)",
                        color: "var(--gold)",
                        fontSize: "18px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      +
                    </button>
                    <span
                      style={{
                        fontSize: "13px",
                        color: "var(--gold)",
                        marginLeft: "auto",
                        fontWeight: 700,
                      }}
                    >
                      ₦
                      {(
                        Number(configuringService.hourlyRateNgn || 25000) *
                        (currentConfig.hours || 1)
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Feature Part Selector */}
              {configuringService.slug === "feature" && (
                <div>
                  <label
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "var(--gold)",
                      display: "block",
                      marginBottom: "6px",
                    }}
                  >
                    Desired Feature Placement
                  </label>
                  <div style={{ display: "flex", gap: "10px" }}>
                    {["verse", "hook", "both"].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() =>
                          setCurrentConfig((prev) => ({
                            ...prev,
                            featurePart: opt,
                          }))
                        }
                        style={{
                          flex: 1,
                          height: "34px",
                          borderRadius: "4px",
                          border:
                            currentConfig.featurePart === opt
                              ? "1px solid var(--gold)"
                              : "1px solid var(--line)",
                          background:
                            currentConfig.featurePart === opt
                              ? "rgba(223, 194, 125, 0.15)"
                              : "transparent",
                          color:
                            currentConfig.featurePart === opt
                              ? "var(--gold)"
                              : "var(--muted)",
                          fontSize: "10px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          cursor: "pointer",
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Musical Parameters */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "var(--gold)",
                      display: "block",
                      marginBottom: "4px",
                    }}
                  >
                    Tempo / BPM (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 105 or ~120"
                    value={currentConfig.bpm || ""}
                    onChange={(e) =>
                      setCurrentConfig((prev) => ({
                        ...prev,
                        bpm: e.target.value,
                      }))
                    }
                    style={{
                      width: "100%",
                      height: "38px",
                      padding: "0 12px",
                      borderRadius: "4px",
                      border: "1px solid var(--line-gold)",
                      background: "rgba(5, 5, 7, 0.6)",
                      color: "var(--text)",
                      fontSize: "12px",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "var(--gold)",
                      display: "block",
                      marginBottom: "4px",
                    }}
                  >
                    Key (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. F# Minor or C Major"
                    value={currentConfig.musicalKey || ""}
                    onChange={(e) =>
                      setCurrentConfig((prev) => ({
                        ...prev,
                        musicalKey: e.target.value,
                      }))
                    }
                    style={{
                      width: "100%",
                      height: "38px",
                      padding: "0 12px",
                      borderRadius: "4px",
                      border: "1px solid var(--line-gold)",
                      background: "rgba(5, 5, 7, 0.6)",
                      color: "var(--text)",
                      fontSize: "12px",
                    }}
                  />
                </div>
              </div>

              {/* Genre / Mood */}
              <div>
                <label
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--gold)",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Genre & Vibe
                </label>
                <input
                  type="text"
                  placeholder="e.g. Afrobeats, Trap, R&B, Dark / Energetic"
                  value={currentConfig.genre || ""}
                  onChange={(e) =>
                    setCurrentConfig((prev) => ({
                      ...prev,
                      genre: e.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    height: "38px",
                    padding: "0 12px",
                    borderRadius: "4px",
                    border: "1px solid var(--line-gold)",
                    background: "rgba(5, 5, 7, 0.6)",
                    color: "var(--text)",
                    fontSize: "12px",
                  }}
                />
              </div>

              {/* Reference Links */}
              <div>
                <label
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--gold)",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Reference Song / Sound Links
                </label>
                <input
                  type="text"
                  placeholder="Spotify, Apple Music, or YouTube link"
                  value={currentConfig.referenceLinks || ""}
                  onChange={(e) =>
                    setCurrentConfig((prev) => ({
                      ...prev,
                      referenceLinks: e.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    height: "38px",
                    padding: "0 12px",
                    borderRadius: "4px",
                    border: "1px solid var(--line-gold)",
                    background: "rgba(5, 5, 7, 0.6)",
                    color: "var(--text)",
                    fontSize: "12px",
                  }}
                />
              </div>

              {/* Specific Instructions */}
              <div>
                <label
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--gold)",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Specific Notes for this Service
                </label>
                <textarea
                  rows={3}
                  placeholder="Specific requirements, stems information, or notes..."
                  value={currentConfig.notes || ""}
                  onChange={(e) =>
                    setCurrentConfig((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "4px",
                    border: "1px solid var(--line-gold)",
                    background: "rgba(5, 5, 7, 0.6)",
                    color: "var(--text)",
                    fontSize: "12px",
                    lineHeight: 1.5,
                  }}
                />
              </div>

              {configuringService.basePriceNgn === null && (
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: "5px",
                    background: "rgba(223, 194, 125, 0.08)",
                    border: "1px solid rgba(223, 194, 125, 0.25)",
                    fontSize: "12px",
                    color: "var(--gold)",
                    lineHeight: 1.5,
                  }}
                >
                  ✦ <strong>Price Upon Request:</strong> Submit your request
                  details and stems. Chomka Music Studio will review and issue
                  an official quote before payment.
                </div>
              )}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
                marginTop: "24px",
              }}
            >
              <button
                type="button"
                onClick={() => setConfiguringService(null)}
                style={{
                  height: "38px",
                  padding: "0 16px",
                  borderRadius: "4px",
                  border: "1px solid var(--line)",
                  background: "transparent",
                  color: "var(--muted)",
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveToSession}
                style={{
                  height: "38px",
                  padding: "0 20px",
                  borderRadius: "4px",
                  border: "none",
                  background: "linear-gradient(135deg, #fae2a0 0%, #dfc27d 100%)",
                  color: "#050507",
                  fontSize: "11px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                Add to Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          STEP 2: REVIEW & CONTACT DETAILS (Req #24)
          ========================================================= */}
      {activeStep === "review" && (
        <section
          style={{
            maxWidth: "780px",
            margin: "0 auto",
            background: "rgba(10, 10, 16, 0.8)",
            border: "1px solid var(--line-gold)",
            borderRadius: "10px",
            padding: "36px 40px",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.8)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "24px",
            }}
          >
            <button
              type="button"
              onClick={() => setActiveStep("catalog")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                border: "none",
                background: "transparent",
                color: "var(--gold)",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              <LeftArrowIcon size={12} /> Back to Catalog
            </button>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.14em",
                color: "var(--muted)",
                textTransform: "uppercase",
              }}
            >
              Step 2 of 3
            </span>
          </div>

          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "22px",
              fontWeight: 800,
              letterSpacing: "0.06em",
              color: "var(--text)",
              marginBottom: "20px",
              textTransform: "uppercase",
            }}
          >
            Your Studio Session Summary
          </h2>

          {/* Itemized Services Breakdown */}
          <div
            style={{
              borderRadius: "6px",
              border: "1px solid rgba(223, 194, 125, 0.15)",
              background: "rgba(5, 5, 7, 0.5)",
              padding: "16px 20px",
              marginBottom: "24px",
            }}
          >
            {sessionCart.map((item, idx) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 0",
                  borderBottom:
                    idx < sessionCart.length - 1
                      ? "1px solid rgba(223, 194, 125, 0.1)"
                      : "none",
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "var(--text)",
                      display: "block",
                    }}
                  >
                    {item.service.title}
                  </span>
                  {item.service.isHourly && (
                    <span
                      style={{
                        fontSize: "11px",
                        color: "var(--muted)",
                      }}
                    >
                      {item.configuration.hours || 1} hours × ₦
                      {Number(
                        item.service.hourlyRateNgn || 25000
                      ).toLocaleString()}
                    </span>
                  )}
                  {item.configuration.genre && (
                    <span
                      style={{
                        fontSize: "11px",
                        color: "var(--muted)",
                        marginLeft: "8px",
                      }}
                    >
                      • {item.configuration.genre}
                    </span>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: 800,
                      color: "var(--gold)",
                    }}
                  >
                    {item.calculatedPrice !== null
                      ? `₦${item.calculatedPrice.toLocaleString()}`
                      : "Price Upon Request"}
                  </span>
                </div>
              </div>
            ))}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: "14px",
                marginTop: "10px",
                borderTop: "2px solid rgba(223, 194, 125, 0.25)",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 800,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--text)",
                }}
              >
                Total Session Amount
              </span>
              <span
                style={{
                  fontSize: "20px",
                  fontWeight: 800,
                  color: "var(--gold)",
                }}
              >
                {hasPriceUponRequest
                  ? "Quote Upon Request"
                  : `₦${cartTotalNgn.toLocaleString()}`}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmitOrder}>
            {/* Customer Information */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
                marginBottom: "16px",
              }}
            >
              <div>
                <label
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--gold)",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Your Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe / Artist Alias"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  style={{
                    width: "100%",
                    height: "40px",
                    padding: "0 12px",
                    borderRadius: "4px",
                    border: "1px solid var(--line-gold)",
                    background: "rgba(5, 5, 7, 0.6)",
                    color: "var(--text)",
                    fontSize: "13px",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--gold)",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="you@domain.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  style={{
                    width: "100%",
                    height: "40px",
                    padding: "0 12px",
                    borderRadius: "4px",
                    border: "1px solid var(--line-gold)",
                    background: "rgba(5, 5, 7, 0.6)",
                    color: "var(--text)",
                    fontSize: "13px",
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--gold)",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Phone / WhatsApp (Optional)
              </label>
              <input
                type="tel"
                placeholder="+234 ..."
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                style={{
                  width: "100%",
                  height: "40px",
                  padding: "0 12px",
                  borderRadius: "4px",
                  border: "1px solid var(--line-gold)",
                  background: "rgba(5, 5, 7, 0.6)",
                  color: "var(--text)",
                  fontSize: "13px",
                }}
              />
            </div>

            {/* Creative Brief / Customer Message (Req #23) */}
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--gold)",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Project Vision & Message to Studio
              </label>
              <textarea
                rows={4}
                placeholder="Describe what you want to achieve, mood, references, or specific instructions..."
                value={customerMessage}
                onChange={(e) => setCustomerMessage(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "4px",
                  border: "1px solid var(--line-gold)",
                  background: "rgba(5, 5, 7, 0.6)",
                  color: "var(--text)",
                  fontSize: "13px",
                  lineHeight: 1.5,
                }}
              />
            </div>

            {/* File Upload Section (Req #22) */}
            <div style={{ marginBottom: "28px" }}>
              <label
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--gold)",
                  display: "block",
                  marginBottom: "6px",
                }}
              >
                Project Audio & Reference Files
              </label>
              <div
                style={{
                  border: "1px dashed rgba(223, 194, 125, 0.35)",
                  borderRadius: "6px",
                  padding: "20px",
                  textAlign: "center",
                  background: "rgba(5, 5, 7, 0.4)",
                }}
              >
                <input
                  type="file"
                  id="client-file-input"
                  style={{ display: "none" }}
                  onChange={handleFileUpload}
                  disabled={isUploadingFile}
                />
                <label
                  htmlFor="client-file-input"
                  style={{
                    display: "inline-block",
                    padding: "8px 16px",
                    borderRadius: "4px",
                    background: "rgba(223, 194, 125, 0.1)",
                    border: "1px solid var(--line-gold)",
                    color: "var(--gold)",
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    cursor: isUploadingFile ? "wait" : "pointer",
                    letterSpacing: "0.12em",
                  }}
                >
                  {isUploadingFile
                    ? "Uploading File..."
                    : "+ Upload WAV, MP3, or ZIP"}
                </label>
                <p
                  style={{
                    fontSize: "11px",
                    color: "var(--muted)",
                    margin: "8px 0 0",
                  }}
                >
                  Maximum 100MB per file. Files are stored securely and
                  accessible only by the studio.
                </p>

                {uploadError && (
                  <p
                    style={{
                      color: "#ff6b6b",
                      fontSize: "12px",
                      margin: "8px 0 0",
                    }}
                  >
                    {uploadError}
                  </p>
                )}

                {uploadedFiles.length > 0 && (
                  <div
                    style={{
                      marginTop: "14px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    {uploadedFiles.map((f) => (
                      <div
                        key={f.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "6px 10px",
                          borderRadius: "4px",
                          background: "rgba(223, 194, 125, 0.08)",
                          fontSize: "12px",
                        }}
                      >
                        <span style={{ color: "var(--text)" }}>{f.name}</span>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <span style={{ color: "var(--muted)" }}>
                            {Math.round(f.size / 1024)} KB
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(f.id)}
                            style={{
                              border: "none",
                              background: "transparent",
                              color: "#ff6b6b",
                              cursor: "pointer",
                              padding: "0 4px",
                            }}
                            title="Remove file"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Agreed Deadline Note (Req #29) */}
            <div
              style={{
                fontSize: "11.5px",
                color: "var(--muted)",
                lineHeight: 1.5,
                padding: "12px 14px",
                borderRadius: "5px",
                background: "rgba(5, 5, 7, 0.6)",
                border: "1px solid rgba(223, 194, 125, 0.15)",
                marginBottom: "24px",
              }}
            >
              ✦ <strong>Studio Delivery Schedule:</strong> Standard turnaround
              is 3–5 working days upon payment confirmation. Official delivery
              deadlines are confirmed in West Africa Time (WAT / UTC+1).
            </div>

            {orderSubmitError && (
              <p
                style={{
                  color: "#ff6b6b",
                  fontSize: "12px",
                  marginBottom: "16px",
                }}
              >
                {orderSubmitError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmittingOrder}
              style={{
                width: "100%",
                height: "46px",
                borderRadius: "5px",
                border: "none",
                background: "linear-gradient(135deg, #fae2a0 0%, #dfc27d 100%)",
                color: "#050507",
                fontSize: "12px",
                fontWeight: 800,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                cursor: isSubmittingOrder ? "wait" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              {isSubmittingOrder ? (
                <LoadingSpinner size={18} color="#050507" />
              ) : (
                "Confirm & Proceed to Payment →"
              )}
            </button>
          </form>
        </section>
      )}

      {/* =========================================================
          STEP 3: ORDER CONFIRMED & PAYMENT CTA (Req #25 & #26)
          ========================================================= */}
      {activeStep === "success" && confirmedOrder && (
        <section
          style={{
            maxWidth: "680px",
            margin: "0 auto",
            background: "rgba(10, 10, 16, 0.85)",
            border: "1px solid var(--gold)",
            borderRadius: "10px",
            padding: "40px",
            textAlign: "center",
            boxShadow:
              "0 20px 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(223, 194, 125, 0.15)",
          }}
        >
          <div
            style={{
              width: "50px",
              height: "50px",
              borderRadius: "50%",
              background: "rgba(223, 194, 125, 0.15)",
              border: "1px solid var(--gold)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 18px",
            }}
          >
            <CheckIcon size={24} color="var(--gold)" />
          </div>

          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "24px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              color: "var(--text)",
              margin: "0 0 8px",
              textTransform: "uppercase",
            }}
          >
            Studio Session Booked
          </h2>

          <p
            style={{
              fontSize: "13.5px",
              lineHeight: 1.6,
              color: "var(--muted)",
              marginBottom: "24px",
            }}
          >
            Your session has been logged with Chomka Music Studio. Save your
            order number below to track production progress and deliverables.
          </p>

          {/* 1-Click Copyable Order Number (Req #25) */}
          <div
            style={{
              background: "rgba(5, 5, 7, 0.7)",
              border: "1px solid rgba(223, 194, 125, 0.35)",
              borderRadius: "6px",
              padding: "16px 20px",
              display: "inline-flex",
              alignItems: "center",
              gap: "14px",
              marginBottom: "30px",
            }}
          >
            <span
              style={{
                fontFamily: "monospace",
                fontSize: "18px",
                fontWeight: 700,
                color: "var(--gold)",
                letterSpacing: "0.1em",
              }}
            >
              #{confirmedOrder.orderNumber}
            </span>
            <button
              type="button"
              onClick={copyOrderNumberToClipboard}
              style={{
                height: "30px",
                padding: "0 12px",
                borderRadius: "3px",
                border: "1px solid var(--line-gold)",
                background: hasCopiedOrderNumber
                  ? "var(--gold)"
                  : "rgba(223, 194, 125, 0.1)",
                color: hasCopiedOrderNumber ? "#050507" : "var(--gold)",
                fontSize: "10px",
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {hasCopiedOrderNumber ? "COPIED!" : "COPY"}
            </button>
          </div>

          {/* Session Summary & Payment Action */}
          <div
            style={{
              textAlign: "left",
              padding: "18px",
              borderRadius: "6px",
              background: "rgba(5, 5, 7, 0.5)",
              border: "1px solid rgba(223, 194, 125, 0.15)",
              marginBottom: "26px",
              fontSize: "12.5px",
              lineHeight: 1.6,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "6px",
              }}
            >
              <span style={{ color: "var(--muted)" }}>Client:</span>
              <span style={{ color: "var(--text)", fontWeight: 600 }}>
                {confirmedOrder.customerName} ({confirmedOrder.customerEmail})
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "6px",
              }}
            >
              <span style={{ color: "var(--muted)" }}>Session:</span>
              <span style={{ color: "var(--text)", fontWeight: 600 }}>
                {confirmedOrder.serviceTitle}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderTop: "1px solid rgba(223, 194, 125, 0.15)",
                paddingTop: "8px",
                marginTop: "8px",
              }}
            >
              <span style={{ color: "var(--muted)" }}>Total Due:</span>
              <span
                style={{
                  color: "var(--gold)",
                  fontWeight: 800,
                  fontSize: "15px",
                }}
              >
                {confirmedOrder.totalAmountNgn !== null
                  ? `₦${confirmedOrder.totalAmountNgn.toLocaleString()}`
                  : "Quote Upon Request"}
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Link
              to={`/services/order/${confirmedOrder.orderNumber}`}
              style={{
                height: "42px",
                padding: "0 22px",
                borderRadius: "5px",
                background: "linear-gradient(135deg, #fae2a0 0%, #dfc27d 100%)",
                color: "#050507",
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              Proceed to Payment & Tracking →
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
