"use client";

import { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import type { Locale, TranslationDict } from "@/lib/i18n";
import { translations } from "@/lib/i18n";

export type Theme = "lime" | "mint" | "emerald" | "jade";
export type Mode = "light" | "dark";

export const THEMES: { id: Theme; name: string; colorClass: string; hex: string }[] = [
  { id: "lime", name: "Cyber Lime", colorClass: "bg-[#c6f827]", hex: "#c6f827" },
  { id: "mint", name: "Electric Mint", colorClass: "bg-[#00ff88]", hex: "#00ff88" },
  { id: "emerald", name: "Neon Emerald", colorClass: "bg-[#10b981]", hex: "#10b981" },
  { id: "jade", name: "Forest Jade", colorClass: "bg-[#059669]", hex: "#059669" },
];

export type TranslationKeys = keyof (typeof translations)["es"];

type PreferencesContextType = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  mode: Mode;
  setMode: (m: Mode) => void;
  locale: Locale;
  setLocale: (l: Locale) => void;
  sound: boolean;
  setSound: (s: boolean) => void;
  playBlip: (freq?: number, duration?: number, gainValue?: number) => void;
  t: TranslationDict;
};

const PreferencesContext = createContext<PreferencesContextType | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("erp-mode") as Mode | null;
      if (saved === "light" || saved === "dark") return saved;
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
    }
    return "dark";
  });

  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("erp-theme") as Theme | null;
      if (saved && THEMES.some((t) => t.id === saved)) return saved;
    }
    return "lime";
  });

  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("erp-locale") as Locale | null;
      if (saved && (["es", "en", "pt", "zh"] as const).includes(saved)) return saved;
      const match = document.cookie.match(/erp-locale=([^;]+)/);
      if (match && (["es", "en", "pt", "zh"] as const).includes(match[1] as Locale)) {
        return match[1] as Locale;
      }
    }
    return "es";
  });

  const [sound, setSoundState] = useState<boolean>(true);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    try {
      const savedSound = localStorage.getItem("vout-sound");
      if (savedSound !== null) {
        setSoundState(savedSound === "true");
      }
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-mode", mode);
    if (mode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [mode]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.cookie = `erp-locale=${locale}; path=/; max-age=31536000; SameSite=Lax`;
  }, [locale]);

  const setMode = (newMode: Mode) => {
    setModeState(newMode);
    localStorage.setItem("erp-mode", newMode);
    document.documentElement.setAttribute("data-mode", newMode);
    if (newMode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("erp-theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("erp-locale", newLocale);
    document.cookie = `erp-locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
  };

  const setSound = (enabled: boolean) => {
    setSoundState(enabled);
    try {
      localStorage.setItem("vout-sound", String(enabled));
    } catch {}
    if (enabled) {
      playBlip(720, 0.05, 0.04);
    }
  };

  const playBlip = useCallback((freq = 600, duration = 0.045, gainValue = 0.035) => {
    if (!sound) return;
    try {
      if (typeof window === "undefined") return;
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(gainValue, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  }, [sound]);

  useEffect(() => {
    if (!sound) return;
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest(
        "button, a, [role='button'], input[type='submit'], input[type='checkbox']"
      );
      if (target) {
        playBlip(620, 0.04, 0.035);
      }
    };

    window.addEventListener("click", handleClick, { capture: true });
    return () => window.removeEventListener("click", handleClick, { capture: true });
  }, [sound, playBlip]);

  const t = translations[locale] || translations.es;

  return (
    <PreferencesContext.Provider
      value={{
        theme,
        setTheme,
        mode,
        setMode,
        locale,
        setLocale,
        sound,
        setSound,
        playBlip,
        t,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error("usePreferences must be used within a PreferencesProvider");
  }
  return ctx;
}
