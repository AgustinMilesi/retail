import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth/session";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get("to") === "pos" ? "/app/pos" : "/app";

  // Find or create demo user
  let user = await db.user.findFirst({
    where: {
      email: "demo@milesi-erp.com",
    },
    include: {
      memberships: {
        include: { organization: true },
      },
    },
  });

  if (!user) {
    const { hashPassword } = await import("@/lib/auth/password");
    const { slugify } = await import("@/lib/ids");
    const passwordHash = await hashPassword("GuestDemo2026!");
    user = await db.user.create({
      data: {
        name: "Agustín Milesi",
        email: "demo@milesi-erp.com",
        passwordHash,
        memberships: {
          create: {
            role: "OWNER",
            organization: {
              create: {
                name: "Retail Demo Express",
                slug: slugify("Retail Demo Express"),
                notifyEmail: "demo@milesi-erp.com",
                currency: "ARS",
                showDecimals: false,
                timezone: "America/Argentina/Buenos_Aires",
                enabledModules: [
                  "overview",
                  "pos",
                  "sales",
                  "products",
                  "debtors",
                  "expenses",
                  "cash",
                  "settings",
                ],
              },
            },
          },
        },
      },
      include: {
        memberships: {
          include: { organization: true },
        },
      },
    });
  }

  const membership = user.memberships[0];
  const org = membership?.organization;

  if (org) {
    if (user.name !== "Agustín Milesi") {
      await db.user.update({
        where: { id: user.id },
        data: { name: "Agustín Milesi" },
      });
    }

    // 1. Seed Categories & Products if < 8 products
    const productCount = await db.product.count({
      where: { organizationId: org.id },
    });

    if (productCount < 8) {
      const catBebidas = await db.category.upsert({
        where: { organizationId_name: { organizationId: org.id, name: "Bebidas" } },
        update: {},
        create: { organizationId: org.id, name: "Bebidas" },
      });
      const catAlmacen = await db.category.upsert({
        where: { organizationId_name: { organizationId: org.id, name: "Almacén" } },
        update: {},
        create: { organizationId: org.id, name: "Almacén" },
      });
      const catSnacks = await db.category.upsert({
        where: { organizationId_name: { organizationId: org.id, name: "Golosinas & Snacks" } },
        update: {},
        create: { organizationId: org.id, name: "Golosinas & Snacks" },
      });
      const catLacteos = await db.category.upsert({
        where: { organizationId_name: { organizationId: org.id, name: "Lácteos" } },
        update: {},
        create: { organizationId: org.id, name: "Lácteos" },
      });

      const sampleProducts = [
        {
          sku: "BEB-COCA-225",
          barcode: "7790895000997",
          name: "Coca-Cola Original 2.25L",
          priceCents: BigInt(280000), // $2.800
          costCents: BigInt(180000),
          stock: 48,
          minStock: 12,
          categoryId: catBebidas.id,
        },
        {
          sku: "ALM-PLAYA-1K",
          barcode: "7798001640030",
          name: "Yerba Mate Playadito 1kg",
          priceCents: BigInt(390000), // $3.900
          costCents: BigInt(260000),
          stock: 35,
          minStock: 8,
          categoryId: catAlmacen.id,
        },
        {
          sku: "SNK-CHOCO-250",
          barcode: "7790040110309",
          name: "Galletitas Chocolinas 250g",
          priceCents: BigInt(150000), // $1.500
          costCents: BigInt(95000),
          stock: 60,
          minStock: 15,
          categoryId: catSnacks.id,
        },
        {
          sku: "SNK-HAVAN-70",
          barcode: "7791234567890",
          name: "Alfajor Havanna 70% Cacao Puro",
          priceCents: BigInt(210000), // $2.100
          costCents: BigInt(120000),
          stock: 40,
          minStock: 10,
          categoryId: catSnacks.id,
        },
        {
          sku: "LAC-SEREN-1L",
          barcode: "7790742111001",
          name: "Leche Entera La Serenísima 1L",
          priceCents: BigInt(130000), // $1.300
          costCents: BigInt(85000),
          stock: 50,
          minStock: 12,
          categoryId: catLacteos.id,
        },
        {
          sku: "ALM-VIRGIN-500",
          barcode: "7790060001018",
          name: "Café Tostado Molido La Virginia 500g",
          priceCents: BigInt(480000), // $4.800
          costCents: BigInt(310000),
          stock: 25,
          minStock: 6,
          categoryId: catAlmacen.id,
        },
        {
          sku: "ALM-COCIN-15",
          barcode: "7790070211100",
          name: "Aceite de Girasol Cocinero 1.5L",
          priceCents: BigInt(240000), // $2.400
          costCents: BigInt(160000),
          stock: 30,
          minStock: 8,
          categoryId: catAlmacen.id,
        },
        {
          sku: "BEB-QUILM-1L",
          barcode: "7792798000011",
          name: "Cerveza Quilmes Clásica Retornable 1L",
          priceCents: BigInt(220000), // $2.200
          costCents: BigInt(140000),
          stock: 45,
          minStock: 12,
          categoryId: catBebidas.id,
        },
        {
          sku: "ALM-LUCCH-500",
          barcode: "7790040120100",
          name: "Fideos Tirabuzón Lucchetti 500g",
          priceCents: BigInt(110000), // $1.100
          costCents: BigInt(70000),
          stock: 70,
          minStock: 15,
          categoryId: catAlmacen.id,
        },
        {
          sku: "ALM-DOSHER-1K",
          barcode: "7790100100200",
          name: "Arroz Dos Hermanos Largo Fino 1kg",
          priceCents: BigInt(175000), // $1.750
          costCents: BigInt(110000),
          stock: 40,
          minStock: 10,
          categoryId: catAlmacen.id,
        },
        {
          sku: "BEB-VILLASUR-2L",
          barcode: "7790001002100",
          name: "Agua Mineral sin gas Villa del Sur 2L",
          priceCents: BigInt(110000), // $1.100
          costCents: BigInt(65000),
          stock: 55,
          minStock: 12,
          categoryId: catBebidas.id,
        },
        {
          sku: "SNK-MILKA-100",
          barcode: "7622210444555",
          name: "Chocolate Milka con Leche Suizo 100g",
          priceCents: BigInt(230000), // $2.300
          costCents: BigInt(140000),
          stock: 35,
          minStock: 8,
          categoryId: catSnacks.id,
        },
      ];

      for (const p of sampleProducts) {
        await db.product.upsert({
          where: { organizationId_sku: { organizationId: org.id, sku: p.sku } },
          update: {},
          create: {
            organizationId: org.id,
            sku: p.sku,
            barcode: p.barcode,
            name: p.name,
            priceCents: p.priceCents,
            costCents: p.costCents,
            stock: p.stock,
            minStock: p.minStock,
            trackStock: true,
            active: true,
            categoryId: p.categoryId,
          },
        });
      }
    }

    // 2. Ensure an OPEN cash session exists so POS is immediately active
    let cashSession = await db.cashSession.findFirst({
      where: { organizationId: org.id, status: "OPEN" },
    });

    if (!cashSession) {
      cashSession = await db.cashSession.create({
        data: {
          organizationId: org.id,
          openedById: user.id,
          status: "OPEN",
          openingCents: BigInt(5000000), // $50.000 ARS
          note: "Apertura Turno Mañana",
        },
      });
    }

    // 3. Ensure Debtor accounts exist
    const debtorCount = await db.debtor.count({
      where: { organizationId: org.id },
    });

    if (debtorCount === 0) {
      await db.debtor.create({
        data: {
          organizationId: org.id,
          name: "Carlos Gómez (Taller Mecánico)",
          phone: "+54 11 4982-3311",
          notes: "Cuenta corriente habilitada. Liquida quincenalmente.",
          items: {
            create: [
              {
                productName: "Coca-Cola Original 2.25L x2",
                quantity: 2,
                unitPriceCents: BigInt(280000),
                totalCents: BigInt(560000),
              },
              {
                productName: "Galletitas Chocolinas 250g x3",
                quantity: 3,
                unitPriceCents: BigInt(150000),
                totalCents: BigInt(450000),
              },
            ],
          },
        },
      });

      await db.debtor.create({
        data: {
          organizationId: org.id,
          name: "Mariana Rossi (Vecina Depto 4B)",
          phone: "+54 11 6214-8800",
          notes: "Fiado semanal de despensa familiar.",
          items: {
            create: [
              {
                productName: "Yerba Mate Playadito 1kg",
                quantity: 1,
                unitPriceCents: BigInt(390000),
                totalCents: BigInt(390000),
              },
              {
                productName: "Leche Entera La Serenísima 1L x2",
                quantity: 2,
                unitPriceCents: BigInt(130000),
                totalCents: BigInt(260000),
              },
            ],
          },
        },
      });
    }

    // 4. Ensure Expenses exist
    const expenseCount = await db.expense.count({
      where: { organizationId: org.id },
    });

    if (expenseCount === 0) {
      await db.expense.createMany({
        data: [
          {
            organizationId: org.id,
            description: "Reposición de Hielo en Rolito y Gaseosas",
            amountCents: BigInt(1850000), // $18.500
            category: "Mercadería",
            date: new Date(Date.now() - 86400000),
          },
          {
            organizationId: org.id,
            description: "Rollos térmicos 80mm y bolsas camiseta biodegradables",
            amountCents: BigInt(620000), // $6.200
            category: "Insumos",
            date: new Date(Date.now() - 2 * 86400000),
          },
        ],
      });
    }

    // 5. Ensure past sales exist so dashboard charts and metrics are populated
    const salesCount = await db.sale.count({
      where: { organizationId: org.id },
    });

    if (salesCount === 0 && cashSession) {
      const { randomBytes } = await import("node:crypto");
      await db.sale.create({
        data: {
          organizationId: org.id,
          sessionId: cashSession.id,
          cashierId: user.id,
          number: 1,
          status: "COMPLETED",
          subtotalCents: BigInt(430000),
          totalCents: BigInt(430000),
          taxCents: BigInt(74628),
          idempotencyKey: randomBytes(16).toString("hex"),
          items: {
            create: [
              {
                sku: "BEB-COCA-225",
                name: "Coca-Cola Original 2.25L",
                quantity: 1,
                unitPriceCents: BigInt(280000),
                taxRateBp: 2100,
                totalCents: BigInt(280000),
              },
              {
                sku: "SNK-CHOCO-250",
                name: "Galletitas Chocolinas 250g",
                quantity: 1,
                unitPriceCents: BigInt(150000),
                taxRateBp: 2100,
                totalCents: BigInt(150000),
              },
            ],
          },
          payments: {
            create: [
              {
                method: "CASH",
                amountCents: BigInt(430000),
              },
            ],
          },
        },
      });

      await db.sale.create({
        data: {
          organizationId: org.id,
          sessionId: cashSession.id,
          cashierId: user.id,
          number: 2,
          status: "COMPLETED",
          subtotalCents: BigInt(600000),
          totalCents: BigInt(600000),
          taxCents: BigInt(104132),
          idempotencyKey: randomBytes(16).toString("hex"),
          items: {
            create: [
              {
                sku: "ALM-PLAYA-1K",
                name: "Yerba Mate Playadito 1kg",
                quantity: 1,
                unitPriceCents: BigInt(390000),
                taxRateBp: 2100,
                totalCents: BigInt(390000),
              },
              {
                sku: "SNK-HAVAN-70",
                name: "Alfajor Havanna 70% Cacao Puro",
                quantity: 1,
                unitPriceCents: BigInt(210000),
                taxRateBp: 2100,
                totalCents: BigInt(210000),
              },
            ],
          },
          payments: {
            create: [
              {
                method: "CARD",
                amountCents: BigInt(600000),
              },
            ],
          },
        },
      });
    }
  }

  await createSession(user.id);

  const url = new URL(target, request.url);
  return NextResponse.redirect(url);
}
