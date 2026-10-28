// src/components/ImmersiveServicesView.jsx
// Stage 37 — Req #2: Immersive Conversational Studio Concierge Experience

import React, { useState } from "react";
import { formatLongDate } from "../utils/dateFormatter";
import { CheckIcon, LoadingSpinner, LeftArrowIcon, RightArrowIcon, TrashIcon } from "./Icons";

/**
 * Immersive Conversational Studio Concierge Experience (Stage 37 — Req #2)
 *
 * Provides a large, glass-translucent, viewport-like conversation surface
 * that guides the user step-by-step:
 * 1. "What do you need?" -> Large interactive decision cards
 * 2. "How much?"        -> Duration stepper & scope
 * 3. "When?"            -> Themed calendar & time slot picker
 * 4. "Anything else?"   -> Neutral-placeholder brief & stems
 * 5. "Review & Pay"     -> Clear summary, deposit details & Paystack checkout
 *
 * Non-takeover: website chrome remains accessible; clear exit button & Escape key listener.
 */
export default function ImmersiveServicesView({
  activeServiceList = [],
  selectedSlugs = [],
  toggleService,
  configurations = {},
  updateConfig,
  studioAvailability = [],
  itemizedPrices = {},
  totalNgn = 0,
  hasPriceUponRequest = false,
  customerName = "",
  setCustomerName,
  customerEmail = "",
  setCustomerEmail,
  customerPhone = "",
  setCustomerPhone,
  customerMessage = "",
  setCustomerMessage,
  clientFiles = [],
  handleFileUpload,
  removeFile,
  isUploadingFile = false,
  uploadProgress = null,
  uploadError = null,
  handleFinalSubmit,
  isSubmitting = false,
  submitError = null,
  PublicStudioCalendar,
  onExit,
}) {
  // Internal conversation step: 'need' | 'scope' | 'when' | 'brief' | 'review'
  const [convStep, setConvStep] = useState("need");

  const selectedServices = activeServiceList.filter((s) => selectedSlugs.includes(s.slug));
  const hasVoiceRecording = selectedSlugs.includes("voice-recording");
  const primarySlug = hasVoiceRecording ? "voice-recording" : (selectedSlugs[0] || "general");
  const voiceBookingDate =
    configurations[primarySlug]?.bookingDate || configurations["voice-recording"]?.bookingDate || "";
  const voiceBookingTime =
    configurations[primarySlug]?.bookingTime || configurations["voice-recording"]?.bookingTime || "";

  return (
    <section className="services-immersive-viewport" aria-label="Immersive Studio Concierge Conversation">
      {/* Immersive Console Header */}
      <div className="services-immersive-header">
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span
            className="eyebrow"
            style={{
              letterSpacing: "0.22em",
              color: "var(--gold)",
              margin: 0,
              fontSize: "11px",
              fontWeight: 800,
            }}
          >
            chomkaMUSIC™ • THE SACRED SANCTUARY
          </span>
          <span style={{ fontSize: "11px", color: "var(--muted)", letterSpacing: "0.06em" }}>
            {convStep === "need" && "• Realm I: Which creation do you wish to manifest?"}
            {convStep === "scope" && "• Realm II: The Sacred Dimensions & Studio Time"}
            {convStep === "when" && "• Realm III: Harmonize Time & The Celestial Calendar"}
            {convStep === "brief" && "• Realm IV: Inscribe Your Vision & Sacred Stems"}
            {convStep === "review" && "• Realm V: Consecrate & Seal Your Manifestation"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "9px", color: "var(--muted)", display: "block", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Sacred Offering
            </span>
            <span style={{ fontSize: "15px", fontWeight: 800, color: "var(--gold)" }}>
              {hasPriceUponRequest && totalNgn === 0 ? "Price upon request" : `₦${totalNgn.toLocaleString()}`}
            </span>
          </div>

          <button
            type="button"
            onClick={onExit}
            className="studio-pill-btn"
            style={{
              fontSize: "11px",
              padding: "5px 12px",
              background: "rgba(255, 255, 255, 0.05)",
              color: "var(--muted)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              cursor: "pointer",
            }}
            title="Return to Temple (Escape)"
          >
            ✕ Return to Temple (Esc)
          </button>
        </div>
      </div>

      {/* Immersive Console Body */}
      <div className="services-immersive-body">
        {/* ========================================================
            STEP 1: "WHICH CREATION DO YOU WISH TO MANIFEST?"
            ======================================================== */}
        {convStep === "need" && (
          <div style={{ animation: "fadeIn 0.25s ease-out" }}>
            <div style={{ marginBottom: "26px", textAlign: "left" }}>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(24px, 4vw, 36px)",
                  fontWeight: 800,
                  color: "var(--text)",
                  margin: "0 0 8px",
                  letterSpacing: "0.02em",
                }}
              >
                Which creation do you wish to manifest?
              </h2>
              <p style={{ fontSize: "14px", color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
                Step into the sanctuary. Select the sacred sonic forms you desire to bring forth into physical reality. Every masterwork is sculpted with divine clarity and timeless perfection.
              </p>
            </div>

            {/* Large Interactive Choice Cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "14px",
              }}
            >
              {activeServiceList.map((svc) => {
                const isSelected = selectedSlugs.includes(svc.slug);
                return (
                  <div
                    key={svc.slug}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleService(svc.slug)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggleService(svc.slug)}
                    className={`services-immersive-card ${isSelected ? "is-selected" : ""}`}
                    style={{ minHeight: "150px" }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                        <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--gold)", textTransform: "uppercase" }}>
                          {svc.category || "STUDIO"}
                        </span>
                        <div
                          style={{
                            width: "20px",
                            height: "20px",
                            borderRadius: "50%",
                            border: isSelected ? "2px solid var(--gold)" : "2px solid rgba(255, 255, 255, 0.2)",
                            background: isSelected ? "var(--gold)" : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#050507",
                            fontSize: "11px",
                            fontWeight: 800,
                            transition: "all 0.15s ease",
                          }}
                        >
                          {isSelected && "✓"}
                        </div>
                      </div>
                      <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text)", margin: "0 0 6px" }}>
                        {svc.title}
                      </h3>
                      <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0, lineHeight: 1.4 }}>
                        {svc.plainExplanation || svc.description || svc.tagline}
                      </p>
                    </div>

                    {/* Live Duration Stepper right on card for hourly recording sessions */}
                    {svc.isHourly && isSelected && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          background: "rgba(0, 0, 0, 0.45)",
                          padding: "6px 12px",
                          borderRadius: "8px",
                          marginTop: "12px",
                          border: "1px solid rgba(223, 194, 125, 0.35)",
                        }}
                      >
                        <span style={{ fontSize: "11px", color: "var(--muted)" }}>Session Duration:</span>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const currentH = Math.max(1, parseInt(configurations[svc.slug]?.hours || 2, 10));
                              updateConfig(svc.slug, "hours", Math.max(1, currentH - 1));
                            }}
                            disabled={Math.max(1, parseInt(configurations[svc.slug]?.hours || 2, 10)) <= 1}
                            style={{
                              width: "24px",
                              height: "24px",
                              borderRadius: "4px",
                              border: "1px solid rgba(255,255,255,0.2)",
                              background: "rgba(255,255,255,0.08)",
                              color: "var(--text)",
                              cursor: "pointer",
                              fontWeight: 700,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                            aria-label="Decrease hours"
                          >
                            -
                          </button>
                          <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--gold)", minWidth: "48px", textAlign: "center" }}>
                            {configurations[svc.slug]?.hours || 2} {Number(configurations[svc.slug]?.hours || 2) === 1 ? "hr" : "hrs"}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const currentH = Math.max(1, parseInt(configurations[svc.slug]?.hours || 2, 10));
                              updateConfig(svc.slug, "hours", currentH + 1);
                            }}
                            style={{
                              width: "24px",
                              height: "24px",
                              borderRadius: "4px",
                              border: "1px solid rgba(255,255,255,0.2)",
                              background: "rgba(255,255,255,0.08)",
                              color: "var(--text)",
                              cursor: "pointer",
                              fontWeight: 700,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                            aria-label="Increase hours"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}

                    <div style={{ marginTop: "14px", paddingTop: "10px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: isSelected ? "var(--gold)" : "var(--text)" }}>
                        {svc.isHourly
                          ? `₦${((svc.hourlyRateNgn || 25000) * (configurations[svc.slug]?.hours || 2)).toLocaleString()}`
                          : svc.basePriceNgn ? `₦${Number(svc.basePriceNgn).toLocaleString()}` : "Price upon request"}
                      </span>
                      <span style={{ fontSize: "10px", color: "var(--muted)" }}>
                        {svc.turnaroundDays ? `~${svc.turnaroundDays}d turnaround` : "Live session"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Navigation Row */}
            <div className="services-immersive-nav">
              <span style={{ fontSize: "13px", color: "var(--muted)" }}>
                {selectedSlugs.length === 0 ? "Select at least 1 creation to enter the sanctuary" : `${selectedSlugs.length} sacred creation(s) chosen`}
              </span>
              <button
                type="button"
                disabled={selectedSlugs.length === 0}
                onClick={() => setConvStep("scope")}
                className="primary-button"
                style={{
                  height: "44px",
                  padding: "0 24px",
                  fontSize: "13px",
                  fontWeight: 700,
                  opacity: selectedSlugs.length === 0 ? 0.4 : 1,
                  cursor: selectedSlugs.length === 0 ? "not-allowed" : "pointer",
                }}
              >
                Next: Dimensions & Scope →
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 2: "THE SACRED DIMENSIONS & SCOPE"
            ======================================================== */}
        {convStep === "scope" && (
          <div style={{ animation: "fadeIn 0.25s ease-out" }}>
            <div style={{ marginBottom: "26px", textAlign: "left" }}>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(24px, 4vw, 36px)",
                  fontWeight: 800,
                  color: "var(--text)",
                  margin: "0 0 8px",
                  letterSpacing: "0.02em",
                }}
              >
                The Sacred Dimensions & Scope
              </h2>
              <p style={{ fontSize: "14px", color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
                Set the depth and hours necessary to sculpt your masterwork with unhurried perfection.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {selectedServices.map((svc) => {
                const cfg = configurations[svc.slug] || {};
                const hours = Math.max(1, parseInt(cfg.hours || 2, 10));
                return (
                  <div
                    key={svc.slug}
                    style={{
                      background: "rgba(16, 16, 24, 0.7)",
                      border: "1px solid rgba(223, 194, 125, 0.2)",
                      borderRadius: "12px",
                      padding: "20px 24px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "14px",
                      textAlign: "left",
                    }}
                  >
                    <div>
                      <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text)", margin: "0 0 4px" }}>
                        {svc.title}
                      </h3>
                      <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0 }}>
                        {svc.isHourly ? "Live engineering in the booth. Minimum 1 hour session." : svc.plainExplanation || "Authoritative deliverables included with standard turnaround."}
                      </p>
                    </div>

                    {svc.isHourly ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>Duration:</span>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(5, 5, 8, 0.7)", padding: "4px 8px", borderRadius: "8px", border: "1px solid rgba(223, 194, 125, 0.3)" }}>
                          <button
                            type="button"
                            onClick={() => updateConfig(svc.slug, "hours", Math.max(1, hours - 1))}
                            className="studio-pill-btn"
                            style={{ width: "28px", height: "28px", padding: 0, fontSize: "16px", fontWeight: 800 }}
                            aria-label="Decrease hours"
                          >
                            −
                          </button>
                          <span style={{ minWidth: "56px", textAlign: "center", fontWeight: 800, color: "var(--gold)", fontSize: "14px" }}>
                            {hours} {hours === 1 ? "hour" : "hours"}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateConfig(svc.slug, "hours", hours + 1)}
                            className="studio-pill-btn"
                            style={{ width: "28px", height: "28px", padding: 0, fontSize: "16px", fontWeight: 800 }}
                            aria-label="Increase hours"
                          >
                            +
                          </button>
                        </div>
                        <span style={{ fontSize: "14px", fontWeight: 800, color: "var(--gold)", minWidth: "85px", textAlign: "right" }}>
                          ₦{((svc.hourlyRateNgn || 25000) * hours).toLocaleString()}
                        </span>
                      </div>
                    ) : (
                      <span style={{ fontSize: "15px", fontWeight: 800, color: "var(--gold)" }}>
                        {svc.basePriceNgn ? `₦${Number(svc.basePriceNgn).toLocaleString()}` : "Price upon request"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Navigation Row */}
            <div className="services-immersive-nav">
              <button
                type="button"
                onClick={() => setConvStep("need")}
                className="studio-pill-btn"
                style={{ padding: "8px 16px", fontSize: "12px" }}
              >
                ← Back: Select Creations
              </button>
              <button
                type="button"
                onClick={() => setConvStep("when")}
                className="primary-button"
                style={{ height: "44px", padding: "0 24px", fontSize: "13px", fontWeight: 700 }}
              >
                Next: Harmonize Calendar & Time →
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 3: "HARMONIZE TIME & DATE"
            ======================================================== */}
        {convStep === "when" && (
          <div style={{ animation: "fadeIn 0.25s ease-out" }}>
            <div style={{ marginBottom: "26px", textAlign: "left" }}>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(24px, 4vw, 36px)",
                  fontWeight: 800,
                  color: "var(--text)",
                  margin: "0 0 8px",
                  letterSpacing: "0.02em",
                }}
              >
                Harmonize Time & Date
              </h2>
              <p style={{ fontSize: "14px", color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
                {hasVoiceRecording
                  ? "Choose the exact hour the sanctuary doors open for your studio tracking session."
                  : "We craft and consecrate remote creations within 3 to 5 business days. You may also specify an auspicious kickoff date below."}
              </p>
            </div>

            {/* Themed Studio Calendar */}
            {PublicStudioCalendar && (
              <div
                style={{
                  background: "rgba(16, 16, 24, 0.7)",
                  border: "1px solid rgba(223, 194, 125, 0.2)",
                  borderRadius: "12px",
                  padding: "20px",
                }}
              >
                <PublicStudioCalendar
                  studioAvailability={studioAvailability}
                  selectedDate={voiceBookingDate}
                  onSelectDate={(newDate) => {
                    updateConfig(primarySlug, "bookingDate", newDate);
                    updateConfig("voice-recording", "bookingDate", newDate);
                    updateConfig(primarySlug, "bookingTime", "");
                    updateConfig("voice-recording", "bookingTime", "");
                  }}
                  selectedTime={voiceBookingTime}
                  onSelectTime={(newTime) => {
                    updateConfig(primarySlug, "bookingTime", newTime);
                    updateConfig("voice-recording", "bookingTime", newTime);
                  }}
                />
              </div>
            )}

            {/* Navigation Row */}
            <div className="services-immersive-nav">
              <button
                type="button"
                onClick={() => setConvStep("scope")}
                className="studio-pill-btn"
                style={{ padding: "8px 16px", fontSize: "12px" }}
              >
                ← Back: Dimensions & Scope
              </button>
              <button
                type="button"
                onClick={() => setConvStep("brief")}
                className="primary-button"
                style={{ height: "44px", padding: "0 24px", fontSize: "13px", fontWeight: 700 }}
              >
                Next: Inscribe Your Vision →
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 4: "INSCRIBE YOUR SACRED VISION"
            ======================================================== */}
        {convStep === "brief" && (
          <div style={{ animation: "fadeIn 0.25s ease-out" }}>
            <div style={{ marginBottom: "26px", textAlign: "left" }}>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(24px, 4vw, 36px)",
                  fontWeight: 800,
                  color: "var(--text)",
                  margin: "0 0 8px",
                  letterSpacing: "0.02em",
                }}
              >
                Inscribe Your Sacred Vision
              </h2>
              <p style={{ fontSize: "14px", color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
                Entrust us with your contact details, notes, reference frequencies, and audio stems for the engineer.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "16px", textAlign: "left" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--gold)", fontWeight: 700, marginBottom: "6px", textTransform: "uppercase" }}>
                  Your Name / Studio Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Jane Doe / Studio Client"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="studio-input"
                  style={{ width: "100%", height: "44px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--gold)", fontWeight: 700, marginBottom: "6px", textTransform: "uppercase" }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="client@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="studio-input"
                  style={{ width: "100%", height: "44px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--gold)", fontWeight: 700, marginBottom: "6px", textTransform: "uppercase" }}>
                  Phone / WhatsApp *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+234 800 000 0000"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="studio-input"
                  style={{ width: "100%", height: "44px" }}
                />
              </div>
            </div>

            <div style={{ textAlign: "left", marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "12px", color: "var(--gold)", fontWeight: 700, marginBottom: "6px", textTransform: "uppercase" }}>
                Project Brief & Notes (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Share any notes about your vision, release goals, reference tracks, or timeline constraints..."
                value={customerMessage}
                onChange={(e) => setCustomerMessage(e.target.value)}
                className="studio-input"
                style={{ width: "100%", resize: "vertical", minHeight: "80px" }}
              />
            </div>

            {/* Optional Stem / Reference Upload */}
            <div
              style={{
                background: "rgba(16, 16, 24, 0.6)",
                border: "1px dashed rgba(223, 194, 125, 0.3)",
                borderRadius: "10px",
                padding: "16px 20px",
                textAlign: "left",
                marginBottom: "16px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)", display: "block" }}>
                    Attach Stems, Beats or Reference Audio (Optional)
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                    Supported formats: WAV, MP3, AIFF, ZIP up to 50MB
                  </span>
                </div>
                <label
                  className="studio-pill-btn"
                  style={{
                    padding: "6px 14px",
                    background: "rgba(223, 194, 125, 0.15)",
                    color: "var(--gold)",
                    cursor: isUploadingFile ? "wait" : "pointer",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}
                >
                  {isUploadingFile ? `Uploading (${uploadProgress?.percent || 0}%)` : "+ Attach File"}
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={isUploadingFile}
                    style={{ display: "none" }}
                    accept=".wav,.mp3,.aiff,.zip"
                  />
                </label>
              </div>

              {clientFiles.length > 0 && (
                <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  {clientFiles.map((f) => (
                    <div
                      key={f.id || f.name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        background: "rgba(5, 5, 8, 0.7)",
                        borderRadius: "6px",
                        fontSize: "12px",
                      }}
                    >
                      <span style={{ color: "var(--text)" }}>📎 {f.originalName || f.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(f.id)}
                        style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: "14px" }}
                        title="Remove file"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Navigation Row */}
            <div className="services-immersive-nav">
              <button
                type="button"
                onClick={() => setConvStep("when")}
                className="studio-pill-btn"
                style={{ padding: "8px 16px", fontSize: "12px" }}
              >
                ← Back: Sacred Calendar
              </button>
              <button
                type="button"
                disabled={!customerName.trim() || !customerEmail.trim() || !customerPhone.trim()}
                onClick={() => setConvStep("review")}
                className="primary-button"
                style={{
                  height: "44px",
                  padding: "0 24px",
                  fontSize: "13px",
                  fontWeight: 700,
                  opacity: !customerName.trim() || !customerEmail.trim() || !customerPhone.trim() ? 0.4 : 1,
                  cursor: !customerName.trim() || !customerEmail.trim() || !customerPhone.trim() ? "not-allowed" : "pointer",
                }}
              >
                Next: Review & Consecrate →
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 5: "REVIEW & CONSECRATE"
            ======================================================== */}
        {convStep === "review" && (
          <div style={{ animation: "fadeIn 0.25s ease-out" }}>
            <div style={{ marginBottom: "26px", textAlign: "left" }}>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(24px, 4vw, 36px)",
                  fontWeight: 800,
                  color: "var(--text)",
                  margin: "0 0 8px",
                  letterSpacing: "0.02em",
                }}
              >
                Review & Consecrate Your Manifestation
              </h2>
              <p style={{ fontSize: "14px", color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
                Every element has aligned. Review your session breakdown before sealing it into the sanctuary ledger.
              </p>
            </div>

            {/* Itemized Summary Card */}
            <div
              style={{
                background: "rgba(16, 16, 24, 0.8)",
                border: "1px solid rgba(223, 194, 125, 0.25)",
                borderRadius: "12px",
                padding: "24px",
                textAlign: "left",
                marginBottom: "20px",
              }}
            >
              <div style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "14px", marginBottom: "14px" }}>
                <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: "4px" }}>
                  Client Contact
                </span>
                <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>
                  {customerName} <span style={{ color: "var(--muted)", fontWeight: 400 }}>({customerEmail} · {customerPhone})</span>
                </p>
              </div>

              {voiceBookingDate && (
                <div style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "14px", marginBottom: "14px" }}>
                  <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: "4px" }}>
                    Scheduled Studio Session
                  </span>
                  <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--gold)" }}>
                    📅 {formatLongDate(voiceBookingDate)} {voiceBookingTime ? `at ${voiceBookingTime}` : ""}
                  </p>
                </div>
              )}

              {/* Deliverables Overview */}
              <div style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "14px", marginBottom: "14px" }}>
                <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: "8px" }}>
                  Guaranteed Deliverables
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {selectedServices.map((svc) => (
                    <div key={`deliv-${svc.slug}`} style={{ fontSize: "12px", color: "var(--text)" }}>
                      <strong style={{ color: "var(--gold)" }}>• {svc.title}:</strong>{" "}
                      <span style={{ color: "var(--muted)" }}>
                        {Array.isArray(svc.deliverables) && svc.deliverables.length > 0
                          ? svc.deliverables.join(", ")
                          : "High-resolution master files, industry-standard stems & mix passes"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
                <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Itemized Services
                </span>
                {selectedServices.map((svc) => {
                  const price = itemizedPrices[svc.slug];
                  const hours = configurations[svc.slug]?.hours || 2;
                  return (
                    <div key={svc.slug} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "14px", color: "var(--text)" }}>
                        {svc.title} {svc.isHourly ? `(${hours} hrs)` : ""}
                      </span>
                      <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--gold)" }}>
                        {svc.isHourly ? `₦${price?.toLocaleString() || "0"}` : price ? `₦${Number(price).toLocaleString()}` : "Price upon request"}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Total & 50% Deposit Breakdown */}
              <div
                style={{
                  borderTop: "1px solid rgba(223, 194, 125, 0.3)",
                  paddingTop: "14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-h)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Total Studio Investment
                  </span>
                  <span style={{ fontSize: "20px", fontWeight: 800, color: "var(--gold)" }}>
                    {hasPriceUponRequest && totalNgn === 0 ? "Price upon request" : `₦${totalNgn.toLocaleString()}`}
                  </span>
                </div>

                {totalNgn > 0 && (
                  <div
                    style={{
                      background: "rgba(223, 194, 125, 0.06)",
                      border: "1px solid rgba(223, 194, 125, 0.2)",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: "12px",
                    }}
                  >
                    <div>
                      <strong style={{ color: "#4ade80", display: "block" }}>⚡ 50% Initial Deposit Today</strong>
                      <span style={{ color: "var(--muted)", fontSize: "11px" }}>To lock studio schedule & engineer time</span>
                    </div>
                    <span style={{ fontSize: "15px", fontWeight: 800, color: "#4ade80" }}>
                      ₦{Math.round(totalNgn * 0.5).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {submitError && (
              <div
                style={{
                  padding: "12px 16px",
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "8px",
                  color: "#fca5a5",
                  fontSize: "13px",
                  marginBottom: "16px",
                  textAlign: "left",
                }}
              >
                ⚠️ {submitError}
              </div>
            )}

            {/* Navigation Row */}
            <div className="services-immersive-nav">
              <button
                type="button"
                onClick={() => setConvStep("brief")}
                className="studio-pill-btn"
                style={{ padding: "8px 16px", fontSize: "12px" }}
              >
                ← Back: Edit Inscription
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalSubmit}
                className="primary-button"
                style={{
                  height: "48px",
                  padding: "0 28px",
                  fontSize: "14px",
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                  background: "var(--gold)",
                  color: "#050507",
                }}
              >
                {isSubmitting ? "Consecrating Session..." : "Seal & Consecrate Manifestation →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
