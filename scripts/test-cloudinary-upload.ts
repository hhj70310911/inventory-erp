import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { uploadRemoteImage } from "../src/lib/cloudinary-server";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env");
  const text = readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx);
    const value = trimmed.slice(idx + 1);
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const sampleUrl =
  "https://image.oliveyoung.co.kr/cfimages/cf-goods/uploads/images/thumbnails/10/0000/0018/A00000018955601ko.jpg?l=ko";

uploadRemoteImage(sampleUrl)
  .then((url) => console.log("Cloudinary upload OK:", url))
  .catch((err) => {
    console.error("Cloudinary upload FAIL:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
