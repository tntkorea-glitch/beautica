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
      // fallback
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
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={handleCopy}
        title="클릭하여 링크 복사"
        className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-blue-700 hover:bg-blue-50 hover:text-blue-800"
      >
        {label}
      </button>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        title="새 탭에서 열기"
        className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-blue-700"
      >
        ↗
      </a>
      <span
        className={
          "ml-1 text-xs text-emerald-600 transition-opacity " +
          (copied ? "opacity-100" : "pointer-events-none opacity-0")
        }
      >
        ✓ 복사됨
      </span>
    </span>
  );
}
