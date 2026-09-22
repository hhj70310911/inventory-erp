const fs = require("fs");
const path = require("path");
const out = path.join(__dirname, "..", "prisma", "schema.prisma");
const schema = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  VIP
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  role         Role
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model InviteToken {
  id        String    @id @default(cuid())
  email     String
  tokenHash String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())
}

model Product {
  id          String   @id @default(cuid())
  title       String
  description String   @db.Text
  imageUrl    String?
  priceTwd    Int
  priceKrw    Int?
  unitLabel   String   @default("")
  stock       Int      @default(0)
  published   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
`;
fs.writeFileSync(out, schema, "utf8");
console.log("Wrote UTF-8:", out);
