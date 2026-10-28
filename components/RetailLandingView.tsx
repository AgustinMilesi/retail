"use client";

import Link from "next/link";
import { Headline } from "@/components/Headline";
import { PosIcon } from "@/components/MailIcon";
import { PreferencesBlock } from "@/components/PreferencesBlock";
import { PreferencesControls } from "@/components/PreferencesControls";
import { usePreferences } from "@/components/PreferencesProvider";
import { ui } from "@/components/ui";

export function RetailLandingView() {
  const { t } = usePreferences();

  const points = [
    {
      label: t.pointPosLabel,
      text: t.pointPosDesc,
    },
    {
      label: t.pointCashLabel,
      text: t.pointCashDesc,
    },
    {
      label: t.pointStockLabel,
      text: t.pointStockDesc,
    },
  ];

  return (
    <main className="min-h-screen flex flex-col justify-between p-4 sm:p-8 lg:p-12 relative overflow-hidden animate-smooth-in bg-[var(--bg-page,#0A0E14)] text-slate-100">
      {/* Top Header */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between pb-6 border-b border-[#252525]">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="size-10 rounded-[4px] bg-[#1f1f1f] border border-[#252525] flex items-center justify-center p-2 shadow-none transition-transform group-hover:scale-105 shrink-0">
            <svg viewBox="68 106 416 310" className="w-full h-full" fill="none">
              <rect x="68" y="228" width="60" height="60" rx="2" fill="#E5E5E5" />
              <rect x="132" y="292" width="60" height="60" rx="2" fill="#E5E5E5" />
              <rect x="196" y="356" width="60" height="60" rx="2" fill="#E5E5E5" />
              <rect x="260" y="292" width="60" height="60" rx="2" fill="#E5E5E5" />
              <rect x="324" y="228" width="60" height="60" rx="2" fill="#c5ff4a" />
              <rect x="390" y="166" width="46" height="46" rx="2" fill="#c5ff4a" />
              <rect x="452" y="106" width="32" height="32" rx="2" fill="#c5ff4a" />
            </svg>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5 leading-none">
              <span className="font-sans font-black text-xl tracking-[-0.03em] text-white">
                <span className="text-[#e5e5e5]">v</span>
                <span className="text-[#c5ff4a]">out</span>
              </span>
              <span className="text-[11px] font-mono uppercase tracking-[0.1em] text-[#c5ff4a] px-1.5 py-0.5 rounded-[2px] bg-[#000000] border border-[#252525]">
                retail
              </span>
            </div>
            <span className="text-xs text-[#7a7a7a] font-sans font-medium">Cloud POS &amp; Store Inventory Engine</span>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <PreferencesControls />
          <Link
            href="/login"
            className="hidden sm:inline-flex px-4 py-2 text-xs font-sans font-medium uppercase tracking-[0.08em] text-[#c5ff4a] hover:bg-[#252525] rounded-[4px] border border-[#252525] transition-colors"
          >
            {t.landingLogin}
          </Link>
          <Link href="/register" className={ui.button}>
            {t.landingCreateAccount}
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="w-full max-w-6xl mx-auto my-auto py-10 space-y-12">
        <div className="grid md:grid-cols-5 gap-12 md:gap-20 items-center">
          <div className="md:col-span-3 space-y-8">
            <Headline light={[t.landingHeadlineA, t.landingHeadlineB]} bold={t.landingHeadlineBold} />
            <p className="text-base text-slate-400 leading-relaxed max-w-xl">
              {t.landingHeroDesc}
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <Link
                href="/demo"
                prefetch={false}
                className="px-5 py-2.5 rounded-[4px] bg-[var(--primary-accent)] text-[#000000] font-sans font-medium text-xs uppercase tracking-[0.04em] shadow-[0_0_8px_rgba(197,255,74,0.45)] hover:opacity-95 active:scale-95 transition-all flex items-center gap-2 group"
              >
                <span>⚡ Live Demo →</span>
              </Link>
              <Link href="/register" className={ui.button}>
                {t.landingCreateAccount}
              </Link>
              <Link href="/login" className={`${ui.link} text-xs uppercase tracking-wider font-bold`}>
                {t.landingAccessConsole}
              </Link>
            </div>
          </div>

          <div className="md:col-span-2 space-y-6">
            <PosIcon />
            <div className="space-y-4">
              {points.map((point) => (
                <div key={point.label} className="p-4 rounded-[4px] bg-[#1f1f1f] border border-[#252525] shadow-none">
                  <p className={ui.label}>{point.label}</p>
                  <p className="text-[#e5e5e5] text-sm font-sans font-normal mt-1">{point.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Visual Preferences Block */}
        <section className="pt-4">
          <PreferencesBlock />
        </section>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-[#7a7a7a] pt-6 border-t border-[#252525]">
        <p>© {new Date().getFullYear()} {t.landingFooterRights}</p>
        <div className="flex items-center gap-5">
          <Link href="/legal" className="hover:text-[var(--primary-accent)] transition">
            {t.landingFooterTerms}
          </Link>
          <Link href="/legal" className="hover:text-[var(--primary-accent)] transition">
            {t.landingFooterPrivacy}
          </Link>
          <Link href="/legal" className="hover:text-[var(--primary-accent)] transition">
            {t.landingFooterCookies}
          </Link>
        </div>
      </footer>
    </main>
  );
}
