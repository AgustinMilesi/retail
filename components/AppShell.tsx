"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NavLinks } from "@/components/NavLinks";
import { PreferencesControls } from "@/components/PreferencesControls";
import { SubmitButton } from "@/components/SubmitButton";
import { ui } from "@/components/ui";

type ItemKey =
  | "overview"
  | "pos"
  | "sales"
  | "products"
  | "cash"
  | "inbox"
  | "contacts"
  | "forms"
  | "settings"
  | "debtors"
  | "expenses";

type NavItem = {
  href: string;
  key: ItemKey;
  label: string;
  badge?: number;
};

export function AppShell({
  organizationName,
  userEmail,
  workspaceLabel,
  signOutLabel,
  settingsLabel,
  signingOutLabel,
  navItems,
  logoutAction,
  children,
}: {
  organizationName: string;
  userEmail: string;
  workspaceLabel: string;
  signOutLabel: string;
  settingsLabel: string;
  signingOutLabel: string;
  navItems: NavItem[];
  logoutAction: () => Promise<void>;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);

  // Restore desktop sidebar preference from localStorage
  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      try {
        const saved = localStorage.getItem("erp_sidebar_open");
        if (saved !== null) {
          setDesktopOpen(saved === "true");
        }
      } catch {
        // ignore
      }
    });
    return () => cancelAnimationFrame(handle);
  }, []);

  // Close mobile drawer on Escape key
  useEffect(() => {
    if (!mobileOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [mobileOpen]);

  function toggleDesktopSidebar() {
    setDesktopOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("erp_sidebar_open", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  // Sidebar content used in both desktop aside and mobile drawer
  const sidebarContent = (
    <div className="flex flex-col h-full gap-4 justify-between">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <p className={ui.label}>{workspaceLabel}</p>
          <p className="text-white text-base font-black leading-tight tracking-tight">
            {organizationName}
          </p>
        </div>
        {/* Mobile close button */}
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
          aria-label="Cerrar menú"
        >
          <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 min-h-0 space-y-1">
        <NavLinks items={navItems} onItemClick={() => setMobileOpen(false)} />
      </div>

      <div className="shrink-0 space-y-3 pt-3 border-t border-white/10">
        <div className="flex items-center justify-between gap-2">
          <p className="text-slate-400 text-xs truncate max-w-[150px]">{userEmail}</p>
          <PreferencesControls />
        </div>

        <div className="flex items-center gap-2">
          <form action={logoutAction} className="flex-1">
            <SubmitButton variant="ghost" pendingText={signingOutLabel} className="w-full text-center text-xs py-2">
              {signOutLabel}
            </SubmitButton>
          </form>

          <Link
            href="/app/settings"
            onClick={() => setMobileOpen(false)}
            className="p-2 border border-white/10 hover:border-[var(--primary-accent)] hover:text-[var(--primary-accent)] text-slate-300 rounded-[4px] transition-colors flex items-center justify-center shrink-0"
            title={settingsLabel}
            aria-label={settingsLabel}
          >
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.75"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
        </div>

        <Link
          href="/login"
          onClick={() => setMobileOpen(false)}
          className="w-full text-center text-[11px] font-semibold text-slate-400 hover:text-[var(--primary-accent)] py-1.5 px-2 rounded-[4px] border border-white/5 hover:border-[var(--primary-accent)]/30 transition block"
          title="Ver pantalla de login"
        >
          🔑 Ver Pantalla de Login
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page,#0A0E14)] text-[var(--text-main,#FFFFFF)]">
      {/* 1. Header Superior Unificado con Botón Hamburguesa */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-2.5 bg-[var(--bg-card,#121824)] border-b border-[var(--border-card,#1E293B)] shrink-0 h-16 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
        <div className="flex items-center gap-3">
          {/* Botón Hamburguesa (funciona en móvil y escritorio para dar más espacio) */}
          <button
            type="button"
            onClick={() => {
              if (window.innerWidth < 768) {
                setMobileOpen(!mobileOpen);
              } else {
                toggleDesktopSidebar();
              }
            }}
            className="p-2.5 rounded-[4px] text-[var(--primary-accent)] hover:bg-[var(--bg-hover,#252525)] transition-all duration-150 border border-[var(--border-card,#252525)] shadow-none flex items-center justify-center active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-accent)]"
            title="Alternar menú / Más espacio"
            aria-label="Abrir o cerrar menú"
            aria-expanded={mobileOpen}
          >
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          <div className="flex items-center gap-2.5">
            <span className="size-9 rounded-[4px] bg-[#000000] border border-[#252525] flex items-center justify-center shrink-0 p-1.5 shadow-none">
              <svg viewBox="68 106 416 310" className="w-full h-full" fill="none">
                <rect x="68" y="228" width="60" height="60" rx="6" fill="#E9E7E0" />
                <rect x="132" y="292" width="60" height="60" rx="6" fill="#E9E7E0" />
                <rect x="196" y="356" width="60" height="60" rx="6" fill="#E9E7E0" />
                <rect x="260" y="292" width="60" height="60" rx="6" fill="#E9E7E0" />
                <rect x="324" y="228" width="60" height="60" rx="6" fill="#C6F827" />
                <rect x="390" y="166" width="46" height="46" rx="5" fill="#C6F827" />
                <rect x="452" y="106" width="32" height="32" rx="4" fill="#C6F827" />
              </svg>
            </span>
            <span className="text-[var(--text-main,#FFFFFF)] font-black text-base sm:text-lg tracking-tight truncate max-w-[200px] sm:max-w-xs">
              {organizationName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <PreferencesControls />
          <Link
            href="/app/settings"
            className="p-2.5 border border-[var(--border-card,#252525)] hover:border-[var(--primary-accent)] hover:text-[var(--primary-accent)] text-[var(--text-muted,#7a7a7a)] bg-[var(--bg-card,#1f1f1f)] rounded-[4px] transition-colors duration-150 flex items-center justify-center shrink-0 active:scale-95"
            title={settingsLabel}
            aria-label={settingsLabel}
          >
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.75"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
        </div>
      </header>

      {/* 2. Cuerpo Principal */}
      <div className="flex-1 flex items-start">
        {/* Sidebar de Escritorio (Collapsible & Pinned to Viewport, does NOT stretch with page) */}
        {desktopOpen && (
          <aside className="hidden md:flex w-64 flex-col shrink-0 border-r border-[var(--border-card,#1E293B)] p-5 bg-[var(--bg-sidebar,#0D121B)] sticky top-16 h-[calc(100dvh-4rem)] self-start overflow-hidden shadow-[4px_0_24px_rgba(0,0,0,0.3)]">
            {sidebarContent}
          </aside>
        )}

        {/* Drawer Móvil con Backdrop */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            {/* Backdrop oscuro */}
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileOpen(false)}
            />
            {/* Panel lateral deslizante */}
            <div role="dialog" aria-modal="true" aria-label="Menú de navegación" className="relative w-72 max-w-[85vw] bg-[var(--bg-sidebar,#0D121B)] border-r border-[var(--border-card,#1E293B)] p-5 flex flex-col z-10 shadow-2xl h-[100dvh]">
              {sidebarContent}
            </div>
          </div>
        )}

        {/* Contenido Principal (ocupa todo el espacio si se colapsa el sidebar) */}
        <main className="flex-1 min-w-0 p-4 md:p-8 w-full max-w-[1600px] mx-auto animate-smooth-in">
          {children}
        </main>
      </div>
    </div>
  );
}
