const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const schemaPath = path.join(root, "prisma", "schema.prisma");
const schemaText = fs.readFileSync(schemaPath, "utf8");

function esc(s) {
  return s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

const outJs = `const fs = require("fs");
const path = require("path");
const out = path.join(__dirname, "..", "prisma", "schema.prisma");
const schema = \`${esc(schemaText)}\`;
fs.writeFileSync(out, schema, "utf8");
console.log("Wrote UTF-8:", out);
`;

const target = path.join(__dirname, "fix-prisma-schema.js");
fs.writeFileSync(target, outJs, "utf8");
console.log("OK emitted:", target);
