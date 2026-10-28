"use server";

import { revalidatePath } from "next/cache";
import { requireSession, canManage } from "@/lib/auth/session";
import { fail, ok, type ActionResult } from "@/lib/action";
import {
  saveArcaConfig,
  generateCsrTool,
  emitArcaInvoice,
} from "@/lib/arca";

export async function saveArcaCredentials(formData: FormData): Promise<ActionResult> {
  const { organization, role } = await requireSession();
  if (!canManage(role)) return fail("Solo administradores pueden configurar credenciales de ARCA.");

  const cuit = String(formData.get("cuit") || "").trim();
  const ptoVta = parseInt(String(formData.get("ptoVta") || "1"), 10);
  const production = formData.get("production") === "on" || formData.get("production") === "true";
  const certPem = String(formData.get("certPem") || "").trim();
  const keyPem = String(formData.get("keyPem") || "").trim();

  if (cuit && cuit.replace(/\D/g, "").length !== 11) {
    return fail("El CUIT debe tener exactamente 11 dígitos numéricos.");
  }

  try {
    await saveArcaConfig(organization.id, {
      cuit,
      ptoVta: isNaN(ptoVta) ? 1 : ptoVta,
      production,
      certPem,
      keyPem,
    });

    revalidatePath("/app/arca");
    return ok("Credenciales de ARCA guardadas exitosamente en la base de datos segura.");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al guardar configuración de ARCA";
    return fail(msg);
  }
}

export async function generateCsrAndKey(cuit: string) {
  const { organization, role } = await requireSession();
  if (!canManage(role)) {
    return { ok: false, error: "Solo administradores pueden generar claves y certificados." };
  }

  try {
    const res = await generateCsrTool(organization.id, cuit, organization.name);
    revalidatePath("/app/arca");
    return {
      ok: true,
      cuit: res.cuit,
      name: res.name,
      pemCsr: res.pemCsr,
      pemKey: res.pemKey,
      filenameCsr: res.filenameCsr,
      filenameKey: res.filenameKey,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al generar pedido de certificado";
    return { ok: false, error: msg };
  }
}

export async function emitInvoice(data: {
  importePesos: number;
  ptoVta?: number;
  cbteTipo?: number;
  docTipo?: number;
  docNro?: string;
  concepto?: string;
  metodoOrigen?: string;
}) {
  const { organization } = await requireSession();

  if (!data.importePesos || data.importePesos <= 0) {
    return { ok: false, error: "El monto a facturar debe ser mayor a $0." };
  }

  const importeCents = Math.round(data.importePesos * 100);

  try {
    const invoice = await emitArcaInvoice(organization.id, {
      importeCents,
      ptoVta: data.ptoVta,
      cbteTipo: data.cbteTipo,
      docTipo: data.docTipo,
      docNro: data.docNro,
      concepto: data.concepto,
      metodoOrigen: data.metodoOrigen,
    });

    revalidatePath("/app/arca");
    return {
      ok: true,
      invoice,
    };
  } catch (err: unknown) {
    console.error("[ARCA Action] Error al emitir:", err);
    const msg = err instanceof Error ? err.message : "Error de comunicación con ARCA (AFIP)";
    return { ok: false, error: msg };
  }
}
