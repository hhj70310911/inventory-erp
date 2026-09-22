const fs = require("fs");
const path = require("path");
const dir = __dirname;

const rewritePackageJson =
  'const fs = require("fs");\n' +
  'const path = require("path");\n' +
  'const root = path.join(__dirname, "..");\n' +
  'const target = path.join(root, "package.json");\n' +
  "const json = {\n" +
  '  name: "korean-proxy-shopping",\n' +
  '  version: "0.1.0",\n' +
  "  private: true,\n" +
  "  scripts: {\n" +
  '    dev: "next dev --turbopack",\n' +
  '    build: "prisma generate && next build",\n' +
  '    start: "next start",\n' +
  '    lint: "eslint",\n' +
  '    postinstall: "prisma generate",\n' +
  '    "db:push": "prisma db push",\n' +
  '    "db:seed": "npx tsx prisma/seed.ts",\n' +
  '    "fix-schema": "node scripts/fix-prisma-schema.js",\n' +
  "  },\n" +
  "  dependencies: {\n" +
  '    "@auth/core": "^0.37.0",\n' +
  '    "@prisma/client": "^6.3.1",\n' +
  '    bcryptjs: "^2.4.3",\n' +
  '    next: "15.1.6",\n' +
  '    "next-auth": "^5.0.0-beta.25",\n' +
  '    react: "^19.0.0",\n' +
  '    "react-dom": "^19.0.0",\n' +
  '    zod: "^3.24.1",\n' +
  "  },\n" +
  "  devDependencies: {\n" +
  '    "@eslint/eslintrc": "^3",\n' +
  '    "@types/bcryptjs": "^2.4.6",\n' +
  '    "@types/node": "^20",\n' +
  '    "@types/react": "^19",\n' +
  '    "@types/react-dom": "^19",\n' +
  '    autoprefixer: "^10.4.20",\n' +
  '    eslint: "^9",\n' +
  '    "eslint-config-next": "15.1.6",\n' +
  '    postcss: "^8",\n' +
  '    prisma: "^6.3.1",\n' +
  '    tailwindcss: "^3.4.1",\n' +
  '    tsx: "^4.19.2",\n' +
  '    typescript: "^5",\n' +
  "  },\n" +
  "  prisma: {\n" +
  '    seed: "npx tsx prisma/seed.ts",\n' +
  "  },\n" +
  "};\n" +
  'fs.writeFileSync(target, JSON.stringify(json, null, 2) + "\\n", "utf8");\n' +
  'console.log("OK wrote:", target);\n';

const fixPrismaSchema =
  'const fs = require("fs");\n' +
  'const path = require("path");\n' +
  'const out = path.join(__dirname, "..", "prisma", "schema.prisma");\n' +
  "const schema = `generator client {\n" +
  '  provider = "prisma-client-js"\n' +
  "}\n" +
  "\n" +
  "datasource db {\n" +
  '  provider = "postgresql"\n' +
  '  url      = env("DATABASE_URL")\n' +
  "}\n" +
  "\n" +
  "enum Role {\n" +
  "  ADMIN\n" +
  "  VIP\n" +
  "}\n" +
  "\n" +
  "model User {\n" +
  "  id           String   @id @default(cuid())\n" +
  "  email        String   @unique\n" +
  "  passwordHash String\n" +
  "  role         Role\n" +
  "  createdAt    DateTime @default(now())\n" +
  "  updatedAt    DateTime @updatedAt\n" +
  "}\n" +
  "\n" +
  "model InviteToken {\n" +
  "  id        String    @id @default(cuid())\n" +
  "  email     String\n" +
  "  tokenHash String    @unique\n" +
  "  expiresAt DateTime\n" +
  "  usedAt    DateTime?\n" +
  "  createdAt DateTime  @default(now())\n" +
  "}\n" +
  "\n" +
  "model Product {\n" +
  "  id          String   @id @default(cuid())\n" +
  "  title       String\n" +
  "  description String   @db.Text\n" +
  "  imageUrl    String?\n" +
  "  priceTwd    Int\n" +
  "  priceKrw    Int?\n" +
  '  unitLabel   String   @default("")\n' +
  "  stock       Int      @default(0)\n" +
  "  published   Boolean  @default(false)\n" +
  "  createdAt   DateTime @default(now())\n" +
  "  updatedAt   DateTime @updatedAt\n" +
  "}\n" +
  "`;\n" +
  'fs.writeFileSync(out, schema, "utf8");\n' +
  'console.log("Wrote UTF-8:", out);\n';

fs.writeFileSync(path.join(dir, "rewrite-package-json.js"), rewritePackageJson, "utf8");
fs.writeFileSync(path.join(dir, "fix-prisma-schema.js"), fixPrismaSchema, "utf8");
console.log("Restored UTF-8:", path.join(dir, "rewrite-package-json.js"), path.join(dir, "fix-prisma-schema.js"));
