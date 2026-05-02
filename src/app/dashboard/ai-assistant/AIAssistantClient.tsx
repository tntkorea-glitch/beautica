"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { confirmCreateCustomer, confirmCreateBooking, confirmCreateOrder } from "./actions";
import type { ProposalType } from "@/lib/ai-tools/gemini";

type Proposal = ProposalType & { status: "pending" | "confirmed" | "cancelled" };

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  proposals?: Proposal[];
};

const HINTS = [
  "오늘 예약 알려줘",
  "시술 메뉴 목록 보여줘",
  "이소영 고객 찾아줘",
  "샴푸 2개 주문해줘",
];

export function AIAssistantClient() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: msg };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = [...messages, userMsg].map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        content: m.content,
      }));

      const res = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      const data = await res.json();

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.reply ?? "응답을 받지 못했습니다.",
        proposals: data.proposals?.map((p: ProposalType) => ({
          ...p,
          status: "pending" as const,
        })),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "오류가 발생했습니다. 다시 시도해주세요.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(msgId: string, idx: number) {
    const msg = messages.find((m) => m.id === msgId);
    const proposal = msg?.proposals?.[idx];
    if (!proposal) return;

    let error: string | undefined;

    if (proposal.type === "create_customer") {
      const result = await confirmCreateCustomer(proposal.data);
      error = result.error;
    } else if (proposal.type === "create_booking") {
      const result = await confirmCreateBooking(proposal.data);
      error = result.error;
    } else if (proposal.type === "create_order") {
      const result = await confirmCreateOrder(proposal.data);
      error = result.error;
      if (!error && result.orderId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id !== msgId
              ? m
              : { ...m, proposals: m.proposals?.map((p, i) => (i !== idx ? p : { ...p, status: "confirmed" })) }
          )
        );
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: `주문이 등록되었습니다. 주문 상세 페이지로 이동합니다.` },
        ]);
        router.push(`/dashboard/orders/${result.orderId}`);
        return;
      }
    }

    setMessages((prev) =>
      prev.map((m) =>
        m.id !== msgId
          ? m
          : {
              ...m,
              proposals: m.proposals?.map((p, i) =>
                i !== idx ? p : { ...p, status: error ? "cancelled" : "confirmed" }
              ),
            }
      )
    );

    const feedback = error
      ? `오류: ${error}`
      : proposal.type === "create_customer"
      ? `${proposal.data.name} 고객이 등록되었습니다.`
      : proposal.type === "create_booking"
      ? "예약이 등록되었습니다."
      : "처리되었습니다.";

    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "assistant", content: feedback },
    ]);
  }

  function handleCancel(msgId: string, idx: number) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id !== msgId
          ? m
          : {
              ...m,
              proposals: m.proposals?.map((p, i) =>
                i !== idx ? p : { ...p, status: "cancelled" }
              ),
            }
      )
    );
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-3 text-5xl">🤖</div>
            <p className="text-base font-medium text-gray-600">AI 어시스턴트</p>
            <p className="mt-1 text-sm text-gray-400">
              고객 등록, 예약 확인 등을 말해보세요
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {HINTS.map((h) => (
                <button
                  key={h}
                  onClick={() => send(h)}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition"
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className="max-w-[80%] space-y-2">
              <div
                className={
                  msg.role === "user"
                    ? "rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm text-white"
                    : "rounded-2xl rounded-tl-sm bg-white px-4 py-2.5 text-sm text-gray-800 shadow-sm ring-1 ring-gray-100 whitespace-pre-wrap"
                }
                style={
                  msg.role === "user"
                    ? { background: "var(--rose-gold-500)" }
                    : undefined
                }
              >
                {msg.content}
              </div>

              {msg.proposals?.map((proposal, i) => (
                <div
                  key={i}
                  className="rounded-xl p-3 text-sm"
                  style={{
                    background: "var(--rose-gold-50)",
                    border: "1px solid var(--rose-gold-200)",
                  }}
                >
                  {proposal.type === "create_customer" && (
                    <>
                      <p className="mb-1 font-medium" style={{ color: "var(--rose-gold-800)" }}>
                        👤 신규 고객 등록 제안
                      </p>
                      <p className="text-gray-700">{proposal.data.name}</p>
                      {proposal.data.phone && (
                        <p className="text-xs text-gray-500">{proposal.data.phone}</p>
                      )}
                      {proposal.data.notes && (
                        <p className="text-xs text-gray-400">{proposal.data.notes}</p>
                      )}
                    </>
                  )}
                  {proposal.type === "create_order" && (
                    <>
                      <p className="mb-2 font-medium" style={{ color: "var(--rose-gold-800)" }}>
                        📦 제품 주문 제안
                      </p>
                      <div className="space-y-1">
                        {proposal.data.items.map((item, itemIdx) => (
                          <div key={itemIdx} className="flex justify-between text-xs text-gray-700">
                            <span>{item.name}</span>
                            <span className="font-mono">
                              ×{item.quantity}
                              {item.unitPrice != null && ` · ${(item.unitPrice * item.quantity).toLocaleString()}원`}
                            </span>
                          </div>
                        ))}
                      </div>
                      {proposal.data.items.some((it) => it.unitPrice != null) && (
                        <div className="mt-1 flex justify-between border-t border-rose-gold-200 pt-1 text-xs font-semibold text-gray-800">
                          <span>합계</span>
                          <span className="font-mono">
                            {proposal.data.items
                              .reduce((s, it) => s + (it.unitPrice ?? 0) * it.quantity, 0)
                              .toLocaleString()}
                            원
                          </span>
                        </div>
                      )}
                      <p className="mt-1 text-[10px] text-gray-400">
                        배송지: 샵 기본 주소 · 무통장 입금
                      </p>
                    </>
                  )}
                  {proposal.type === "create_booking" && (
                    <>
                      <p className="mb-1 font-medium" style={{ color: "var(--rose-gold-800)" }}>
                        📅 예약 등록 제안
                      </p>
                      {proposal.data.service_name && (
                        <p className="text-gray-700">{proposal.data.service_name}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        {new Date(proposal.data.start_at).toLocaleString("ko-KR", {
                          month: "long",
                          day: "numeric",
                          weekday: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {(proposal.data.guest_name || proposal.data.customer_id) && (
                        <p className="text-xs text-gray-400">
                          {proposal.data.guest_name ?? "기존 고객"}
                        </p>
                      )}
                    </>
                  )}

                  {proposal.status === "pending" && (
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => handleConfirm(msg.id, i)}
                        className="rounded-lg px-3 py-1 text-xs font-medium text-white transition hover:opacity-90"
                        style={{ background: "var(--rose-gold-500)" }}
                      >
                        확인
                      </button>
                      <button
                        onClick={() => handleCancel(msg.id, i)}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 transition"
                      >
                        취소
                      </button>
                    </div>
                  )}
                  {proposal.status === "confirmed" && (
                    <p className="mt-2 text-xs font-medium" style={{ color: "var(--sage-700)" }}>
                      ✓ 등록 완료
                    </p>
                  )}
                  {proposal.status === "cancelled" && (
                    <p className="mt-2 text-xs text-gray-400">취소됨</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-tl-sm bg-white px-4 py-2.5 text-sm text-gray-400 shadow-sm ring-1 ring-gray-100 animate-pulse">
              생각 중...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="메시지를 입력하세요..."
            disabled={loading}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition disabled:opacity-50"
            style={{
              "--tw-ring-color": "var(--rose-gold-400)",
            } as React.CSSProperties}
            onFocus={(e) => {
              e.target.style.borderColor = "var(--rose-gold-400)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "";
            }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
            style={{ background: "var(--rose-gold-500)" }}
          >
            전송
          </button>
        </form>
      </div>
    </div>
  );
}
