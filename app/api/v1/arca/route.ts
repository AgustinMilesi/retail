import { NextResponse } from "next/server";
import { authenticateApiKey, apiError } from "@/lib/auth/api-auth";
import { getSession } from "@/lib/auth/session";
import { getArcaStatus, saveArcaConfig, generateCsrTool, emitArcaInvoice, getInvoicesHistory } from "@/lib/arca";

async function resolveOrganizationId(req: Request): Promise<string | null> {
  // 1. Try API Key / Bearer auth
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const apiAuth = await authenticateApiKey(req);
    if (!(apiAuth instanceof Response)) {
      return apiAuth.organizationId;
    }
  }

  // 2. Try Web Session
  const session = await getSession();
  if (session?.organization) {
    return session.organization.id;
  }

  return null;
}

export async function GET(req: Request) {
  const orgId = await resolveOrganizationId(req);
  if (!orgId) {
    return apiError(401, "unauthorized", "Autenticación requerida (API key o sesión activa).");
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "status";

  try {
    if (action === "list_invoices") {
      const invoices = await getInvoicesHistory(orgId);
      return NextResponse.json({
        success: true,
        invoices: invoices.map((inv) => ({
          ...inv,
          importePesos: Number(inv.importeCents) / 100,
          importeCents: inv.importeCents.toString(),
        })),
      });
    }

    const status = await getArcaStatus(orgId);
    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al consultar ARCA";
    return apiError(500, "arca_error", msg);
  }
}

export async function POST(req: Request) {
  const orgId = await resolveOrganizationId(req);
  if (!orgId) {
    return apiError(401, "unauthorized", "Autenticación requerida (API key o sesión activa).");
  }

  try {
    const body = await req.json();
    const action = body.action || "emit_invoice";

    if (action === "generate_csr") {
      const cuit = String(body.cuit || "").replace(/\D/g, "");
      const name = String(body.name || "Comercio").trim();
      const res = await generateCsrTool(orgId, cuit, name);
      return NextResponse.json({
        success: true,
        ...res,
      });
    }

    if (action === "save_config") {
      await saveArcaConfig(orgId, {
        cuit: body.cuit,
        ptoVta: body.ptoVta ? Number(body.ptoVta) : undefined,
        production: typeof body.production === "boolean" ? body.production : undefined,
        certPem: body.certPem,
        keyPem: body.keyPem,
      });
      return NextResponse.json({
        success: true,
        message: "Credenciales de ARCA guardadas correctamente.",
      });
    }

    if (action === "emit_invoice") {
      const rawImporte = parseFloat(body.importe || body.importePesos || "0");
      if (isNaN(rawImporte) || rawImporte <= 0) {
        return apiError(400, "invalid_amount", "El monto a facturar debe ser mayor a 0.");
      }

      const invoice = await emitArcaInvoice(orgId, {
        importeCents: Math.round(rawImporte * 100),
        ptoVta: body.ptoVta ? Number(body.ptoVta) : undefined,
        cbteTipo: body.cbteTipo ? Number(body.cbteTipo) : 11,
        docTipo: body.docTipo ? Number(body.docTipo) : 99,
        docNro: body.docNro ? String(body.docNro) : "0",
        concepto: body.concepto || "Ventas varias de mercadería",
        metodoOrigen: body.metodoOrigen || "API",
      });

      return NextResponse.json({
        success: true,
        message: "Factura emitida y autorizada por ARCA.",
        invoice: {
          ...invoice,
          importeCents: invoice.importeCents.toString(),
        },
      });
    }

    return apiError(400, "invalid_action", `Acción desconocida: ${action}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al procesar solicitud de ARCA";
    return apiError(500, "arca_error", msg);
  }
}
