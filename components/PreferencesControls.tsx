"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePreferences, THEMES } from "@/components/PreferencesProvider";
import { LOCALES } from "@/lib/i18n";

export function PreferencesControls({ placement = "down" }: { placement?: "up" | "down" }) {
  const { theme, setTheme, mode, setMode, locale, setLocale, sound, setSound, t } = usePreferences();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <div>
      {/* Trigger Button: Ergonomic, clean flex item */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-xs font-sans text-[#a3a3a3] hover:text-white transition-all min-h-[40px] px-3 py-2 rounded-[6px] bg-[#161616] border border-[#262626] hover:border-[#383838] select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5ff4a] active:scale-[0.98] shrink-0"
        title="Personalización y preferencias"
        aria-label="Abrir panel de preferencias"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {/* Minimalist mode icon: Sun / Moon */}
        {mode === "dark" ? (
          <svg className="size-4 text-[#a3a3a3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
        ) : (
          <svg className="size-4 text-[#a3a3a3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        )}

        {/* Color accent dot */}
        <span
          className="size-2.5 rounded-full ring-1 ring-white/20 shrink-0"
          style={{ backgroundColor: THEMES.find((x) => x.id === theme)?.hex }}
        />

        {/* Minimalist language code label */}
        <span className="font-mono font-semibold text-xs text-white">{locale.toUpperCase()}</span>

        {/* Preferences controls indicator */}
        <svg className="size-3 text-[#737373]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
          />
        </svg>
      </button>

      {/* Accessible Centered Preferences Modal Dialog (Portaled to document.body, floats above everything) */}
      {mounted &&
        open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity"
            role="dialog"
            aria-modal="true"
            aria-labelledby="preferences-modal-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <div
              className="w-full max-w-sm sm:max-w-md bg-[#121212] border border-[#262626] rounded-[8px] p-5 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.9)] space-y-5 animate-smooth-in"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
                <div>
                  <h2 id="preferences-modal-title" className="text-sm font-sans font-bold text-white uppercase tracking-wider">
                    {locale === "es" ? "Aspecto & Preferencias" : "Appearance & Preferences"}
                  </h2>
                  <p className="text-xs text-[#737373] mt-0.5 font-sans">
                    {locale === "es" ? "Ajustes de visualización e idioma" : "Display and language settings"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="size-9 rounded-[6px] bg-[#1a1a1a] border border-[#262626] text-[#a3a3a3] hover:text-white hover:border-[#383838] flex items-center justify-center transition-all cursor-pointer active:scale-95"
                  aria-label="Cerrar modal de preferencias"
                >
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* SECTION 1: Modo Claro / Oscuro */}
              <div className="space-y-2">
                <label className="block text-[11px] font-sans font-medium text-[#737373] uppercase tracking-wider">
                  {t.mode || "Aspecto"}
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-[6px] bg-[#0a0a0a] border border-[#262626]">
                  <button
                    type="button"
                    onClick={() => setMode("light")}
                    style={mode === "light" ? { backgroundColor: "var(--primary-accent)", color: "var(--primary-accent-text, #000000)" } : undefined}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 min-h-[40px] rounded-[4px] text-xs font-semibold transition-all cursor-pointer ${
                      mode === "light"
                        ? "font-bold shadow-xs"
                        : "text-[#a3a3a3] hover:text-white hover:bg-[#1a1a1a]"
                    }`}
                  >
                    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                    <span>{t.lightMode || "Claro"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode("dark")}
                    style={mode === "dark" ? { backgroundColor: "var(--primary-accent)", color: "var(--primary-accent-text, #000000)" } : undefined}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 min-h-[40px] rounded-[4px] text-xs font-semibold transition-all cursor-pointer ${
                      mode === "dark"
                        ? "font-bold shadow-xs"
                        : "text-[#a3a3a3] hover:text-white hover:bg-[#1a1a1a]"
                    }`}
                  >
                    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                      />
                    </svg>
                    <span>{t.darkMode || "Oscuro"}</span>
                  </button>
                </div>
              </div>

              {/* SECTION 2: Color de Acento */}
              <div className="space-y-2 border-t border-[#262626] pt-4">
                <label className="block text-[11px] font-sans font-medium text-[#737373] uppercase tracking-wider">
                  {t.theme || "Color de Acento"}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {THEMES.map((item) => {
                    const isSelected = theme === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setTheme(item.id)}
                        style={isSelected ? { borderColor: item.hex, boxShadow: `0 0 12px ${item.hex}40` } : undefined}
                        className={`flex items-center justify-center gap-1.5 py-2 px-2 min-h-[40px] rounded-[6px] border text-xs font-medium transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#1a1a1a] text-white font-bold"
                            : "border-[#262626] bg-[#0a0a0a] text-[#737373] hover:text-white hover:border-[#383838]"
                        }`}
                      >
                        <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: item.hex }} />
                        <span className="text-[11px] capitalize">{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 3: Idioma */}
              <div className="space-y-2 border-t border-[#262626] pt-4">
                <label className="block text-[11px] font-sans font-medium text-[#737373] uppercase tracking-wider">
                  {t.language || "Idioma"}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {LOCALES.map((l) => {
                    const isSelected = locale === l.code;
                    return (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => setLocale(l.code)}
                        style={isSelected ? { backgroundColor: "var(--primary-accent)", color: "var(--primary-accent-text, #000000)", borderColor: "var(--primary-accent)" } : undefined}
                        className={`flex items-center justify-between px-3 py-2.5 min-h-[42px] rounded-[6px] border text-xs font-medium transition-all cursor-pointer ${
                          isSelected
                            ? "font-bold shadow-xs"
                            : "bg-[#0a0a0a] text-[#a3a3a3] border-[#262626] hover:text-white hover:border-[#383838]"
                        }`}
                      >
                        <span>{l.label}</span>
                        <span className="font-mono text-[10px] uppercase opacity-80">{l.code}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 4: Respuesta Sonora */}
              <div className="space-y-2 border-t border-[#262626] pt-4">
                <label className="block text-[11px] font-sans font-medium text-[#737373] uppercase tracking-wider">
                  {t.soundLabel || "Respuesta Sonora"}
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-[6px] bg-[#0a0a0a] border border-[#262626]">
                  <button
                    type="button"
                    onClick={() => setSound(true)}
                    style={sound ? { backgroundColor: "var(--primary-accent)", color: "var(--primary-accent-text, #000000)" } : undefined}
                    className={`flex items-center justify-center gap-2 py-2 px-3 min-h-[40px] rounded-[4px] text-xs font-semibold transition-all cursor-pointer ${
                      sound
                        ? "font-bold shadow-xs"
                        : "text-[#a3a3a3] hover:text-white hover:bg-[#1a1a1a]"
                    }`}
                  >
                    <span>🔊 {t.soundOn || "Activado"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSound(false)}
                    style={!sound ? { backgroundColor: "var(--primary-accent)", color: "var(--primary-accent-text, #000000)" } : undefined}
                    className={`flex items-center justify-center gap-2 py-2 px-3 min-h-[40px] rounded-[4px] text-xs font-semibold transition-all cursor-pointer ${
                      !sound
                        ? "font-bold shadow-xs"
                        : "text-[#a3a3a3] hover:text-white hover:bg-[#1a1a1a]"
                    }`}
                  >
                    <span>🔇 {t.soundOff || "Silenciado"}</span>
                  </button>
                </div>
              </div>

              {/* Footer button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-full py-2.5 min-h-[42px] rounded-[6px] bg-[#1e1e1e] hover:bg-[#282828] border border-[#2e2e2e] text-white text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer active:scale-[0.99]"
                >
                  {locale === "es" ? "Guardar y Cerrar" : "Save & Close"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
