const GOODS_NO_IN_QUERY = /[?&]goodsNo=([A-Z0-9]+)/i;
const GOODS_NO_IN_PATH = /\/(A\d{10,})/i;
const GOODS_NO_ONLY = /^A\d{10,}$/i;

export function parseGoodsNo(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (GOODS_NO_ONLY.test(trimmed)) return trimmed.toUpperCase();

  try {
    const url = new URL(trimmed);
    const fromQuery = url.searchParams.get("goodsNo");
    if (fromQuery && GOODS_NO_ONLY.test(fromQuery)) return fromQuery.toUpperCase();

    const pathMatch = url.pathname.match(GOODS_NO_IN_PATH);
    if (pathMatch) return pathMatch[1].toUpperCase();
  } catch {
    const queryMatch = trimmed.match(GOODS_NO_IN_QUERY);
    if (queryMatch) return queryMatch[1].toUpperCase();
  }

  return null;
}

export function buildCanonicalSourceUrl(goodsNo: string): string {
  return `https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=${encodeURIComponent(goodsNo)}`;
}
