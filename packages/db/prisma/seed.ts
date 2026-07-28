import { PrismaClient, Role, ProductStatus } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── Demo tenant ──────────────────────────────────────────────────────────────

  const tenant = await prisma.tenant.upsert({
    where: { slug: "tienda-demo" },
    update: {},
    create: {
      name: "Tienda Demo",
      slug: "tienda-demo",
      email: "tienda@demo.com",
      status: "active",
      isActive: true,
    },
  });

  console.log(`  ✓ Tenant created: ${tenant.name} (${tenant.slug})`);

  // ── Tenant theme ────────────────────────────────────────────────────────────

  await prisma.tenantTheme.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      primaryColor: "#2563eb",
      secondaryColor: "#64748b",
      accentColor: "#f59e0b",
      fontFamily: "Inter",
    },
  });

  console.log(`  ✓ Tenant theme created`);

  // ── Super-admin user ─────────────────────────────────────────────────────────

  const adminPassword = hashSync("admin123", 10);

  await prisma.user.upsert({
    where: { email_tenantId: { email: "admin@shelf.com", tenantId: null } },
    update: {},
    create: {
      email: "admin@shelf.com",
      name: "Super Admin",
      password: adminPassword,
      role: Role.super_admin,
      isActive: true,
    },
  });

  console.log("  ✓ Super-admin user created: admin@shelf.com / admin123");

  // ── Demo user (customer) ─────────────────────────────────────────────────────

  const customerPassword = hashSync("demo123", 10);

  await prisma.user.upsert({
    where: {
      email_tenantId: { email: "cliente@demo.com", tenantId: tenant.id },
    },
    update: {},
    create: {
      email: "cliente@demo.com",
      name: "Cliente Demo",
      password: customerPassword,
      role: Role.customer,
      isActive: true,
      tenantId: tenant.id,
    },
  });

  console.log("  ✓ Demo customer created: cliente@demo.com / demo123");

  // ── Categories ───────────────────────────────────────────────────────────────

  const electronica = await prisma.category.upsert({
    where: { slug_tenantId: { slug: "electronica", tenantId: tenant.id } },
    update: {},
    create: {
      name: "Electrónica",
      slug: "electronica",
      tenantId: tenant.id,
    },
  });

  const ropa = await prisma.category.upsert({
    where: { slug_tenantId: { slug: "ropa", tenantId: tenant.id } },
    update: {},
    create: {
      name: "Ropa",
      slug: "ropa",
      tenantId: tenant.id,
    },
  });

  const hogar = await prisma.category.upsert({
    where: { slug_tenantId: { slug: "hogar", tenantId: tenant.id } },
    update: {},
    create: {
      name: "Hogar",
      slug: "hogar",
      tenantId: tenant.id,
    },
  });

  // Subcategories
  const smartphones = await prisma.category.upsert({
    where: { slug_tenantId: { slug: "smartphones", tenantId: tenant.id } },
    update: {},
    create: {
      name: "Smartphones",
      slug: "smartphones",
      parentId: electronica.id,
      tenantId: tenant.id,
    },
  });

  const laptops = await prisma.category.upsert({
    where: { slug_tenantId: { slug: "laptops", tenantId: tenant.id } },
    update: {},
    create: {
      name: "Laptops",
      slug: "laptops",
      parentId: electronica.id,
      tenantId: tenant.id,
    },
  });

  const camisas = await prisma.category.upsert({
    where: { slug_tenantId: { slug: "camisas", tenantId: tenant.id } },
    update: {},
    create: {
      name: "Camisas",
      slug: "camisas",
      parentId: ropa.id,
      tenantId: tenant.id,
    },
  });

  const muebles = await prisma.category.upsert({
    where: { slug_tenantId: { slug: "muebles", tenantId: tenant.id } },
    update: {},
    create: {
      name: "Muebles",
      slug: "muebles",
      parentId: hogar.id,
      tenantId: tenant.id,
    },
  });

  console.log(`  ✓ Categories created (${[electronica, ropa, hogar, smartphones, laptops, camisas, muebles].length})`);

  // ── Products ─────────────────────────────────────────────────────────────────

  const products = [
    {
      name: "Smartphone X Pro",
      description: "Smartphone de última generación con cámara de 108MP",
      price: 799.99,
      sku: "SMT-XPRO-001",
      stock: 50,
      categoryId: smartphones.id,
    },
    {
      name: "Laptop UltraBook 15",
      description: "Laptop ultraligera de 15 pulgadas con 16GB RAM",
      price: 1299.99,
      sku: "LAP-UB15-001",
      stock: 25,
      categoryId: laptops.id,
    },
    {
      name: "Auriculares Inalámbricos",
      description: "Auriculares Bluetooth con cancelación de ruido activa",
      price: 149.99,
      sku: "AUR-BT-001",
      stock: 100,
      categoryId: electronica.id,
    },
    {
      name: "Camisa Algodón Premium",
      description: "Camisa de algodón egipcio, corte slim fit",
      price: 59.99,
      sku: "CAM-ALG-001",
      stock: 200,
      categoryId: camisas.id,
    },
    {
      name: "Camisa Lino Verano",
      description: "Camisa de lino ligera, ideal para clima cálido",
      price: 49.99,
      sku: "CAM-LIN-001",
      stock: 150,
      categoryId: camisas.id,
    },
    {
      name: "Sofá Seccional 3 Plazas",
      description: "Sofá seccional tapizado en tela premium con cojines viscoelásticos",
      price: 899.99,
      sku: "SOF-SEC-001",
      stock: 10,
      categoryId: muebles.id,
    },
    {
      name: "Mesa de Centro Roble",
      description: "Mesa de centro de roble macizo con acabado natural",
      price: 349.99,
      sku: "MES-ROB-001",
      stock: 15,
      categoryId: muebles.id,
    },
    {
      name: "Lámpara LED Inteligente",
      description: "Lámpara LED con control por app, 16M colores, compatible Alexa",
      price: 39.99,
      sku: "LAM-LED-001",
      stock: 300,
      categoryId: hogar.id,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { sku_tenantId: { sku: product.sku, tenantId: tenant.id } },
      update: {},
      create: {
        ...product,
        tenantId: tenant.id,
        price: product.price,
        status: ProductStatus.active,
        images: {
          create: [
            {
              url: `https://placehold.co/600x400/2563eb/ffffff?text=${encodeURIComponent(product.name)}`,
              altText: product.name,
              sortOrder: 0,
            },
          ],
        },
      },
    });
  }

  console.log(`  ✓ ${products.length} products created with placeholder images`);
  console.log("✅ Seed completed successfully");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
