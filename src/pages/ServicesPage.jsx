import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import SeoHead from "../components/SeoHead";
import {
  LoadingSpinner,
  RightArrowIcon,
  LeftArrowIcon,
  CheckIcon,
  TrashIcon,
} from "../components/Icons";

// Conversational Intent Options mapped 1:1 to authoritative services in Neon DB
const CONVERSATIONAL_SERVICES = [
  {
    slug: "beat-production",
    prompt: "I need a bespoke beat",
    title: "Beat Production",
    category: "PRODUCTION",
    basePriceNgn: 80000,
    isHourly: false,
    turnaroundDays: 5,
    tagline: "Custom instrumental tailored to your sonic identity",
  },
  {
    slug: "beat-mixing",
    prompt: "I already have a beat and need it mixed",
    title: "Beat Mixing",
    category: "MIXING",
    basePriceNgn: 25000,
    isHourly: false,
    turnaroundDays: 3,
    tagline: "Clarity, punch, and low-end separation for your instrumental",
  },
  {
    slug: "voice-recording",
    prompt: "I need to record vocals in the studio",
    title: "Voice Recording",
    category: "RECORDING",
    basePriceNgn: 25000,
    isHourly: true,
    hourlyRateNgn: 25000,
    turnaroundDays: 1,
    tagline: "Professional vocal tracking in a treated studio environment",
  },
  {
    slug: "vocal-mixing",
    prompt: "I need my recorded vocals mixed into a track",
    title: "Vocal Mixing",
    category: "MIXING",
    basePriceNgn: 35000,
    isHourly: false,
    turnaroundDays: 4,
    tagline: "Tuning, compression, spatial depth, and seamless beat blend",
  },
  {
    slug: "full-song-mastering",
    prompt: "I need industry-standard mastering",
    title: "Full Song Mastering",
    category: "MASTERING",
    basePriceNgn: 35000,
    isHourly: false,
    turnaroundDays: 2,
    tagline: "Loudness, dynamic polish, and translation across streaming platforms",
  },
  {
    slug: "full-song-production",
    prompt: "I want a complete song produced from scratch",
    title: "Full Song Production",
    category: "PRODUCTION",
    basePriceNgn: 110000,
    isHourly: false,
    turnaroundDays: 10,
    tagline: "Full song arrangement, live instruments, and radio-ready production",
  },
  {
    slug: "instrumentalist-collaboration",
    prompt: "I want to collaborate with an instrumentalist / producer",
    title: "Instrumentalist / Producer Collaboration",
    category: "COLLABORATION",
    basePriceNgn: 20000,
    isHourly: false,
    turnaroundDays: 5,
    tagline: "Live guitars, keys, or joint production input on your tracks",
  },
  {
    slug: "recording-mixing-client-beat",
    prompt: "I want to record vocals & mix on a beat I already own",
    title: "Recording + Mixing on Client's Beat",
    category: "PRODUCTION",
    basePriceNgn: null, // Strictly Price Upon Request
    isHourly: false,
    turnaroundDays: 5,
    tagline: "Integrated vocal tracking and full hybrid mix on your instrumental",
  },
  {
    slug: "feature",
    prompt: "I want to feature silachomka as an artist",
    title: "Feature",
    category: "COLLABORATION",
    basePriceNgn: 50000,
    isHourly: false,
    turnaroundDays: 7,
    tagline: "Official guest verse or hook collaboration with silachomka",
  },
];

export default function ServicesPage() {
  const navigate = useNavigate();
  const { slug: routeSlug } = useParams();
  const [searchParams] = useSearchParams();

  // Server-fetched authoritative services
  const [dbServices, setDbServices] = useState([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);

  // Conversational Concierge Steps:
  // 1: 'intent'     - Opening greeting & multi-service selection
  // 2: 'confirm'    - "Nice. I've got that. Anything else to include?"
  // 3: 'details'    - Service-specific tailored questions
  // 4: 'client'     - Customer contact info & overall brief
  // 5: 'summary'    - Session summary & review before booking
  // 6: 'success'    - Order confirmed, copyable reference & payment
  const [step, setStep] = useState("intent");

  // Multi-service selection: array of service slugs
  const [selectedSlugs, setSelectedSlugs] = useState([]);

  // Per-service tailored configurations: { [slug]: { hours, bpm, key, genre, mood, ... } }
  const [configurations, setConfigurations] = useState({});

  // Client contact details
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerMessage, setCustomerMessage] = useState("");

  // Attached files (stems, references, beats)
  const [clientFiles, setClientFiles] = useState([]);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Order submission & payment states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [hasCopiedRef, setHasCopiedRef] = useState(false);
  const [isInitializingPayment, setIsInitializingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState(null);

  // Fetch live services from Worker API
  useEffect(() => {
    let cancelled = false;
    fetch("/api/services")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) {
          setDbServices(Array.isArray(data) ? data : []);
          setIsLoadingServices(false);
        }
      })
      .catch((err) => {
        console.warn("Failed to load services:", err);
        if (!cancelled) setIsLoadingServices(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Pre-select service if passed via URL (e.g. /services/beat-production or /services?service=beat-production)
  useEffect(() => {
    const targetSlug = routeSlug || searchParams.get("service");
    if (targetSlug && selectedSlugs.length === 0) {
      const match = CONVERSATIONAL_SERVICES.find((s) => s.slug === targetSlug);
      if (match) {
        setSelectedSlugs([match.slug]);
        // Set default config
        if (match.isHourly) {
          setConfigurations((prev) => ({
            ...prev,
            [match.slug]: { hours: 2, ...prev[match.slug] },
          }));
        }
      }
    }
  }, [routeSlug, searchParams]);

  // Merge client catalogue with any DB price updates
  const activeServiceList = useMemo(() => {
    return CONVERSATIONAL_SERVICES.map((s) => {
      const dbMatch = dbServices.find((d) => d.slug === s.slug);
      if (!dbMatch) return s;
      return {
        ...s,
        title: dbMatch.title || s.title,
        basePriceNgn:
          dbMatch.base_price_ngn !== null && dbMatch.base_price_ngn !== undefined
            ? Number(dbMatch.base_price_ngn)
            : s.basePriceNgn,
        isHourly: dbMatch.is_hourly ?? s.isHourly,
        hourlyRateNgn:
          dbMatch.hourly_rate_ngn !== null && dbMatch.hourly_rate_ngn !== undefined
            ? Number(dbMatch.hourly_rate_ngn)
            : s.hourlyRateNgn,
        turnaroundDays: dbMatch.turnaround_days ?? s.turnaroundDays,
      };
    });
  }, [dbServices]);

  // Toggle service selection in conversational intent step
  const toggleService = (slug) => {
    setSelectedSlugs((prev) => {
      if (prev.includes(slug)) {
        return prev.filter((s) => s !== slug);
      } else {
        const svc = activeServiceList.find((s) => s.slug === slug);
        if (svc?.isHourly && !configurations[slug]?.hours) {
          setConfigurations((c) => ({
            ...c,
            [slug]: { hours: 2, ...c[slug] },
          }));
        }
        return [...prev, slug];
      }
    });
  };

  // Update configuration for a specific service
  const updateConfig = (slug, field, value) => {
    setConfigurations((prev) => ({
      ...prev,
      [slug]: {
        ...(prev[slug] || {}),
        [field]: value,
      },
    }));
  };

  // Selected services mapped to objects (Multi-service sessionCart)
  const selectedServices = useMemo(() => {
    return selectedSlugs
      .map((slug) => activeServiceList.find((s) => s.slug === slug))
      .filter(Boolean);
  }, [selectedSlugs, activeServiceList]);

  const sessionCart = selectedServices;

  // Live Authoritative Calculation
  const { totalNgn, hasPriceUponRequest, itemizedPrices, maxTurnaroundDays } =
    useMemo(() => {
      let sum = 0;
      let uponRequest = false;
      let maxDays = 3;
      const prices = {};

      for (const svc of selectedServices) {
        if (svc.turnaroundDays && svc.turnaroundDays > maxDays) {
          maxDays = svc.turnaroundDays;
        }

        if (svc.isHourly) {
          const hours = Math.max(
            1,
            parseInt(configurations[svc.slug]?.hours || 1, 10)
          );
          const rate = svc.hourlyRateNgn || 25000;
          const price = rate * hours;
          prices[svc.slug] = price;
          sum += price;
        } else if (
          svc.basePriceNgn !== null &&
          svc.basePriceNgn !== undefined
        ) {
          const price = Number(svc.basePriceNgn);
          prices[svc.slug] = price;
          sum += price;
        } else {
          // Service #5: Price Upon Request
          uponRequest = true;
          prices[svc.slug] = null;
        }
      }

      return {
        totalNgn: uponRequest && sum === 0 ? null : sum,
        hasPriceUponRequest: uponRequest,
        itemizedPrices: prices,
        maxTurnaroundDays: maxDays,
      };
    }, [selectedServices, configurations]);

  // File Upload Handler (Up to 100MB via /api/services/upload)
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      setUploadError("File exceeds 100MB limit. Please upload audio under 100MB.");
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
      setClientFiles((prev) => [...prev, data.file]);
    } catch (err) {
      setUploadError(err.message || "Failed to upload file");
    } finally {
      setIsUploadingFile(false);
      e.target.value = "";
    }
  };

  const removeFile = (id) => {
    setClientFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Submit Order to Server-side authority
  const handleFinalSubmit = async () => {
    if (selectedServices.length === 0) {
      setSubmitError("Please select at least one studio service.");
      return;
    }
    if (!customerName.trim() || !customerEmail.trim()) {
      setSubmitError("Please provide your name and contact email.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const payload = {
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim().toLowerCase(),
      customerPhone: customerPhone.trim(),
      customerMessage: customerMessage.trim(),
      services: selectedServices.map((svc) => ({
        slug: svc.slug,
        configuration: configurations[svc.slug] || {},
      })),
      clientFiles: clientFiles,
    };

    try {
      const res = await fetch("/api/services/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unable to reserve studio session");
      }
      setConfirmedOrder(data.order);
      setStep("success");
    } catch (err) {
      setSubmitError(err.message || "Session reservation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Copy order reference to clipboard with "Copied ✓" feedback
  const handleCopyOrderRef = () => {
    if (!confirmedOrder?.orderNumber && !confirmedOrder?.order_number) return;
    const refNum = confirmedOrder.orderNumber || confirmedOrder.order_number;
    navigator.clipboard
      .writeText(refNum)
      .then(() => {
        setHasCopiedRef(true);
        setTimeout(() => setHasCopiedRef(false), 2400);
      })
      .catch(() => {});
  };

  // Paystack Payment Trigger
  const handleInitializePayment = async () => {
    const refNum = confirmedOrder?.orderNumber || confirmedOrder?.order_number;
    if (!refNum) return;
    setIsInitializingPayment(true);
    setPaymentError(null);

    try {
      const res = await fetch(
        `/api/services/orders/${encodeURIComponent(refNum)}/payment`,
        { method: "POST" }
      );
      const data = await res.json();
      if (res.ok && data.success && data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else if (res.ok && data.success) {
        // Direct reference fallback
        navigate(`/services/order/${refNum}`);
      } else {
        throw new Error(data.error || "Payment gateway unavailable");
      }
    } catch (err) {
      setPaymentError(err.message || "Failed to initialize payment gateway");
    } finally {
      setIsInitializingPayment(false);
    }
  };

  // Estimated WAT Deadline calculation
  const deadlineDateString = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + (maxTurnaroundDays || 3));
    return d.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Africa/Lagos",
    });
  }, [maxTurnaroundDays]);

  return (
    <main
      style={{
        minHeight: "100vh",
        position: "relative",
        padding: "60px 6vw 140px",
        background: "radial-gradient(ellipse at 50% 0%, rgba(223, 194, 125, 0.04) 0%, transparent 60%)",
      }}
    >
      <SeoHead
        title="Studio Services & Production | silachomka"
        description="Book professional music production, vocal recording, mixing, mastering, and artist collaborations directly with Chomka Music Studio."
        canonicalUrl="/services"
      />

      <div style={{ maxWidth: "840px", margin: "0 auto" }}>
        {/* =========================================================
            HEADER / BREADCRUMB INDICATOR
            ========================================================= */}
        <div style={{ marginBottom: "28px", textAlign: "left" }}>
          <p
            className="eyebrow"
            style={{
              letterSpacing: "0.22em",
              color: "var(--gold)",
              marginBottom: "8px",
            }}
          >
            chomkaMUSIC™ STUDIO CONCIERGE
          </p>

          {/* Concierge Step Breadcrumb */}
          {step !== "success" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--muted)",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  color: step === "intent" ? "var(--gold)" : "var(--muted)",
                  borderBottom: step === "intent" ? "1px solid var(--gold)" : "none",
                  paddingBottom: "2px",
                }}
              >
                1. Intent
              </span>
              <span style={{ color: "rgba(223, 194, 125, 0.3)" }}>→</span>
              <span
                style={{
                  color: step === "confirm" ? "var(--gold)" : "var(--muted)",
                  borderBottom: step === "confirm" ? "1px solid var(--gold)" : "none",
                  paddingBottom: "2px",
                }}
              >
                2. Confirmation
              </span>
              <span style={{ color: "rgba(223, 194, 125, 0.3)" }}>→</span>
              <span
                style={{
                  color: step === "details" ? "var(--gold)" : "var(--muted)",
                  borderBottom: step === "details" ? "1px solid var(--gold)" : "none",
                  paddingBottom: "2px",
                }}
              >
                3. Session Details
              </span>
              <span style={{ color: "rgba(223, 194, 125, 0.3)" }}>→</span>
              <span
                style={{
                  color: step === "client" ? "var(--gold)" : "var(--muted)",
                  borderBottom: step === "client" ? "1px solid var(--gold)" : "none",
                  paddingBottom: "2px",
                }}
              >
                4. Brief & Contact
              </span>
              <span style={{ color: "rgba(223, 194, 125, 0.3)" }}>→</span>
              <span
                style={{
                  color: step === "summary" ? "var(--gold)" : "var(--muted)",
                  borderBottom: step === "summary" ? "1px solid var(--gold)" : "none",
                  paddingBottom: "2px",
                }}
              >
                5. Review
              </span>
            </div>
          )}
        </div>

        {/* =========================================================
            STAGE 1: INTENT (Hey. What are we creating?)
            ========================================================= */}
        {step === "intent" && (
          <section
            style={{
              background: "rgba(10, 10, 16, 0.8)",
              border: "1px solid rgba(223, 194, 125, 0.2)",
              borderRadius: "12px",
              padding: "clamp(24px, 4vw, 44px)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)",
              animation: "fadeIn 0.25s ease-out",
            }}
          >
            <div style={{ marginBottom: "28px" }}>
              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(26px, 4vw, 40px)",
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                  color: "var(--text)",
                  margin: "0 0 10px",
                  lineHeight: 1.2,
                }}
              >
                Hey. What are we creating?
              </h1>
              <p
                style={{
                  fontSize: "15px",
                  lineHeight: 1.6,
                  color: "var(--muted)",
                  margin: 0,
                }}
              >
                Tell me what you're trying to get done and I'll help you put together the right studio session.
              </p>
              <p
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--gold)",
                  marginTop: "16px",
                  marginBottom: 0,
                }}
              >
                What are you looking to create?
              </p>
            </div>

            {/* Selectable conversational service options */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                marginBottom: "32px",
              }}
            >
              {activeServiceList.map((svc) => {
                const isSelected = selectedSlugs.includes(svc.slug);

                return (
                  <button
                    key={svc.slug}
                    type="button"
                    onClick={() => toggleService(svc.slug)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      textAlign: "left",
                      padding: "16px 20px",
                      borderRadius: "8px",
                      border: isSelected
                        ? "1px solid var(--gold)"
                        : "1px solid rgba(255, 255, 255, 0.08)",
                      background: isSelected
                        ? "rgba(223, 194, 125, 0.1)"
                        : "rgba(5, 5, 8, 0.5)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      gap: "16px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1 }}>
                      {/* Checkbox circle indicator */}
                      <div
                        style={{
                          width: "20px",
                          height: "20px",
                          borderRadius: "4px",
                          border: isSelected
                            ? "1px solid var(--gold)"
                            : "1px solid rgba(255, 255, 255, 0.25)",
                          background: isSelected ? "var(--gold)" : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          transition: "all 0.15s ease",
                        }}
                      >
                        {isSelected && <CheckIcon size={13} color="#050507" />}
                      </div>

                      <div>
                        <p
                          style={{
                            fontSize: "15px",
                            fontWeight: 600,
                            color: isSelected ? "var(--text)" : "#d6d6d8",
                            margin: "0 0 2px",
                          }}
                        >
                          {svc.prompt}
                        </p>
                        <p
                          style={{
                            fontSize: "12px",
                            color: "var(--muted)",
                            margin: 0,
                          }}
                        >
                          {svc.title} · {svc.tagline}
                        </p>
                      </div>
                    </div>

                    {/* Price tag */}
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 700,
                          color: isSelected ? "var(--gold)" : "var(--muted)",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {svc.basePriceNgn === null
                          ? "Price Upon Request"
                          : svc.isHourly
                          ? `₦${(svc.hourlyRateNgn || 25000).toLocaleString()}/hr`
                          : `₦${svc.basePriceNgn.toLocaleString()}`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom Action Bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: "20px",
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                flexWrap: "wrap",
                gap: "14px",
              }}
            >
              <div>
                {selectedSlugs.length > 0 ? (
                  <p style={{ margin: 0, fontSize: "14px", color: "var(--text)" }}>
                    <strong style={{ color: "var(--gold)" }}>
                      {selectedSlugs.length}
                    </strong>{" "}
                    {selectedSlugs.length === 1 ? "service" : "services"} selected
                    {totalNgn !== null && (
                      <span style={{ color: "var(--muted)", marginLeft: "8px" }}>
                        · Subtotal: ₦{totalNgn.toLocaleString()}
                      </span>
                    )}
                    {hasPriceUponRequest && (
                      <span style={{ color: "var(--gold)", marginLeft: "6px" }}>
                        (+ Custom Quote)
                      </span>
                    )}
                  </p>
                ) : (
                  <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)" }}>
                    Select one or multiple options above to proceed.
                  </p>
                )}
              </div>

              <button
                type="button"
                disabled={selectedSlugs.length === 0}
                onClick={() => setStep("confirm")}
                className="primary-button"
                style={{
                  opacity: selectedSlugs.length === 0 ? 0.4 : 1,
                  cursor: selectedSlugs.length === 0 ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "0 24px",
                  height: "44px",
                  fontSize: "13px",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                }}
              >
                Continue <RightArrowIcon size={14} color="#050507" />
              </button>
            </div>
          </section>
        )}

        {/* =========================================================
            STAGE 2: CONFIRMATION & EXPANSION
            "Nice. I've got that. Anything else you want included?"
            ========================================================= */}
        {step === "confirm" && (
          <section
            style={{
              background: "rgba(10, 10, 16, 0.8)",
              border: "1px solid rgba(223, 194, 125, 0.2)",
              borderRadius: "12px",
              padding: "clamp(24px, 4vw, 44px)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)",
              animation: "fadeIn 0.25s ease-out",
            }}
          >
            <div style={{ marginBottom: "26px" }}>
              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(26px, 4vw, 38px)",
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                  color: "var(--text)",
                  margin: "0 0 10px",
                }}
              >
                Nice. I've got that.
              </h1>
              <p
                style={{
                  fontSize: "15px",
                  color: "var(--muted)",
                  margin: "0 0 16px",
                }}
              >
                You're looking at:
              </p>

              {/* Selected List */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  padding: "16px 20px",
                  background: "rgba(5, 5, 8, 0.6)",
                  border: "1px solid rgba(223, 194, 125, 0.15)",
                  borderRadius: "8px",
                  marginBottom: "24px",
                }}
              >
                {selectedServices.map((svc) => (
                  <div
                    key={svc.slug}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "14px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <CheckIcon size={14} color="var(--gold)" />
                      <span style={{ fontWeight: 600, color: "var(--text)" }}>
                        {svc.title}
                      </span>
                    </div>
                    <span style={{ color: "var(--gold)", fontWeight: 700 }}>
                      {svc.basePriceNgn === null
                        ? "Price Upon Request"
                        : svc.isHourly
                        ? `₦${(svc.hourlyRateNgn || 25000).toLocaleString()}/hr`
                        : `₦${svc.basePriceNgn.toLocaleString()}`}
                    </span>
                  </div>
                ))}
              </div>

              <h2
                style={{
                  fontSize: "18px",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  color: "var(--text)",
                  margin: "0 0 8px",
                }}
              >
                Anything else you want included?
              </h2>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--muted)",
                  margin: 0,
                }}
              >
                You can add complementary mixing, recording, or mastering to keep your entire record under one cohesive sonic direction.
              </p>
            </div>

            {/* Decision Buttons */}
            <div
              style={{
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
                paddingTop: "20px",
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <button
                type="button"
                onClick={() => setStep("intent")}
                className="secondary-button"
                style={{
                  height: "44px",
                  padding: "0 20px",
                  fontSize: "13px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  border: "1px solid rgba(223, 194, 125, 0.3)",
                  color: "var(--gold)",
                  cursor: "pointer",
                }}
              >
                + Add / Modify Services
              </button>

              <button
                type="button"
                onClick={() => setStep("details")}
                className="primary-button"
                style={{
                  height: "44px",
                  padding: "0 24px",
                  fontSize: "13px",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                }}
              >
                That's Everything — Tailor Details <RightArrowIcon size={14} color="#050507" />
              </button>
            </div>
          </section>
        )}

        {/* =========================================================
            STAGE 3: DYNAMIC RELEVANT QUESTIONS PER SERVICE
            ========================================================= */}
        {step === "details" && (
          <section
            style={{
              background: "rgba(10, 10, 16, 0.8)",
              border: "1px solid rgba(223, 194, 125, 0.2)",
              borderRadius: "12px",
              padding: "clamp(24px, 4vw, 44px)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)",
              animation: "fadeIn 0.25s ease-out",
            }}
          >
            <div style={{ marginBottom: "28px" }}>
              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(24px, 3.8vw, 36px)",
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                  color: "var(--text)",
                  margin: "0 0 10px",
                }}
              >
                Let's tailor your session.
              </h1>
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--muted)",
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                Please answer only the details relevant to the services you selected so we can prepare the studio properly.
              </p>
            </div>

            {/* Service-by-service tailored fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: "28px", marginBottom: "36px" }}>
              {selectedServices.map((svc) => {
                const cfg = configurations[svc.slug] || {};

                return (
                  <div
                    key={svc.slug}
                    style={{
                      background: "rgba(5, 5, 8, 0.5)",
                      border: "1px solid rgba(223, 194, 125, 0.15)",
                      borderRadius: "8px",
                      padding: "22px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "16px",
                        borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                        paddingBottom: "10px",
                      }}
                    >
                      <h2
                        style={{
                          fontSize: "16px",
                          fontWeight: 700,
                          letterSpacing: "0.04em",
                          color: "var(--gold)",
                          margin: 0,
                        }}
                      >
                        {svc.title}
                      </h2>
                      <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>
                        {svc.isHourly
                          ? `${cfg.hours || 2} hrs × ₦${(svc.hourlyRateNgn || 25000).toLocaleString()} = ₦${(
                              (cfg.hours || 2) * (svc.hourlyRateNgn || 25000)
                            ).toLocaleString()}`
                          : svc.basePriceNgn === null
                          ? "Price Upon Request"
                          : `₦${svc.basePriceNgn.toLocaleString()}`}
                      </span>
                    </div>

                    {/* Specific Questions based on Service Slug */}
                    {svc.slug === "voice-recording" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: "13px",
                              fontWeight: 600,
                              color: "var(--text)",
                              marginBottom: "8px",
                            }}
                          >
                            How many recording hours do you need?
                          </label>
                          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                            <button
                              type="button"
                              onClick={() => {
                                const current = Math.max(1, parseInt(cfg.hours || 2, 10));
                                if (current > 1) updateConfig(svc.slug, "hours", current - 1);
                              }}
                              style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "4px",
                                border: "1px solid rgba(223, 194, 125, 0.3)",
                                background: "rgba(5, 5, 7, 0.8)",
                                color: "var(--gold)",
                                fontSize: "18px",
                                cursor: "pointer",
                              }}
                            >
                              -
                            </button>
                            <span
                              style={{
                                fontSize: "16px",
                                fontWeight: 700,
                                color: "var(--text)",
                                minWidth: "70px",
                                textAlign: "center",
                              }}
                            >
                              {cfg.hours || 2} {parseInt(cfg.hours || 2, 10) === 1 ? "Hour" : "Hours"}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const current = parseInt(cfg.hours || 2, 10);
                                updateConfig(svc.slug, "hours", current + 1);
                              }}
                              style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "4px",
                                border: "1px solid rgba(223, 194, 125, 0.3)",
                                background: "rgba(5, 5, 7, 0.8)",
                                color: "var(--gold)",
                                fontSize: "18px",
                                cursor: "pointer",
                              }}
                            >
                              +
                            </button>
                            <span
                              style={{
                                fontSize: "13px",
                                color: "var(--gold)",
                                fontWeight: 700,
                                marginLeft: "12px",
                              }}
                            >
                              = ₦{((parseInt(cfg.hours || 2, 10)) * (svc.hourlyRateNgn || 25000)).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: "12px",
                              color: "var(--muted)",
                              marginBottom: "6px",
                            }}
                          >
                            Preferred Session Dates / Times / Studio Logistics (WAT)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Next Tuesday afternoon or weekend evening"
                            value={cfg.sessionInfo || ""}
                            onChange={(e) => updateConfig(svc.slug, "sessionInfo", e.target.value)}
                            style={{
                              width: "100%",
                              padding: "10px 14px",
                              borderRadius: "4px",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                              background: "rgba(10, 10, 16, 0.6)",
                              color: "var(--text)",
                              fontSize: "13px",
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {(svc.slug === "beat-production" || svc.slug === "full-song-production") && (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
                        <div>
                          <label style={{ display: "block", fontSize: "12px", color: "var(--muted)", marginBottom: "6px" }}>
                            Genre / Sound Direction
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Afrobeats, Amapiano, Drill, Trap"
                            value={cfg.genre || ""}
                            onChange={(e) => updateConfig(svc.slug, "genre", e.target.value)}
                            style={{
                              width: "100%",
                              padding: "10px 14px",
                              borderRadius: "4px",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                              background: "rgba(10, 10, 16, 0.6)",
                              color: "var(--text)",
                              fontSize: "13px",
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: "12px", color: "var(--muted)", marginBottom: "6px" }}>
                            BPM & Musical Key (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 104 BPM, C# Minor"
                            value={cfg.bpmKey || ""}
                            onChange={(e) => updateConfig(svc.slug, "bpmKey", e.target.value)}
                            style={{
                              width: "100%",
                              padding: "10px 14px",
                              borderRadius: "4px",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                              background: "rgba(10, 10, 16, 0.6)",
                              color: "var(--text)",
                              fontSize: "13px",
                            }}
                          />
                        </div>

                        <div style={{ gridColumn: "1 / -1" }}>
                          <label style={{ display: "block", fontSize: "12px", color: "var(--muted)", marginBottom: "6px" }}>
                            Reference Artists or Song Links
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Asake, Rema, Travis Scott, or YouTube/Spotify URL"
                            value={cfg.references || ""}
                            onChange={(e) => updateConfig(svc.slug, "references", e.target.value)}
                            style={{
                              width: "100%",
                              padding: "10px 14px",
                              borderRadius: "4px",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                              background: "rgba(10, 10, 16, 0.6)",
                              color: "var(--text)",
                              fontSize: "13px",
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {(svc.slug === "beat-mixing" || svc.slug === "vocal-mixing" || svc.slug === "full-song-mastering") && (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
                        <div>
                          <label style={{ display: "block", fontSize: "12px", color: "var(--muted)", marginBottom: "6px" }}>
                            BPM & Track Key
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 110 BPM, F Major"
                            value={cfg.bpmKey || ""}
                            onChange={(e) => updateConfig(svc.slug, "bpmKey", e.target.value)}
                            style={{
                              width: "100%",
                              padding: "10px 14px",
                              borderRadius: "4px",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                              background: "rgba(10, 10, 16, 0.6)",
                              color: "var(--text)",
                              fontSize: "13px",
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: "12px", color: "var(--muted)", marginBottom: "6px" }}>
                            Reference Mix / Target Sound
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Crisp vocal presence, warm punchy low end"
                            value={cfg.referenceMix || ""}
                            onChange={(e) => updateConfig(svc.slug, "referenceMix", e.target.value)}
                            style={{
                              width: "100%",
                              padding: "10px 14px",
                              borderRadius: "4px",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                              background: "rgba(10, 10, 16, 0.6)",
                              color: "var(--text)",
                              fontSize: "13px",
                            }}
                          />
                        </div>

                        <div style={{ gridColumn: "1 / -1" }}>
                          <label style={{ display: "block", fontSize: "12px", color: "var(--muted)", marginBottom: "6px" }}>
                            What needs the most attention?
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Sibilance control, vocal riding, wide stereo image, bass muddiness"
                            value={cfg.attention || ""}
                            onChange={(e) => updateConfig(svc.slug, "attention", e.target.value)}
                            style={{
                              width: "100%",
                              padding: "10px 14px",
                              borderRadius: "4px",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                              background: "rgba(10, 10, 16, 0.6)",
                              color: "var(--text)",
                              fontSize: "13px",
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {svc.slug === "feature" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                        <div>
                          <label style={{ display: "block", fontSize: "12px", color: "var(--muted)", marginBottom: "6px" }}>
                            Feature Scope
                          </label>
                          <div style={{ display: "flex", gap: "12px" }}>
                            {["Verse", "Hook", "Verse + Hook"].map((part) => (
                              <button
                                key={part}
                                type="button"
                                onClick={() => updateConfig(svc.slug, "part", part)}
                                style={{
                                  padding: "8px 16px",
                                  borderRadius: "4px",
                                  border:
                                    (cfg.part || "Verse") === part
                                      ? "1px solid var(--gold)"
                                      : "1px solid rgba(255, 255, 255, 0.1)",
                                  background:
                                    (cfg.part || "Verse") === part
                                      ? "rgba(223, 194, 125, 0.12)"
                                      : "rgba(10, 10, 16, 0.6)",
                                  color:
                                    (cfg.part || "Verse") === part
                                      ? "var(--gold)"
                                      : "var(--muted)",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                              >
                                {part}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: "12px", color: "var(--muted)", marginBottom: "6px" }}>
                            Creative Direction & Theme
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Energetic Afrobeats vibe, reflective storytelling, romantic mood"
                            value={cfg.direction || ""}
                            onChange={(e) => updateConfig(svc.slug, "direction", e.target.value)}
                            style={{
                              width: "100%",
                              padding: "10px 14px",
                              borderRadius: "4px",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                              background: "rgba(10, 10, 16, 0.6)",
                              color: "var(--text)",
                              fontSize: "13px",
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {svc.slug === "recording-mixing-client-beat" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div
                          style={{
                            padding: "12px 14px",
                            borderRadius: "6px",
                            background: "rgba(223, 194, 125, 0.08)",
                            border: "1px solid rgba(223, 194, 125, 0.25)",
                            fontSize: "12px",
                            color: "var(--gold)",
                            lineHeight: 1.5,
                          }}
                        >
                          <strong>Price Upon Request:</strong> Attach your beat/session stems below or paste a cloud link. silachomka will review your tracks and provide a dedicated custom quote based on track count and complexity.
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: "12px", color: "var(--muted)", marginBottom: "6px" }}>
                            Session Scope & Details
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 16 vocal tracks over stereo MP3/WAV beat, need tuning and full mix"
                            value={cfg.scope || ""}
                            onChange={(e) => updateConfig(svc.slug, "scope", e.target.value)}
                            style={{
                              width: "100%",
                              padding: "10px 14px",
                              borderRadius: "4px",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                              background: "rgba(10, 10, 16, 0.6)",
                              color: "var(--text)",
                              fontSize: "13px",
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {svc.slug === "instrumentalist-collaboration" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div>
                          <label style={{ display: "block", fontSize: "12px", color: "var(--muted)", marginBottom: "6px" }}>
                            Collaboration Instrument / Role
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Live acoustic guitar, bassline composition, saxophone lead"
                            value={cfg.collabRole || ""}
                            onChange={(e) => updateConfig(svc.slug, "collabRole", e.target.value)}
                            style={{
                              width: "100%",
                              padding: "10px 14px",
                              borderRadius: "4px",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                              background: "rgba(10, 10, 16, 0.6)",
                              color: "var(--text)",
                              fontSize: "13px",
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Audio & Stem Upload Component */}
            <div
              style={{
                background: "rgba(5, 5, 8, 0.5)",
                border: "1px dashed rgba(223, 194, 125, 0.3)",
                borderRadius: "8px",
                padding: "20px",
                marginBottom: "32px",
              }}
            >
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  color: "var(--text)",
                  margin: "0 0 6px",
                }}
              >
                Upload Project Audio / Stems (Optional)
              </h3>
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--muted)",
                  margin: "0 0 14px",
                  lineHeight: 1.5,
                }}
              >
                Upload WAV, MP3, ZIP, or AIFF up to 100MB. Files are securely transferred directly to studio storage.
              </p>

              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "0 18px",
                    height: "38px",
                    borderRadius: "4px",
                    border: "1px solid var(--gold)",
                    background: "rgba(223, 194, 125, 0.1)",
                    color: "var(--gold)",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: isUploadingFile ? "wait" : "pointer",
                    letterSpacing: "0.08em",
                  }}
                >
                  {isUploadingFile ? (
                    <>
                      <LoadingSpinner size={14} color="var(--gold)" /> Uploading...
                    </>
                  ) : (
                    "+ Select File to Upload"
                  )}
                  <input
                    type="file"
                    accept="audio/*,.zip,.rar,.tar,.gz,.aiff,.wav,.mp3"
                    disabled={isUploadingFile}
                    onChange={handleFileUpload}
                    style={{ display: "none" }}
                  />
                </label>

                {uploadError && (
                  <span style={{ fontSize: "12px", color: "#e57373" }}>
                    {uploadError}
                  </span>
                )}
              </div>

              {/* Uploaded Files List */}
              {clientFiles.length > 0 && (
                <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  {clientFiles.map((f) => (
                    <div
                      key={f.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        background: "rgba(10, 10, 16, 0.7)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: "4px",
                        fontSize: "12px",
                      }}
                    >
                      <span style={{ color: "var(--text)" }}>
                        {f.originalName} ({(f.size / (1024 * 1024)).toFixed(1)} MB)
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(f.id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#e57373",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                        }}
                      >
                        <TrashIcon size={14} color="#e57373" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Navigation buttons */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                paddingTop: "20px",
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={() => setStep("confirm")}
                className="secondary-button"
                style={{
                  height: "44px",
                  padding: "0 20px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <LeftArrowIcon size={13} color="var(--gold)" /> Back to Services
              </button>

              <button
                type="button"
                onClick={() => setStep("client")}
                className="primary-button"
                style={{
                  height: "44px",
                  padding: "0 24px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                Continue to Brief & Contact <RightArrowIcon size={14} color="#050507" />
              </button>
            </div>
          </section>
        )}

        {/* =========================================================
            STAGE 4: CLIENT BRIEF & CONTACT DETAILS
            ========================================================= */}
        {step === "client" && (
          <section
            style={{
              background: "rgba(10, 10, 16, 0.8)",
              border: "1px solid rgba(223, 194, 125, 0.2)",
              borderRadius: "12px",
              padding: "clamp(24px, 4vw, 44px)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)",
              animation: "fadeIn 0.25s ease-out",
            }}
          >
            <div style={{ marginBottom: "26px" }}>
              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(26px, 4vw, 38px)",
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                  color: "var(--text)",
                  margin: "0 0 10px",
                }}
              >
                Who am I working with?
              </h1>
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--muted)",
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                Provide your contact details so the studio can coordinate delivery, revisions, and direct communication.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "18px", marginBottom: "32px" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--gold)",
                    marginBottom: "8px",
                  }}
                >
                  Full Name / Artist Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Samuel John / Sila"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "6px",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    background: "rgba(5, 5, 8, 0.7)",
                    color: "var(--text)",
                    fontSize: "14px",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--gold)",
                    marginBottom: "8px",
                  }}
                >
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. artist@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "6px",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    background: "rgba(5, 5, 8, 0.7)",
                    color: "var(--text)",
                    fontSize: "14px",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--gold)",
                    marginBottom: "8px",
                  }}
                >
                  Phone / WhatsApp (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +234 800 000 0000"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "6px",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    background: "rgba(5, 5, 8, 0.7)",
                    color: "var(--text)",
                    fontSize: "14px",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--gold)",
                    marginBottom: "8px",
                  }}
                >
                  Overall Project Brief / Message
                </label>
                <textarea
                  rows={4}
                  placeholder="Tell silachomka anything else about the vision, release goals, reference tracks, or specific timeline constraints..."
                  value={customerMessage}
                  onChange={(e) => setCustomerMessage(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "6px",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    background: "rgba(5, 5, 8, 0.7)",
                    color: "var(--text)",
                    fontSize: "14px",
                    lineHeight: 1.5,
                  }}
                />
              </div>
            </div>

            {/* Navigation buttons */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                paddingTop: "20px",
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={() => setStep("details")}
                className="secondary-button"
                style={{
                  height: "44px",
                  padding: "0 20px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <LeftArrowIcon size={13} color="var(--gold)" /> Back to Session Details
              </button>

              <button
                type="button"
                disabled={!customerName.trim() || !customerEmail.trim()}
                onClick={() => setStep("summary")}
                className="primary-button"
                style={{
                  opacity: !customerName.trim() || !customerEmail.trim() ? 0.4 : 1,
                  cursor: !customerName.trim() || !customerEmail.trim() ? "not-allowed" : "pointer",
                  height: "44px",
                  padding: "0 24px",
                  fontSize: "13px",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                Review Session Summary <RightArrowIcon size={14} color="#050507" />
              </button>
            </div>
          </section>
        )}

        {/* =========================================================
            STAGE 5: SESSION SUMMARY & AUTHORITATIVE TOTAL
            ========================================================= */}
        {step === "summary" && (
          <section
            style={{
              background: "rgba(10, 10, 16, 0.8)",
              border: "1px solid rgba(223, 194, 125, 0.25)",
              borderRadius: "12px",
              padding: "clamp(24px, 4vw, 44px)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)",
              animation: "fadeIn 0.25s ease-out",
            }}
          >
            <div style={{ marginBottom: "26px", textAlign: "left" }}>
              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(26px, 4vw, 40px)",
                  fontWeight: 800,
                  letterSpacing: "0.06em",
                  color: "var(--text)",
                  margin: "0 0 8px",
                }}
              >
                YOUR SESSION
              </h1>
              <p style={{ fontSize: "14px", color: "var(--muted)", margin: 0 }}>
                Review your session breakdown before confirming. The total below is authoritative.
              </p>
            </div>

            {/* Itemized Services Breakdown */}
            <div
              style={{
                background: "rgba(5, 5, 8, 0.6)",
                border: "1px solid rgba(223, 194, 125, 0.15)",
                borderRadius: "8px",
                padding: "24px",
                marginBottom: "28px",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {selectedServices.map((svc) => {
                  const cfg = configurations[svc.slug] || {};
                  const price = itemizedPrices[svc.slug];

                  return (
                    <div
                      key={svc.slug}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        paddingBottom: "14px",
                        borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                        gap: "16px",
                      }}
                    >
                      <div>
                        <h2
                          style={{
                            fontSize: "15px",
                            fontWeight: 700,
                            letterSpacing: "0.04em",
                            color: "var(--text)",
                            margin: "0 0 4px",
                          }}
                        >
                          {svc.title}
                        </h2>
                        {svc.isHourly && (
                          <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0 }}>
                            {cfg.hours || 2} hours × ₦{(svc.hourlyRateNgn || 25000).toLocaleString()}
                          </p>
                        )}
                        {svc.slug === "recording-mixing-client-beat" && (
                          <p style={{ fontSize: "12px", color: "var(--gold)", margin: 0 }}>
                            Scope: {cfg.scope || "Client custom beat & tracking"}
                          </p>
                        )}
                        {cfg.genre && (
                          <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0 }}>
                            Genre: {cfg.genre} {cfg.bpmKey ? `· ${cfg.bpmKey}` : ""}
                          </p>
                        )}
                      </div>

                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <span
                          style={{
                            fontSize: "15px",
                            fontWeight: 700,
                            color: price === null ? "var(--gold)" : "var(--text)",
                          }}
                        >
                          {price === null ? "Price Upon Request" : `₦${price.toLocaleString()}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total Calculation */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingTop: "18px",
                  marginTop: "8px",
                  borderTop: "1px solid rgba(223, 194, 125, 0.3)",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "18px",
                    fontWeight: 800,
                    letterSpacing: "0.1em",
                    color: "var(--text)",
                  }}
                >
                  TOTAL
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "22px",
                    fontWeight: 800,
                    letterSpacing: "0.06em",
                    color: "var(--gold)",
                  }}
                >
                  {totalNgn === null
                    ? "Custom Quote (Price Upon Request)"
                    : hasPriceUponRequest
                    ? `₦${totalNgn.toLocaleString()} + Custom Quote`
                    : `₦${totalNgn.toLocaleString()}`}
                </span>
              </div>
            </div>

            {/* Brief & Logistics Summary */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "16px",
                marginBottom: "32px",
              }}
            >
              <div
                style={{
                  padding: "16px",
                  background: "rgba(5, 5, 8, 0.5)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "6px",
                }}
              >
                <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--gold)" }}>
                  Client Contact
                </span>
                <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)", margin: "4px 0 2px" }}>
                  {customerName}
                </p>
                <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0 }}>
                  {customerEmail} {customerPhone ? `· ${customerPhone}` : ""}
                </p>
              </div>

              <div
                style={{
                  padding: "16px",
                  background: "rgba(5, 5, 8, 0.5)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "6px",
                }}
              >
                <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--gold)" }}>
                  Estimated WAT Deadline
                </span>
                <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)", margin: "4px 0 2px" }}>
                  {deadlineDateString}
                </p>
                <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0 }}>
                  Based on ~{maxTurnaroundDays} business days turnaround
                </p>
              </div>

              <div
                style={{
                  padding: "16px",
                  background: "rgba(5, 5, 8, 0.5)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "6px",
                }}
              >
                <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--gold)" }}>
                  Attached Files
                </span>
                <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)", margin: "4px 0 2px" }}>
                  {clientFiles.length === 0
                    ? "None attached"
                    : `${clientFiles.length} file${clientFiles.length === 1 ? "" : "s"}`}
                </p>
                <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0 }}>
                  {clientFiles.length > 0 ? clientFiles.map((f) => f.originalName).join(", ") : "Can be sent via WhatsApp/email"}
                </p>
              </div>
            </div>

            {customerMessage && (
              <div
                style={{
                  padding: "16px",
                  background: "rgba(5, 5, 8, 0.5)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "6px",
                  marginBottom: "32px",
                }}
              >
                <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--gold)" }}>
                  Your Brief
                </span>
                <p style={{ fontSize: "13px", color: "var(--text)", margin: "6px 0 0", lineHeight: 1.5 }}>
                  "{customerMessage}"
                </p>
              </div>
            )}

            {submitError && (
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: "6px",
                  background: "rgba(229, 115, 115, 0.12)",
                  border: "1px solid #e57373",
                  color: "#e57373",
                  fontSize: "13px",
                  marginBottom: "20px",
                }}
              >
                {submitError}
              </div>
            )}

            {/* Action Buttons */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                paddingTop: "20px",
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={() => setStep("client")}
                className="secondary-button"
                style={{
                  height: "44px",
                  padding: "0 20px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <LeftArrowIcon size={13} color="var(--gold)" /> Adjust Details
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalSubmit}
                className="primary-button"
                style={{
                  height: "46px",
                  padding: "0 28px",
                  fontSize: "13px",
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  cursor: isSubmitting ? "wait" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size={16} color="#050507" /> Reserving Session...
                  </>
                ) : totalNgn === null ? (
                  "Submit Session For Custom Quote"
                ) : (
                  <>
                    Lock In Session & Proceed to Payment <RightArrowIcon size={14} color="#050507" />
                  </>
                )}
              </button>
            </div>
          </section>
        )}

        {/* =========================================================
            STAGE 6: SESSION RESERVED & REAL PAYMENT TRIGGER
            (Part 7 & Part 8: Real Working Payment + Copyable Order Ref)
            ========================================================= */}
        {step === "success" && confirmedOrder && (
          <section
            style={{
              background: "rgba(10, 10, 16, 0.85)",
              border: "1px solid rgba(223, 194, 125, 0.3)",
              borderRadius: "12px",
              padding: "clamp(26px, 5vw, 50px)",
              backdropFilter: "blur(14px)",
              boxShadow: "0 10px 50px rgba(0, 0, 0, 0.6)",
              textAlign: "center",
              animation: "fadeIn 0.3s ease-out",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "rgba(223, 194, 125, 0.15)",
                border: "1px solid var(--gold)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <CheckIcon size={28} color="var(--gold)" />
            </div>

            <p
              className="eyebrow"
              style={{
                letterSpacing: "0.22em",
                color: "var(--gold)",
                marginBottom: "6px",
              }}
            >
              SESSION RESERVED
            </p>

            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(24px, 4.5vw, 38px)",
                fontWeight: 800,
                letterSpacing: "0.06em",
                color: "var(--text)",
                margin: "0 0 12px",
              }}
            >
              Your studio session is locked in.
            </h1>

            <p
              style={{
                fontSize: "15px",
                color: "var(--muted)",
                maxWidth: "600px",
                margin: "0 auto 28px",
                lineHeight: 1.6,
              }}
            >
              A confirmation and studio stem link have been reserved for{" "}
              <strong style={{ color: "var(--text)" }}>{confirmedOrder.customer_email || confirmedOrder.customerEmail}</strong>.
            </p>

            {/* Copyable Order Reference Box (Part 8) */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "14px",
                padding: "12px 20px",
                background: "rgba(5, 5, 8, 0.8)",
                border: "1px solid rgba(223, 194, 125, 0.35)",
                borderRadius: "8px",
                marginBottom: "32px",
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: "16px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: "var(--gold)",
                }}
              >
                #{confirmedOrder.order_number || confirmedOrder.orderNumber}
              </span>

              <button
                type="button"
                onClick={handleCopyOrderRef}
                style={{
                  padding: "6px 14px",
                  borderRadius: "4px",
                  border: hasCopiedRef
                    ? "1px solid #81c784"
                    : "1px solid var(--gold)",
                  background: hasCopiedRef
                    ? "rgba(129, 199, 132, 0.15)"
                    : "rgba(223, 194, 125, 0.15)",
                  color: hasCopiedRef ? "#81c784" : "var(--gold)",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {hasCopiedRef ? "Copied ✓" : "Copy"}
              </button>
            </div>

            {/* Payment Section (Part 7: Real Working Payment) */}
            {confirmedOrder.total_amount_ngn !== null &&
            Number(confirmedOrder.total_amount_ngn) > 0 ? (
              <div
                style={{
                  background: "rgba(5, 5, 8, 0.6)",
                  border: "1px solid rgba(223, 194, 125, 0.2)",
                  borderRadius: "8px",
                  padding: "24px",
                  maxWidth: "540px",
                  margin: "0 auto 30px",
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px" }}>
                  <span style={{ fontSize: "13px", color: "var(--muted)" }}>Authoritative Total</span>
                  <span style={{ fontSize: "16px", fontWeight: 800, color: "var(--gold)" }}>
                    ₦{Number(confirmedOrder.total_amount_ngn).toLocaleString()}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
                  <span style={{ fontSize: "13px", color: "var(--muted)" }}>Status</span>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "4px",
                      background: "rgba(223, 194, 125, 0.15)",
                      color: "var(--gold)",
                    }}
                  >
                    AWAITING PAYMENT
                  </span>
                </div>

                {paymentError && (
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: "4px",
                      background: "rgba(229, 115, 115, 0.15)",
                      color: "#e57373",
                      fontSize: "12px",
                      marginBottom: "16px",
                    }}
                  >
                    {paymentError}
                  </div>
                )}

                <button
                  type="button"
                  disabled={isInitializingPayment}
                  onClick={handleInitializePayment}
                  className="primary-button"
                  style={{
                    width: "100%",
                    height: "46px",
                    fontSize: "13px",
                    fontWeight: 800,
                    letterSpacing: "0.1em",
                    cursor: isInitializingPayment ? "wait" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  {isInitializingPayment ? (
                    <>
                      <LoadingSpinner size={16} color="#050507" /> Connecting to Paystack...
                    </>
                  ) : (
                    "Pay with Paystack →"
                  )}
                </button>
              </div>
            ) : (
              <div
                style={{
                  background: "rgba(5, 5, 8, 0.6)",
                  border: "1px solid rgba(223, 194, 125, 0.2)",
                  borderRadius: "8px",
                  padding: "20px",
                  maxWidth: "540px",
                  margin: "0 auto 30px",
                  textAlign: "center",
                }}
              >
                <p style={{ fontSize: "14px", color: "var(--gold)", margin: "0 0 6px", fontWeight: 700 }}>
                  Custom Scope Under Review
                </p>
                <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0 }}>
                  Your session involves Price Upon Request services. silachomka will inspect your files and deliver a tailored invoice and schedule.
                </p>
              </div>
            )}

            {/* Link to order status tracking */}
            <div style={{ display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}>
              <Link
                to={`/services/order/${confirmedOrder.order_number || confirmedOrder.orderNumber}`}
                className="secondary-button"
                style={{
                  padding: "10px 20px",
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                }}
              >
                View Full Session Tracking →
              </Link>

              <button
                type="button"
                onClick={() => {
                  setConfirmedOrder(null);
                  setSelectedSlugs([]);
                  setConfigurations({});
                  setClientFiles([]);
                  setStep("intent");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--muted)",
                  fontSize: "12px",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Start New Session Request
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
