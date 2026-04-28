"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { formatPhone } from "@/lib/format";
import { PostcodeButton } from "@/components/address/PostcodeButton";
import { submitOrder } from "../actions";

type CatalogItem = {
  prodCd: string;
  name: string;
  imageUrl: string | null;
  price: number | null;
  badge: "FREQUENT" | "NEW";
  hint: string;
};

type CartLine = {
  prodCd: string;
  name: string;
  imageUrl: string | null;
  unitPrice: number | null;
  quantity: number;
};

export function NewOrderClient({
  shopSlug,
  shopTier,
  catalog,
  defaultShipping,
  initialAdd,
}: {
  shopSlug: string;
  shopTier: number;
  catalog: CatalogItem[];
  defaultShipping: {
    recipient: string;
    phone: string;
    zipcode: string;
    address1: string;
    address2: string;
  };
  initialAdd: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[] | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);

  // 배송
  const [recipient, setRecipient] = useState(defaultShipping.recipient);
  const [phone, setPhone] = useState(defaultShipping.phone);
  const [zipcode, setZipcode] = useState(defaultShipping.zipcode);
  const [address1, setAddress1] = useState(defaultShipping.address1);
  const [address2, setAddress2] = useState(defaultShipping.address2);
  const [memo, setMemo] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "BANK_TRANSFER" | "CARD" | "KAKAO_PAY" | "NAVER_PAY"
  >("BANK_TRANSFER");

  const addToCart = (item: CatalogItem) => {
    setError(null);
    setMissing(null);
    setCart((prev) => {
      const existing = prev.find((l) => l.prodCd === item.prodCd);
      if (existing) {
        return prev.map((l) =>
          l.prodCd === item.prodCd ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [
        ...prev,
        {
          prodCd: item.prodCd,
          name: item.name,
          imageUrl: item.imageUrl,
          unitPrice: item.price,
          quantity: 1,
        },
      ];
    });
  };

  // initialAdd 처리 (URL ?add= or ?reorder=)
  useEffect(() => {
    if (!initialAdd) return;
    const item = catalog.find((c) => c.prodCd === initialAdd);
    if (item) addToCart(item);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateQuantity = (prodCd: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) =>
          l.prodCd === prodCd ? { ...l, quantity: Math.max(0, l.quantity + delta) } : l,
        )
        .filter((l) => l.quantity > 0),
    );
  };

  const removeLine = (prodCd: string) => {
    setCart((prev) => prev.filter((l) => l.prodCd !== prodCd));
  };

  const subtotal = useMemo(
    () =>
      cart.reduce(
        (sum, l) => sum + (l.unitPrice ?? 0) * l.quantity,
        0,
      ),
    [cart],
  );
  const shippingFee = subtotal >= 50000 || subtotal === 0 ? 0 : 3000;
  const total = subtotal + shippingFee;

  const handleSubmit = () => {
    setError(null);
    setMissing(null);

    if (cart.length === 0) {
      setError("장바구니가 비어있습니다.");
      return;
    }
    const idempotencyKey = generateIdempotencyKey(shopSlug);

    startTransition(async () => {
      const r = await submitOrder({
        items: cart.map((l) => ({
          prodCd: l.prodCd,
          quantity: l.quantity,
          unitPrice: l.unitPrice ?? undefined,
          productName: l.name,
        })),
        shipping: {
          recipient,
          phone,
          zipcode,
          address1,
          address2: address2 || undefined,
          memo: memo || undefined,
        },
        paymentMethod,
        idempotencyKey,
      });
      // submitOrder 가 성공하면 server redirect 발생 → 여기 도달 X
      if (r && "error" in r) {
        setError(r.error);
        if (r.missing && r.missing.length > 0) setMissing(r.missing);
      }
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      {/* 좌: 카탈로그 */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-gray-700">상품 추가</h2>
        {catalog.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-white p-8 text-center text-sm text-gray-500">
            표시할 상품이 없습니다 (자주 구매 + 신상품).
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {catalog.map((item) => {
              const inCart = cart.find((l) => l.prodCd === item.prodCd);
              return (
                <button
                  type="button"
                  key={item.prodCd}
                  onClick={() => addToCart(item)}
                  className="flex gap-3 rounded-lg border border-rose-gold-100 bg-white p-3 text-left transition hover:border-rose-gold-300 hover:shadow-sm"
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-gray-100">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl text-gray-300">
                        🛍
                      </div>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div>
                      <div className="line-clamp-2 text-sm font-medium text-gray-900">
                        {item.name}
                      </div>
                      <div className="mt-0.5 text-[10px] text-gray-400">
                        {item.badge === "NEW" ? "✨ NEW" : "🔁"} · {item.hint}
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <span className="font-mono text-sm font-semibold text-rose-gold-700">
                        {item.price != null
                          ? `${item.price.toLocaleString()}원`
                          : "가격 문의"}
                      </span>
                      {inCart && (
                        <span className="rounded-full bg-rose-gold-600 px-2 py-0.5 text-xs font-medium text-white">
                          담김 ×{inCart.quantity}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        <p className="mt-3 text-xs text-gray-400">
          전체 카탈로그 검색은 곧 추가됩니다 (Phase 3). 지금은 자주 구매 + 신상품 (각 최대 20개).
        </p>
      </section>

      {/* 우: 장바구니 + 배송 + 주문 */}
      <aside className="space-y-4">
        <section className="rounded-lg border bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">🛒 장바구니</h3>
          {cart.length === 0 ? (
            <p className="rounded-md border border-dashed p-6 text-center text-xs text-gray-500">
              왼쪽에서 상품을 클릭해 추가하세요.
            </p>
          ) : (
            <div className="space-y-2">
              {cart.map((l) => (
                <div key={l.prodCd} className="flex items-center gap-2 text-sm">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-gray-100">
                    {l.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={l.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gray-300">🛍</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-1 text-xs text-gray-900">{l.name}</div>
                    <div className="font-mono text-[11px] text-gray-500">
                      {(l.unitPrice ?? 0).toLocaleString()}원
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => updateQuantity(l.prodCd, -1)}
                      className="h-6 w-6 rounded border border-gray-300 text-xs hover:bg-gray-50"
                    >
                      -
                    </button>
                    <span className="w-6 text-center text-xs font-medium">
                      {l.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(l.prodCd, 1)}
                      className="h-6 w-6 rounded border border-gray-300 text-xs hover:bg-gray-50"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLine(l.prodCd)}
                    className="text-xs text-gray-400 hover:text-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}

              <hr className="my-2" />
              <div className="flex justify-between text-xs text-gray-600">
                <span>상품 합계</span>
                <span className="font-mono">{subtotal.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>배송비 {subtotal >= 50000 && "(5만원↑ 무료)"}</span>
                <span className="font-mono">{shippingFee.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-sm font-semibold">
                <span>총 결제</span>
                <span className="font-mono text-rose-gold-700">
                  {total.toLocaleString()}원
                </span>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-lg border bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">🚚 배송 정보</h3>
          <div className="space-y-2">
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="수령인"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="연락처 010-0000-0000"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
            <div className="flex gap-2">
              <input
                value={zipcode}
                readOnly
                placeholder="우편번호"
                className="block w-24 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm"
              />
              <PostcodeButton
                onComplete={({ postalCode, address }) => {
                  setZipcode(postalCode);
                  setAddress1(address);
                }}
              />
            </div>
            <input
              value={address1}
              readOnly
              placeholder="도로명 주소"
              className="block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm"
            />
            <input
              value={address2}
              onChange={(e) => setAddress2(e.target.value)}
              placeholder="상세 주소"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
            <input
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="배송 메모 (선택)"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
          </div>
        </section>

        <section className="rounded-lg border bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">💳 결제 방법</h3>
          <div className="space-y-1.5 text-sm">
            {(
              [
                ["BANK_TRANSFER", "무통장 입금 (입금 대기 상태로 등록)"],
                ["CARD", "카드 (지금 미연동, 추후 PG 통합)"],
                ["KAKAO_PAY", "카카오페이 (추후 연동)"],
                ["NAVER_PAY", "네이버페이 (추후 연동)"],
              ] as const
            ).map(([v, label]) => (
              <label key={v} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === v}
                  onChange={() => setPaymentMethod(v)}
                  disabled={v !== "BANK_TRANSFER"}
                />
                <span className={v === "BANK_TRANSFER" ? "" : "text-gray-400"}>{label}</span>
              </label>
            ))}
          </div>
        </section>

        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
            {missing && missing.length > 0 && (
              <div className="mt-1 font-mono text-[10px] text-red-600">
                매칭 실패 prodCd: {missing.join(", ")}
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          disabled={isPending || cart.length === 0}
          onClick={handleSubmit}
          className="h-12 w-full rounded-lg bg-rose-gold-600 text-sm font-semibold text-white hover:bg-rose-gold-700 disabled:opacity-50"
        >
          {isPending ? "주문 처리 중..." : `${total.toLocaleString()}원 주문하기`}
        </button>
        <p className="text-center text-[10px] text-gray-400">
          tier {shopTier} 등급 가격 · 무통장 입금 시 입금 확인 후 배송 시작
        </p>
      </aside>
    </div>
  );
}

/**
 * 멱등 키: BTC-{slug}-{YYYYMMDD-HHMMSS}-{random}
 * 같은 키로 RPC 재호출 시 idempotent 처리 (DB 변경 없이 기존 orderId 반환).
 */
function generateIdempotencyKey(slug: string) {
  const now = new Date();
  const ts =
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    "-" +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds());
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `BTC-${slug}-${ts}-${rand}`;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}
