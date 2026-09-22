import prisma from "@/lib/prisma";

export const DEFAULT_CATEGORIES = [
  { name: "美妝美顏", slug: "meizhuang", sortOrder: 0 },
  { name: "零食", slug: "lingshi", sortOrder: 1 },
  { name: "服飾", slug: "fushi", sortOrder: 2 },
  { name: "生活", slug: "shenghuo", sortOrder: 3 },
] as const;

export type CategoryNavItem = {
  id: string;
  name: string;
  slug: string;
};

export async function getCategoryNavItems(): Promise<CategoryNavItem[]> {
  try {
    return await prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true },
    });
  } catch {
    return [];
  }
}

export async function getCategoryBySlug(slug: string) {
  return prisma.category.findUnique({ where: { slug } });
}
