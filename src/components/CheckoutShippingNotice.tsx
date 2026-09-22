export function CheckoutShippingNotice() {
  return (
    <div className="rounded border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-neutral-700">
      <p className="mb-2 font-medium text-neutral-900">運費與關稅說明</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>運費每公斤 5,700 韓元，6 公斤起寄。</li>
        <li>從韓國寄出時會裝箱秤重拍照請款，請款費用包含代購商品、服務費及運費。</li>
        <li>關稅每公斤約 50 台幣，依報關行收費為主；關稅為到付，收包裹時付給司機。</li>
      </ul>
      <p className="mt-3 text-xs text-neutral-500">
        上方「應付總額」為商品原價與代購服務費，不含韓國運費與台灣關稅。
      </p>
    </div>
  );
}
