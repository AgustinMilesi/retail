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
    <div className="flex flex-col h-full justify-between gap-4">
      {/* Drawer / Sidebar Header */}
      <div className="flex items-center justify-between shrink-0 pb-2 border-b border-[#262626]">
        <div className="min-w-0 pr-2">
          <p className="text-[11px] font-sans font-medium text-[#737373] uppercase tracking-wider truncate mb-0.5">
            {workspaceLabel}
          </p>
          <p className="text-white text-base font-bold leading-tight tracking-tight truncate">
            {organizationName}
          </p>
        </div>

        {/* Mobile close button (Ergonomic 44x44px touch target) */}
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="md:hidden size-11 min-h-[44px] min-w-[44px] shrink-0 flex items-center justify-center rounded-[6px] bg-[#161616] border border-[#262626] text-[#a3a3a3] hover:text-white hover:border-[#383838] active:scale-95 transition-all cursor-pointer"
          aria-label="Cerrar menú"
        >
          <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto pr-1 min-h-0 space-y-1 py-1">
        <NavLinks items={navItems} onItemClick={() => setMobileOpen(false)} />
      </div>

      {/* Drawer / Sidebar Footer */}
      <div className="shrink-0 space-y-3 pt-3 border-t border-[#262626]">
        {/* User Identity & Preferences */}
        <div className="flex items-center justify-between gap-2 bg-[#121212] border border-[#262626] rounded-[6px] p-2">
          <div className="flex items-center gap-2 min-w-0 flex-1 mr-1">
            <div className="size-8 rounded-full bg-[#1e1e1e] border border-[#2e2e2e] flex items-center justify-center text-xs font-mono font-bold text-[#c5ff4a] shrink-0">
              {userEmail.slice(0, 1).toUpperCase()}
            </div>
            <p className="text-[#a3a3a3] text-xs font-mono truncate" title={userEmail}>
              {userEmail}
            </p>
          </div>
          <PreferencesControls placement="up" />
        </div>

        {/* Actions: Sign Out + Settings (Both min-h-[44px] touch target) */}
        <div className="flex items-center gap-2">
          <form action={logoutAction} className="flex-1">
            <SubmitButton
              variant="ghost"
              pendingText={signingOutLabel}
              className="w-full text-center text-xs min-h-[44px] font-semibold tracking-wide"
            >
              {signOutLabel}
            </SubmitButton>
          </form>

          <Link
            href="/app/settings"
            onClick={() => setMobileOpen(false)}
            className="size-11 min-h-[44px] min-w-[44px] shrink-0 rounded-[6px] bg-[#161616] border border-[#262626] hover:border-[#383838] hover:text-[#c5ff4a] text-[#a3a3a3] transition-colors flex items-center justify-center active:scale-95"
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
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#060606] text-white w-full max-w-full overflow-x-hidden">
      {/* 1. Header Superior Unificado con Botón Hamburguesa - Nunca desborda horizontalmente */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-3 sm:px-6 py-2.5 bg-[#0e0e0e] border-b border-[#262626] shrink-0 h-16 w-full max-w-full shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
        {/* Lado izquierdo: Botón Hamburguesa + Logo + Nombre (ocupa espacio restante y trunca si es necesario) */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-2">
          {/* Botón Hamburguesa ergonómico (min 44x44px, shrink-0) */}
          <button
            type="button"
            onClick={() => {
              if (window.innerWidth < 768) {
                setMobileOpen(!mobileOpen);
              } else {
                toggleDesktopSidebar();
              }
            }}
            className="size-11 min-h-[44px] min-w-[44px] shrink-0 rounded-[6px] text-[#c5ff4a] bg-[#161616] hover:bg-[#202020] transition-all duration-150 border border-[#262626] hover:border-[#383838] flex items-center justify-center active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5ff4a] cursor-pointer"
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

          <div className="flex items-center gap-2 min-w-0">
            <span className="size-8 sm:size-9 rounded-[6px] bg-[#000000] border border-[#262626] flex items-center justify-center shrink-0 p-1.5">
              <svg viewBox="68 106 416 310" className="w-full h-full" fill="none">
                <rect x="68" y="228" width="60" height="60" rx="6" fill="#E9E7E0" />
                <rect x="132" y="292" width="60" height="60" rx="6" fill="#E9E7E0" />
                <rect x="196" y="356" width="60" height="60" rx="6" fill="#E9E7E0" />
                <rect x="260" y="292" width="60" height="60" rx="6" fill="#E9E7E0" />
                <rect x="324" y="228" width="60" height="60" rx="6" fill="#c5ff4a" />
                <rect x="390" y="166" width="46" height="46" rx="5" fill="#c5ff4a" />
                <rect x="452" y="106" width="32" height="32" rx="4" fill="#c5ff4a" />
              </svg>
            </span>
            <span className="text-white font-bold text-sm sm:text-base tracking-tight truncate">
              {organizationName}
            </span>
          </div>
        </div>

        {/* Lado derecho: Preferencias + Configuración (shrink-0) */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <PreferencesControls placement="down" />
          <Link
            href="/app/settings"
            className="size-11 min-h-[44px] min-w-[44px] shrink-0 border border-[#262626] hover:border-[#383838] hover:text-[#c5ff4a] text-[#a3a3a3] bg-[#161616] rounded-[6px] transition-colors duration-150 flex items-center justify-center active:scale-95"
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
      <div className="flex-1 flex items-start w-full max-w-full overflow-x-hidden">
        {/* Sidebar de Escritorio */}
        {desktopOpen && (
          <aside className="hidden md:flex w-64 flex-col shrink-0 border-r border-[#262626] p-5 bg-[#0c0c0c] sticky top-16 h-[calc(100dvh-4rem)] self-start overflow-hidden shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
            {sidebarContent}
          </aside>
        )}

        {/* Drawer Móvil con Backdrop sólido y enfocado */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            {/* Backdrop oscuro sólido */}
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
              onClick={() => setMobileOpen(false)}
            />
            {/* Panel lateral deslizante ergonómico */}
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Menú de navegación"
              className="relative w-80 max-w-[85vw] bg-[#0c0c0c] border-r border-[#262626] p-5 flex flex-col z-10 shadow-[0_0_50px_rgba(0,0,0,0.9)] h-[100dvh]"
            >
              {sidebarContent}
            </div>
          </div>
        )}

        {/* Contenido Principal - Nunca desborda horizontalmente */}
        <main className="flex-1 min-w-0 p-4 md:p-8 w-full max-w-[1600px] mx-auto overflow-x-hidden animate-smooth-in">
          {children}
        </main>
      </div>
    </div>
  );
}
