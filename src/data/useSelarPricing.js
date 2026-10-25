import { useState, useEffect, useCallback } from "react";

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

export function useSelarPricing(initialCurrency) {
  const [currency, setCurrencyState] = useState(() => {
    if (initialCurrency) return initialCurrency.toUpperCase();
    try {
      const stored = localStorage.getItem("chomka_preferred_currency");
      if (stored) return stored.toUpperCase();
    } catch {}
    return "NGN";
  });

  const [pricingData, setPricingData] = useState(() => pricingCache.get(currency) || null);
  const [isLoading, setIsLoading] = useState(!pricingCache.has(currency));
  const [error, setError] = useState(null);

  const fetchPricing = useCallback(async (curr) => {
    if (pricingCache.has(curr)) {
      setPricingData(pricingCache.get(curr));
      setIsLoading(false);
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
        setPricingData(data);
        console.log("SELAR PRICING LOADED:", curr, Object.keys(data.products || {}).length, "products");
      } else {
        throw new Error(data?.error || "Failed to load authoritative Selar pricing");
      }
    } catch (err) {
      console.warn("Could not fetch Selar pricing:", err.message);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPricing(currency);
  }, [currency, fetchPricing]);

  const setCurrency = (newCurr) => {
    const upper = newCurr.toUpperCase();
    setCurrencyState(upper);
    if (pricingCache.has(upper)) {
      setPricingData(pricingCache.get(upper));
    }
    try {
      localStorage.setItem("chomka_preferred_currency", upper);
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
