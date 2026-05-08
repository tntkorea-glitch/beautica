"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { analyzeFace, generateBrowImages, saveAnalysisResult, type AnalysisResult, type AnalysisProvider, type GeneratedImages, type ImageQuality } from "./actions";
import type { CustomerHit } from "./actions";
import { AnalysisReport } from "./AnalysisReport";
import { CustomerSearchInput } from "./CustomerSearchInput";
import { toJpeg } from "html-to-image";

type MediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

function resizeImage(file: File, maxPx = 1200): Promise<{ base64: string; mediaType: MediaType; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
        resolve({ base64: dataUrl.split(",")[1], mediaType: "image/jpeg", dataUrl });
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 눈 영역 좌표 유효성 검사 + 보정
// 셀피/증명 사진: 눈썹은 이미지 상단 10~28% 시작, 끝 지점 42% 이내
function sanitizeEyeRegion(
  r: { x: number; y: number; w: number; h: number },
  imgW: number,
  imgH: number,
): { x: number; y: number; w: number; h: number } {
  const aspectRatio = imgW / imgH;
  const isPortrait = aspectRatio < 1;

  const yMin = isPortrait ? 0.08 : 0.06;
  const yMax = isPortrait ? 0.28 : 0.24; // 눈썹 시작점은 이미지 상단 28% 이내

  const isValid =
    r.y >= yMin &&
    r.y <= yMax &&
    r.h >= 0.05 &&
    r.h <= 0.16 &&          // 높이 최대 16% (눈썹 띠만 캡처)
    r.y + r.h <= 0.42;      // 전체 구간 42% 이내 (코 이상으로 올라오도록)

  if (isValid) return r;

  // 폴백: 이미지 높이의 13~30% 구간 (눈썹/눈 영역)
  return {
    x: 0.02,
    y: isPortrait ? 0.13 : 0.10,
    w: 0.96,
    h: 0.17,
  };
}

function cropEyeRegion(
  dataUrl: string,
  region: { x: number; y: number; w: number; h: number },
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const safe = sanitizeEyeRegion(region, img.width, img.height);
      const sx = Math.max(0, Math.round(safe.x * img.width));
      const sy = Math.max(0, Math.round(safe.y * img.height));
      const sw = Math.min(img.width - sx, Math.round(safe.w * img.width));
      const sh = Math.min(img.height - sy, Math.round(safe.h * img.height));
      const canvas = document.createElement("canvas");
      canvas.width = sw; canvas.height = sh;
      canvas.getContext("2d")!.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

const PROVIDERS: { id: AnalysisProvider; label: string; sub: string }[] = [
  { id: "claude", label: "Claude Sonnet", sub: "Anthropic" },
  { id: "openai", label: "GPT-4o",        sub: "OpenAI" },
];

export function FaceAnalysisClient() {
  const fileRef   = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const [provider,     setProvider]     = useState<AnalysisProvider>("claude");
  const [imageQuality, setImageQuality] = useState<ImageQuality>("medium");
  const [customer,     setCustomer]     = useState<CustomerHit | null>(null);
  const [imageData,    setImageData]    = useState<{ base64: string; mediaType: MediaType; dataUrl: string } | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [result,       setResult]       = useState<AnalysisResult | null>(null);
  const [eyeCrop,       setEyeCrop]       = useState<string | undefined>(undefined);
  const [genImages,     setGenImages]     = useState<GeneratedImages | undefined>(undefined);
  const [genLoading,    setGenLoading]    = useState(false);
  const [genError,      setGenError]      = useState<string | null>(null);
  const [saving,        setSaving]        = useState(false);
  const [savedId,       setSavedId]       = useState<string | null>(null);
  const [saveError,     setSaveError]     = useState<string | null>(null);
  const [downloading,   setDownloading]   = useState<"jpg" | "pdf" | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null); setResult(null); setSavedId(null); setEyeCrop(undefined); setGenImages(undefined); setGenError(null);
    try { setImageData(await resizeImage(file)); }
    catch { setError("이미지 처리 중 오류가 발생했습니다."); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) handleFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith("image/")) handleFile(f);
  };

  const handleAnalyze = async () => {
    if (!imageData) return;
    setLoading(true); setError(null); setResult(null); setSavedId(null);
    setEyeCrop(undefined); setGenImages(undefined);

    // Step 1: 얼굴 분석
    const res = await analyzeFace(imageData.base64, imageData.mediaType, provider);
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    if (!res.result) return;
    setResult(res.result);

    // Step 2: 눈 영역 크롭 (클라이언트)
    if (res.result.eyeRegion) {
      try {
        const crop = await cropEyeRegion(imageData.dataUrl, res.result.eyeRegion);
        setEyeCrop(crop);
      } catch { /* skip */ }
    }

    // Step 3: gpt-image-2 눈썹 스타일 이미지 생성
    setGenLoading(true);
    const genRes = await generateBrowImages(res.result, imageQuality);
    setGenLoading(false);
    if (genRes.images) setGenImages(genRes.images);
    if (genRes.error) setGenError(genRes.error);
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true); setSaveError(null);
    const res = await saveAnalysisResult(customer?.id ?? null, result);
    setSaving(false);
    if (res.error) setSaveError(res.error);
    else setSavedId(res.id ?? null);
  };

  const handleReset = () => {
    setImageData(null); setResult(null); setEyeCrop(undefined); setGenImages(undefined);
    setError(null); setSavedId(null); setSaveError(null);
    if (fileRef.current)   fileRef.current.value   = "";
    if (cameraRef.current) cameraRef.current.value = "";
  };

  const captureJpeg = () => {
    if (!reportRef.current) throw new Error("리포트 DOM을 찾을 수 없습니다");
    return toJpeg(reportRef.current, {
      quality: 0.92,
      pixelRatio: 2,
      backgroundColor: "#fdf9f6",
      skipFonts: false,
    });
  };

  const fileName = () =>
    `얼굴분석_${new Date().toLocaleDateString("ko-KR").replace(/\. /g, "-").replace(".", "")}`;

  const triggerDownload = (url: string, name: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    requestAnimationFrame(() => document.body.removeChild(a));
  };

  const handleDownloadJpg = async () => {
    setDownloading("jpg"); setDownloadError(null);
    try {
      const dataUrl = await captureJpeg();
      triggerDownload(dataUrl, `${fileName()}.jpg`);
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : "JPG 다운로드 실패");
    } finally { setDownloading(null); }
  };

  const handleDownloadPdf = async () => {
    setDownloading("pdf"); setDownloadError(null);
    try {
      const imgData = await captureJpeg();
      const img = new Image();
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = imgData; });
      const { jsPDF } = await import("jspdf");
      const pdfW = 595.28;
      const pdfH = (img.naturalHeight / img.naturalWidth) * pdfW;
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: [pdfW, pdfH] });
      pdf.addImage(imgData, "JPEG", 0, 0, pdfW, pdfH);
      pdf.save(`${fileName()}.pdf`);
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : "PDF 다운로드 실패");
    } finally { setDownloading(null); }
  };

  return (
    <div className="space-y-5">

      {/* ── 고객 연결 ── */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="mb-2 text-sm font-semibold text-gray-700">
          👤 고객 연결
          <span className="ml-1.5 text-xs font-normal text-gray-400">선택 — 나중에도 연결 가능</span>
        </p>
        <CustomerSearchInput selected={customer} onSelect={setCustomer} onClear={() => setCustomer(null)} />
      </div>

      {/* ── 모델 선택 ── */}
      {!result && (
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="mb-2.5 text-sm font-semibold text-gray-700">🤖 AI 모델 선택</p>
          <div className="flex gap-3">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProvider(p.id)}
                className={
                  "flex-1 rounded-xl border-2 px-4 py-3 text-left transition " +
                  (provider === p.id
                    ? "border-[#c4896a] bg-[#fdf0ea]"
                    : "border-gray-100 bg-gray-50 hover:border-gray-200")
                }
              >
                <p className={`text-sm font-bold ${provider === p.id ? "text-[#c4896a]" : "text-gray-700"}`}>
                  {p.label}
                </p>
                <p className="mt-0.5 text-[11px] text-gray-400">{p.sub}</p>
              </button>
            ))}
          </div>

          {/* 이미지 생성 품질 */}
          <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="mb-2 text-sm font-semibold text-gray-700">
              🎨 눈썹 스타일 이미지 품질
              <span className="ml-1.5 text-[11px] font-normal text-gray-400">(gpt-image-2)</span>
            </p>
            <div className="flex gap-2">
              {([
                { id: "low",    label: "저품질",  sub: "빠름 · 저비용",  cost: "~₩42" },
                { id: "medium", label: "중간품질", sub: "균형",          cost: "~₩371" },
              ] as { id: ImageQuality; label: string; sub: string; cost: string }[]).map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setImageQuality(q.id)}
                  className={
                    "flex-1 rounded-xl border-2 px-3 py-2.5 text-left transition " +
                    (imageQuality === q.id
                      ? "border-[#c4896a] bg-[#fdf0ea]"
                      : "border-gray-100 bg-gray-50 hover:border-gray-200")
                  }
                >
                  <p className={`text-[13px] font-bold ${imageQuality === q.id ? "text-[#c4896a]" : "text-gray-700"}`}>
                    {q.label}
                  </p>
                  <p className="mt-0.5 text-[10px] text-gray-400">{q.sub} · {q.cost}/회</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 업로드 영역 ── */}
      {!result && (
        <div className="rounded-xl border border-dashed border-[#d4b8a8] bg-[#fdf9f6] p-6">
          {!imageData ? (
            <div
              className="flex cursor-pointer flex-col items-center gap-4 py-8 text-center"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f0e8e0] text-3xl">📸</div>
              <div>
                <p className="font-semibold text-gray-800">사진을 업로드하거나 드래그하세요</p>
                <p className="mt-0.5 text-xs text-gray-400">JPG · PNG · WEBP 지원 · 정면 사진 권장</p>
              </div>
              <div className="flex gap-3">
                <button type="button"
                  onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
                  className="rounded-xl bg-[#c4896a] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#b07a5e] shadow-sm">
                  파일 선택
                </button>
                <button type="button"
                  onClick={(e) => { e.stopPropagation(); cameraRef.current?.click(); }}
                  className="rounded-xl border-2 border-[#c4896a] px-5 py-2.5 text-sm font-semibold text-[#c4896a] hover:bg-[#fdf0ea]">
                  📷 카메라 촬영
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageData.dataUrl} alt="업로드된 사진" className="h-52 w-44 rounded-2xl object-cover shadow-md" />
              <div className="flex flex-1 flex-col gap-3">
                <div>
                  <p className="font-semibold text-gray-800">사진이 준비됐습니다.</p>
                  <p className="mt-0.5 text-xs text-gray-500">얼굴이 잘 보이는 정면 사진일수록 정확하게 분석됩니다.</p>
                </div>
                <div className="rounded-lg bg-[#f0e8e0] px-3 py-2 text-[12px] text-[#8a6a58]">
                  선택된 모델: <strong>{provider === "claude" ? "Claude Sonnet (Anthropic)" : "GPT-4o (OpenAI)"}</strong>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={handleAnalyze} disabled={loading}
                    className="rounded-xl bg-[#c4896a] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#b07a5e] disabled:opacity-50 shadow-sm">
                    {loading
                      ? <span className="flex items-center gap-2"><span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />분석 중…</span>
                      : "✨ AI 분석 시작"}
                  </button>
                  <button type="button" onClick={handleReset}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-500 hover:bg-gray-50">
                    다시 선택
                  </button>
                </div>
              </div>
            </div>
          )}
          <input ref={fileRef}   type="file" accept="image/*"          className="hidden" onChange={handleInputChange} />
          <input ref={cameraRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handleInputChange} />
        </div>
      )}

      {/* ── 에러 ── */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* ── 로딩 ── */}
      {loading && (
        <div className="flex flex-col items-center gap-5 py-12 text-center">
          <div className="relative">
            <div className="h-14 w-14 animate-spin rounded-full border-4 border-[#f0e4db] border-t-[#c4896a]" />
            <span className="absolute inset-0 flex items-center justify-center text-xl">💆</span>
          </div>
          <div>
            <p className="font-semibold text-gray-800">AI가 얼굴형과 눈썹을 분석하고 있어요</p>
            <p className="mt-1 text-xs text-gray-400">분석 후 눈썹 스타일 이미지도 생성합니다 (20~40초)</p>
          </div>
        </div>
      )}

      {/* ── 결과 ── */}
      {result && imageData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">분석 결과</h2>
            <button type="button" onClick={handleReset}
              className="text-xs text-gray-400 hover:text-gray-600 hover:underline">
              다시 분석하기
            </button>
          </div>

          {genError && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
              ⚠️ 눈썹 스타일 이미지 생성 실패 — {genError}
            </div>
          )}

          <div ref={reportRef}>
            <AnalysisReport
              result={result}
              imageDataUrl={imageData.dataUrl}
              eyeCropDataUrl={eyeCrop}
              generatedImages={genImages}
              genLoading={genLoading}
            />
          </div>

          {/* ── 다운로드 버튼 ── */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleDownloadJpg}
              disabled={!!downloading || genLoading}
              className="flex items-center gap-2 rounded-xl border border-[#c4896a] px-5 py-2.5 text-sm font-semibold text-[#c4896a] hover:bg-[#fdf0ea] disabled:opacity-50 transition"
            >
              {downloading === "jpg"
                ? <><span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#c4896a] border-t-transparent" />저장 중…</>
                : "🖼️ JPG 다운로드"}
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={!!downloading || genLoading}
              className="flex items-center gap-2 rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition"
            >
              {downloading === "pdf"
                ? <><span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-500 border-t-transparent" />저장 중…</>
                : "📄 PDF 다운로드"}
            </button>
            {genLoading && (
              <span className="self-center text-xs text-gray-400">이미지 생성 완료 후 다운로드하면 더 예쁜 결과물이 저장돼요</span>
            )}
          </div>
          {downloadError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{downloadError}</p>
          )}

          {/* ── 저장 섹션 ── */}
          {!savedId ? (
            <div className="rounded-2xl border border-[#ede4da] bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-bold text-gray-800">고객 차트에 저장</h3>
              <div className="mb-4">
                <p className="mb-1.5 text-xs text-gray-500">
                  {customer ? "연결된 고객" : "고객을 연결하면 해당 고객 차트에서 분석 결과를 확인할 수 있습니다."}
                </p>
                <CustomerSearchInput selected={customer} onSelect={setCustomer} onClear={() => setCustomer(null)} />
              </div>
              {saveError && (
                <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{saveError}</p>
              )}
              <div className="flex items-center gap-3">
                <button type="button" onClick={handleSave} disabled={saving}
                  className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-black disabled:opacity-50">
                  {saving ? "저장 중…" : customer ? `${customer.name} 차트에 저장` : "고객 연결 없이 저장"}
                </button>
                {!customer && <span className="text-xs text-gray-400">고객 연결 없이도 저장됩니다</span>}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4">
              <p className="font-semibold text-green-800">✅ 저장 완료!</p>
              {customer && (
                <p className="mt-1 text-sm text-green-700">
                  <Link href={`/dashboard/customers/${customer.id}/face-analysis`}
                    className="underline hover:text-green-900">
                    {customer.name} 고객 얼굴 분석 기록 보기 →
                  </Link>
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
