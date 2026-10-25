import React, { useState } from "react";

export default function SubscriberNewsletterBox({ source = "website" }) {
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState("IDLE"); // IDLE, SUBMITTING, SUCCESS, ERROR
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setStatus("ERROR");
      setMessage("Please enter a valid email address.");
      return;
    }

    setStatus("SUBMITTING");
    setMessage("");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          website_hp: honeypot, // Honeypot field for anti-bot
          source,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setStatus("SUCCESS");
        setMessage(data.message || "Thank you for subscribing to Silachomka updates!");
        setEmail("");
      } else {
        setStatus("ERROR");
        setMessage(data.error || "Subscription failed. Please try again.");
      }
    } catch {
      setStatus("ERROR");
      setMessage("Network error. Please try again later.");
    }
  };

  return (
    <div
      className="newsletter-box"
      style={{
        background: "rgba(223, 194, 125, 0.04)",
        border: "1px solid rgba(223, 194, 125, 0.2)",
        borderRadius: "12px",
        padding: "24px 20px",
        maxWidth: "540px",
        margin: "0 auto 32px auto",
        textAlign: "center",
      }}
    >
      <h3
        style={{
          fontSize: "18px",
          fontWeight: 700,
          color: "var(--text-h, #fff)",
          margin: "0 0 6px 0",
          letterSpacing: "0.02em",
        }}
      >
        Stay In The Loop
      </h3>
      <p
        style={{
          fontSize: "13px",
          color: "var(--muted, #888)",
          margin: "0 0 16px 0",
          lineHeight: 1.5,
        }}
      >
        Subscribe for notification of new releases, studio beats, and exclusive Chomka Nation drops.
      </p>

      {status === "SUCCESS" ? (
        <div
          style={{
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(16, 185, 129, 0.4)",
            color: "#34d399",
            padding: "12px 16px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 500,
          }}
        >
          ✓ {message}
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* Honeypot for bots (hidden from humans) */}
          <input
            type="text"
            name="website_hp"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            style={{ display: "none" }}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />

          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <input
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              disabled={status === "SUBMITTING"}
              style={{
                flex: "1 1 240px",
                padding: "10px 14px",
                borderRadius: "6px",
                border: "1px solid var(--border, rgba(255,255,255,0.15))",
                background: "rgba(0,0,0,0.5)",
                color: "#fff",
                fontSize: "13px",
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={status === "SUBMITTING"}
              className="primary-button"
              style={{
                padding: "10px 20px",
                fontSize: "13px",
                fontWeight: 600,
                borderRadius: "6px",
                border: "none",
                background: "var(--gold, #dfc27d)",
                color: "#000",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {status === "SUBMITTING" ? "Subscribing..." : "Subscribe"}
            </button>
          </div>

          {status === "ERROR" && (
            <div style={{ color: "#f87171", fontSize: "12px", marginTop: "4px" }}>
              {message}
            </div>
          )}

          <div
            style={{
              fontSize: "11px",
              color: "rgba(255,255,255,0.4)",
              marginTop: "4px",
            }}
          >
            By subscribing, you agree to receive studio updates. Unsubscribe anytime with one click.
          </div>
        </form>
      )}
    </div>
  );
}
