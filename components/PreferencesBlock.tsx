"use client";

import { usePreferences, THEMES } from "@/components/PreferencesProvider";
import { LOCALES } from "@/lib/i18n";

export function PreferencesBlock({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme, mode, setMode, locale, setLocale, t } = usePreferences();

  return (
    <div className={`clay-card ${compact ? "p-5" : "p-6 sm:p-8"} rounded-[4px] space-y-6 bg-[var(--bg-card)] border border-[var(--border-card)]`}>
      <div className="border-b border-[var(--border-card)] pb-4">
        <p className="text-xs font-sans font-medium uppercase tracking-[0.22em] text-[var(--text-muted)]">
          {t.mode || "Aspecto"} &amp; {t.theme || "Personalización"}
        </p>
        <h2 className="text-xl font-serif text-[var(--text-main,#FFFFFF)]">
          {locale === "es" ? "Preferencias Visuales" : "Interface Preferences"}
        </h2>
        <p className="text-xs text-[var(--text-muted)] mt-1 font-sans">
          {locale === "es"
            ? "Personalizá el modo de pantalla, el color de acento y el idioma de la aplicación."
            : "Customize your appearance mode, primary accent color, and language."}
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-6">
        {/* 1. Mode: Light vs Dark */}
        <div className="space-y-2">
          <label className="block text-[11px] font-sans font-medium uppercase tracking-[0.22em] text-[var(--text-muted)]">
            {t.mode || "Modo"}
          </label>
          <div className="grid grid-cols-2 gap-2 p-1 rounded-[4px] bg-[var(--bg-card-subtle)] border border-[var(--border-card)]">
            <button
              type="button"
              onClick={() => setMode("light")}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-[2px] text-xs font-sans font-medium uppercase tracking-[0.04em] transition-all cursor-pointer ${
                mode === "light"
                  ? "bg-[var(--primary-accent)] text-[#000000] shadow-[0_0_8px_rgba(197,255,74,0.35)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-main,#FFFFFF)]"
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
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-[2px] text-xs font-sans font-medium uppercase tracking-[0.04em] transition-all cursor-pointer ${
                mode === "dark"
                  ? "bg-[var(--primary-accent)] text-[#000000] shadow-[0_0_8px_rgba(197,255,74,0.35)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-main,#FFFFFF)]"
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

        {/* 2. Color Accent Palettes */}
        <div className="space-y-2">
          <label className="block text-[11px] font-sans font-medium uppercase tracking-[0.22em] text-[var(--text-muted)]">
            {t.theme || "Color de Acento"}
          </label>
          <div className="flex items-center justify-between gap-2 p-2 rounded-[4px] bg-[var(--bg-card-subtle)] border border-[var(--border-card)] h-[46px]">
            {THEMES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTheme(item.id)}
                className={`size-6 rounded-[2px] transition-all cursor-pointer ${item.colorClass} ${
                  theme === item.id
                    ? "scale-110 ring-2 ring-[var(--primary-accent)]"
                    : "opacity-60 hover:opacity-100"
                }`}
                title={item.name}
              />
            ))}
          </div>
        </div>

        {/* 3. Language Selection */}
        <div className="space-y-2">
          <label className="block text-[11px] font-sans font-medium uppercase tracking-[0.22em] text-[var(--text-muted)]">
            {t.language || "Idioma"}
          </label>
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-[4px] bg-[var(--bg-card-subtle)] border border-[var(--border-card)]">
            {LOCALES.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLocale(l.code)}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-[2px] text-xs font-sans transition-all cursor-pointer ${
                  locale === l.code
                    ? "bg-[var(--primary-accent)] text-[#000000] font-medium shadow-[0_0_8px_rgba(197,255,74,0.35)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-main,#FFFFFF)] hover:bg-[var(--bg-hover)]"
                }`}
              >
                <span>{l.label}</span>
                <span>{l.flag}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
