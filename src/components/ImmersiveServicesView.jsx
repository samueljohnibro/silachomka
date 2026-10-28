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
  const voiceHours = configurations["voice-recording"]?.hours || 2;
  const voiceBookingDate = configurations["voice-recording"]?.bookingDate || "";
  const voiceBookingTime = configurations["voice-recording"]?.bookingTime || "";

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
            chomkaMUSIC™ STUDIO CONCIERGE
          </span>
          <span style={{ fontSize: "11px", color: "var(--muted)", letterSpacing: "0.06em" }}>
            {convStep === "need" && "• Step 1 of 5: What do you need?"}
            {convStep === "scope" && "• Step 2 of 5: How much studio time?"}
            {convStep === "when" && "• Step 3 of 5: When should we schedule?"}
            {convStep === "brief" && "• Step 4 of 5: Anything else to know?"}
            {convStep === "review" && "• Step 5 of 5: Review & reserve"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "9px", color: "var(--muted)", display: "block", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Total
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
            title="Exit immersive conversation (Escape)"
          >
            ✕ Exit (Esc)
          </button>
        </div>
      </div>

      {/* Immersive Console Body */}
      <div className="services-immersive-body">
        {/* ========================================================
            STEP 1: "WHAT DO YOU NEED?"
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
                What do you need?
              </h2>
              <p style={{ fontSize: "14px", color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
                Tap one or more services to assemble your studio session. Clear options, zero studio jargon.
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

                    <div style={{ marginTop: "14px", paddingTop: "10px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: isSelected ? "var(--gold)" : "var(--text)" }}>
                        {svc.isHourly ? `₦${(svc.hourlyRateNgn || 25000).toLocaleString()} / hr` : svc.basePriceNgn ? `₦${Number(svc.basePriceNgn).toLocaleString()}` : "Price upon request"}
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
                {selectedSlugs.length === 0 ? "Select at least 1 service to continue" : `${selectedSlugs.length} service(s) chosen`}
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
                Next: Scope & Duration →
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 2: "HOW MUCH?" (SCOPE / DURATION)
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
                How much studio time do you need?
              </h2>
              <p style={{ fontSize: "14px", color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
                Configure the duration and scope for your selected services.
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
                ← Back: Choose Services
              </button>
              <button
                type="button"
                onClick={() => setConvStep("when")}
                className="primary-button"
                style={{ height: "44px", padding: "0 24px", fontSize: "13px", fontWeight: 700 }}
              >
                Next: Schedule Date & Time →
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 3: "WHEN?" (CALENDAR & TIME SLOTS)
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
                When should we schedule your session?
              </h2>
              <p style={{ fontSize: "14px", color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
                {hasVoiceRecording
                  ? "Select an open studio date from the calendar, then choose your preferred time slot."
                  : "We deliver remote projects within 3 to 5 business days from brief receipt. You can also pick a kickoff date below."}
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
                    updateConfig("voice-recording", "bookingDate", newDate);
                    updateConfig("voice-recording", "bookingTime", "");
                  }}
                  selectedTime={voiceBookingTime}
                  onSelectTime={(newTime) => {
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
                ← Back: Duration & Scope
              </button>
              <button
                type="button"
                onClick={() => setConvStep("brief")}
                className="primary-button"
                style={{ height: "44px", padding: "0 24px", fontSize: "13px", fontWeight: 700 }}
              >
                Next: Project Brief & Details →
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 4: "ANYTHING ELSE?" (BRIEF & NEUTRAL PLACEHOLDERS)
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
                Anything else we should know?
              </h2>
              <p style={{ fontSize: "14px", color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
                Enter your contact info and any vision notes, reference links, or stems for the studio engineer.
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
                ← Back: Schedule
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
                Next: Review & Payment →
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 5: "REVIEW & RESERVE"
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
                Review your studio booking
              </h2>
              <p style={{ fontSize: "14px", color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
                Everything looks ready. Review your session breakdown before confirming.
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

              {hasVoiceRecording && voiceBookingDate && (
                <div style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "14px", marginBottom: "14px" }}>
                  <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: "4px" }}>
                    Scheduled Appointment
                  </span>
                  <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--gold)" }}>
                    📅 {formatLongDate(voiceBookingDate)} {voiceBookingTime ? `at ${voiceBookingTime}` : ""}
                  </p>
                </div>
              )}

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

              <div
                style={{
                  borderTop: "1px solid rgba(223, 194, 125, 0.3)",
                  paddingTop: "14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block" }}>
                    Total Estimated Investment
                  </span>
                  <span style={{ fontSize: "11px", color: "#4ade80" }}>
                    * 50% deposit required upon booking confirmation
                  </span>
                </div>
                <span style={{ fontSize: "22px", fontWeight: 800, color: "var(--gold)" }}>
                  {hasPriceUponRequest && totalNgn === 0 ? "Price upon request" : `₦${totalNgn.toLocaleString()}`}
                </span>
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
                ← Back: Edit Details
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
                {isSubmitting ? "Locking In Session..." : "Confirm Studio Booking →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
