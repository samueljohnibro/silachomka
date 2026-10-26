import { createContext, useContext, useState, useEffect } from "react";

const STORAGE_KEY = "silachomka_cookie_consent_v1";

const DEFAULT_PREFERENCES = {
  essential: true,
  functional: true,
  analytics: false,
  embeddedMedia: true,
};

const CookieConsentContext = createContext({
  consent: null,
  preferences: DEFAULT_PREFERENCES,
  isBannerVisible: false,
  isModalOpen: false,
  acceptAll: () => {},
  rejectOptional: () => {},
  savePreferences: () => {},
  openCookieSettings: () => {},
  closeCookieSettings: () => {},
});

export function CookieConsentProvider({ children }) {
  const [consent, setConsent] = useState(null);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && parsed.updatedAt) {
          setConsent(parsed);
          setPreferences({
            essential: true,
            functional: Boolean(parsed.functional),
            analytics: Boolean(parsed.analytics),
            embeddedMedia: Boolean(parsed.embeddedMedia),
          });
          setIsBannerVisible(false);
          return;
        }
      }
    } catch {
      // ignore storage errors
    }
    setIsBannerVisible(true);
  }, []);

  const persist = (nextPrefs, mode) => {
    const payload = {
      essential: true,
      functional: Boolean(nextPrefs.functional),
      analytics: Boolean(nextPrefs.analytics),
      embeddedMedia: Boolean(nextPrefs.embeddedMedia),
      mode,
      updatedAt: new Date().toISOString(),
    };
    setPreferences({
      essential: true,
      functional: payload.functional,
      analytics: payload.analytics,
      embeddedMedia: payload.embeddedMedia,
    });
    setConsent(payload);
    setIsBannerVisible(false);
    setIsModalOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }
  };

  const acceptAll = () => {
    persist(
      {
        essential: true,
        functional: true,
        analytics: true,
        embeddedMedia: true,
      },
      "accept_all"
    );
  };

  const rejectOptional = () => {
    persist(
      {
        essential: true,
        functional: false,
        analytics: false,
        embeddedMedia: false,
      },
      "reject_optional"
    );
  };

  const savePreferences = (customPrefs) => {
    persist(
      {
        ...preferences,
        ...customPrefs,
        essential: true,
      },
      "custom"
    );
  };

  const openCookieSettings = () => setIsModalOpen(true);
  const closeCookieSettings = () => setIsModalOpen(false);

  return (
    <CookieConsentContext.Provider
      value={{
        consent,
        preferences,
        isBannerVisible,
        isModalOpen,
        acceptAll,
        rejectOptional,
        savePreferences,
        openCookieSettings,
        closeCookieSettings,
      }}
    >
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  return useContext(CookieConsentContext);
}
