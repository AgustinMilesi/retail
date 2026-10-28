import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/Headline";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { getServerTranslations } from "@/lib/i18n-server";
import { ui } from "@/components/ui";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage() {
  const [{ organization, user }, { t }] = await Promise.all([
    requireSession(),
    getServerTranslations(),
  ]);
  const orgId = organization.id;
  const money = (cents: number | bigint) =>
    formatMoney(cents, organization.currency, organization.showDecimals);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    todaySales,
    openSession,
    lowStockProducts,
    unread,
    contacts,
    recentSales,
  ] = await Promise.all([
    // Today completed sales aggregation
    db.sale.aggregate({
      where: {
        organizationId: orgId,
        status: "COMPLETED",
        createdAt: { gte: startOfToday },
      },
      _count: true,
      _sum: { totalCents: true },
    }),
    // Open cash session
    db.cashSession.findFirst({
      where: { organizationId: orgId, status: "OPEN" },
      select: { id: true, openedAt: true, openedBy: { select: { name: true } } },
    }),
    // Low stock warnings
    db.product.findMany({
      where: {
        organizationId: orgId,
        trackStock: true,
        active: true,
        stock: { lte: db.product.fields.minStock },
      },
      take: 5,
      select: { id: true, name: true, sku: true, stock: true, minStock: true },
    }),
    // Unread messages
    db.message.count({ where: { organizationId: orgId, status: "NEW" } }),
    // Total contacts
    db.contact.count({ where: { organizationId: orgId } }),
    // Recent sales
    db.sale.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        number: true,
        status: true,
        totalCents: true,
        createdAt: true,
        cashier: { select: { name: true } },
      },
    }),
  ]);

  const todayRevenue = todaySales._sum.totalCents ?? BigInt(0);

  return (
    <div className="space-y-6 animate-smooth-in">
      {/* 1. Header with greeting and live badge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <PageTitle light={t.hi} bold={`${user.name.split(" ")[0]}.`} />
          <p className="text-sm text-[#a3a3a3] mt-1 font-medium">
            {t.todayIn} <span className="font-semibold text-white">{organization.name}</span>
          </p>
        </div>

        {/* Quick till indicator pill & CTA (Ergonomic 44px min height) */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 px-4 py-2 min-h-[44px] rounded-[6px] bg-[#161616] border border-[#262626]">
            <span className={`size-2.5 rounded-full ${openSession ? "bg-[#c5ff4a] shadow-[0_0_8px_#c5ff4a]" : "bg-rose-500"}`} />
            <span className="text-xs font-semibold text-white">
              {openSession ? t.registerOpen : t.registerClosed}
            </span>
          </div>
          <Link
            href={openSession ? "/app/pos" : "/app/cash"}
            className={ui.button}
          >
            <span>{openSession ? t.openPosTill : t.openRegisterBtn}</span>
            <span>→</span>
          </Link>
        </div>
      </div>

      {/* 2. Top Hero Section: Metric Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* VOUT Revenue Card (Span 6) */}
        <div className="lg:col-span-6 p-6 sm:p-7 rounded-[6px] relative overflow-hidden flex flex-col justify-between bg-[#141414] border border-[#262626] hover:border-[#383838] transition-all duration-200">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#a3a3a3]">
                {t.todayRevenue}
              </span>
              <span className="px-2.5 py-1 rounded-[4px] text-xs font-mono font-semibold bg-[#c5ff4a]/12 text-[#c5ff4a] border border-[#c5ff4a]/30">
                {organization.currency}
              </span>
            </div>

            <div className="mt-4">
              <p className="text-4xl sm:text-5xl font-black text-white tracking-tight font-mono">
                {money(todayRevenue)}
              </p>
            </div>
          </div>

          <div className="mt-8 pt-5 border-t border-[#262626] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-[4px] bg-[#222222] text-white font-mono font-semibold text-xs border border-[#303030]">
                {todaySales._count} {t.completedSales}
              </span>
              <span className="text-[#a3a3a3]">en el día</span>
            </div>

            <Link
              href="/app/sales"
              className="text-xs font-semibold text-[#c5ff4a] hover:underline flex items-center gap-1 transition"
            >
              <span>{t.viewSalesHistory}</span> →
            </Link>
          </div>
        </div>

        {/* 3 Secondary Cards (Span 6) */}
        <div className="lg:col-span-6 grid sm:grid-cols-3 lg:grid-cols-1 gap-3.5">
          <Link
            href="/app/sales"
            className="p-5 rounded-[6px] bg-[#141414] border border-[#262626] hover:border-[#383838] flex items-center justify-between gap-4 group transition-all"
          >
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#a3a3a3]">{t.todaySales}</p>
              <p className="text-3xl font-black text-white tracking-tight font-mono">{todaySales._count}</p>
              <p className="text-xs text-[#737373]">{t.completedSales}</p>
            </div>
            <div className="size-12 rounded-[6px] bg-[#1c1c1c] border border-[#2c2c2c] text-[#c5ff4a] flex items-center justify-center font-bold group-hover:border-[#c5ff4a]/50 transition-all">
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </Link>

          <Link
            href="/app/inbox?status=NEW"
            className="p-5 rounded-[6px] bg-[#141414] border border-[#262626] hover:border-[#383838] flex items-center justify-between gap-4 group transition-all"
          >
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#a3a3a3]">{t.newMessages}</p>
              <p className="text-3xl font-black text-white tracking-tight font-mono">{unread}</p>
              <p className="text-xs text-[#737373]">{t.customerInbox}</p>
            </div>
            <div className="size-12 rounded-[6px] bg-[#1c1c1c] border border-[#2c2c2c] text-[#c5ff4a] flex items-center justify-center font-bold group-hover:border-[#c5ff4a]/50 transition-all">
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75A2.25 2.25 0 014.5 4.5h15a2.25 2.25 0 012.25 2.25z" />
              </svg>
            </div>
          </Link>

          <Link
            href="/app/contacts"
            className="p-5 rounded-[6px] bg-[#141414] border border-[#262626] hover:border-[#383838] flex items-center justify-between gap-4 group transition-all"
          >
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#a3a3a3]">{t.totalContacts}</p>
              <p className="text-3xl font-black text-white tracking-tight font-mono">{contacts}</p>
              <p className="text-xs text-[#737373]">{t.customersAndLeads}</p>
            </div>
            <div className="size-12 rounded-[6px] bg-[#1c1c1c] border border-[#2c2c2c] text-[#c5ff4a] flex items-center justify-center font-bold group-hover:border-[#c5ff4a]/50 transition-all">
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </Link>
        </div>
      </div>

      {/* 3. Bottom Cards: Latest Activity & Inventory Warnings */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Latest Sales Activity */}
        <section className="p-6 rounded-[6px] bg-[#141414] border border-[#262626] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">{t.latestSales}</h2>
              <p className="text-xs text-[#737373]">Transacciones recientes registradas</p>
            </div>
            <Link
              href="/app/sales"
              className="text-xs font-semibold text-[#c5ff4a] hover:underline transition"
            >
              {t.viewAll} →
            </Link>
          </div>

          {recentSales.length === 0 ? (
            <p className="text-xs text-[#737373] italic py-8 text-center">{t.noSalesYet}</p>
          ) : (
            <ul className="divide-y divide-[#262626]">
              {recentSales.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/app/sales/${s.id}`}
                    className="flex items-center justify-between gap-4 py-3 hover:bg-[#1a1a1a] px-3 rounded-[4px] transition group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-9 rounded-[4px] bg-[#1c1c1c] border border-[#2c2c2c] text-[#c5ff4a] flex items-center justify-center text-xs font-bold">
                        <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M9 12h6m-6 4h4m-8 4h16a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v14a1 1 0 001 1z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <span className={`block truncate text-xs font-semibold ${s.status === "VOIDED" ? "text-[#737373] line-through" : "text-white"}`}>
                          {t.saleNumber}{s.number}
                          {s.status === "VOIDED" && (
                            <span className="ml-2 text-[10px] uppercase font-bold tracking-wider text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-[2px] border border-rose-500/20">
                              {t.voidedBadge}
                            </span>
                          )}
                        </span>
                        <span className="block text-[11px] text-[#737373] truncate">
                          {formatDate(s.createdAt)} · {s.cashier.name}
                        </span>
                      </div>
                    </div>
                    <span className={`text-xs font-bold font-mono whitespace-nowrap ${s.status === "VOIDED" ? "text-[#737373]" : "text-white"}`}>
                      {money(s.totalCents)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Low Stock Alerts */}
        <section className="p-6 rounded-[6px] bg-[#141414] border border-[#262626] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">{t.lowStockAlerts}</h2>
              <p className="text-xs text-[#737373]">Productos por debajo del stock mínimo</p>
            </div>
            <Link
              href="/app/products"
              className="text-xs font-semibold text-[#c5ff4a] hover:underline transition"
            >
              {t.allProducts} →
            </Link>
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <div className="size-10 rounded-[6px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
                <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-xs font-medium text-emerald-400">{t.allInventoryHealthy}</p>
            </div>
          ) : (
            <ul className="divide-y divide-[#262626]">
              {lowStockProducts.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/app/products/${p.id}`}
                    className="flex items-center justify-between gap-4 py-3 hover:bg-[#1a1a1a] px-3 rounded-[4px] transition group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-9 rounded-[4px] bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">
                        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <span className="block text-white text-xs font-semibold truncate group-hover:text-[#c5ff4a] transition">
                          {p.name}
                        </span>
                        <span className="block text-[11px] text-[#737373] font-mono truncate">{p.sku}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-[2px] ${p.stock <= 0 ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"}`}>
                        {p.stock} {t.left}
                      </span>
                      <span className="block text-[11px] text-[#737373] mt-1 font-mono">{t.min} {p.minStock}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
