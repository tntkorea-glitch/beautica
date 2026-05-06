"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type RecentItem = {
  id: string;
  name: string;
  message: string;
  createdAt: string;
};

type FeedResponse = { newCount: number; recent: RecentItem[] };

const POLL_MS = 15_000; // 15초 간격 폴링

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export function NotificationBell() {
  const [count, setCount] = useState(0);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [open, setOpen] = useState(false);
  const lastSeenIdRef = useRef<string | null>(null);
  const ddRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 외부 클릭 시 닫기
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ddRef.current && !ddRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // 브라우저 알림 권한 요청 (최초 1회)
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // 폴링
  useEffect(() => {
    let mounted = true;
    let timer: number | null = null;

    async function tick() {
      try {
        const r = await fetch("/api/notifications/consultations", {
          cache: "no-store",
        });
        if (!r.ok) return;
        const data = (await r.json()) as FeedResponse;
        if (!mounted) return;

        const prevId = lastSeenIdRef.current;
        const newestId = data.recent[0]?.id ?? null;

        // 처음 마운트가 아니고, 최상단 id 가 바뀌었으면 새 알림 도착으로 간주
        if (prevId !== null && newestId && newestId !== prevId) {
          const top = data.recent[0];
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            try {
              new Notification("새 상담이 도착했어요", {
                body: `${top.name}: ${top.message.slice(0, 60)}`,
                tag: "beautica-consultation",
              });
            } catch {}
          }
          // 사운드(짧은 띵)
          try {
            audioRef.current?.play().catch(() => {});
          } catch {}
        }
        lastSeenIdRef.current = newestId;

        setCount(data.newCount);
        setRecent(data.recent);
      } catch {
        // 무시
      }
    }

    tick();
    timer = window.setInterval(tick, POLL_MS);
    return () => {
      mounted = false;
      if (timer) window.clearInterval(timer);
    };
  }, []);

  return (
    <div ref={ddRef} className="relative">
      {/* 사운드용 audio (data URI 짧은 비프) */}
      <audio
        ref={audioRef}
        src="data:audio/wav;base64,UklGRiQEAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAEAAA="
        preload="auto"
      />

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-8 w-8 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"
        aria-label="알림"
        title="알림"
      >
        {/* 종 SVG */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white shadow ring-2 ring-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
            <span className="text-sm font-semibold text-gray-800">알림</span>
            {count > 0 && (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                새 상담 {count}건
              </span>
            )}
          </div>

          {recent.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-gray-400">
              새로운 알림이 없습니다.
            </div>
          ) : (
            <ul className="max-h-80 divide-y divide-gray-100 overflow-y-auto">
              {recent.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/dashboard/consultations/${r.id}`}
                    onClick={() => setOpen(false)}
                    className="block px-4 py-3 transition hover:bg-rose-50"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        💬 {r.name}
                      </span>
                      <span className="shrink-0 text-[11px] text-gray-400">
                        {timeAgo(r.createdAt)}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-xs text-gray-600">{r.message}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/dashboard/consultations"
            onClick={() => setOpen(false)}
            className="block border-t border-gray-100 px-4 py-2.5 text-center text-xs font-medium text-rose-600 hover:bg-gray-50"
          >
            전체 상담 보기 →
          </Link>
        </div>
      )}
    </div>
  );
}
