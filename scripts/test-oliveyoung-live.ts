process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { scrapeOliveYoungProduct } from "../src/lib/oliveyoung/scraper";
import { krwToTwd } from "../src/lib/exchange";

function loadEnv() {
  const text = readFileSync(resolve(process.cwd(), ".env"), "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    process.env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
}

loadEnv();
const url =
  process.argv[2] ||
  "https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000189556";

async function main() {
  try {
    const scraped = await scrapeOliveYoungProduct(url);
    console.log(
      JSON.stringify(
        {
          ok: true,
          sourceTitle: scraped.sourceTitle,
          brand: scraped.brand,
          priceKrw: scraped.priceKrw,
          priceTwd: krwToTwd(scraped.priceKrw),
          imageCount: scraped.imageUrls.length,
          firstImage: scraped.imageUrls[0],
        },
        null,
        2,
      ),
    );
  } catch (err) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          error: err instanceof Error ? err.message : String(err),
          hint: "若為 Cloudflare，請在 .env 設定 ZYTE_API_KEY 後重試",
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  }
}

main();
