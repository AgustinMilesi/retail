"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ui } from "@/components/ui";
import {
  createSale,
  findProductByCode,
  searchProducts,
  type TillProduct,
} from "@/app/actions/pos";
import { centsToInput, formatMoney, parseMoney } from "@/lib/money";
import { computeTotals } from "@/lib/pos/sale-math";

export type Line = TillProduct & { quantity: number };

export type PaymentMethodType = "CASH" | "TRANSFER" | "CARD";

export type PosTab = {
  id: string;
  label: string;
  lines: Line[];
  paymentMethod: PaymentMethodType;
  debtorId: string;
  discount: string;
  saleKey: string;
};

export type PendingSale = {
  id: string;
  lines: Line[];
  totalCents: number;
  timeStr: string;
  paymentMethod: PaymentMethodType;
  debtorId?: string;
  debtorName?: string;
};

type DoneSale = {
  id: string;
  number: string;
  totalCents: number;
  changeCents: number;
  methodLabel: string;
};

const newKey = () => crypto.randomUUID().replace(/-/g, "");

const STORAGE_KEY_TABS = "marierp_pos_tabs_v2";
const STORAGE_KEY_PENDING = "marierp_pos_pending_v2";

export function PosTerminal({
  currency,
  showDecimals = false,
  allowNegativeStock,
  canDiscount,
  debtors = [],
}: {
  currency: string;
  showDecimals?: boolean;
  allowNegativeStock: boolean;
  canDiscount: boolean;
  debtors?: { id: string; name: string; saldoFavorCents: number }[];
}) {
  const money = (cents: number | bigint) => formatMoney(cents, currency, showDecimals);

  // Tabs state: Pedido 1, Pedido 2, Pedido 3
  const [tabs, setTabs] = useState<PosTab[]>([
    {
      id: "tab-1",
      label: "Pedido 1",
      lines: [],
      paymentMethod: "CASH",
      debtorId: "",
      discount: "",
      saleKey: newKey(),
    },
    {
      id: "tab-2",
      label: "Pedido 2",
      lines: [],
      paymentMethod: "CASH",
      debtorId: "",
      discount: "",
      saleKey: newKey(),
    },
    {
      id: "tab-3",
      label: "Pedido 3",
      lines: [],
      paymentMethod: "CASH",
      debtorId: "",
      discount: "",
      saleKey: newKey(),
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>("tab-1");

  // Pending sales
  const [pendingSales, setPendingSales] = useState<PendingSale[]>([]);

  // Search & input state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TillProduct[]>([]);
  const [quantityInput, setQuantityInput] = useState("1");
  const [selectedProductId, setSelectedProductId] = useState<string>("");

  // Modals & busy state
  const [busy, setBusy] = useState(false);
  const [doneSale, setDoneSale] = useState<DoneSale | null>(null);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitCash, setSplitCash] = useState("");
  const [splitTransfer, setSplitTransfer] = useState("");
  const [splitPosnet, setSplitPosnet] = useState("");
  const [splitDebtorId, setSplitDebtorId] = useState("");
  const [splitDebtorAmount, setSplitDebtorAmount] = useState("");

  const searchBox = useRef<HTMLInputElement>(null);
  const searchSeq = useRef(0);

  // Load state from localStorage on initial client mount
  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      try {
        const savedTabs = localStorage.getItem(STORAGE_KEY_TABS);
        if (savedTabs) {
          const parsed = JSON.parse(savedTabs);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const initial3 = ["tab-1", "tab-2", "tab-3"].map((id, index) => {
              const existing = parsed.find((p) => p.id === id) || parsed[index];
              return {
                id,
                label: `Pedido ${index + 1}`,
                lines: existing?.lines || [],
                paymentMethod: existing?.paymentMethod || "CASH",
                debtorId: existing?.debtorId || "",
                discount: existing?.discount || "",
                saleKey: existing?.saleKey || newKey(),
              };
            });
            setTabs(initial3);
            setActiveTabId("tab-1");
          }
        }
        const savedPending = localStorage.getItem(STORAGE_KEY_PENDING);
        if (savedPending) {
          const parsedPending = JSON.parse(savedPending);
          if (Array.isArray(parsedPending)) {
            setPendingSales(parsedPending);
          }
        }
      } catch {
        // Ignored
      }
    });
    return () => cancelAnimationFrame(handle);
  }, []);

  // Save tabs & pending to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TABS, JSON.stringify(tabs));
    } catch {
      // Ignored
    }
  }, [tabs]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PENDING, JSON.stringify(pendingSales));
    } catch {
      // Ignored
    }
  }, [pendingSales]);

  // Product search debounce
  useEffect(() => {
    const seq = ++searchSeq.current;
    const timer = setTimeout(
      async () => {
        try {
          const found = await searchProducts(query);
          if (seq === searchSeq.current) {
            setResults(found);
            if (found.length > 0 && !selectedProductId) {
              setSelectedProductId(found[0].id);
            }
          }
        } catch {
          if (seq === searchSeq.current) setResults([]);
        }
      },
      query ? 180 : 0,
    );
    return () => clearTimeout(timer);
  }, [query, selectedProductId]);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  function updateActiveTab(updates: Partial<PosTab>) {
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTab.id ? { ...t, ...updates } : t)),
    );
  }

  const discountCents = canDiscount && activeTab.discount.trim() ? parseMoney(activeTab.discount) : 0;
  const totals = computeTotals(
    activeTab.lines.map((l) => ({
      unitPriceCents: l.priceCents,
      quantity: l.quantity,
      taxRateBp: 0,
      saleType: l.saleType,
    })),
    discountCents ?? 0,
  );

  function parseQuantity(raw: string, isWeight = false): number {
    const cleaned = raw.replace(",", ".").trim();
    const val = parseFloat(cleaned);
    if (isNaN(val) || val <= 0) return isWeight ? 100 : 1;
    if (isWeight) {
      if (val < 10) {
        return Math.round(val * 1000);
      }
      return Math.round(val);
    }
    return Math.round(val * 1000) / 1000;
  }

  function addProductToCart(product: TillProduct, qty?: number) {
    const isWeight = product.saleType === "WEIGHT";
    const finalQty = qty !== undefined ? qty : isWeight ? 100 : 1;
    if (finalQty <= 0) return;

    const current = activeTab.lines.find((l) => l.id === product.id)?.quantity ?? 0;
    if (product.trackStock && !allowNegativeStock) {
      const stockGrams = isWeight ? product.stock * 1000 : product.stock;
      if (current + finalQty > stockGrams) {
        toast.error(`Solo quedan ${product.stock} de "${product.name}" en stock.`);
        return;
      }
    }

    const updatedLines = [...activeTab.lines];
    const existingIndex = updatedLines.findIndex((l) => l.id === product.id);
    if (existingIndex >= 0) {
      const newTotalQty = Math.round(updatedLines[existingIndex].quantity + finalQty);
      updatedLines[existingIndex] = {
        ...updatedLines[existingIndex],
        quantity: newTotalQty,
      };
    } else {
      updatedLines.push({ ...product, quantity: finalQty });
    }

    updateActiveTab({ lines: updatedLines, saleKey: newKey() });
    const formattedQty = isWeight ? `${finalQty}gr` : `${finalQty}u.`;
    toast.success(`+${formattedQty} ${product.name}`);
  }

  function adjustLineQty(lineId: string, direction: number) {
    const line = activeTab.lines.find((l) => l.id === lineId);
    if (!line) return;
    const isWeight = line.saleType === "WEIGHT";
    const step = isWeight ? (line.quantity <= 100 ? 50 : 100) : 1;
    const newQty = Math.round(line.quantity + direction * step);
    if (newQty <= 0) {
      removeLine(lineId);
      return;
    }
    if (line.trackStock && !allowNegativeStock) {
      const stockGrams = isWeight ? line.stock * 1000 : line.stock;
      if (newQty > stockGrams) {
        toast.error(`Stock máximo alcanzado (${line.stock}).`);
        return;
      }
    }
    const updatedLines = activeTab.lines.map((l) =>
      l.id === lineId ? { ...l, quantity: newQty } : l,
    );
    updateActiveTab({ lines: updatedLines, saleKey: newKey() });
  }

  function setLineExactQty(lineId: string, rawVal: string) {
    const line = activeTab.lines.find((l) => l.id === lineId);
    if (!line) return;
    const isWeight = line.saleType === "WEIGHT";
    const val = parseQuantity(rawVal, isWeight);
    if (line.trackStock && !allowNegativeStock) {
      const stockGrams = isWeight ? line.stock * 1000 : line.stock;
      if (val > stockGrams) {
        toast.error(`Stock máximo alcanzado (${line.stock}).`);
        return;
      }
    }
    const updatedLines = activeTab.lines.map((l) =>
      l.id === lineId ? { ...l, quantity: val } : l,
    );
    updateActiveTab({ lines: updatedLines, saleKey: newKey() });
  }

  function removeLine(lineId: string) {
    const updatedLines = activeTab.lines.filter((l) => l.id !== lineId);
    updateActiveTab({ lines: updatedLines, saleKey: newKey() });
  }

  function clearActiveTab() {
    updateActiveTab({
      lines: [],
      discount: "",
      debtorId: "",
      saleKey: newKey(),
    });
  }

  // Quick product submission from search box or button
  async function handleAddClick() {
    let targetProd = selectedProductId ? results.find((r) => r.id === selectedProductId) : null;
    const term = query.trim();

    if (!targetProd && term) {
      const exact = await findProductByCode(term).catch(() => null);
      targetProd = exact ?? (results.length > 0 ? results[0] : null);
    }

    if (!targetProd) {
      toast.error("Producto no encontrado.");
      return;
    }

    const isWeight = targetProd.saleType === "WEIGHT";
    const qty = isWeight && quantityInput === "1" ? 100 : parseQuantity(quantityInput, isWeight);
    addProductToCart(targetProd, qty);
    setQuery("");
    setQuantityInput("1");
    if (searchBox.current) searchBox.current.focus();
  }

  // Direct fast checkout with active payment method
  async function handleQuickCharge(method = activeTab.paymentMethod) {
    if (activeTab.lines.length === 0 || totals.totalCents <= 0) {
      toast.error("El pedido está vacío.");
      return;
    }

    setBusy(true);
    const methodEnum = method === "CASH" ? "CASH" : method === "TRANSFER" ? "TRANSFER" : "CARD";
    const methodLabel = method === "CASH" ? "Efectivo" : method === "TRANSFER" ? "Transferencia" : "Posnet";

    try {
      const result = await createSale({
        idempotencyKey: activeTab.saleKey,
        items: activeTab.lines.map((l) => ({ productId: l.id, quantity: l.quantity })),
        payments: [{ method: methodEnum, amountCents: totals.totalCents }],
        discountCents: totals.discountCents,
        expectedTotalCents: totals.totalCents,
        note: `Venta directa (${methodLabel})`,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message ?? `Venta de ${money(totals.totalCents)} registrada.`);
      setDoneSale({
        id: result.data?.id ?? "",
        number: result.data?.number ?? "",
        totalCents: totals.totalCents,
        changeCents: 0,
        methodLabel,
      });

      clearActiveTab();
    } catch {
      toast.error("Error al procesar la venta. Reintentá.");
    } finally {
      setBusy(false);
    }
  }

  // Send sale directly to Debtor account (Fiado)
  async function handleSendToDebtor() {
    if (!activeTab.debtorId) {
      toast.error("Seleccioná un cliente deudor de la lista.");
      return;
    }
    if (activeTab.lines.length === 0 || totals.totalCents <= 0) {
      toast.error("El pedido está vacío.");
      return;
    }

    const debtor = debtors.find((d) => d.id === activeTab.debtorId);
    if (!debtor) {
      toast.error("Cliente deudor no encontrado.");
      return;
    }

    setBusy(true);
    try {
      const result = await createSale({
        idempotencyKey: activeTab.saleKey,
        items: activeTab.lines.map((l) => ({ productId: l.id, quantity: l.quantity })),
        payments: [{ method: "OTHER", amountCents: totals.totalCents }],
        discountCents: totals.discountCents,
        expectedTotalCents: totals.totalCents,
        debtorId: debtor.id,
        note: `A cuenta de ${debtor.name}`,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(`Venta de ${money(totals.totalCents)} enviada al fiado de ${debtor.name}.`);
      setDoneSale({
        id: result.data?.id ?? "",
        number: result.data?.number ?? "",
        totalCents: totals.totalCents,
        changeCents: 0,
        methodLabel: `Fiado (${debtor.name})`,
      });

      clearActiveTab();
    } catch {
      toast.error("Error al registrar venta a deudor.");
    } finally {
      setBusy(false);
    }
  }

  // Move active sale to Pending (Poner en espera)
  function handleMoveToPending() {
    if (activeTab.lines.length === 0 || totals.totalCents <= 0) {
      toast.error("No hay ítems para poner en espera.");
      return;
    }

    const debtor = debtors.find((d) => d.id === activeTab.debtorId);
    const newPending: PendingSale = {
      id: crypto.randomUUID(),
      lines: [...activeTab.lines],
      totalCents: totals.totalCents,
      timeStr: new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
      paymentMethod: activeTab.paymentMethod,
      debtorId: activeTab.debtorId || undefined,
      debtorName: debtor?.name,
    };

    setPendingSales((prev) => [newPending, ...prev]);
    clearActiveTab();
    toast.info("Venta puesta en espera en Pendientes de Pago.");
  }

  // Restore pending sale into active tab
  function handleRestorePending(pending: PendingSale) {
    const targetTab =
      (activeTab.lines.length === 0 ? activeTab : null) ||
      tabs.find((t) => t.lines.length === 0) ||
      activeTab;

    setTabs((prev) =>
      prev.map((t) =>
        t.id === targetTab.id
          ? {
              ...t,
              lines: pending.lines,
              paymentMethod: pending.paymentMethod,
              debtorId: pending.debtorId || "",
              saleKey: newKey(),
            }
          : t,
      ),
    );
    setActiveTabId(targetTab.id);
    setPendingSales((prev) => prev.filter((p) => p.id !== pending.id));
    toast.success(`Pedido recuperado en ${targetTab.label}.`);
  }

  // Discard pending sale
  function handleDiscardPending(id: string) {
    setPendingSales((prev) => prev.filter((p) => p.id !== id));
    toast.info("Pedido pendiente eliminado.");
  }

  // Split payment confirm
  async function handleConfirmSplit() {
    const cashVal = parseFloat(splitCash) || 0;
    const transVal = parseFloat(splitTransfer) || 0;
    const posVal = parseFloat(splitPosnet) || 0;
    const debtorVal = parseFloat(splitDebtorAmount) || 0;

    const cashCents = Math.round(cashVal * 100);
    const transCents = Math.round(transVal * 100);
    const posCents = Math.round(posVal * 100);
    const debtorCents = Math.round(debtorVal * 100);

    if (debtorCents > 0 && !splitDebtorId) {
      toast.error("Por favor seleccioná el cliente deudor para asignarle el saldo fiado.");
      return;
    }

    const totalEntered = cashCents + transCents + posCents + debtorCents;
    if (totalEntered < totals.totalCents) {
      toast.error(`Faltan ${money(totals.totalCents - totalEntered)} para cubrir el total.`);
      return;
    }

    const payments: { method: "CASH" | "CARD" | "TRANSFER" | "OTHER"; amountCents: number }[] = [];
    if (cashCents > 0) payments.push({ method: "CASH", amountCents: cashCents });
    if (transCents > 0) payments.push({ method: "TRANSFER", amountCents: transCents });
    if (posCents > 0) payments.push({ method: "CARD", amountCents: posCents });
    if (debtorCents > 0) payments.push({ method: "OTHER", amountCents: debtorCents });

    const selectedDebtor = debtors.find((d) => d.id === splitDebtorId);

    setBusy(true);
    try {
      const result = await createSale({
        idempotencyKey: activeTab.saleKey,
        items: activeTab.lines.map((l) => ({ productId: l.id, quantity: l.quantity })),
        payments,
        discountCents: totals.discountCents,
        expectedTotalCents: totals.totalCents,
        debtorId: debtorCents > 0 ? splitDebtorId : undefined,
        debtorAmountCents: debtorCents > 0 ? debtorCents : undefined,
        note:
          debtorCents > 0
            ? `Pago dividido (Fiado a ${selectedDebtor?.name || "cliente"}: ${money(debtorCents)})`
            : "Pago dividido / mixto",
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(
        result.message ??
          (debtorCents > 0
            ? `Venta registrada. ${money(debtorCents)} enviados a la cuenta de ${selectedDebtor?.name || "cliente"}.`
            : "Venta dividida registrada.")
      );
      setDoneSale({
        id: result.data?.id ?? "",
        number: result.data?.number ?? "",
        totalCents: totals.totalCents,
        changeCents: Math.max(0, totalEntered - totals.totalCents),
        methodLabel:
          debtorCents > 0
            ? `Pago Dividido (${selectedDebtor?.name ? `Fiado: ${selectedDebtor.name}` : "Fiado"})`
            : "Pago Dividido",
      });

      setShowSplitModal(false);
      clearActiveTab();
    } catch {
      toast.error("Error al procesar el pago.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 animate-smooth-in">
      {/* 1. Barra de Pestañas de Pedidos (Ergonómica 44px min-height) */}
      <div className="flex items-center justify-between border-b border-[#262626] pb-4 overflow-x-auto gap-4">
        <div className="flex items-center gap-2">
          {tabs.slice(0, 3).map((tab) => {
            const isActive = tab.id === activeTabId;
            const countDisplay = tab.lines.length;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTabId(tab.id)}
                className={`flex items-center gap-2.5 px-5 py-2.5 min-h-[44px] rounded-[6px] text-xs font-semibold tracking-wide transition-all select-none border cursor-pointer active:scale-[0.98] ${
                  isActive
                    ? "bg-[#c5ff4a]/12 text-white border-[#c5ff4a]/40 shadow-[0_0_12px_rgba(197,255,74,0.15)]"
                    : "bg-[#141414] text-[#a3a3a3] hover:text-white hover:bg-[#1f1f1f] border-[#262626]"
                }`}
              >
                <span>{tab.label}</span>
                {countDisplay > 0 && (
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-bold ${
                      isActive ? "bg-[#c5ff4a] text-black" : "bg-[#262626] text-[#c5ff4a]"
                    }`}
                  >
                    {countDisplay}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {pendingSales.length > 0 && (
          <div className="flex items-center gap-2 text-xs font-semibold px-4 py-2 min-h-[40px] rounded-[6px] bg-amber-500/10 text-amber-300 border border-amber-500/30">
            <span>⏸️ {pendingSales.length} en espera</span>
          </div>
        )}
      </div>

      {/* 2. Cuadrícula Principal del POS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* COLUMNA 1: Buscar & Catálogo de Productos (Span 4) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-[6px] bg-[#141414] border border-[#262626] space-y-4">
            <p className={ui.label}>Buscar y Agregar Producto</p>
            <div className="space-y-3">
              <input
                ref={searchBox}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddClick();
                  }
                }}
                autoFocus
                placeholder="Nombre, código de barra o SKU..."
                className={ui.input}
              />

              <div className="flex items-center gap-2">
                <div className="w-28 shrink-0">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={quantityInput}
                    onChange={(e) => setQuantityInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddClick();
                      }
                    }}
                    className={`${ui.input} text-center font-bold`}
                    placeholder="Cant / gr"
                    title="Cantidad o gramos (ej: 100, 250, 500, 1000)"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddClick}
                  className={ui.button}
                >
                  <span>+ Agregar al Pedido</span>
                </button>
              </div>
            </div>

            {/* Listado rápido de productos encontrados */}
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1 pt-1">
              {results.length === 0 ? (
                <p className="text-xs text-[#737373] italic py-8 text-center">
                  {query ? "No se encontraron productos coincidentes." : "Escribí o escaneá para ver productos."}
                </p>
              ) : (
                results.map((p) => {
                  const isOut = p.trackStock && p.stock <= 0 && !allowNegativeStock;
                  const isSelected = selectedProductId === p.id;
                  const isWeight = p.saleType === "WEIGHT";

                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedProductId(p.id);
                        const qty = isWeight && quantityInput === "1" ? 100 : parseQuantity(quantityInput, isWeight);
                        addProductToCart(p, qty);
                      }}
                      className={`group flex items-center justify-between p-3.5 rounded-[6px] border text-xs cursor-pointer transition-all select-none ${
                        isSelected
                          ? "border-[#c5ff4a]/60 bg-[#c5ff4a]/10 ring-1 ring-[#c5ff4a]/40"
                          : "border-[#262626] hover:border-[#383838] bg-[#1a1a1a] hover:bg-[#202020]"
                      } ${isOut ? "opacity-40 cursor-not-allowed" : "active:scale-[0.99]"}`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-white font-semibold group-hover:text-[#c5ff4a] transition truncate">
                            {p.name}
                          </p>
                          {isWeight && (
                            <span className="text-[10px] px-2 py-0.5 bg-[#c5ff4a]/12 text-[#c5ff4a] rounded-[2px] font-bold border border-[#c5ff4a]/30">
                              x Kilo
                            </span>
                          )}
                          {p.size && (
                            <span className="text-[10px] px-2 py-0.5 bg-[#262626] text-[#a3a3a3] rounded-[2px] font-mono">
                              {p.size}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <span className="text-[#c5ff4a] font-bold font-mono block text-sm">
                          {money(p.priceCents)}{isWeight ? <span className="text-[10px] font-normal text-[#737373]">/kg</span> : ""}
                        </span>
                        {p.trackStock && (
                          <span className={`text-[10px] font-mono ${isOut ? "text-rose-400 font-semibold" : "text-[#737373]"}`}>
                            {isOut ? "Sin stock" : `${p.stock} disp.`}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* COLUMNA 2: Pedido Actual (Lista de Ítems) (Span 4) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-[6px] bg-[#141414] border border-[#262626] space-y-4">
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold text-white flex items-center gap-2">
                  <span>{activeTab.label}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-[4px] bg-[#c5ff4a]/12 text-[#c5ff4a] border border-[#c5ff4a]/30 font-mono font-bold">
                    {activeTab.lines.length} {activeTab.lines.length === 1 ? "ítem" : "ítems"}
                  </span>
                </p>
              </div>

              {activeTab.lines.length > 0 && (
                <button
                  type="button"
                  onClick={clearActiveTab}
                  className="text-xs uppercase tracking-wider text-[#737373] hover:text-rose-400 transition font-semibold cursor-pointer"
                >
                  Vaciar
                </button>
              )}
            </div>

            {activeTab.lines.length === 0 ? (
              <div className="text-center py-20 space-y-3">
                <div className="size-14 rounded-[6px] bg-[#1c1c1c] border border-[#262626] flex items-center justify-center mx-auto text-[#737373]">
                  <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <p className="text-white text-xs uppercase tracking-wider font-semibold">Pedido vacío</p>
                <p className="text-xs text-[#737373]">
                  Agregá productos del catálogo o escaneá un código
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[#262626] max-h-[460px] overflow-y-auto pr-1">
                {activeTab.lines.map((item, idx) => {
                  const isWeight = item.saleType === "WEIGHT";
                  const lineTotal = Math.round(
                    isWeight
                      ? (item.priceCents * item.quantity) / 1000
                      : item.priceCents * item.quantity,
                  );

                  return (
                    <li key={item.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-white font-medium truncate">
                            <span className="text-[#737373] font-mono mr-1">{idx + 1}.</span>
                            {item.name}
                          </p>
                          {isWeight && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-[#c5ff4a]/12 text-[#c5ff4a] rounded-[2px] font-bold border border-[#c5ff4a]/30">
                              x Kilo
                            </span>
                          )}
                          {item.size && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-[#262626] text-[#a3a3a3] rounded-[2px] font-mono">
                              {item.size}
                            </span>
                          )}
                        </div>
                        <p className="text-[#a3a3a3] text-[11px] mt-0.5 font-mono">
                          {money(item.priceCents)} {isWeight ? "/kg" : "c/u"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Stepper ergonómico (min 36x36px) */}
                        <div className="flex items-center bg-[#0a0a0a] border border-[#262626] rounded-[6px] p-0.5">
                          <button
                            type="button"
                            onClick={() => adjustLineQty(item.id, -1)}
                            className="size-8 min-h-[32px] min-w-[32px] flex items-center justify-center text-[#a3a3a3] hover:text-white hover:bg-[#1e1e1e] rounded-[4px] font-bold transition active:scale-90 cursor-pointer"
                            title={isWeight ? "Restar 100gr" : "Restar 1"}
                          >
                            −
                          </button>
                          <div className="flex items-center px-1">
                            <input
                              type="text"
                              inputMode="numeric"
                              defaultValue={item.quantity}
                              key={`${item.id}-${item.quantity}`}
                              onBlur={(e) => setLineExactQty(item.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.currentTarget.blur();
                                }
                              }}
                              className="w-12 text-center font-bold text-white font-mono bg-transparent border-0 focus:bg-[#1a1a1a] focus:ring-1 focus:ring-[#c5ff4a] rounded-[4px] py-0.5 text-xs outline-none"
                              title="Escribí los gramos con el teclado (ej: 100, 250, 500, 1000) y pulsá Enter"
                            />
                            <span className="text-[10px] text-[#737373] font-mono ml-0.5">
                              {isWeight ? "gr" : "u"}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => adjustLineQty(item.id, 1)}
                            className="size-8 min-h-[32px] min-w-[32px] flex items-center justify-center text-[#a3a3a3] hover:text-white hover:bg-[#1e1e1e] rounded-[4px] font-bold transition active:scale-90 cursor-pointer"
                            title={isWeight ? "Sumar 100gr" : "Sumar 1"}
                          >
                            +
                          </button>
                        </div>

                        <span className="text-white font-bold w-16 text-right font-mono text-sm">
                          {money(lineTotal)}
                        </span>

                        <button
                          type="button"
                          onClick={() => removeLine(item.id)}
                          className="size-8 min-h-[32px] min-w-[32px] flex items-center justify-center text-[#737373] hover:text-rose-400 hover:bg-rose-950/20 rounded-[4px] transition cursor-pointer"
                          title="Eliminar del pedido"
                        >
                          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* COLUMNA 3: Totales, Métodos de Pago y Acciones (Span 4) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-6 rounded-[6px] bg-[#141414] border border-[#262626] space-y-6 relative overflow-hidden">
            {/* Total Grande */}
            <div className="flex items-baseline justify-between border-b border-[#262626] pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#a3a3a3]">Total a Cobrar</p>
                <p className="text-4xl sm:text-5xl font-black text-white tracking-tight font-mono mt-1">
                  {money(totals.totalCents)}
                </p>
              </div>

              {canDiscount && (
                <div className="w-24 text-right">
                  <input
                    value={activeTab.discount}
                    onChange={(e) => updateActiveTab({ discount: e.target.value })}
                    placeholder="Desc. $"
                    className="w-full bg-[#000000] border border-[#262626] rounded-[6px] focus:border-[#c5ff4a] text-xs text-white text-right outline-none py-1.5 px-2 placeholder:text-[#666666] font-mono transition"
                    title="Descuento en pesos"
                  />
                </div>
              )}
            </div>

            {/* Selector de Método de Pago Directo (Ergonómico 44px min-height) */}
            <div className="space-y-2.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#a3a3a3]">Método de Pago</p>

              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    id: "CASH" as const,
                    label: "Efectivo",
                    icon: (
                      <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ),
                  },
                  {
                    id: "TRANSFER" as const,
                    label: "Transf.",
                    icon: (
                      <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                      </svg>
                    ),
                  },
                  {
                    id: "CARD" as const,
                    label: "Posnet",
                    icon: (
                      <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-6 3.75h16.5a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5H4.5A2.25 2.25 0 002.25 6.75v10.5A2.25 2.25 0 004.5 21z" />
                      </svg>
                    ),
                  },
                ].map((m) => {
                  const isSelected = activeTab.paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => updateActiveTab({ paymentMethod: m.id })}
                      className={`min-h-[48px] py-2.5 px-2 rounded-[6px] text-xs font-semibold tracking-wide transition-all flex flex-col items-center justify-center gap-1.5 select-none border cursor-pointer active:scale-[0.98] ${
                        isSelected
                          ? "bg-[#c5ff4a]/15 text-[#c5ff4a] border-[#c5ff4a]/50 shadow-[0_0_12px_rgba(197,255,74,0.15)] font-bold"
                          : "bg-[#181818] text-[#a3a3a3] border-[#262626] hover:text-white hover:bg-[#202020]"
                      }`}
                    >
                      {m.icon}
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Botones Principales de Cobro (Ergonómicos min-h-[44px]) */}
            <div className="space-y-3 pt-1">
              <button
                type="button"
                disabled={activeTab.lines.length === 0 || busy}
                onClick={() => handleQuickCharge()}
                className="w-full min-h-[48px] py-3 px-5 bg-[#c5ff4a] hover:bg-[#b8f73b] active:scale-[0.98] disabled:opacity-40 text-black font-bold text-xs uppercase tracking-wider rounded-[6px] shadow-[0_0_16px_rgba(197,255,74,0.3)] flex items-center justify-between cursor-pointer transition-all"
              >
                <span className="flex items-center gap-2">
                  <span>Cobrar</span>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-[4px] bg-black/15 text-inherit">
                    {activeTab.paymentMethod === "CASH"
                      ? "Efectivo"
                      : activeTab.paymentMethod === "TRANSFER"
                      ? "Transf."
                      : "Posnet"}
                  </span>
                </span>
                <span className="font-mono text-base font-black">
                  {money(totals.totalCents)}
                </span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={activeTab.lines.length === 0}
                  onClick={() => {
                    setSplitCash(centsToInput(totals.totalCents));
                    setSplitTransfer("");
                    setSplitPosnet("");
                    setSplitDebtorId(activeTab.debtorId || "");
                    setSplitDebtorAmount("");
                    setShowSplitModal(true);
                  }}
                  className={ui.ghost}
                >
                  Dividir Pago
                </button>

                <button
                  type="button"
                  disabled={activeTab.lines.length === 0}
                  onClick={handleMoveToPending}
                  className="min-h-[44px] px-4 py-2.5 rounded-[6px] text-xs font-semibold tracking-wide bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                  title="Poner venta en espera para atender a otro cliente"
                >
                  ⏸️ En Espera
                </button>
              </div>
            </div>

            {/* Sección: Enviar a Deudor (Fiado) */}
            <div className="pt-4 border-t border-[#262626] space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#a3a3a3]">A Cuenta de Deudor (Fiado)</p>

              <select
                value={activeTab.debtorId}
                onChange={(e) => updateActiveTab({ debtorId: e.target.value })}
                className={ui.input}
              >
                <option value="" className="text-[#737373]">Seleccionar cliente deudor...</option>
                {debtors.map((d) => (
                  <option key={d.id} value={d.id} className="text-white bg-[#141414]">
                    {d.name} {d.saldoFavorCents > 0 ? `(Favor: ${money(d.saldoFavorCents)})` : ""}
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={!activeTab.debtorId || activeTab.lines.length === 0 || busy}
                onClick={handleSendToDebtor}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-[6px] text-xs font-semibold uppercase tracking-wide bg-[#161616] text-amber-300 border border-amber-900/40 hover:bg-amber-950/30 hover:border-amber-600/50 transition cursor-pointer disabled:opacity-40"
              >
                Enviar al Fiado
              </button>
            </div>
          </div>

          {/* Sección Lateral: Pendientes de Pago */}
          {pendingSales.length > 0 && (
            <div className="p-5 rounded-[6px] space-y-3 border border-amber-500/30 bg-amber-500/5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                  <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
                  <span>Pendientes de Pago ({pendingSales.length})</span>
                </p>
              </div>

              <ul className="divide-y divide-amber-500/20 space-y-2 max-h-60 overflow-y-auto pr-1">
                {pendingSales.map((p) => (
                  <li key={p.id} className="pt-2 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="text-white font-bold block font-mono">{money(p.totalCents)}</span>
                      <span className="text-[#a3a3a3] text-[11px]">
                        {p.timeStr} · {p.lines.length} {p.lines.length === 1 ? "ítem" : "ítems"}
                        {p.debtorName ? ` · ${p.debtorName}` : ""}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRestorePending(p)}
                        className="px-3 py-1.5 min-h-[36px] bg-amber-400 hover:bg-amber-300 text-black rounded-[4px] text-xs font-bold transition active:scale-95 cursor-pointer shadow-xs"
                      >
                        Recuperar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDiscardPending(p.id)}
                        className="text-[#737373] hover:text-rose-400 p-2 cursor-pointer"
                        title="Descartar"
                      >
                        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* 3. Modal de Dividir Pago (Split Payment) */}
      {showSplitModal && (() => {
        const splitCashCents = Math.round((parseFloat(splitCash) || 0) * 100);
        const splitTransCents = Math.round((parseFloat(splitTransfer) || 0) * 100);
        const splitPosCents = Math.round((parseFloat(splitPosnet) || 0) * 100);
        const splitDebtorCents = Math.round((parseFloat(splitDebtorAmount) || 0) * 100);

        const totalEnteredCents = splitCashCents + splitTransCents + splitPosCents + splitDebtorCents;
        const remainingCents = totals.totalCents - totalEnteredCents;
        const nonDebtorCents = splitCashCents + splitTransCents + splitPosCents;
        const remainderForDebtor = Math.max(0, totals.totalCents - nonDebtorCents);
        const isCovered = totalEnteredCents >= totals.totalCents;
        const debtorMissing = splitDebtorCents > 0 && !splitDebtorId;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="max-w-lg w-full p-6 sm:p-7 space-y-5 rounded-[6px] bg-[#121212] border border-[#262626] shadow-[0_20px_50px_rgba(0,0,0,0.9)] max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#262626] pb-3">
                <p className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <svg className="size-4 text-[#c5ff4a]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                  Dividir Pago de la Venta
                </p>
                <button
                  type="button"
                  onClick={() => setShowSplitModal(false)}
                  className="size-9 flex items-center justify-center text-[#737373] hover:text-white rounded-[4px] cursor-pointer"
                >
                  <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="flex items-baseline justify-between bg-[#0a0a0a] p-4 rounded-[6px] border border-[#262626]">
                <span className={ui.label}>Total a Cubrir</span>
                <span className="text-2xl font-black text-[#c5ff4a] font-mono">{money(totals.totalCents)}</span>
              </div>

              <div className="space-y-4">
                {/* Efectivo */}
                <div>
                  <label className={ui.label}>Efectivo ($)</label>
                  <input
                    type="number"
                    step="any"
                    value={splitCash}
                    onChange={(e) => setSplitCash(e.target.value)}
                    placeholder="0"
                    className={ui.input}
                  />
                </div>

                {/* Transferencia */}
                <div>
                  <label className={ui.label}>Transferencia / MP ($)</label>
                  <input
                    type="number"
                    step="any"
                    value={splitTransfer}
                    onChange={(e) => setSplitTransfer(e.target.value)}
                    placeholder="0"
                    className={ui.input}
                  />
                </div>

                {/* Posnet */}
                <div>
                  <label className={ui.label}>Posnet / Tarjeta ($)</label>
                  <input
                    type="number"
                    step="any"
                    value={splitPosnet}
                    onChange={(e) => setSplitPosnet(e.target.value)}
                    placeholder="0"
                    className={ui.input}
                  />
                </div>

                {/* Enviar a Fiado / Deudor */}
                <div className="p-4 rounded-[6px] bg-amber-500/5 border border-amber-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                      <span>Cuenta Corriente (Fiado)</span>
                    </label>
                    {remainderForDebtor > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setSplitDebtorAmount(String(remainderForDebtor / 100))
                        }
                        className="text-[11px] font-mono text-[#c5ff4a] hover:underline font-bold cursor-pointer"
                      >
                        Mandar resto ({money(remainderForDebtor)})
                      </button>
                    )}
                  </div>

                  <select
                    value={splitDebtorId}
                    onChange={(e) => setSplitDebtorId(e.target.value)}
                    className={ui.input}
                  >
                    <option value="">-- Seleccionar cliente fiado --</option>
                    {debtors.map((d) => (
                      <option key={d.id} value={d.id} className="text-white bg-[#141414]">
                        {d.name} {d.saldoFavorCents > 0 ? `(A favor: ${money(d.saldoFavorCents)})` : ""}
                      </option>
                    ))}
                  </select>

                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737373] font-mono text-sm font-bold">
                      $
                    </span>
                    <input
                      type="number"
                      step="any"
                      value={splitDebtorAmount}
                      onChange={(e) => setSplitDebtorAmount(e.target.value)}
                      placeholder="Monto a mandar a cuenta corriente (0)"
                      className={`${ui.input} pl-8`}
                    />
                  </div>
                </div>
              </div>

              {/* Status Box */}
              {debtorMissing ? (
                <div className="p-3 rounded-[6px] bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 font-medium">
                  Ingresaste un monto de fiado pero no seleccionaste ningún cliente deudor.
                </div>
              ) : remainingCents > 0 ? (
                <div className="p-3 rounded-[6px] bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between">
                  <span>Faltan <strong className="font-mono text-white">{money(remainingCents)}</strong> para cubrir el total.</span>
                  {splitDebtorId && (
                    <button
                      type="button"
                      onClick={() => {
                        const currentDebtor = parseFloat(splitDebtorAmount) || 0;
                        const newDebtorCents = Math.round(currentDebtor * 100) + remainingCents;
                        setSplitDebtorAmount(String(newDebtorCents / 100));
                      }}
                      className="px-2.5 py-1 rounded-[4px] bg-amber-400 text-black font-bold hover:bg-amber-300 transition text-[11px] cursor-pointer"
                    >
                      + Sumar al fiado
                    </button>
                  )}
                </div>
              ) : remainingCents === 0 ? (
                <div className="p-3 rounded-[6px] bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-medium flex items-center justify-between">
                  <span>Total cubierto exactamente.</span>
                  {splitDebtorCents > 0 && (
                    <span className="font-mono font-bold text-amber-300">
                      (Fiado: {money(splitDebtorCents)})
                    </span>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-[6px] bg-sky-500/10 border border-sky-500/20 text-xs text-sky-300 font-mono">
                  Vuelto en efectivo a entregar: <strong className="font-mono text-white">{money(-remainingCents)}</strong>
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowSplitModal(false)}
                  className={ui.ghost}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={busy || !isCovered || debtorMissing}
                  onClick={handleConfirmSplit}
                  className={ui.button}
                >
                  Confirmar Cobro
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 4. Modal de Venta Registrada con Éxito */}
      {doneSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-sm w-full p-8 text-center space-y-6 rounded-[6px] bg-[#121212] border border-[#262626] shadow-[0_20px_50px_rgba(0,0,0,0.9)]">
            <div className="size-16 rounded-[6px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-xs">
              <svg className="size-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#a3a3a3]">Venta Registrada</p>
              <p className="text-2xl font-bold text-white">Ticket #{doneSale.number}</p>
              <p className="text-3xl font-black text-[#c5ff4a] font-mono mt-1">{money(doneSale.totalCents)}</p>
              <p className="text-xs text-[#737373]">{doneSale.methodLabel}</p>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDoneSale(null)}
                className={ui.button}
              >
                Siguiente Venta
              </button>

              {doneSale.id && (
                <Link
                  href={`/pos/receipt/${doneSale.id}`}
                  target="_blank"
                  className={ui.ghost}
                >
                  Ver / Imprimir Recibo
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
