import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth-forms";
import { getSession } from "@/lib/auth/session";
import { PreferencesControls } from "@/components/PreferencesControls";

export const metadata: Metadata = { title: "Cuenta VOUT • Acceso al Sistema" };

export default async function LoginPage() {
  if (await getSession()) redirect("/app");

  return (
    <main className="min-h-screen flex flex-col justify-between p-6 sm:p-12 relative overflow-hidden bg-[#0A0E14] text-white">
      {/* Top Bar */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between relative z-10">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="size-9 rounded-xl bg-[#121824] border border-[#1E293B] flex items-center justify-center p-1.5 shadow-sm group-hover:scale-105 transition-transform shrink-0">
            <svg viewBox="68 106 416 310" className="w-full h-full" fill="none">
              <rect x="68" y="228" width="60" height="60" rx="6" fill="#E9E7E0" />
              <rect x="132" y="292" width="60" height="60" rx="6" fill="#E9E7E0" />
              <rect x="196" y="356" width="60" height="60" rx="6" fill="#E9E7E0" />
              <rect x="260" y="292" width="60" height="60" rx="6" fill="#E9E7E0" />
              <rect x="324" y="228" width="60" height="60" rx="6" fill="#C6F827" />
              <rect x="390" y="166" width="46" height="46" rx="5" fill="#C6F827" />
              <rect x="452" y="106" width="32" height="32" rx="4" fill="#C6F827" />
            </svg>
          </div>
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1.5 leading-none">
              <span className="font-black text-lg tracking-[-0.05em] text-white">
                <span className="text-[#E9E7E0]">v</span>
                <span className="text-[#C6F827]">out</span>
              </span>
              <span className="text-[10px] font-mono text-[#C6F827] px-1.5 py-0.5 rounded bg-[#121824] border border-[#1E293B]">
                retail
              </span>
            </div>
            <span className="text-[9px] uppercase tracking-widest text-[#94A3B8] font-bold mt-1">
              Autonomous Cloud Ecosystem
            </span>
          </div>
        </Link>
        <PreferencesControls />
      </header>

      {/* Centered Login Card */}
      <div className="w-full max-w-md mx-auto my-auto py-8 relative z-10">
        <div className="border border-[#1E293B] rounded-3xl bg-[#121824] p-8 sm:p-10 shadow-2xl space-y-7">
          <div className="space-y-3 text-center sm:text-left">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-[#0A0E14] border border-[#1E293B] flex items-center justify-center text-[#C6F827] shadow-sm">
                <span className="font-black text-xl">⚡</span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-[#C6F827]/15 text-[#C6F827] border border-[#C6F827]/30">
                CUENTA VOUT
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Accedé a tu Cuenta VOUT</h1>
              <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">
                Tu llave digital unificada. La misma cuenta que utilizás en <strong className="text-white">VOUT</strong>, <strong className="text-white">VOUT Cargo</strong> y <strong className="text-white">VOUT Inbox</strong>.
              </p>
            </div>
          </div>

          {/* Prestige VOUT Membership Banner */}
          <div className="p-3.5 rounded-2xl bg-[#0F1520] border border-[#1E293B] space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#C6F827] animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#C6F827]">
                Membresía VOUT Oficial
              </span>
            </div>
            <p className="text-[11px] text-[#94A3B8] leading-normal">
              Acceso total al punto de venta, arqueo de caja chica, control de stock y reportes financieros integrados.
            </p>
          </div>

          {/* Guest Access for Recruiters & Testing */}
          <div className="p-4 rounded-2xl bg-[#121824] border border-[#1E293B] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                Acceso de Evaluación
              </span>
              <span className="text-[9px] font-black bg-[#C6F827] text-[#0A0E14] px-2 py-0.5 rounded-full font-mono">
                1-CLICK DEMO
              </span>
            </div>
            <p className="text-xs text-[#94A3B8]">
              Probá la terminal POS y los arqueos de caja en vivo sin necesidad de registro.
            </p>
            <Link
              href="/demo"
              className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/15 hover:border-[#C6F827]/40 font-bold text-xs text-center block transition cursor-pointer"
            >
              🚀 Entrar como Invitado (Modo Demo) →
            </Link>
          </div>

          <div className="relative flex items-center justify-center my-1">
            <div className="border-t border-[#1E293B] w-full" />
            <span className="bg-[#121824] px-3 text-[10px] text-[#64748B] uppercase tracking-widest font-black shrink-0">
              o con tu Cuenta VOUT
            </span>
            <div className="border-t border-[#1E293B] w-full" />
          </div>

          <LoginForm />

          <div className="pt-3 border-t border-[#1E293B] text-center">
            <p className="text-xs text-[#94A3B8]">
              ¿Aún no tenés una Cuenta VOUT?{" "}
              <Link href="/register" className="text-[#C6F827] hover:underline font-bold transition">
                Crear Cuenta VOUT
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-[#64748B] pt-6 relative z-10">
        <p>© {new Date().getFullYear()} VOUT Ecosystem · Retail Engine & Point of Sale.</p>
        <Link href="/" className="hover:text-white transition">
          ← Volver al inicio
        </Link>
      </footer>
    </main>
  );
}
