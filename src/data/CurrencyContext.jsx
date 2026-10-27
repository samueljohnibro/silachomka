import { createContext, useContext, useState } from 'react';
import { useSelarPricing } from './useSelarPricing';

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
  const pricing = useSelarPricing();
  const [playbackMode, setPlaybackModeState] = useState(() => {
    try {
      const stored = sessionStorage.getItem('chomka_beat_playback_mode');
      if (stored === 'full') return 'full';
      return '45sec';
    } catch {
      return '45sec';
    }
  });

  const setPlaybackMode = (mode) => {
    const next = mode === 'full' ? 'full' : '45sec';
    setPlaybackModeState(next);
    try {
      sessionStorage.setItem('chomka_beat_playback_mode', next);
    } catch {}
  };

  return (
    <CurrencyContext.Provider value={{ ...pricing, playbackMode, setPlaybackMode }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
