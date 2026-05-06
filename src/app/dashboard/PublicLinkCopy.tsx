"use client";

import { useState } from "react";

export function PublicLinkCopy({ href, label }: { href: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = href;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      } catch {}
      document.body.removeChild(ta);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-blue-700 hover:bg-gray-200"
      >
        {label} ↗
      </a>
      <button
        type="button"
        onClick={handleCopy}
        title={copied ? "복사됨" : "링크 복사"}
        aria-label={copied ? "복사됨" : "링크 복사"}
        className={
          "inline-flex h-6 w-6 items-center justify-center rounded-md border transition " +
          (copied
            ? "border-emerald-300 bg-emerald-50 text-emerald-600"
            : "border-gray-200 bg-white text-gray-600 hover:border-gray-400 hover:bg-gray-50 hover:text-gray-800")
        }
      >
        {copied ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
          >
            {/* 앞쪽 문서 (우측 상단 모서리 접힘) */}
            <path d="M15.5 2H8.6c-.9 0-1.6.7-1.6 1.6v10.8c0 .9.7 1.6 1.6 1.6h9.8c.9 0 1.6-.7 1.6-1.6V6.5L15.5 2z" />
            <path d="M15 2v5h5" />
            {/* 뒤쪽 문서 */}
            <path d="M3 7.6v12.8c0 .9.7 1.6 1.6 1.6h9.8" />
          </svg>
        )}
      </button>
    </span>
  );
}
