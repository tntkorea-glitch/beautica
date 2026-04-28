"use client";

import { useCallback, useEffect, useRef } from "react";

const SCRIPT_SRC = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";

type DaumPostcodeData = {
  zonecode: string;
  roadAddress: string;
  jibunAddress: string;
  buildingName?: string;
};

declare global {
  interface Window {
    daum?: {
      Postcode: new (config: {
        oncomplete: (data: DaumPostcodeData) => void;
      }) => { open: () => void };
    };
  }
}

export function PostcodeButton({
  onComplete,
  className,
}: {
  onComplete: (data: { postalCode: string; address: string }) => void;
  className?: string;
}) {
  const loadedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.daum?.Postcode) {
      loadedRef.current = true;
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => (loadedRef.current = true));
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => (loadedRef.current = true);
    document.body.appendChild(script);
  }, []);

  const open = useCallback(() => {
    if (!window.daum?.Postcode) {
      alert("주소 검색 스크립트 로딩 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    new window.daum.Postcode({
      oncomplete: (data) => {
        const address =
          data.roadAddress + (data.buildingName ? ` (${data.buildingName})` : "");
        onComplete({ postalCode: data.zonecode, address });
      },
    }).open();
  }, [onComplete]);

  return (
    <button
      type="button"
      onClick={open}
      className={
        className ??
        "rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
      }
    >
      주소 검색
    </button>
  );
}
