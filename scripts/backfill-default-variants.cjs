const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: { variants: { none: {} } },
    select: { id: true, priceTwd: true, priceKrw: true },
  });

  for (const p of products) {
    await prisma.productVariant.create({
      data: {
        productId: p.id,
        priceTwd: p.priceTwd,
        priceKrw: p.priceKrw,
        acceptOrders: true,
      },
    });
  }

  console.log(`Created default variant for ${products.length} product(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
