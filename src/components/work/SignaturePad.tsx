"use client";

import { useEffect, useRef, useState } from "react";

/**
 * HTML5 canvas 기반 서명 패드.
 * 마우스/터치 모두 지원. PNG Blob 반환.
 */
export function SignaturePad({
  onSave,
  disabled,
}: {
  onSave: (blob: Blob) => void | Promise<void>;
  disabled?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1f1610";
  }, []);

  const getPos = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const t = e.touches[0] ?? e.changedTouches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const begin = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    if (disabled) return;
    drawingRef.current = true;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    if (!drawingRef.current || disabled) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasInk(true);
  };

  const end = () => {
    drawingRef.current = false;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasInk) return;
    canvas.toBlob(
      (blob) => {
        if (blob) onSave(blob);
      },
      "image/png",
    );
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        className="block h-40 w-full touch-none rounded-md border border-gray-300 bg-white"
        onMouseDown={begin}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={(e) => {
          e.preventDefault();
          begin(e);
        }}
        onTouchMove={(e) => {
          e.preventDefault();
          move(e);
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          end();
        }}
      />
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {hasInk ? "✏️ 서명됨" : "위 영역에 손가락 또는 마우스로 서명해주세요"}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={clear}
            disabled={!hasInk || disabled}
            className="rounded-md border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            지우기
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!hasInk || disabled}
            className="rounded-md bg-rose-gold-600 px-3 py-1 text-xs font-medium text-white hover:bg-rose-gold-700 disabled:opacity-50"
          >
            서명 저장
          </button>
        </div>
      </div>
    </div>
  );
}
