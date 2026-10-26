import { createContext, useContext, useState } from 'react';
import { useSelarPricing } from './useSelarPricing';

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
  const pricing = useSelarPricing();
  const [playbackMode, setPlaybackModeState] = useState(() => {
    try {
      return sessionStorage.getItem('chomka_beat_playback_mode') || '1min';
    } catch {
      return '1min';
    }
  });

  const setPlaybackMode = (mode) => {
    const next = mode === 'full' ? 'full' : '1min';
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
