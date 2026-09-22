import type { Role } from "@prisma/client";

export function canShopRole(role: Role | undefined): boolean {
  return role === "VIP" || role === "BUYER" || role === "ADMIN";
}
