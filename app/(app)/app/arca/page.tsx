import type { Metadata } from "next";
import { requireSession, canManage } from "@/lib/auth/session";
import { getArcaStatus, getInvoicesHistory } from "@/lib/arca";
import { db } from "@/lib/db";
import { ArcaView } from "./ArcaView";

export const metadata: Metadata = {
  title: "Facturación Electrónica ARCA",
};

export default async function ArcaPage() {
  const { organization, role } = await requireSession();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [status, invoices, todaySalesAgg] = await Promise.all([
    getArcaStatus(organization.id),
    getInvoicesHistory(organization.id),
    db.sale.aggregate({
      where: {
        organizationId: organization.id,
        createdAt: { gte: startOfToday },
        status: "COMPLETED",
      },
      _sum: { totalCents: true },
    }),
  ]);

  const todaySalesCents = Number(todaySalesAgg._sum.totalCents ?? BigInt(0));

  const serializedInvoices = invoices.map((inv) => ({
    id: inv.id,
    cuit: inv.cuit,
    ptoVta: inv.ptoVta,
    cbteTipo: inv.cbteTipo,
    cbteNro: inv.cbteNro,
    cae: inv.cae,
    caeVto: inv.caeVto,
    fecha: inv.fecha,
    importePesos: Number(inv.importeCents) / 100,
    concepto: inv.concepto,
    metodoOrigen: inv.metodoOrigen,
    docTipo: inv.docTipo,
    docNro: inv.docNro,
    qrUrl: inv.qrUrl,
    createdAt: inv.createdAt,
  }));

  return (
    <ArcaView
      organization={{ id: organization.id, name: organization.name }}
      initialStatus={status}
      initialInvoices={serializedInvoices}
      todaySalesCents={todaySalesCents}
      canEdit={canManage(role)}
    />
  );
}
