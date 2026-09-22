// Convert UTF-16 text files to UTF-8. Run: node scripts/ensure-utf8.cjs
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SKIP_DIRS = new Set(["node_modules", ".next", ".git"]);

function okExt(name) {
  const lower = name.toLowerCase();
  return (
    lower.endsWith(".ts") ||
    lower.endsWith(".tsx") ||
    lower.endsWith(".js") ||
    lower.endsWith(".mjs") ||
    lower.endsWith(".cjs") ||
    lower.endsWith(".css") ||
    lower.endsWith(".json") ||
    lower.endsWith(".md") ||
    lower.endsWith(".prisma")
  );
}

function walk(dir, out) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      walk(p, out);
    } else if (okExt(ent.name)) {
      out.push(p);
    }
  }
  return out;
}

function tryUtf16(buf) {
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return { text: buf.slice(2).toString("utf16le"), reason: "UTF-16 LE BOM" };
  }
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    const b = Buffer.from(buf.slice(2));
    b.swap16();
    return { text: b.toString("utf16le"), reason: "UTF-16 BE BOM" };
  }
  if (
    buf.length >= 10 &&
    buf[1] === 0 &&
    buf[3] === 0 &&
    buf[5] === 0 &&
    buf[7] === 0 &&
    buf[0] < 128 &&
    buf[2] < 128 &&
    buf[4] < 128
  ) {
    return { text: buf.toString("utf16le"), reason: "UTF-16 LE (no BOM)" };
  }
  return null;
}

function main() {
  const out = [];
  walk(ROOT, out);
  let count = 0;
  for (const file of out) {
    const buf = fs.readFileSync(file);
    const conv = tryUtf16(buf);
    if (!conv) continue;
    fs.writeFileSync(file, conv.text, "utf8");
    console.log("[UTF-8]", path.relative(ROOT, file), "<-", conv.reason);
    count++;
  }
  console.log("Done. Converted", count, "file(s).");
}

main();
