import type { AnalysisResult, GeneratedImages } from "./actions";

export function AnalysisReport({
  result,
  imageDataUrl,
  eyeCropDataUrl,
  generatedImages,
  genLoading,
}: {
  result: AnalysisResult;
  imageDataUrl: string;
  eyeCropDataUrl?: string;
  generatedImages?: GeneratedImages;
  genLoading?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-[#fdf9f6] shadow-sm">

      {/* ══ 헤더 ══ */}
      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-start">
        {imageDataUrl && (
          <div className="mx-auto h-56 w-48 shrink-0 overflow-hidden rounded-2xl shadow-md sm:mx-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageDataUrl} alt="분석 사진" className="h-full w-full object-cover" />
          </div>
        )}
        <div className="flex-1 space-y-3 pt-1">
          <div>
            <p className="font-serif text-xs italic tracking-widest text-[#c4a090]">Face &amp; Brow Analysis</p>
            <h1 className="mt-1 text-[1.6rem] font-bold leading-tight text-gray-900">
              얼굴형 &amp; 눈썹디자인 분석
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {result.hashtags.map((tag) => (
              <span key={tag} className="rounded-full bg-[#f0e4db] px-3 py-0.5 text-[12px] font-semibold text-[#a07060]">
                {tag}
              </span>
            ))}
          </div>
          <div className="relative rounded-2xl bg-white px-5 py-4 shadow-sm">
            <span className="absolute left-3 top-2 font-serif text-3xl leading-none text-[#e8c8b8]">"</span>
            <p className="mt-3 whitespace-pre-line text-[13.5px] leading-relaxed text-gray-700">
              {result.summary}
            </p>
          </div>
        </div>
      </div>

      {/* ══ 분석 그리드 ══ */}
      <div className="grid gap-4 px-6 pb-5 sm:grid-cols-3">

        {/* 나의 얼굴 & 눈썹 분석 */}
        <div className="sm:col-span-2 rounded-2xl border border-[#ede4da] bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-[13px] font-bold text-gray-700">나의 얼굴 &amp; 눈썹 분석</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            {[
              { icon: "○", label: "얼굴형",     value: result.faceShape },
              { icon: "◇", label: "골격",       value: result.boneLine },
              { icon: "☺", label: "분위기",     value: result.vibe },
              { icon: "◡", label: "얼굴선",     value: result.faceLine },
              { icon: "—", label: "눈썹 특징",  value: result.browFeature },
              { icon: "☆", label: "보완 포인트", value: result.improvementPoint },
              { icon: "●", label: "피부톤",     value: result.skinTone },
            ].map(({ icon, label, value }) => (
              <div key={label} className="flex items-start gap-2.5">
                <span className="mt-0.5 w-5 shrink-0 text-center text-base text-[#c4a090]">{icon}</span>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
                  <p className="mt-0.5 text-[13px] leading-snug text-gray-800">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 현재 눈썹 특징 */}
        <div className="rounded-2xl border border-[#ede4da] bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-[13px] font-bold text-gray-700">현재 눈썹 특징</h2>
          <ul className="mb-4 space-y-2">
            {result.currentBrowFeatures.map((feat) => (
              <li key={feat} className="flex items-start gap-2 text-[12.5px] text-gray-700">
                <span className="mt-0.5 shrink-0 font-bold text-[#c4a090]">✓</span>
                <span>{feat}</span>
              </li>
            ))}
          </ul>
          {eyeCropDataUrl && (
            <div className="overflow-hidden rounded-xl shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={eyeCropDataUrl} alt="눈썹 클로즈업" className="w-full object-cover" />
            </div>
          )}
        </div>
      </div>

      {/* ══ 눈썹 스타일 ══ */}
      <div className="grid gap-4 px-6 pb-5 sm:grid-cols-4">

        {/* 잘 어울리는 3종 */}
        <div className="sm:col-span-3 rounded-2xl border border-[#ede4da] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-[13px] font-bold text-gray-800">잘 어울리는 눈썹 스타일</h2>
            <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-600">베스트 / 추천</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {result.recommendedStyles.map((s) => (
              <div key={s.rank} className="overflow-hidden rounded-xl border border-[#f0e4db] bg-[#fdf9f6]">
                {/* 랭크 + 이름 */}
                <div className="px-3 pt-3 pb-2">
                  <span className="text-[10px] font-bold text-[#c4a090]">0{s.rank}</span>
                  <p className="text-[13px] font-bold text-gray-900">{s.name}</p>
                </div>
                {/* 눈썹 스타일 이미지 */}
                <div className="mx-3 mb-3 overflow-hidden rounded-lg bg-[#f0e8e0]" style={{ aspectRatio: "3/1.5" }}>
                  {generatedImages?.recommended[s.rank - 1] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`data:image/jpeg;base64,${generatedImages.recommended[s.rank - 1]}`} alt={s.name} className="h-full w-full object-cover" />
                  ) : genLoading ? (
                    <div className="flex h-full items-center justify-center gap-1.5">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#c4a090]" style={{ animationDelay: "0ms" }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#c4a090]" style={{ animationDelay: "150ms" }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#c4a090]" style={{ animationDelay: "300ms" }} />
                    </div>
                  ) : eyeCropDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={eyeCropDataUrl} alt="눈썹 참고" className="h-full w-full object-cover" />
                  ) : (
                    <EyeSvg name={s.name} />
                  )}
                </div>
                {/* 스펙 */}
                <dl className="space-y-0.5 px-3 pb-3">
                  {Object.entries(s.specs).filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <dt className="w-14 shrink-0 text-[10.5px] text-gray-400">{k}</dt>
                      <dd className="text-[10.5px] font-medium text-gray-700">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </div>

        {/* 덜 어울리는 2종 */}
        <div className="rounded-2xl border border-[#ede4da] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-1.5">
            <h2 className="text-[13px] font-bold text-gray-800">덜 어울리는 스타일</h2>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">비추천</span>
          </div>
          <div className="space-y-4">
            {result.notRecommendedStyles.map((s) => (
              <div key={s.name} className="overflow-hidden rounded-xl border border-amber-100 bg-amber-50/40">
                <div className="overflow-hidden bg-[#f5ede5]" style={{ aspectRatio: "3/1.5" }}>
                  {generatedImages?.notRecommended[result.notRecommendedStyles.indexOf(s)] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`data:image/jpeg;base64,${generatedImages.notRecommended[result.notRecommendedStyles.indexOf(s)]}`} alt={s.name} className="h-full w-full object-cover opacity-80 grayscale" />
                  ) : genLoading ? (
                    <div className="flex h-full items-center justify-center gap-1.5">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#c4a090]" style={{ animationDelay: "0ms" }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#c4a090]" style={{ animationDelay: "150ms" }} />
                    </div>
                  ) : eyeCropDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={eyeCropDataUrl} alt="" className="h-full w-full object-cover opacity-70 grayscale" />
                  ) : (
                    <EyeSvg name={s.name} muted />
                  )}
                </div>
                <div className="p-3">
                  <p className="text-[12px] font-bold text-gray-700">{s.name}</p>
                  <p className="mt-1 text-[11px] leading-snug text-gray-500">{s.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ TIP ══ */}
      <div className="mx-6 mb-6 flex items-center gap-3 rounded-xl bg-[#f5ede5] px-5 py-3.5">
        <span className="shrink-0 rounded-lg bg-[#c4896a] px-3 py-1 text-[11px] font-bold text-white">TIP</span>
        <p className="text-[13px] text-[#7a5c4a]">{result.tip}</p>
      </div>
    </div>
  );
}

function EyeSvg({ name, muted }: { name: string; muted?: boolean }) {
  const n = name.toLowerCase();
  let d = "M8,22 C25,14 45,10 60,10 C75,10 95,13 112,20";
  if (n.includes("일자") || n.includes("스트레이트")) d = "M8,20 C30,17 50,15 60,15 C70,15 90,17 112,20";
  else if (n.includes("각진") || n.includes("높은"))   d = "M8,26 C25,18 45,8 58,8 C71,8 90,16 112,26";
  else if (n.includes("아치"))                         d = "M8,24 C25,14 42,8 60,9 C78,8 95,14 112,24";
  const color = muted ? "#aaa" : "#7a5c4a";
  const sw = n.includes("두꺼운") || n.includes("굵은") ? 6 : 3.5;
  return (
    <svg viewBox="0 0 120 36" className="h-full w-full px-2 py-1">
      <path d={d} stroke={color} strokeWidth={sw} fill="none" strokeLinecap="round" />
    </svg>
  );
}
