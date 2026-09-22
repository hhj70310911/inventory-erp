import assert from "node:assert/strict";
import { krwToTwd } from "../src/lib/exchange";
import {
  buildCanonicalSourceUrl,
  parseGoodsNo,
} from "../src/lib/oliveyoung/parse-goods-no";
import { parseProductHtml } from "../src/lib/oliveyoung/scraper";

const fixtureHtml = `
<html>
<head>
  <meta property="og:title" content="VT 리들샷 100 모공앰플 50ml" />
  <meta property="og:image" content="https://image.oliveyoung.co.kr/cfimages/cf-goods/uploads/images/thumbnails/10/0000/0018/A00000018955601ko.jpg?l=ko" />
</head>
<body>
<script>
  var goods = {"goodsNm":"VT 리들샷 100 모공앰플 50ml","onlBrndNm":"VT","salePrice":19500};
</script>
</body>
</html>
`;

assert.equal(parseGoodsNo("A000000189556"), "A000000189556");
assert.equal(
  parseGoodsNo(
    "https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000189556",
  ),
  "A000000189556",
);
assert.equal(
  parseGoodsNo("https://m.oliveyoung.co.kr/mtn/goods/detail?goodsNo=A000000189556"),
  "A000000189556",
);
assert.equal(
  buildCanonicalSourceUrl("A000000189556"),
  "https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000189556",
);

assert.equal(krwToTwd(19500, 45), 433);
assert.equal(krwToTwd(45000, 45), 1000);

const parsed = parseProductHtml(
  fixtureHtml,
  "https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000189556",
);
assert.equal(parsed.sourceTitle, "VT 리들샷 100 모공앰플 50ml");
assert.equal(parsed.brand, "VT");
assert.equal(parsed.priceKrw, 19500);
assert.equal(parsed.imageUrls.length, 1);
assert.ok(parsed.imageUrls[0].includes("A00000018955601ko.jpg"));

console.log("Olive Young import tests passed");
