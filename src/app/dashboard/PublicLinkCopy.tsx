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
        title="링크 복사"
        className={
          "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium transition " +
          (copied
            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
            : "border-gray-200 bg-white text-gray-600 hover:border-gray-400 hover:bg-gray-50")
        }
      >
        {copied ? (
          <>
            <span>✓</span>
            <span>복사됨</span>
          </>
        ) : (
          <>
            <span>📋</span>
            <span>복사</span>
          </>
        )}
      </button>
    </span>
  );
}
