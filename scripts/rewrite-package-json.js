const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const target = path.join(root, "package.json");
const json = {
  name: "korean-proxy-shopping",
  version: "0.1.0",
  private: true,
  scripts: {
    dev: "next dev --turbopack",
    build: "prisma generate && next build",
    start: "next start",
    lint: "eslint",
    postinstall: "prisma generate",
    "db:push": "prisma db push",
    "db:seed": "npx tsx prisma/seed.ts",
    "fix-schema": "node scripts/fix-prisma-schema.js",
  },
  dependencies: {
    "@auth/core": "^0.37.0",
    "@prisma/client": "^6.3.1",
    bcryptjs: "^2.4.3",
    next: "15.1.6",
    "next-auth": "^5.0.0-beta.25",
    react: "^19.0.0",
    "react-dom": "^19.0.0",
    zod: "^3.24.1",
  },
  devDependencies: {
    "@eslint/eslintrc": "^3",
    "@types/bcryptjs": "^2.4.6",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    autoprefixer: "^10.4.20",
    eslint: "^9",
    "eslint-config-next": "15.1.6",
    postcss: "^8",
    prisma: "^6.3.1",
    tailwindcss: "^3.4.1",
    tsx: "^4.19.2",
    typescript: "^5",
  },
  prisma: {
    seed: "npx tsx prisma/seed.ts",
  },
};
fs.writeFileSync(target, JSON.stringify(json, null, 2) + "\n", "utf8");
console.log("OK wrote:", target);
