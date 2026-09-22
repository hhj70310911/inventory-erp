import {
  buildImportDescriptionTemplate,
  buildSuggestedImportTitle,
} from "@/lib/oliveyoung/description-template";
import {
  buildCanonicalSourceUrl,
  parseGoodsNo,
} from "@/lib/oliveyoung/parse-goods-no";

export type OliveYoungScrapedProduct = {
  sourceUrl: string;
  sourceTitle: string;
  brand?: string;
  priceKrw: number;
  imageUrls: string[];
};

const BROWSER_HEADERS: HeadersInit = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
  Referer: "https://www.oliveyoung.co.kr/",
};

const MAX_IMAGES = 15;

function isCloudflareChallenge(html: string): boolean {
  return (
    html.includes("Enable JavaScript and cookies to continue") ||
    html.includes("cf-challenge") ||
    html.includes("challenge-platform")
  );
}

function decodeJsonString(value: string): string {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

function firstMatch(html: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeJsonString(match[1]);
  }
  return undefined;
}

function stripOliveYoungTitleSuffix(title: string): string {
  return title.replace(/\s*\|\s*올리브영\s*$/i, "").trim();
}

function firstNumber(html: string, patterns: RegExp[]): number | undefined {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const n = parseInt(match[1].replace(/,/g, ""), 10);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return undefined;
}

function extractImageUrls(html: string): string[] {
  const urls = new Set<string>();

  for (const match of html.matchAll(
    /https?:\/\/image\.oliveyoung\.co\.kr\/[^"'\s)]+/gi,
  )) {
    const url = match[0].replace(/\\u002F/g, "/").replace(/\\\//g, "/");
    if (!/\.(jpg|jpeg|png|webp)(\?|$)/i.test(url)) continue;
    urls.add(url.split("&amp;").join("&"));
  }

  for (const match of html.matchAll(
    /"(?:thnlPathNm|imgPathNm|imageUrl|goodsImg|orgImgPathNm)"\s*:\s*"([^"]+)"/g,
  )) {
    const path = decodeJsonString(match[1]);
    if (!path) continue;
    const normalized = path.startsWith("http")
      ? path
      : `https://image.oliveyoung.co.kr/cfimages/cf-goods/uploads/images/thumbnails/${path}`;
    urls.add(normalized);
  }

  for (const match of html.matchAll(
    /property=["']eg:itemImage["'][^>]+content=["']([^"']+)["']/gi,
  )) {
    const path = decodeJsonString(match[1]);
    if (!path) continue;
    const normalized = path.startsWith("http")
      ? path
      : `https://image.oliveyoung.co.kr/cfimages/cf-goods/uploads/images/thumbnails/${path}`;
    urls.add(normalized);
  }

  const ogImage = html.match(
    /property=["']og:image["']\s+content=["']([^"']+)["']/i,
  );
  if (ogImage?.[1]) urls.add(ogImage[1]);

  return [...urls].slice(0, MAX_IMAGES);
}

function parseProductHtml(
  html: string,
  sourceUrl: string,
): OliveYoungScrapedProduct {
  const sourceTitle = stripOliveYoungTitleSuffix(
    firstMatch(html, [
      /property=["']eg:itemName["'][^>]+content=["']([^"']+)["']/i,
      /"goodsNm"\s*:\s*"((?:\\.|[^"\\])*)"/,
      /property=["']og:title["']\s+content=["']([^"']+)["']/i,
      /<title>([^<]+)<\/title>/i,
      /<meta[^>]+name=["']title["'][^>]+content=["']([^"']+)["']/i,
    ]) ?? "",
  );

  const brand = firstMatch(html, [
    /property=["']eg:brandName["'][^>]+content=["']([^"']+)["']/i,
    /"onlBrndNm"\s*:\s*"((?:\\.|[^"\\])*)"/,
    /"brndNm"\s*:\s*"((?:\\.|[^"\\])*)"/,
    /"brandName"\s*:\s*"((?:\\.|[^"\\])*)"/,
  ]);

  const priceKrw =
    firstNumber(html, [
      /property=["']eg:salePrice["'][^>]+content=["'](\d+)["']/i,
      /"salePrice"\s*:\s*(\d+)/,
      /"priceToPay"\s*:\s*(\d+)/,
      /"maxBnfAmt"\s*:\s*(\d+)/,
      /"saleAmt"\s*:\s*(\d+)/,
      /"nrmlAmt"\s*:\s*(\d+)/,
      /"normPrc"\s*:\s*(\d+)/,
      /class=["'][^"']*price[^"']*["'][^>]*>\s*₩?\s*([\d,]+)/i,
    ]) ??
    firstNumber(html, [
      /property=["']eg:originalPrice["'][^>]+content=["'](\d+)["']/i,
    ]) ??
    0;

  const imageUrls = extractImageUrls(html);

  if (!sourceTitle) {
    throw new Error("無法解析商品標題，頁面結構可能已變更");
  }
  if (!priceKrw) {
    throw new Error("無法解析韓幣價格，請手動填寫");
  }
  if (imageUrls.length === 0) {
    throw new Error("無法解析商品圖片");
  }

  return {
    sourceUrl,
    sourceTitle,
    brand,
    priceKrw,
    imageUrls,
  };
}

async function fetchViaZyte(
  url: string,
  apiKey: string,
  mode: "http" | "browser",
): Promise<string> {
  const auth = Buffer.from(`${apiKey}:`).toString("base64");
  const body =
    mode === "browser"
      ? { url, browserHtml: true }
      : { url, httpResponseBody: true };

  const response = await fetch("https://api.zyte.com/v1/extract", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const result = (await response.json()) as {
    statusCode?: number;
    httpResponseBody?: string;
    browserHtml?: string;
    detail?: string;
  };

  if (!response.ok) {
    throw new Error(`Zyte 代理失敗：${result.detail ?? response.status}`);
  }

  if (mode === "browser") {
    if (!result.browserHtml) throw new Error("Zyte 回傳內容為空");
    return result.browserHtml;
  }

  if (!result.httpResponseBody) throw new Error("Zyte 回傳內容為空");
  return Buffer.from(result.httpResponseBody, "base64").toString("utf8");
}

async function fetchProductHtml(sourceUrl: string): Promise<string> {
  const response = await fetch(sourceUrl, {
    headers: BROWSER_HEADERS,
    cache: "no-store",
  });
  const html = await response.text();

  if (response.ok && !isCloudflareChallenge(html)) {
    return html;
  }

  const zyteKey = process.env.ZYTE_API_KEY?.trim();
  if (zyteKey) {
    const viaZyte = await fetchViaZyte(sourceUrl, zyteKey, "http");
    if (!isCloudflareChallenge(viaZyte)) return viaZyte;
  }

  if (isCloudflareChallenge(html)) {
    throw new Error(
      "Olive Young 阻擋自動抓取（Cloudflare）。請設定 ZYTE_API_KEY 或稍後再試。",
    );
  }

  throw new Error(`抓取失敗（HTTP ${response.status}）`);
}

export async function scrapeOliveYoungProduct(
  goodsNoOrUrl: string,
): Promise<OliveYoungScrapedProduct> {
  const goodsNo = parseGoodsNo(goodsNoOrUrl);
  if (!goodsNo) {
    throw new Error("無法從網址解析 goodsNo，請貼上 Olive Young 商品頁連結");
  }

  const sourceUrl = buildCanonicalSourceUrl(goodsNo);
  const zyteKey = process.env.ZYTE_API_KEY?.trim();
  let html = await fetchProductHtml(sourceUrl);

  try {
    return parseProductHtml(html, sourceUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const needsRenderedPage =
      message.includes("韓幣價格") ||
      message.includes("商品標題") ||
      message.includes("商品圖片");
    if (needsRenderedPage && zyteKey) {
      html = await fetchViaZyte(sourceUrl, zyteKey, "browser");
      return parseProductHtml(html, sourceUrl);
    }
    throw err;
  }
}

export function buildPreviewFromScraped(
  scraped: OliveYoungScrapedProduct,
  priceTwd: number,
) {
  return {
    ...scraped,
    priceTwd,
    suggestedTitle: buildSuggestedImportTitle(scraped.sourceTitle),
    suggestedDescription: buildImportDescriptionTemplate(
      scraped.sourceTitle,
      scraped.sourceUrl,
    ),
  };
}

export { parseProductHtml };
