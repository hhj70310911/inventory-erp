const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: {
      imageUrl: { not: null },
      images: { none: {} },
    },
    select: { id: true, imageUrl: true },
  });

  for (const product of products) {
    await prisma.productImage.create({
      data: {
        productId: product.id,
        url: product.imageUrl,
        sortOrder: 0,
      },
    });
  }

  const total = await prisma.product.count();
  const withUrl = await prisma.product.count({ where: { imageUrl: { not: null } } });
  const imageRows = await prisma.productImage.count();
  console.log(`Products: ${total}, with imageUrl: ${withUrl}, ProductImage rows: ${imageRows}`);
  console.log(`Backfilled ${products.length} product(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
