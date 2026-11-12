import { useState, useEffect, useCallback, useRef } from "react";

const SUPPORTED_CURRENCIES = [
  { code: "NGN", symbol: "₦", label: "NGN (₦)" },
  { code: "USD", symbol: "$", label: "USD ($)" },
  { code: "GBP", symbol: "£", label: "GBP (£)" },
  { code: "GHS", symbol: "GH₵", label: "GHS (GH₵)" },
  { code: "KES", symbol: "KSh", label: "KES (KSh)" },
  { code: "ZAR", symbol: "R", label: "ZAR (R)" },
  { code: "TZS", symbol: "TSh", label: "TZS (TSh)" },
  { code: "UGX", symbol: "USh", label: "UGX (USh)" },
  { code: "XAF", symbol: "FCFA", label: "XAF (FCFA)" },
  { code: "XOF", symbol: "CFA", label: "XOF (CFA)" },
  { code: "RWF", symbol: "RF", label: "RWF (RF)" },
  { code: "ZMW", symbol: "ZK", label: "ZMW (ZK)" },
];

// In-memory cache across hook instances and currency switches
const pricingCache = new Map();

function detectInitialCurrency(override) {
  if (override) return override.toUpperCase();
  try {
    const session = sessionStorage.getItem("chomka_preferred_currency");
    if (session) return session.toUpperCase();
    const stored = localStorage.getItem("chomka_preferred_currency");
    if (stored) return stored.toUpperCase();
  } catch {}

  // Instant multi-signal heuristic (0ms, synchronous, zero network wait)
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const navLangs = Array.isArray(navigator.languages) ? navigator.languages : [navigator.language || ""];
    const langStr = navLangs.join(",").toLowerCase();

    // 1. Nigeria (primary artist market)
    if (
      tz.includes("Lagos") ||
      tz.includes("Nigeria") ||
      tz.includes("Kano") ||
      tz.includes("Ibadan") ||
      tz.includes("Porto-Novo") || // adjacent West Africa Time border
      /-ng\b/i.test(langStr) ||
      /\b(yo|ig|ha|pcm)\b/i.test(langStr)
    ) {
      return "NGN";
    }

    // 2. Ghana
    if (tz.includes("Accra") || tz.includes("Ghana") || /-gh\b/i.test(langStr)) return "GHS";

    // 3. Kenya
    if (tz.includes("Nairobi") || tz.includes("Kenya") || /-ke\b/i.test(langStr)) return "KES";

    // 4. South Africa
    if (tz.includes("Johannesburg") || tz.includes("South_Africa") || /-za\b/i.test(langStr)) return "ZAR";

    // 5. United Kingdom
    if (tz.includes("London") || /-gb\b/i.test(langStr)) return "GBP";

    // 6. Uganda
    if (tz.includes("Kampala") || /-ug\b/i.test(langStr)) return "UGX";

    // 7. Tanzania
    if (tz.includes("Dar_es_Salaam") || /-tz\b/i.test(langStr)) return "TZS";

    // 8. Rwanda
    if (tz.includes("Kigali") || /-rw\b/i.test(langStr)) return "RWF";

    // 9. Zambia
    if (tz.includes("Lusaka") || /-zm\b/i.test(langStr)) return "ZMW";

    // 10. Central Africa (CEMAC / XAF)
    if (
      tz.includes("Douala") ||
      tz.includes("Kinshasa") ||
      tz.includes("Brazzaville") ||
      tz.includes("Bangui") ||
      tz.includes("Malabo") ||
      tz.includes("Libreville") ||
      /-(cm|ga|cg|td|gq|cf)\b/i.test(langStr)
    ) {
      return "XAF";
    }

    // 11. West Africa (UEMOA / XOF)
    if (
      tz.includes("Abidjan") ||
      tz.includes("Dakar") ||
      tz.includes("Cotonou") ||
      tz.includes("Lome") ||
      tz.includes("Bamako") ||
      tz.includes("Niamey") ||
      tz.includes("Ouagadougou") ||
      /-(ci|sn|bj|tg|ml|ne|bf)\b/i.test(langStr)
    ) {
      return "XOF";
    }

    // 12. United States & Americas
    if (
      tz.includes("America") ||
      tz.includes("New_York") ||
      tz.includes("Chicago") ||
      tz.includes("Los_Angeles") ||
      tz.includes("Denver") ||
      tz.includes("Phoenix") ||
      /-us\b/i.test(langStr)
    ) {
      return "USD";
    }
  } catch {}

  // Authoritative default baseline: silachomka is a Nigerian artist based in Nigeria.
  // Default to NGN — NEVER default to USD.
  return "NGN";
}

export function useSelarPricing(initialCurrency) {
  const [currency, setCurrencyState] = useState(() => detectInitialCurrency(initialCurrency));

  const activeCurrencyRef = useRef(currency);
  activeCurrencyRef.current = currency;

  // Background geolocation verification (query server with device signals)
  useEffect(() => {
    try {
      // If user has explicitly picked a currency, preserve it completely
      const userSelected =
        sessionStorage.getItem("chomka_user_selected_currency") ||
        localStorage.getItem("chomka_user_selected_currency");
      if (userSelected) return;

      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      const navLangs = Array.isArray(navigator.languages) ? navigator.languages : [navigator.language || ""];
      const lang = navLangs[0] || "";

      const queryParams = new URLSearchParams();
      if (tz) queryParams.set("tz", tz);
      if (lang) queryParams.set("lang", lang);

      fetch(`/api/geo?${queryParams.toString()}`, {
        headers: {
          "x-client-timezone": tz,
          "x-client-locale": lang,
        },
      })
        .then((r) => r.json())
        .then((geo) => {
          if (!geo?.currency) return;

          const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
          const localNavLangs = Array.isArray(navigator.languages) ? navigator.languages : [navigator.language || ""];
          const localLangStr = localNavLangs.join(",").toLowerCase();

          const isLocallyNigeria =
            localTz.includes("Lagos") ||
            localTz.includes("Nigeria") ||
            localTz.includes("Kano") ||
            localTz.includes("Ibadan") ||
            localTz.includes("Porto-Novo") ||
            /-ng\b/i.test(localLangStr) ||
            /\b(yo|ig|ha|pcm)\b/i.test(localLangStr);

          // IMMUNITY SHIELD:
          // Never allow a proxy / CDN datacenter artifact (DE, US, IE, etc.) to flip a Nigerian device to USD!
          if (isLocallyNigeria && geo.currency !== "NGN" && (geo.country === "DE" || geo.country === "US" || geo.country === "IE")) {
            console.info("[Geo] Preserving authoritative Nigerian NGN against proxy geo misattribution:", geo.country);
            return;
          }

          if (geo.currency !== activeCurrencyRef.current) {
            const matched = SUPPORTED_CURRENCIES.find((c) => c.code === geo.currency);
            if (matched) {
              activeCurrencyRef.current = geo.currency;
              setCurrencyState(geo.currency);
              try {
                sessionStorage.setItem("chomka_preferred_currency", geo.currency);
              } catch {}
            }
          }
        })
        .catch(() => {});
    } catch {}
  }, []);

  const [pricingData, setPricingData] = useState(() => pricingCache.get(currency) || null);
  const [isLoading, setIsLoading] = useState(!pricingCache.has(currency));
  const [error, setError] = useState(null);

  const fetchPricing = useCallback(async (curr) => {
    if (pricingCache.has(curr)) {
      if (activeCurrencyRef.current === curr) {
        setPricingData(pricingCache.get(curr));
        setIsLoading(false);
      }
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const res = await fetch(`/api/beats/pricing?currency=${encodeURIComponent(curr)}`, {
        priority: "high"
      });
      if (!res.ok) {
        throw new Error(`Pricing API responded with HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data?.success) {
        pricingCache.set(curr, data);
        if (activeCurrencyRef.current === curr) {
          setPricingData(data);
        }
      } else {
        throw new Error(data?.error || "Failed to load authoritative Selar pricing");
      }
    } catch (err) {
      console.warn("Could not fetch Selar pricing:", err.message);
      setError(err.message);
    } finally {
      if (activeCurrencyRef.current === curr) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchPricing(currency);
  }, [currency, fetchPricing]);

  const setCurrency = (newCurr) => {
    const upper = newCurr.toUpperCase();
    activeCurrencyRef.current = upper;
    setCurrencyState(upper);
    if (pricingCache.has(upper)) {
      setPricingData(pricingCache.get(upper));
    } else {
      setPricingData(null);
    }
    try {
      sessionStorage.setItem("chomka_preferred_currency", upper);
      localStorage.setItem("chomka_preferred_currency", upper);
      sessionStorage.setItem("chomka_user_selected_currency", upper);
      localStorage.setItem("chomka_user_selected_currency", upper);
    } catch {}
  };

  /**
   * Resolves the authoritative product details for a given beat and license tier.
   * Tier: 'basic' | 'premium' | 'ultimate'
   */
  const getBeatPrice = useCallback(
    (beat, tier) => {
      if (!beat || !pricingData) return null;
      // Do not return data if pricingData belongs to a different currency than active
      if (pricingData.currency && pricingData.currency !== currency) {
        return null;
      }

      // 1. Try matching by the beat's configured Selar URL
      const urlField =
        tier === "basic"
          ? beat.selar?.basic || beat.selar_basic_url
          : tier === "premium"
          ? beat.selar?.premium || beat.selar_premium_url
          : beat.selar?.ultimate || beat.selar_ultimate_url;

      if (urlField && pricingData?.products) {
        const slug = urlField.split("/").pop()?.split("?")[0];
        if (slug && pricingData.products[slug]) {
          return pricingData.products[slug];
        }
      }

      // 2. Try matching by normalized beat slug
      const normalizedSlug = (beat.slug || beat.id || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      if (pricingData?.byBeat?.[normalizedSlug]?.[tier]) {
        return pricingData.byBeat[normalizedSlug][tier];
      }

      // 3. Authoritative Selar Studio tier fallback for newly created beats without a custom product slug
      if (pricingData?.defaultTiers?.[tier]) {
        return {
          ...pricingData.defaultTiers[tier],
          url: urlField || pricingData.defaultTiers[tier].url,
        };
      }

      if (pricingData?.byBeat) {
        for (const key of Object.keys(pricingData.byBeat)) {
          if (pricingData.byBeat[key]?.[tier]) {
            return {
              ...pricingData.byBeat[key][tier],
              url: urlField || pricingData.byBeat[key][tier].url,
            };
          }
        }
      }

      return null;
    },
    [pricingData, currency]
  );

  /**
   * Returns the lowest tier formatted starting price for a beat (usually 'basic').
   */
  const getBeatStartingPrice = useCallback(
    (beat) => {
      const basic = getBeatPrice(beat, "basic");
      if (basic?.formatted) return basic.formatted;

      // Fallback: if Selar data hasn't loaded yet or is offline, use beat's stored currency if NGN
      if (currency === "NGN") {
        const raw = beat?.priceBasic || beat?.price_basic || 15000;
        return `₦${Number(raw).toLocaleString()}`;
      }

      if (currency === "USD") {
        return "$11.26";
      }

      return null;
    },
    [getBeatPrice, currency]
  );

  return {
    currency,
    setCurrency,
    supportedCurrencies: SUPPORTED_CURRENCIES,
    pricingData,
    isLoading,
    error,
    getBeatPrice,
    getBeatStartingPrice,
  };
}
