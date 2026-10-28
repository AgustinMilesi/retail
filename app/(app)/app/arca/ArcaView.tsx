"use client";

import { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import QRCode from "qrcode";
import type { ArcaStatus } from "@/lib/arca";
import { saveArcaCredentials, generateCsrAndKey, emitInvoice } from "@/app/actions/arca";

interface InvoiceRecord {
  id: string;
  cuit: string;
  ptoVta: number;
  cbteTipo: number;
  cbteNro: number;
  cae: string;
  caeVto: string;
  fecha: string;
  importePesos: number;
  concepto: string;
  metodoOrigen: string;
  docTipo: number;
  docNro: string;
  qrUrl: string;
  createdAt: Date;
}

interface ArcaViewProps {
  organization: {
    id: string;
    name: string;
  };
  initialStatus: ArcaStatus;
  initialInvoices: InvoiceRecord[];
  todaySalesCents: number;
  canEdit: boolean;
}

export function ArcaView({
  organization,
  initialStatus,
  initialInvoices,
  todaySalesCents,
  canEdit,
}: ArcaViewProps) {
  const [status, setStatus] = useState<ArcaStatus>(initialStatus);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>(initialInvoices);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Formulario de emisión
  const [monto, setMonto] = useState<string>(
    todaySalesCents > 0 ? (todaySalesCents / 100).toFixed(2) : ""
  );
  const [concepto, setConcepto] = useState<string>("Ventas varias de mercadería");
  const [cbteTipo, setCbteTipo] = useState<number>(11); // 11 = Factura C
  const [docTipo, setDocTipo] = useState<number>(99);   // 99 = Consumidor Final
  const [docNro, setDocNro] = useState<string>("");
  const [metodoOrigen, setMetodoOrigen] = useState<string>("Mostrador");

  // Estado del último comprobante emitido
  const [lastInvoice, setLastInvoice] = useState<{
    numeroCompleto: string;
    cae: string;
    caeVto: string;
    fecha: string;
    importePesos: number;
    qrUrl: string;
    tipoDesc: string;
  } | null>(null);
  const [lastQrDataUrl, setLastQrDataUrl] = useState<string | null>(null);

  // Generador CSR state
  const [csrCuit, setCsrCuit] = useState<string>(status.cuit || "");
  const [isGeneratingCsr, startGeneratingCsr] = useTransition();
  const [isEmitting, startEmitting] = useTransition();
  const [isSavingConfig, startSavingConfig] = useTransition();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Generar QR en base64 cuando se emite una factura
  useEffect(() => {
    if (lastInvoice?.qrUrl) {
      QRCode.toDataURL(lastInvoice.qrUrl, {
        width: 180,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
      })
        .then(setLastQrDataUrl)
        .catch(() => setLastQrDataUrl(null));
    }
  }, [lastInvoice]);

  const handleCargarVentasHoy = () => {
    const val = (todaySalesCents / 100).toFixed(2);
    setMonto(val);
    setMetodoOrigen("Ventas de Hoy");
    toast.info(`Cargado total de ventas de hoy: $${Number(val).toLocaleString("es-AR")}`);
  };

  const handleEmitInvoice = () => {
    const parsedMonto = parseFloat(monto);
    if (!parsedMonto || isNaN(parsedMonto) || parsedMonto <= 0) {
      toast.error("Por favor ingresá un monto mayor a $0.");
      return;
    }

    if (!status.configured) {
      toast.error("Faltan configurar las credenciales de ARCA (CUIT, Certificado digital o Clave).");
      setConfigModalOpen(true);
      return;
    }

    startEmitting(async () => {
      const res = await emitInvoice({
        importePesos: parsedMonto,
        ptoVta: status.ptoVta,
        cbteTipo,
        docTipo,
        docNro: docNro.trim() || "0",
        concepto,
        metodoOrigen,
      });

      if (res.ok && res.invoice) {
        toast.success(`✅ Factura emitida y autorizada por ARCA (CAE: ${res.invoice.cae})`);
        setLastInvoice(res.invoice);

        const newRec: InvoiceRecord = {
          id: res.invoice.id,
          cuit: String(res.invoice.cuit),
          ptoVta: res.invoice.ptoVta,
          cbteTipo: res.invoice.cbteTipo,
          cbteNro: res.invoice.cbteNro,
          cae: res.invoice.cae,
          caeVto: res.invoice.caeVto,
          fecha: res.invoice.fecha,
          importePesos: res.invoice.importePesos,
          concepto: res.invoice.concepto,
          metodoOrigen: res.invoice.metodoOrigen,
          docTipo: res.invoice.docTipo,
          docNro: res.invoice.docNro,
          qrUrl: res.invoice.qrUrl,
          createdAt: new Date(),
        };
        setInvoices((prev) => [newRec, ...prev]);
      } else {
        toast.error(res.error || "Error al conectar con los Web Services de ARCA.");
      }
    });
  };

  const handleGenerateCsr = () => {
    const clean = csrCuit.replace(/\D/g, "");
    if (clean.length !== 11) {
      toast.error("El CUIT debe tener exactamente 11 dígitos numéricos.");
      return;
    }

    startGeneratingCsr(async () => {
      const res = await generateCsrAndKey(clean);
      if (res.ok && res.pemCsr && res.pemKey) {
        // Descargar CSR
        const blobCsr = new Blob([res.pemCsr], { type: "text/plain" });
        const a1 = document.createElement("a");
        a1.href = URL.createObjectURL(blobCsr);
        a1.download = res.filenameCsr || `pedido_afip_${clean}.csr`;
        document.body.appendChild(a1);
        a1.click();
        document.body.removeChild(a1);

        // Descargar Clave Privada
        const blobKey = new Blob([res.pemKey], { type: "text/plain" });
        const a2 = document.createElement("a");
        a2.href = URL.createObjectURL(blobKey);
        a2.download = res.filenameKey || `privada_afip_${clean}.key`;
        document.body.appendChild(a2);
        a2.click();
        document.body.removeChild(a2);

        toast.success(`Archivos .csr y .key descargados. Subí el .csr a la web de ARCA.`);
        setStatus((prev) => ({ ...prev, cuit: clean, hasKey: true }));
      } else {
        toast.error(res.error || "No se pudo generar el pedido de certificado.");
      }
    });
  };

  const handleSaveConfig = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    startSavingConfig(async () => {
      const res = await saveArcaCredentials(fd);
      if (res.ok) {
        toast.success(res.message || "Credenciales guardadas correctamente.");
        setConfigModalOpen(false);

        const cuitVal = String(fd.get("cuit") || "").replace(/\D/g, "");
        const ptoVal = parseInt(String(fd.get("ptoVta") || "1"), 10);
        const prodVal = fd.get("production") === "on";
        const hasCertVal = Boolean(String(fd.get("certPem") || "").trim() || status.hasCert);
        const hasKeyVal = Boolean(String(fd.get("keyPem") || "").trim() || status.hasKey);

        setStatus({
          configured: Boolean(cuitVal.length === 11 && hasCertVal && hasKeyVal),
          cuit: cuitVal || status.cuit,
          ptoVta: isNaN(ptoVal) ? 1 : ptoVal,
          production: prodVal,
          hasCert: hasCertVal,
          hasKey: hasKeyVal,
          updatedAt: new Date(),
        });
      } else {
        toast.error(res.error || "Error al guardar credenciales.");
      }
    });
  };

  const handlePrintReceipt = () => {
    if (!lastInvoice) return;
    window.print();
  };

  return (
    <div className="space-y-6 animate-smooth-in">
      {/* 1. Header con Título, Estado y Botón de Ajustes */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-[8px] bg-[#121212] border border-[#262626]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-sans font-bold text-white tracking-tight">
              Facturación Electrónica ARCA
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-[4px] bg-[#c5ff4a]/12 text-[#c5ff4a] border border-[#c5ff4a]/30 font-semibold uppercase">
              ex-AFIP
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#a3a3a3] mt-1 font-sans">
            Emisión de Factura C Monotributo y comprobantes fiscales con CAE oficial y código QR normado.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Status Badge */}
          {status.configured ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 shadow-xs">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              ARCA Conectado · Pto Vta {String(status.ptoVta).padStart(4, "0")} · {status.production ? "Producción" : "Homologación"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-semibold bg-amber-950/60 text-amber-300 border border-amber-800/60">
              <span className="size-2 rounded-full bg-amber-400" />
              Pendiente de Credenciales
            </span>
          )}

          {canEdit && (
            <button
              type="button"
              onClick={() => setConfigModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-[6px] bg-[#1a1a1a] hover:bg-[#252525] border border-[#262626] hover:border-[#383838] text-white text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer active:scale-95"
            >
              <svg className="size-4 text-[#c5ff4a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Configurar ARCA</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Tarjetas de Acceso Rápido del Día */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Card 1: Ventas del día */}
        <div className="p-4 rounded-[8px] bg-[#161616] border border-[#262626] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-sans font-medium text-[#737373] uppercase tracking-wider">
              Ventas Registradas Hoy
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-[#c5ff4a]/12 text-[#c5ff4a] font-bold">
              Mostrador
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-white mb-3">
            $ {(todaySalesCents / 100).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
          </div>
          <button
            type="button"
            onClick={handleCargarVentasHoy}
            className="w-full py-2 px-3 rounded-[6px] bg-[#222222] hover:bg-[#2c2c2c] text-white text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
          >
            <span>Copiar al monto a facturar</span>
            <svg className="size-3 text-[#c5ff4a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>

        {/* Card 2: Punto de Venta */}
        <div className="p-4 rounded-[8px] bg-[#161616] border border-[#262626] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-sans font-medium text-[#737373] uppercase tracking-wider">
              Punto de Venta Activo
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-white/10 text-white font-bold">
              Web Services
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-white mb-3">
            {String(status.ptoVta).padStart(5, "0")}
          </div>
          <p className="text-xs text-[#737373]">
            {status.cuit ? `CUIT Titular: ${status.cuit}` : "Sin CUIT registrado"}
          </p>
        </div>

        {/* Card 3: Ambiente */}
        <div className="p-4 rounded-[8px] bg-[#161616] border border-[#262626] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-sans font-medium text-[#737373] uppercase tracking-wider">
              Entorno Operativo
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-[4px] font-bold ${
              status.production ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40" : "bg-amber-950/60 text-amber-300 border border-amber-800/40"
            }`}>
              {status.production ? "Producción Real" : "Modo Pruebas"}
            </span>
          </div>
          <div className="text-base font-bold text-white mb-2">
            {status.production ? "Validez Fiscal Oficial" : "Ambiente Homologación"}
          </div>
          <p className="text-xs text-[#737373]">
            {status.hasCert ? "Certificado digital instalado" : "Falta subir certificado .crt"}
          </p>
        </div>
      </div>

      {/* 3. Panel de Emisión de Factura */}
      <div className="p-5 sm:p-6 rounded-[8px] bg-[#121212] border border-[#262626] space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
          <h2 className="text-base font-sans font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span className="size-2 rounded-full bg-[#c5ff4a]" />
            Emisión Directa de Comprobante
          </h2>
          <span className="text-xs text-[#737373]">1-Click · Sin datito por datito</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Monto */}
          <div>
            <label className="block text-[11px] font-sans font-medium text-[#737373] uppercase tracking-wider mb-1">
              Monto Total a Facturar ($)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-[#737373]">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2.5 rounded-[6px] bg-[#1a1a1a] border border-[#262626] focus:border-[#c5ff4a] text-white text-base font-bold font-mono outline-none transition"
              />
            </div>
          </div>

          {/* Concepto */}
          <div>
            <label className="block text-[11px] font-sans font-medium text-[#737373] uppercase tracking-wider mb-1">
              Concepto en Comprobante
            </label>
            <input
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Ventas varias de mercadería"
              className="w-full px-3 py-2.5 rounded-[6px] bg-[#1a1a1a] border border-[#262626] focus:border-[#c5ff4a] text-white text-xs font-semibold outline-none transition"
            />
          </div>

          {/* Tipo de Documento Receptor */}
          <div>
            <label className="block text-[11px] font-sans font-medium text-[#737373] uppercase tracking-wider mb-1">
              Destinatario Fiscal
            </label>
            <select
              value={docTipo}
              onChange={(e) => setDocTipo(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-[6px] bg-[#1a1a1a] border border-[#262626] focus:border-[#c5ff4a] text-white text-xs font-semibold outline-none transition cursor-pointer"
            >
              <option value="99">Consumidor Final (Sin identificar)</option>
              <option value="96">DNI</option>
              <option value="80">CUIT</option>
            </select>
          </div>

          {/* N° Documento */}
          <div>
            <label className="block text-[11px] font-sans font-medium text-[#737373] uppercase tracking-wider mb-1">
              N° Doc. Destinatario {docTipo === 99 ? "(Opcional)" : "(Requerido)"}
            </label>
            <input
              type="text"
              value={docNro}
              onChange={(e) => setDocNro(e.target.value)}
              placeholder={docTipo === 99 ? "0 para anónimo" : "Ej: 38123456"}
              className="w-full px-3 py-2.5 rounded-[6px] bg-[#1a1a1a] border border-[#262626] focus:border-[#c5ff4a] text-white text-xs font-mono outline-none transition"
            />
          </div>
        </div>

        {/* Resumen y Botón Emitir */}
        <div className="p-4 rounded-[6px] bg-[#181818] border border-[#262626] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-[#a3a3a3] space-y-0.5">
            <div>
              Tipo: <strong className="text-white">Factura C (Monotributo)</strong> · Punto de Venta:{" "}
              <strong className="text-white font-mono">{String(status.ptoVta).padStart(5, "0")}</strong>
            </div>
            <div>
              Receptor: <strong className="text-white">{docTipo === 99 ? "Consumidor Final" : `Doc ${docNro}`}</strong> · Entorno:{" "}
              <strong className={status.production ? "text-emerald-400" : "text-amber-400"}>
                {status.production ? "Producción Real" : "Homologación"}
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-[#737373] block">Total a emitir</span>
              <span className="text-2xl font-black font-mono text-[#c5ff4a]">
                $ {parseFloat(monto || "0").toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </span>
            </div>

            <button
              type="button"
              disabled={isEmitting}
              onClick={handleEmitInvoice}
              className="py-3 px-6 rounded-[6px] bg-[#c5ff4a] hover:bg-[#b4f035] text-black font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_12px_rgba(197,255,74,0.3)] disabled:opacity-50 cursor-pointer flex items-center gap-2 active:scale-95"
            >
              {isEmitting ? (
                <>
                  <svg className="size-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Solicitando CAE a ARCA...</span>
                </>
              ) : (
                <span>⚡ Emitir Factura en ARCA Ahora</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 4. Comprobante Emitido con Éxito (si existe) */}
      {lastInvoice && (
        <div className="p-5 sm:p-6 rounded-[8px] bg-emerald-950/40 border border-emerald-600/40 text-white space-y-4 animate-smooth-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-emerald-800/40">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-[6px] bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold block">
                  Comprobante Autorizado por ARCA
                </span>
                <h3 className="text-xl font-bold font-mono text-white">
                  {lastInvoice.tipoDesc} N° {lastInvoice.numeroCompleto}
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePrintReceipt}
              className="py-2.5 px-4 rounded-[6px] bg-white text-black font-semibold text-xs uppercase tracking-wider hover:bg-[#e5e5e5] transition-all cursor-pointer flex items-center gap-2 active:scale-95"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Imprimir Ticket / Factura</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-[6px] bg-black/40 text-xs">
            <div>
              <span className="text-emerald-400/80 block text-[10px] uppercase font-bold">CAE Oficial</span>
              <strong className="font-mono text-sm text-white">{lastInvoice.cae}</strong>
            </div>
            <div>
              <span className="text-emerald-400/80 block text-[10px] uppercase font-bold">Vto. CAE</span>
              <strong className="font-mono text-sm text-white">{lastInvoice.caeVto}</strong>
            </div>
            <div>
              <span className="text-emerald-400/80 block text-[10px] uppercase font-bold">Importe Total</span>
              <strong className="text-sm font-black font-mono text-[#c5ff4a]">
                $ {lastInvoice.importePesos.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </strong>
            </div>
            <div>
              <span className="text-emerald-400/80 block text-[10px] uppercase font-bold">Fecha de Emisión</span>
              <strong className="text-sm font-mono text-white">{lastInvoice.fecha}</strong>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-black/30 p-3.5 rounded-[6px]">
            {lastQrDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={lastQrDataUrl}
                alt="QR Oficial de ARCA"
                className="size-20 rounded-[4px] bg-white p-1 shrink-0"
              />
            )}
            <div className="text-xs text-emerald-200/90 leading-relaxed">
              <p className="font-semibold text-white mb-0.5">Código QR Oficial de ARCA (RG 4291/4892)</p>
              <p className="text-[11px] text-emerald-300/80">
                El código QR está generado y verificado legalmente ante los servidores de AFIP/ARCA. Los clientes o inspectores pueden escanearlo con cualquier cámara de celular para certificar la autenticidad del comprobante.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 5. Historial de Facturas Emitidas */}
      <div className="p-5 sm:p-6 rounded-[8px] bg-[#121212] border border-[#262626] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
          <h3 className="text-sm font-sans font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>Historial de Comprobantes Autorizados</span>
            <span className="text-xs font-mono font-normal text-[#737373]">({invoices.length})</span>
          </h3>
          <span className="text-[11px] text-[#737373]">Almacenados en PostgreSQL seguro</span>
        </div>

        {invoices.length === 0 ? (
          <div className="p-8 text-center rounded-[6px] bg-[#161616] border border-[#262626] text-xs text-[#737373]">
            Aún no se han emitido facturas en esta organización. Podés configurar tus credenciales arriba y emitir tu primera factura en 1 clic.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-[#262626] text-[10px] uppercase font-bold text-[#737373]">
                  <th className="py-2.5 px-3">Comprobante</th>
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3">Destinatario</th>
                  <th className="py-2.5 px-3">Concepto</th>
                  <th className="py-2.5 px-3 text-right">Importe</th>
                  <th className="py-2.5 px-3">CAE Oficial</th>
                  <th className="py-2.5 px-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#181818] transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-white whitespace-nowrap">
                      {inv.cbteTipo === 11 ? "FC" : "FB"}{" "}
                      {String(inv.ptoVta).padStart(4, "0")}-{String(inv.cbteNro).padStart(8, "0")}
                    </td>
                    <td className="py-3 px-3 text-[#a3a3a3] whitespace-nowrap">{inv.fecha}</td>
                    <td className="py-3 px-3 text-white whitespace-nowrap">
                      {inv.docTipo === 99 ? "Consumidor Final" : `Doc: ${inv.docNro}`}
                    </td>
                    <td className="py-3 px-3 text-[#a3a3a3] truncate max-w-[200px]">{inv.concepto}</td>
                    <td className="py-3 px-3 font-mono font-bold text-[#c5ff4a] text-right whitespace-nowrap">
                      $ {inv.importePesos.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-[#a3a3a3] whitespace-nowrap">
                      {inv.cae}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <a
                        href={inv.qrUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#c5ff4a] hover:underline cursor-pointer"
                        title="Verificar en AFIP / ARCA"
                      >
                        <span>Ver QR</span>
                        <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. TUTORIAL DESPLEGABLE ABAJO ("que no se vea de una") */}
      <div className="p-1 rounded-[8px] bg-[#121212] border border-[#262626]">
        <button
          type="button"
          onClick={() => setTutorialOpen(!tutorialOpen)}
          className="w-full flex items-center justify-between p-4 sm:p-5 rounded-[6px] hover:bg-[#181818] transition-colors cursor-pointer text-left group"
          aria-expanded={tutorialOpen}
        >
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-[6px] bg-[#1a1a1a] border border-[#262626] text-[#c5ff4a] flex items-center justify-center font-bold text-base shrink-0 group-hover:border-[#c5ff4a]/50 transition-colors">
              📘
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-sans font-bold text-white group-hover:text-[#c5ff4a] transition-colors">
                  Guía Oficial: Cómo vincular tu cuenta de ARCA (AFIP) paso a paso
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-[#c5ff4a]/12 text-[#c5ff4a] border border-[#c5ff4a]/30 font-semibold">
                  {tutorialOpen ? "Ocultar Guía ▲" : "Ver Tutorial Desplegable ▼"}
                </span>
              </div>
              <p className="text-xs text-[#737373] mt-0.5">
                Requisitos previos, generación de CSR, delegación de Web Services y alta de Punto de Venta para facturar legalmente.
              </p>
            </div>
          </div>
          <svg
            className={`size-5 text-[#a3a3a3] transition-transform duration-200 shrink-0 ml-2 ${
              tutorialOpen ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {tutorialOpen && (
          <div className="p-5 sm:p-6 border-t border-[#262626] space-y-6 text-xs text-[#d4d4d4] leading-relaxed animate-smooth-in">
            {/* Requisitos */}
            <div className="p-4 rounded-[6px] bg-[#161616] border border-[#262626] space-y-2">
              <h4 className="text-xs font-bold text-[#c5ff4a] uppercase tracking-wider flex items-center gap-2">
                <span>00.</span> Requisitos Previos Indispensables
              </h4>
              <ul className="list-disc pl-5 space-y-1 text-[#a3a3a3]">
                <li>CUIT activo e inscripto en AFIP / ARCA (Monotributo o Responsable Inscripto).</li>
                <li>Clave Fiscal Nivel de Seguridad 3 o superior.</li>
                <li>Actividad económica dada de alta en el sistema registral.</li>
              </ul>
            </div>

            {/* Paso 1 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="size-6 rounded-[4px] bg-[#c5ff4a] text-black font-mono font-bold flex items-center justify-center text-xs">
                  1
                </span>
                <h4 className="text-sm font-bold text-white">Generar el Pedido de Certificado (.CSR) y Clave Privada (.KEY)</h4>
              </div>
              <p className="text-[#a3a3a3] pl-8">
                El archivo <strong>.csr</strong> (Certificate Signing Request) es una solicitud firmada que le entrega tus datos públicos a ARCA para que ellos generen tu certificado digital.
              </p>
              <div className="pl-8 pt-1">
                <div className="p-3 rounded-[6px] bg-black/60 border border-[#262626] font-mono text-[11px] text-[#c5ff4a]">
                  💡 <strong>Forma Automática (Recomendada):</strong> Hacé clic en <strong>Configurar ARCA</strong> arriba y usá el botón <em>&quot;Descargar Pedido (.CSR) y Clave (.KEY)&quot;</em>. Se descarga al instante sin necesidad de instalar nada.
                </div>
              </div>
            </div>

            {/* Paso 2 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="size-6 rounded-[4px] bg-[#c5ff4a] text-black font-mono font-bold flex items-center justify-center text-xs">
                  2
                </span>
                <h4 className="text-sm font-bold text-white">Subir el archivo .CSR en la web de ARCA / AFIP</h4>
              </div>
              <ol className="list-decimal pl-13 space-y-1 text-[#a3a3a3]">
                <li>Ingresá a <a href="https://portal.afip.gob.ar" target="_blank" rel="noopener noreferrer" className="text-[#c5ff4a] underline">portal.afip.gob.ar</a> con tu CUIT y Clave Fiscal.</li>
                <li>Buscá e ingresá al servicio <strong>&quot;Administración de Certificados Digitales&quot;</strong>.</li>
                <li>Hacé clic en <strong>&quot;Agregar Alias&quot;</strong>. En el nombre de alias poné por ejemplo: <code className="text-white bg-[#222] px-1 rounded">VOUT_RETAIL</code>.</li>
                <li>En el campo <em>&quot;Upload Request&quot;</em> o <em>&quot;Examinar&quot;</em>, seleccioná el archivo <strong>.csr</strong> descargado en el Paso 1.</li>
                <li>Pulsá <strong>&quot;Guardar Alias&quot;</strong> y hacé clic en el botón <strong>&quot;Ver / Descargar Certificado&quot;</strong> para bajar el archivo <strong>.crt</strong> a tu computadora.</li>
              </ol>
            </div>

            {/* Paso 3 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="size-6 rounded-[4px] bg-[#c5ff4a] text-black font-mono font-bold flex items-center justify-center text-xs">
                  3
                </span>
                <h4 className="text-sm font-bold text-white">Delegar el Servicio de Facturación Electrónica (WSFE)</h4>
              </div>
              <ol className="list-decimal pl-13 space-y-1 text-[#a3a3a3]">
                <li>Volvé al menú principal de AFIP y entrá a <strong>&quot;Administrador de Relaciones de Clave Fiscal&quot;</strong>.</li>
                <li>Hacé clic en <strong>&quot;Nueva Relación&quot;</strong> y luego en el botón <strong>&quot;Buscar Servicio&quot;</strong>.</li>
                <li>Hacé clic en el logo de <strong>ARCA (AFIP)</strong> -&gt; <strong>Web Services</strong> -&gt; <strong>Facturación Electrónica (WSFE)</strong>.</li>
                <li>En el campo <em>&quot;Representante&quot;</em>, hacé clic en <strong>Buscar</strong> y seleccioná el Alias creado en el Paso 2 (<code className="text-white bg-[#222] px-1 rounded">VOUT_RETAIL</code>).</li>
                <li>Hacé clic en <strong>&quot;Confirmar&quot;</strong>. ¡Tu alias ya tiene permiso para emitir facturas!</li>
              </ol>
            </div>

            {/* Paso 4 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="size-6 rounded-[4px] bg-[#c5ff4a] text-black font-mono font-bold flex items-center justify-center text-xs">
                  4
                </span>
                <h4 className="text-sm font-bold text-white">Dar de alta el Punto de Venta para Web Services</h4>
              </div>
              <ol className="list-decimal pl-13 space-y-1 text-[#a3a3a3]">
                <li>En el portal de AFIP entrá a <strong>&quot;Administración de Puntos de Venta y Domicilios&quot;</strong>.</li>
                <li>Seleccioná tu empresa y hacé clic en la pestaña <strong>&quot;A/B/M Puntos de Venta&quot;</strong> y luego en <strong>&quot;Agregar&quot;</strong>.</li>
                <li>Ingresá el número de punto de venta nuevo (por ejemplo <code className="text-white bg-[#222] px-1 rounded">2</code> si el 1 lo usás para facturación manual).</li>
                <li>En <em>&quot;Nombre de Fantasía&quot;</em> escribí el nombre de tu local o comercio.</li>
                <li>En <em>&quot;Sistema&quot;</em> elegí obligatoriamente la opción: <strong>&quot;Facturación Electrónica - Monotributo Web Services&quot;</strong> (o &quot;Factura Electrónica - Web Services&quot; si sos Resp. Inscripto).</li>
                <li>Asociá el domicilio comercial de tu local y confirmá.</li>
              </ol>
            </div>

            {/* Paso 5 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="size-6 rounded-[4px] bg-[#c5ff4a] text-black font-mono font-bold flex items-center justify-center text-xs">
                  5
                </span>
                <h4 className="text-sm font-bold text-white">Cargar las Credenciales en Retail y comenzar a emitir</h4>
              </div>
              <p className="text-[#a3a3a3] pl-8">
                Abrí el panel <strong>&quot;Configurar ARCA&quot;</strong> arriba, ingresá tu CUIT, el número de Punto de Venta configurado en el Paso 4, y pegá el contenido de tu Certificado (archivo <code>.crt</code>) y Clave Privada (archivo <code>.key</code>). Guardá los cambios y ¡listo! Tu sistema ya está conectado en tiempo real con ARCA para emitir facturas con CAE y código QR legal en un clic.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 7. Modal Accesible de Configuración y Asistente CSR */}
      {mounted &&
        configModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity"
            role="dialog"
            aria-modal="true"
            aria-labelledby="arca-config-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) setConfigModalOpen(false);
            }}
          >
            <div
              className="w-full max-w-lg bg-[#121212] border border-[#262626] rounded-[8px] p-5 sm:p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto animate-smooth-in"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
                <div>
                  <h3 id="arca-config-title" className="text-sm font-sans font-bold text-white uppercase tracking-wider">
                    Configuración de Credenciales ARCA
                  </h3>
                  <p className="text-xs text-[#737373] mt-0.5">
                    Vinculá tu certificado digital X.509 y clave privada segura.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfigModalOpen(false)}
                  className="size-8 rounded-[6px] bg-[#1a1a1a] border border-[#262626] text-[#a3a3a3] hover:text-white flex items-center justify-center transition cursor-pointer"
                  aria-label="Cerrar modal"
                >
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Asistente 1-Clic: Generar CSR y Key */}
              <div className="p-4 rounded-[6px] bg-[#181818] border border-[#262626] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-[#c5ff4a] flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-[#c5ff4a]" />
                    Paso Previo: Generador de Pedido (.CSR) y Clave
                  </span>
                  <span className="text-[10px] font-mono text-[#737373]">RSA 2048</span>
                </div>
                <p className="text-xs text-[#a3a3a3]">
                  Ingresá tu CUIT y descargá al instante el archivo <strong>.csr</strong> para subirlo a la web de ARCA sin instalar OpenSSL:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={csrCuit}
                    onChange={(e) => setCsrCuit(e.target.value)}
                    placeholder="CUIT del titular (11 dígitos)"
                    className="flex-1 px-3 py-2 rounded-[6px] bg-[#101010] border border-[#262626] text-xs font-mono text-white focus:border-[#c5ff4a] outline-none"
                  />
                  <button
                    type="button"
                    disabled={isGeneratingCsr}
                    onClick={handleGenerateCsr}
                    className="py-2 px-3 rounded-[6px] bg-[#222222] hover:bg-[#2c2c2c] border border-[#333333] hover:border-[#c5ff4a] text-white text-xs font-semibold whitespace-nowrap transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 active:scale-95"
                  >
                    {isGeneratingCsr ? "Generando..." : "Descargar .CSR y .KEY"}
                  </button>
                </div>
              </div>

              {/* Formulario de Guardado de Credenciales */}
              <form onSubmit={handleSaveConfig} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-sans font-medium text-[#737373] uppercase tracking-wider mb-1">
                      CUIT Titular
                    </label>
                    <input
                      name="cuit"
                      type="text"
                      defaultValue={status.cuit || ""}
                      placeholder="20123456789"
                      required
                      className="w-full px-3 py-2 rounded-[6px] bg-[#1a1a1a] border border-[#262626] text-xs font-mono text-white focus:border-[#c5ff4a] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-sans font-medium text-[#737373] uppercase tracking-wider mb-1">
                      Punto de Venta Web Service
                    </label>
                    <input
                      name="ptoVta"
                      type="number"
                      min="1"
                      max="9999"
                      defaultValue={status.ptoVta || 1}
                      required
                      className="w-full px-3 py-2 rounded-[6px] bg-[#1a1a1a] border border-[#262626] text-xs font-mono text-white focus:border-[#c5ff4a] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-sans font-medium text-[#737373] uppercase tracking-wider">
                      Certificado Digital (.CRT de AFIP)
                    </label>
                    {status.hasCert && (
                      <span className="text-[10px] text-emerald-400 font-mono">✓ Certificado ya cargado</span>
                    )}
                  </div>
                  <textarea
                    name="certPem"
                    rows={3}
                    placeholder="Pegá el contenido de tu archivo .crt (-----BEGIN CERTIFICATE----- ...)"
                    className="w-full px-3 py-2 rounded-[6px] bg-[#1a1a1a] border border-[#262626] text-[11px] font-mono text-white focus:border-[#c5ff4a] outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-sans font-medium text-[#737373] uppercase tracking-wider">
                      Clave Privada (.KEY)
                    </label>
                    {status.hasKey && (
                      <span className="text-[10px] text-emerald-400 font-mono">✓ Clave ya cargada</span>
                    )}
                  </div>
                  <textarea
                    name="keyPem"
                    rows={3}
                    placeholder="Pegá el contenido de tu archivo .key (-----BEGIN RSA PRIVATE KEY----- ...)"
                    className="w-full px-3 py-2 rounded-[6px] bg-[#1a1a1a] border border-[#262626] text-[11px] font-mono text-white focus:border-[#c5ff4a] outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="production"
                    name="production"
                    defaultChecked={status.production}
                    className="size-4 rounded-[4px] accent-[#c5ff4a] cursor-pointer"
                  />
                  <label htmlFor="production" className="text-xs text-white cursor-pointer select-none">
                    Ambiente Real de Producción (Desmarcar para Homologación / Modo Pruebas)
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#262626]">
                  <button
                    type="button"
                    onClick={() => setConfigModalOpen(false)}
                    className="py-2 px-4 rounded-[6px] bg-[#1a1a1a] hover:bg-[#222222] border border-[#262626] text-xs font-semibold text-[#a3a3a3] hover:text-white transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingConfig}
                    className="py-2 px-5 rounded-[6px] bg-[#c5ff4a] hover:bg-[#b4f035] text-black font-bold text-xs uppercase tracking-wider transition cursor-pointer disabled:opacity-50 active:scale-95 shadow-xs"
                  >
                    {isSavingConfig ? "Guardando..." : "Guardar Credenciales"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
