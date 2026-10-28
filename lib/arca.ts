import { db } from "@/lib/db";
import forge from "node-forge";

export interface ArcaStatus {
  configured: boolean;
  cuit: string | null;
  ptoVta: number;
  production: boolean;
  hasCert: boolean;
  hasKey: boolean;
  updatedAt: Date | null;
}

export interface EmitInvoiceInput {
  importeCents: bigint | number;
  ptoVta?: number;
  cbteTipo?: number; // 11 = Factura C, 6 = Factura B, 1 = Factura A
  docTipo?: number;  // 99 = Consumidor Final, 96 = DNI, 80 = CUIT
  docNro?: string;
  concepto?: string;
  metodoOrigen?: string;
}

/**
 * Obtiene el estado de configuración de ARCA para la organización.
 * No expone la clave privada al frontend.
 */
export async function getArcaStatus(organizationId: string): Promise<ArcaStatus> {
  const config = await db.arcaConfig.findUnique({
    where: { organizationId },
  });

  const envCuit = process.env.ARCA_CUIT || null;
  const envPtoVta = process.env.ARCA_PTO_VTA ? parseInt(process.env.ARCA_PTO_VTA, 10) : 1;
  const envCert = process.env.ARCA_CERT || null;
  const envKey = process.env.ARCA_KEY || null;

  const cuit = config?.cuit || envCuit;
  const ptoVta = config?.ptoVta ?? envPtoVta;
  const production = config?.production ?? (process.env.ARCA_PRODUCTION === "true");
  const hasCert = Boolean((config?.certPem && config.certPem.trim().length > 0) || envCert);
  const hasKey = Boolean((config?.keyPem && config.keyPem.trim().length > 0) || envKey);

  const configured = Boolean(cuit && cuit.length === 11 && hasCert && hasKey);

  return {
    configured,
    cuit,
    ptoVta,
    production,
    hasCert,
    hasKey,
    updatedAt: config?.updatedAt || null,
  };
}

/**
 * Guarda o actualiza las credenciales de ARCA para la organización.
 */
export async function saveArcaConfig(
  organizationId: string,
  data: {
    cuit?: string;
    ptoVta?: number;
    production?: boolean;
    certPem?: string;
    keyPem?: string;
  }
) {
  const existing = await db.arcaConfig.findUnique({
    where: { organizationId },
  });

  const cleanCuit = data.cuit ? data.cuit.replace(/\D/g, "") : existing?.cuit || null;
  const ptoVta = typeof data.ptoVta === "number" ? Math.max(1, data.ptoVta) : existing?.ptoVta ?? 1;
  const production = typeof data.production === "boolean" ? data.production : existing?.production ?? false;

  const certPem = data.certPem?.trim() ? data.certPem.trim() : existing?.certPem || null;
  const keyPem = data.keyPem?.trim() ? data.keyPem.trim() : existing?.keyPem || null;

  return db.arcaConfig.upsert({
    where: { organizationId },
    create: {
      organizationId,
      cuit: cleanCuit,
      ptoVta,
      production,
      certPem,
      keyPem,
    },
    update: {
      cuit: cleanCuit,
      ptoVta,
      production,
      ...(certPem ? { certPem } : {}),
      ...(keyPem ? { keyPem } : {}),
    },
  });
}

/**
 * Generador de Pedido de Certificado (.CSR) y Clave Privada (.KEY) RSA 2048 bits.
 * Permite a cualquier usuario obtener sus archivos listos para subir a la web de ARCA
 * sin necesidad de instalar OpenSSL en su computadora.
 */
export async function generateCsrTool(
  organizationId: string,
  cuit: string,
  organizationName: string
) {
  const cleanCuit = cuit.replace(/\D/g, "");
  if (cleanCuit.length !== 11) {
    throw new Error("El CUIT debe tener exactamente 11 dígitos numéricos.");
  }

  const cleanName = (organizationName || "Comercio").trim();

  // Generar par de claves RSA 2048 bits en Node.js puro
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const csr = forge.pki.createCertificationRequest();
  csr.publicKey = keys.publicKey;
  csr.setSubject([
    { name: "countryName", value: "AR" },
    { name: "organizationName", value: cleanName },
    { name: "commonName", value: cleanName },
    { name: "serialNumber", value: `CUIT ${cleanCuit}` },
  ]);

  csr.sign(keys.privateKey, forge.md.sha256.create());

  const pemKey = forge.pki.privateKeyToPem(keys.privateKey);
  const pemCsr = forge.pki.certificationRequestToPem(csr);

  // Auto-guardamos la clave privada generada para simplificarle la vida al usuario
  await db.arcaConfig.upsert({
    where: { organizationId },
    create: {
      organizationId,
      cuit: cleanCuit,
      keyPem: pemKey,
    },
    update: {
      cuit: cleanCuit,
      keyPem: pemKey,
    },
  });

  return {
    cuit: cleanCuit,
    name: cleanName,
    pemCsr,
    pemKey,
    filenameCsr: `pedido_afip_${cleanCuit}.csr`,
    filenameKey: `privada_afip_${cleanCuit}.key`,
  };
}

/**
 * Emite una Factura Electrónica real en ARCA (AFIP WSFE v1).
 */
export async function emitArcaInvoice(organizationId: string, input: EmitInvoiceInput) {
  const config = await db.arcaConfig.findUnique({
    where: { organizationId },
  });

  const cuit = config?.cuit || process.env.ARCA_CUIT;
  const ptoVta = input.ptoVta || config?.ptoVta || (process.env.ARCA_PTO_VTA ? parseInt(process.env.ARCA_PTO_VTA, 10) : 1);
  const certPem = config?.certPem || process.env.ARCA_CERT;
  const keyPem = config?.keyPem || process.env.ARCA_KEY;
  const production = config?.production ?? (process.env.ARCA_PRODUCTION === "true");

  if (!cuit || !certPem || !keyPem) {
    throw new Error(
      "Faltan configurar las credenciales de ARCA (CUIT, Certificado digital o Clave privada). Por favor completá la configuración en la pestaña Credenciales."
    );
  }

  // Import dinámico de afip.js para entornos serverless
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Afip = require("@afipsdk/afip.js");
  const afip = new Afip({
    CUIT: Number(cuit),
    cert: certPem,
    key: keyPem,
    production,
  });

  const rawCents = typeof input.importeCents === "bigint" ? Number(input.importeCents) : input.importeCents;
  const importePesos = Math.round((rawCents / 100) * 100) / 100;

  if (importePesos <= 0) {
    throw new Error("El monto a facturar debe ser mayor a $0.");
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const todayFormatted = parseInt(todayStr.replace(/-/g, ""), 10);
  const docTipo = input.docTipo ?? 99; // 99 = Consumidor Final
  const docNro = input.docNro ? parseInt(input.docNro.replace(/\D/g, "") || "0", 10) : 0;
  const cbteTipo = input.cbteTipo ?? 11; // 11 = Factura C
  const concepto = input.concepto || "Ventas varias de mercadería";
  const metodoOrigen = input.metodoOrigen || "Mostrador";

  const voucherData = {
    CantReg: 1,
    PtoVta: ptoVta,
    CbteTipo: cbteTipo,
    Concepto: 1, // 1 = Productos, 2 = Servicios, 3 = Productos y Servicios
    DocTipo: docTipo,
    DocNro: docNro,
    CbteFch: todayFormatted,
    ImpTotal: importePesos,
    ImpTotConc: 0,
    ImpNeto: importePesos,
    ImpOpEx: 0,
    ImpIVA: 0,
    ImpTrib: 0,
  };

  const resAfip = await afip.ElectronicBilling.createNextVoucher(voucherData);

  const cae = String(resAfip.CAE);
  const caeVto = String(resAfip.CAEFchVto || "");
  const cbteNro = Number(resAfip.voucher_number || resAfip.CbteHasta || 0);

  // Armar QR Oficial normado por ARCA (RG 4291/4892)
  const qrPayload = {
    ver: 1,
    fecha: todayStr,
    cuit: Number(cuit),
    ptoVta: Number(ptoVta),
    tipoCmp: cbteTipo,
    nroCmp: cbteNro,
    importe: importePesos,
    moneda: "PES",
    ctz: 1,
    tipoDocRec: docTipo,
    nroDocRec: docNro,
    tipoCodAut: "E",
    codAut: Number(cae),
  };

  const qrBase64 = Buffer.from(JSON.stringify(qrPayload)).toString("base64");
  const qrUrl = `https://www.afip.gob.ar/fe/qr/?p=${qrBase64}`;

  // Guardar en base de datos
  const saved = await db.invoice.create({
    data: {
      organizationId,
      cuit: String(cuit),
      ptoVta,
      cbteTipo,
      cbteNro,
      cae,
      caeVto,
      fecha: todayStr,
      importeCents: BigInt(rawCents),
      concepto,
      metodoOrigen,
      docTipo,
      docNro: String(docNro),
      qrUrl,
      rawResponse: JSON.stringify(resAfip),
    },
  });

  return {
    id: saved.id,
    cuit,
    ptoVta,
    cbteTipo,
    tipoDesc: cbteTipo === 11 ? "Factura C" : cbteTipo === 6 ? "Factura B" : "Factura A",
    cbteNro,
    numeroCompleto: `${String(ptoVta).padStart(5, "0")}-${String(cbteNro).padStart(8, "0")}`,
    cae,
    caeVto,
    fecha: todayStr,
    importePesos,
    importeCents: rawCents,
    concepto,
    metodoOrigen,
    docTipo,
    docNro: String(docNro),
    qrUrl,
    createdAt: saved.createdAt,
  };
}

/**
 * Consulta el historial de facturas emitidas por la organización.
 */
export async function getInvoicesHistory(organizationId: string) {
  return db.invoice.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
