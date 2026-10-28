"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePreferences, THEMES } from "@/components/PreferencesProvider";
import { LOCALES } from "@/lib/i18n";

export function PreferencesControls({ placement = "down" }: { placement?: "up" | "down" }) {
  const { theme, setTheme, mode, setMode, locale, setLocale, sound, setSound, t } = usePreferences();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ left: number; top?: number; bottom?: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const padding = 12;
    const panelWidth = Math.min(288, window.innerWidth - padding * 2);

    // Compute left coordinate: default to aligning to trigger's right edge
    let left = rect.right - panelWidth;
    // Prevent clipping on the left edge (especially inside sidebars docked to the left wall):
    if (left < padding) {
      left = padding;
    }
    // Prevent clipping on the right edge:
    if (left + panelWidth > window.innerWidth - padding) {
      left = window.innerWidth - panelWidth - padding;
    }

    if (placement === "up") {
      setCoords({
        left,
        bottom: window.innerHeight - rect.top + 8,
        width: panelWidth,
      });
    } else {
      setCoords({
        left,
        top: rect.bottom + 8,
        width: panelWidth,
      });
    }
  }, [placement]);

  useEffect(() => {
    if (!open) return;
    updatePosition();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs font-sans text-[#a3a3a3] hover:text-white transition-all min-h-[40px] px-3 py-2 rounded-[6px] bg-[#161616] border border-[#262626] hover:border-[#383838] select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5ff4a] active:scale-[0.98]"
        title="Personalización y preferencias"
        aria-label="Abrir panel de preferencias"
        aria-expanded={open}
        aria-haspopup="true"
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

        {/* Chevron */}
        <svg
          className={`size-3 text-[#737373] transition-transform duration-200 ${
            open ? (placement === "up" ? "-rotate-180" : "rotate-180") : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && coords && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-label="Panel de preferencias"
            style={{
              left: `${coords.left}px`,
              top: coords.top !== undefined ? `${coords.top}px` : undefined,
              bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
              width: `${coords.width}px`,
            }}
            className="fixed p-4 rounded-[6px] bg-[#121212] border border-[#262626] shadow-[0_16px_40px_rgba(0,0,0,0.85)] z-50 space-y-4 animate-smooth-in"
          >
            {/* Mode selection: Claro / Oscuro */}
            <div>
              <p className="text-[11px] font-sans font-medium text-[#737373] mb-2 uppercase tracking-wider">
                {t.mode || "Aspecto"}
              </p>
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-[6px] bg-[#0a0a0a] border border-[#262626]">
                <button
                  type="button"
                  onClick={() => setMode("light")}
                  className={`flex items-center justify-center gap-2 py-2 px-3 min-h-[38px] rounded-[4px] text-xs font-semibold transition-all cursor-pointer ${
                    mode === "light"
                      ? "bg-[#c5ff4a] text-black shadow-xs font-bold"
                      : "text-[#a3a3a3] hover:text-white hover:bg-[#1a1a1a]"
                  }`}
                >
                  <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  className={`flex items-center justify-center gap-2 py-2 px-3 min-h-[38px] rounded-[4px] text-xs font-semibold transition-all cursor-pointer ${
                    mode === "dark"
                      ? "bg-[#c5ff4a] text-black shadow-xs font-bold"
                      : "text-[#a3a3a3] hover:text-white hover:bg-[#1a1a1a]"
                  }`}
                >
                  <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

            {/* Color Accent Themes */}
            <div className="border-t border-[#262626] pt-3">
              <p className="text-[11px] font-sans font-medium text-[#737373] mb-2 uppercase tracking-wider">
                {t.theme || "Color de Acento"}
              </p>
              <div className="flex items-center justify-between gap-2 px-1">
                {THEMES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTheme(item.id)}
                    className={`size-6 rounded-[4px] transition-all cursor-pointer ${item.colorClass} ${
                      theme === item.id
                        ? "scale-110 ring-2 ring-offset-2 ring-[#c5ff4a] ring-offset-[#121212] shadow-sm"
                        : "opacity-60 hover:opacity-100 hover:scale-105"
                    }`}
                    title={item.name}
                  />
                ))}
              </div>
            </div>

            {/* Language Selection */}
            <div className="border-t border-[#262626] pt-3">
              <p className="text-[11px] font-sans font-medium text-[#737373] mb-2 uppercase tracking-wider">
                {t.language || "Idioma"}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {LOCALES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setLocale(l.code)}
                    className={`flex items-center justify-between px-3 py-2 min-h-[38px] rounded-[4px] text-xs transition-all cursor-pointer ${
                      locale === l.code
                        ? "bg-[#c5ff4a] text-black font-semibold shadow-xs"
                        : "text-[#a3a3a3] hover:text-white hover:bg-[#1a1a1a] border border-[#262626]"
                    }`}
                  >
                    <span>{l.label}</span>
                    <span className="font-mono text-[10px] opacity-75">{l.code.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tactile Sound FX Toggle */}
            <div className="border-t border-[#262626] pt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-sans font-medium text-[#737373] uppercase tracking-wider">
                  {t.soundLabel || "Sonido Táctil"}
                </p>
                <span className="text-[11px] font-mono text-[#c5ff4a] font-semibold">
                  {sound ? (t.soundOn || "ON") : (t.soundOff || "OFF")}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-[6px] bg-[#0a0a0a] border border-[#262626]">
                <button
                  type="button"
                  onClick={() => setSound(true)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 min-h-[38px] rounded-[4px] text-xs font-semibold transition-all cursor-pointer ${
                    sound
                      ? "bg-[#c5ff4a] text-black shadow-xs font-bold"
                      : "text-[#a3a3a3] hover:text-white hover:bg-[#1a1a1a]"
                  }`}
                >
                  <span>🔊</span>
                  <span>{t.soundOn || "Activado"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSound(false)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 min-h-[38px] rounded-[4px] text-xs font-semibold transition-all cursor-pointer ${
                    !sound
                      ? "bg-[#c5ff4a] text-black shadow-xs font-bold"
                      : "text-[#a3a3a3] hover:text-white hover:bg-[#1a1a1a]"
                  }`}
                >
                  <span>🔇</span>
                  <span>{t.soundOff || "Silenciado"}</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
